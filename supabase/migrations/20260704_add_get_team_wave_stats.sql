-- get_team_wave_stats: wave（実施回）別の集計を返す（F-08 経時比較・タスク3-1）
-- 適用済み: 2026-07-04（Supabase MCP apply_migration: add_get_team_wave_stats_rpc）
-- security definer で生回答は返さず、wave別の n・総合平均・因子平均のみ返す
create or replace function public.get_team_wave_stats(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_team_id uuid;
  v_result jsonb;
begin
  select id into v_team_id from public.teams where code = upper(p_code);
  if v_team_id is null then
    return jsonb_build_object('error', 'team_not_found');
  end if;

  with wave_rows as (
    select w.id, w.wave_no, w.label, w.created_at,
           count(a.id) as n,
           round(avg(a.total_score)::numeric, 2) as avg_total
    from public.waves w
    left join public.assessments a on a.wave_id = w.id
    where w.team_id = v_team_id
    group by w.id, w.wave_no, w.label, w.created_at
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
             'n', wr.n,
             'avg_total', wr.avg_total,
             'factor_avg', fa.favg
           ) order by wr.wave_no
         )
    into v_result
  from wave_rows wr
  left join factor_agg fa on fa.wave_id = wr.id;

  return jsonb_build_object('team_code', upper(p_code), 'waves', coalesce(v_result, '[]'::jsonb));
end;
$$;

revoke all on function public.get_team_wave_stats(text) from public;
grant execute on function public.get_team_wave_stats(text) to anon, authenticated;
