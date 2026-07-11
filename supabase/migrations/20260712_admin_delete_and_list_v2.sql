-- 管理機能スイート（2026-07-12 仕様変更: Metamo 管理機能の移植 その1）
-- (1) admin_delete_teams: 管理者によるチームの一括削除（削除範囲2択）
--     p_delete_assessments=false: チーム情報のみ削除
--       （waves は FK CASCADE で消え、assessments.wave_id は SET NULL で外れて匿名の全体統計に残る）
--     p_delete_assessments=true : 紐づく回答データもすべて削除
--     注意: global_aggregates（累積集計）は減算しない（全体平均は累積スナップショットの仕様）
-- (2) admin_list_teams v2: 管理情報PDFの再ダウンロード用に reset_code を返却に追加

create or replace function public.admin_delete_teams(
  p_admin_code text,
  p_codes text[],
  p_delete_assessments boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
  v_teams_deleted int := 0;
  v_assessments_deleted int := 0;
begin
  if not exists (
    select 1 from public.admin_secrets
    where k = 'admin_code' and v = upper(trim(coalesce(p_admin_code, '')))
  ) then
    return jsonb_build_object('error', 'invalid_admin_code');
  end if;

  select array_agg(id) into v_ids
  from public.teams
  where code = any(select upper(trim(c)) from unnest(p_codes) as c);

  if v_ids is null then
    return jsonb_build_object('teams_deleted', 0, 'assessments_deleted', 0);
  end if;

  if p_delete_assessments then
    with del as (
      delete from public.assessments
      where wave_id in (select id from public.waves where team_id = any(v_ids))
      returning id
    )
    select count(*) into v_assessments_deleted from del;
  end if;

  with del as (
    delete from public.teams where id = any(v_ids) returning id
  )
  select count(*) into v_teams_deleted from del;

  return jsonb_build_object(
    'teams_deleted', v_teams_deleted,
    'assessments_deleted', v_assessments_deleted
  );
end;
$$;

revoke all on function public.admin_delete_teams(text, text[], boolean) from public;
grant execute on function public.admin_delete_teams(text, text[], boolean) to anon, authenticated;

-- admin_list_teams v2: reset_code を追加（管理情報PDFの一覧からの再出力用）
create or replace function public.admin_list_teams(p_admin_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_result jsonb;
begin
  if not exists (
    select 1 from public.admin_secrets
    where k = 'admin_code' and v = upper(trim(coalesce(p_admin_code, '')))
  ) then
    return jsonb_build_object('error', 'invalid_admin_code');
  end if;
  select jsonb_agg(row order by row->>'created_at' desc) into v_result
  from (
    select jsonb_build_object(
      'code', t.code, 'name', t.name, 'created_at', t.created_at,
      'view_code', t.view_code,
      'reset_code', t.reset_code,
      'n', (select count(*) from public.assessments a
            join public.waves w on w.id = a.wave_id where w.team_id = t.id),
      'avg_total', (select round(avg(a.total_score)::numeric, 2) from public.assessments a
            join public.waves w on w.id = a.wave_id where w.team_id = t.id)
    ) as row
    from public.teams t
  ) s;
  return jsonb_build_object('teams', coalesce(v_result, '[]'::jsonb));
end;
$$;

revoke all on function public.admin_list_teams(text) from public;
grant execute on function public.admin_list_teams(text) to anon, authenticated;
