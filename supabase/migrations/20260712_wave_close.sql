-- 実施回（wave）の受付クローズ（2026-07-12 仕様変更: 測定期間の混入防止）
-- (1) waves.closed_at 追加。最新waveがクローズ中はチーム回答を受け付けない
-- (2) create_wave RPC: 新しい実施回の発行をサーバー側に移管（閲覧コード必須）
--     ※従来はクライアントから waves へ直接 INSERT していた（team_id を知る誰でも発行できた）。
--       本migrationで waves の anon 直接アクセス（sel_waves/ins_waves）を剥奪し RPC 経由に統一
-- (3) set_wave_closed RPC: 最新waveの受付終了/再開（閲覧コード必須）
-- (4) submit_assessment: 最新waveがクローズ中なら error=wave_closed
-- (5) get_team_by_code: latest_wave_no / latest_wave_closed を追加（参加ページの受付終了表示用）
-- (6) get_team_wave_stats: 各waveに closed_at を追加（集計画面のトグル表示用）

alter table public.waves add column if not exists closed_at timestamptz;

-- 直接アクセスを剥奪（create_wave RPC への移行に伴う。旧クライアントの「新しい実施回」発行は
-- デプロイ完了までの間エラーになるが、作成者専用・低頻度機能のため許容）
drop policy if exists sel_waves on public.waves;
drop policy if exists ins_waves on public.waves;

create or replace function public.create_wave(
  p_code text,
  p_view_code text,
  p_label text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_wave_id uuid;
  v_next int;
begin
  select id into v_team_id from public.teams
   where code = upper(trim(p_code)) and view_code = upper(trim(coalesce(p_view_code, '')));
  if v_team_id is null then
    if exists (select 1 from public.teams where code = upper(trim(p_code))) then
      return jsonb_build_object('error', 'invalid_view_code');
    end if;
    return jsonb_build_object('error', 'team_not_found');
  end if;

  select coalesce(max(wave_no), 0) + 1 into v_next
  from public.waves where team_id = v_team_id;

  insert into public.waves (team_id, wave_no, label)
  values (v_team_id, v_next, nullif(trim(coalesce(p_label, '')), ''))
  returning id into v_wave_id;

  return jsonb_build_object('wave_id', v_wave_id, 'wave_no', v_next);
end;
$$;

revoke all on function public.create_wave(text, text, text) from public;
grant execute on function public.create_wave(text, text, text) to anon, authenticated;

create or replace function public.set_wave_closed(
  p_code text,
  p_view_code text,
  p_closed boolean
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_wave_no int;
  v_closed_at timestamptz;
begin
  select id into v_team_id from public.teams
   where code = upper(trim(p_code)) and view_code = upper(trim(coalesce(p_view_code, '')));
  if v_team_id is null then
    if exists (select 1 from public.teams where code = upper(trim(p_code))) then
      return jsonb_build_object('error', 'invalid_view_code');
    end if;
    return jsonb_build_object('error', 'team_not_found');
  end if;

  update public.waves w
     set closed_at = case when p_closed then now() else null end
   where w.team_id = v_team_id
     and w.wave_no = (select max(wave_no) from public.waves where team_id = v_team_id)
  returning w.wave_no, w.closed_at into v_wave_no, v_closed_at;

  if v_wave_no is null then
    return jsonb_build_object('error', 'wave_not_found');
  end if;

  return jsonb_build_object('wave_no', v_wave_no, 'closed_at', v_closed_at);
end;
$$;

revoke all on function public.set_wave_closed(text, text, boolean) from public;
grant execute on function public.set_wave_closed(text, text, boolean) to anon, authenticated;

-- get_team_by_code: 最新waveのクローズ状態を追加（参加ページの受付終了表示用）
create or replace function public.get_team_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'id', t.id, 'code', t.code, 'name', t.name,
    'latest_wave_no', w.wave_no,
    'latest_wave_closed', (w.closed_at is not null)
  )
    into v
  from public.teams t
  left join lateral (
    select wave_no, closed_at from public.waves
    where team_id = t.id order by wave_no desc limit 1
  ) w on true
  where t.code = upper(trim(p_code));
  if v is null then return jsonb_build_object('error', 'team_not_found'); end if;
  return v;
end;
$$;

revoke all on function public.get_team_by_code(text) from public;
grant execute on function public.get_team_by_code(text) to anon, authenticated;

-- submit_assessment: 最新waveクローズ中の回答を拒否（それ以外は 20260703 の適用済み版と同一）
create or replace function public.submit_assessment(
  p_answers   jsonb,
  p_wave_code text default null,
  p_role      text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_q          record;
  v_raw        int;
  v_adj        int;
  v_total      int := 0;
  v_fsum       int[] := array[0,0,0,0,0];
  v_fcnt       int[] := array[0,0,0,0,0];
  v_adjusted   jsonb := '{}'::jsonb;
  v_wave_id    uuid  := null;
  v_wave_closed_at timestamptz := null;
  v_pattern    text  := '';
  v_factor_scores jsonb := '{}'::jsonb;
  v_factor_sums   jsonb := '{}'::jsonb;
  v_factor_levels jsonb := '{}'::jsonb;
  v_threshold  int;
  v_level      text;
  v_id         uuid;
  v_band_min   int;
  v_band_max   int;
  v_band_desc  text;
  i            int;
begin
  -- 入力検証
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then
    return jsonb_build_object('error', 'invalid_answers');
  end if;
  if (select count(*) from jsonb_object_keys(p_answers)) <> 20 then
    return jsonb_build_object('error', 'invalid_answers');
  end if;
  if p_role is not null and p_role not in ('leader', 'member') then
    return jsonb_build_object('error', 'invalid_role');
  end if;

  -- チームコード → 最新wave の解決（個人利用は null のまま）。クローズ中は受付拒否
  if p_wave_code is not null and length(trim(p_wave_code)) > 0 then
    select w.id, w.closed_at into v_wave_id, v_wave_closed_at
    from public.teams t
    join public.waves w on w.team_id = t.id
    where t.code = upper(trim(p_wave_code))
    order by w.wave_no desc
    limit 1;
    if v_wave_id is null then
      return jsonb_build_object('error', 'team_not_found');
    end if;
    if v_wave_closed_at is not null then
      return jsonb_build_object('error', 'wave_closed');
    end if;
  end if;

  -- 素点×polarity → 補正後素点 → 総合・因子集計（仕様§3.2）
  for v_q in select no, polarity, factor_id from public.questions order by no loop
    if not p_answers ? v_q.no::text then
      return jsonb_build_object('error', 'missing_answer', 'question_no', v_q.no);
    end if;
    begin
      v_raw := (p_answers ->> v_q.no::text)::int;
    exception when others then
      return jsonb_build_object('error', 'invalid_answer_value', 'question_no', v_q.no);
    end;
    if v_raw < 1 or v_raw > 5 then
      return jsonb_build_object('error', 'invalid_answer_value', 'question_no', v_q.no);
    end if;
    v_adj := (v_raw - 3) * v_q.polarity;
    v_total := v_total + v_adj;
    v_fsum[v_q.factor_id] := v_fsum[v_q.factor_id] + v_adj;
    v_fcnt[v_q.factor_id] := v_fcnt[v_q.factor_id] + 1;
    v_adjusted := v_adjusted || jsonb_build_object(v_q.no::text, v_adj);
  end loop;

  -- 因子水準（整数閾値: 3問→±2 / 4問→±3 / 5問→±4）とパターンコード
  for i in 1..5 loop
    v_threshold := case v_fcnt[i] when 3 then 2 when 4 then 3 when 5 then 4 else null end;
    if v_threshold is null then
      return jsonb_build_object('error', 'invalid_master');
    end if;
    v_level := case
      when v_fsum[i] >= v_threshold  then 'H'
      when v_fsum[i] <= -v_threshold then 'L'
      else 'M'
    end;
    v_pattern := v_pattern || v_level;
    v_factor_scores := v_factor_scores || jsonb_build_object('F' || i, round(v_fsum[i]::numeric / v_fcnt[i], 3));
    v_factor_sums   := v_factor_sums   || jsonb_build_object('F' || i, v_fsum[i]);
    v_factor_levels := v_factor_levels || jsonb_build_object('F' || i, v_level);
  end loop;

  -- 保存（保存値はサーバー計算値）
  insert into public.assessments (wave_id, role, answers, total_score, factor_scores, pattern_code)
  values (v_wave_id, p_role, p_answers, v_total, v_factor_scores, v_pattern)
  returning id into v_id;

  -- F-6: 全体平均用の累積集計を更新（20260709 適用済み版と同一）
  update public.global_aggregates set
    n = n + 1,
    total_sum = total_sum + v_total,
    f1_sum = f1_sum + (v_factor_scores->>'F1')::numeric,
    f2_sum = f2_sum + (v_factor_scores->>'F2')::numeric,
    f3_sum = f3_sum + (v_factor_scores->>'F3')::numeric,
    f4_sum = f4_sum + (v_factor_scores->>'F4')::numeric,
    f5_sum = f5_sum + (v_factor_scores->>'F5')::numeric,
    updated_at = now()
  where id = 1;

  -- スコア帯解説
  select min_score, max_score, description
    into v_band_min, v_band_max, v_band_desc
  from public.score_bands
  where v_total between min_score and max_score
  limit 1;

  return jsonb_build_object(
    'assessment_id', v_id,
    'total', v_total,
    'factor_scores', v_factor_scores,
    'factor_sums', v_factor_sums,
    'factor_levels', v_factor_levels,
    'pattern_code', v_pattern,
    'adjusted', v_adjusted,
    'band', case when v_band_desc is not null then
      jsonb_build_object('min_score', v_band_min, 'max_score', v_band_max, 'description', v_band_desc)
    else null end,
    'wave_id', v_wave_id
  );
end;
$$;

revoke all on function public.submit_assessment(jsonb, text, text) from public;
grant execute on function public.submit_assessment(jsonb, text, text) to anon, authenticated;

-- get_team_wave_stats: 各waveに closed_at を追加（適用済み版 + closed_at）
create or replace function public.get_team_wave_stats(p_code text, p_view_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_result jsonb;
begin
  select id into v_team_id from public.teams
   where code = upper(trim(p_code)) and view_code = upper(trim(coalesce(p_view_code, '')));
  if v_team_id is null then
    if exists (select 1 from public.teams where code = upper(trim(p_code))) then
      return jsonb_build_object('error', 'invalid_view_code');
    end if;
    return jsonb_build_object('error', 'team_not_found');
  end if;

  with wave_rows as (
    select w.id, w.wave_no, w.label, w.created_at, w.closed_at,
           count(a.id) as n,
           round(avg(a.total_score)::numeric, 2) as avg_total
    from public.waves w
    left join public.assessments a on a.wave_id = w.id
    where w.team_id = v_team_id
    group by w.id, w.wave_no, w.label, w.created_at, w.closed_at
  ),
  factor_rows as (
    select w.id as wave_id, e.k, round(avg((e.v)::numeric), 3) as v_avg
    from public.waves w
    join public.assessments a on a.wave_id = w.id,
    lateral jsonb_each_text(a.factor_scores) as e(k, v)
    where w.team_id = v_team_id
    group by w.id, e.k
  ),
  factor_agg as (
    select wave_id, jsonb_object_agg(k, v_avg) as favg
    from factor_rows group by wave_id
  )
  select jsonb_agg(
           jsonb_build_object(
             'wave_no', wr.wave_no,
             'label', wr.label,
             'created_at', wr.created_at,
             'closed_at', wr.closed_at,
             'n', wr.n,
             'avg_total', wr.avg_total,
             'factor_avg', fa.favg
           ) order by wr.wave_no
         )
    into v_result
  from wave_rows wr
  left join factor_agg fa on fa.wave_id = wr.id;

  return jsonb_build_object('team_code', upper(trim(p_code)), 'waves', coalesce(v_result, '[]'::jsonb));
end;
$$;

revoke all on function public.get_team_wave_stats(text, text) from public;
grant execute on function public.get_team_wave_stats(text, text) to anon, authenticated;
