-- get_team_stats 拡張＋修正（タスク2-3）
-- 適用済み: 2026-07-04（Supabase MCP apply_migration:
--   update_get_team_stats_name_and_role_guard → fix_get_team_stats_nested_aggregates で確定）
-- (1) team_name を返却に追加（集計画面ヘッダ用）
-- (2) by_role は各役割2名以上の場合のみ集計（1名だと個人スコアが特定されるため）
-- (3) fix: 集約ネスト（jsonb_object_agg 内の avg）を2段階集計へ修正
--     ※元 migration（init_schema）から存在した実行時エラー（42803）の修正
create or replace function public.get_team_stats(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_team_name text;
  v_n       int;
  v_result  jsonb;
begin
  select id, name into v_team_id, v_team_name from public.teams where code = upper(p_code);
  if v_team_id is null then
    return jsonb_build_object('error', 'team_not_found');
  end if;

  select count(*) into v_n
  from public.assessments a
  join public.waves w on w.id = a.wave_id
  where w.team_id = v_team_id;

  with a as (
    select a.* from public.assessments a
    join public.waves w on w.id = a.wave_id
    where w.team_id = v_team_id
  ),
  factor_rows as (
    select e.k, round(avg((e.v)::numeric), 3) as v_avg
    from a, lateral jsonb_each_text(a.factor_scores) as e(k, v)
    group by e.k
  ),
  factor_avg as (
    select jsonb_object_agg(k, v_avg) as favg from factor_rows
  ),
  item_rows as (
    select e.k, round(avg((e.v)::numeric), 3) as v_avg,
           round(coalesce(stddev_pop((e.v)::numeric), 0), 3) as v_sd
    from a, lateral jsonb_each_text(a.answers) as e(k, v)
    group by e.k
  ),
  item_stats as (
    select jsonb_object_agg(k, jsonb_build_object('avg', v_avg, 'stddev', v_sd)) as items
    from item_rows
  ),
  role_rows as (
    select coalesce(role, 'unspecified') as role_key,
           round(avg(total_score)::numeric, 2) as r_avg
    from a
    group by role
    having count(*) >= 2  -- 役割1名の平均=個人スコアのため非表示
  ),
  role_avg as (
    select jsonb_object_agg(role_key, r_avg) as by_role from role_rows
  )
  select jsonb_build_object(
    'team_code', upper(p_code),
    'team_name', v_team_name,
    'n', v_n,
    'avg_total', (select round(avg(total_score)::numeric, 2) from a),
    'factor_avg', (select favg from factor_avg),
    'item_stats', case when v_n >= 3 then (select items from item_stats) else null end,
    'by_role',    case when v_n >= 3 then (select by_role from role_avg) else null end,
    'min_n_for_detail', 3
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_team_stats(text) from public;
grant execute on function public.get_team_stats(text) to anon, authenticated;
