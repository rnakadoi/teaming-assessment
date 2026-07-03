-- submit_assessment: サーバー側再計算＋INSERT＋結果返却（仕様書v2.0 §6・§13タスク1-4）
-- 適用済み: 2026-07-03（Supabase MCP apply_migration:
--   add_submit_assessment_rpc → fix_submit_assessment_total_score で確定）
-- 本ファイルは適用済みSQLのリポジトリ内記録。
--
-- anon には assessments の SELECT ポリシーが無く INSERT ... RETURNING が使えないため、
-- security definer の本RPCで計算・保存し、結果表示用データ一式を返す。
-- 保存値はサーバー計算値（クライアント計算は表示の即時性のためのみ）。
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

  -- チームコード → 最新wave の解決（個人利用は null のまま）
  if p_wave_code is not null and length(trim(p_wave_code)) > 0 then
    select w.id into v_wave_id
    from public.teams t
    join public.waves w on w.team_id = t.id
    where t.code = upper(trim(p_wave_code))
    order by w.wave_no desc
    limit 1;
    if v_wave_id is null then
      return jsonb_build_object('error', 'team_not_found');
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
