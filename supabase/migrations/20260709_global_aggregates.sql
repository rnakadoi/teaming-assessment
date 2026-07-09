-- F-6: 全体平均の累積集計（2026-07-09 フィードバック対応）
-- 適用済み: Supabase MCP apply_migration: add_global_aggregates
--
-- 設計:
--  - 全レコードを保持・走査しなくても全体平均を出せるよう、件数と総和のみを global_aggregates 1行で保持
--  - submit_assessment が INSERT 後にインクリメント（適用済みの全文は当該migration参照）
--  - 表示閾値は n>=30（平均の統計的安定＋初期回答者の匿名性希釈。ベンチマーク上位%は従来どおり n>=100）
--  - RLSポリシー無し=直接読み取り不可。取得は get_global_stats() RPC のみ

create table if not exists public.global_aggregates (
  id        smallint primary key default 1 check (id = 1),
  n         bigint  not null default 0,
  total_sum bigint  not null default 0,
  f1_sum    numeric not null default 0,
  f2_sum    numeric not null default 0,
  f3_sum    numeric not null default 0,
  f4_sum    numeric not null default 0,
  f5_sum    numeric not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.global_aggregates enable row level security;

-- 既存回答からのバックフィル（初回のみ）
insert into public.global_aggregates (id, n, total_sum, f1_sum, f2_sum, f3_sum, f4_sum, f5_sum)
select 1,
       count(*),
       coalesce(sum(total_score), 0),
       coalesce(sum((factor_scores->>'F1')::numeric), 0),
       coalesce(sum((factor_scores->>'F2')::numeric), 0),
       coalesce(sum((factor_scores->>'F3')::numeric), 0),
       coalesce(sum((factor_scores->>'F4')::numeric), 0),
       coalesce(sum((factor_scores->>'F5')::numeric), 0)
from public.assessments
on conflict (id) do nothing;

-- submit_assessment には INSERT 直後に以下を追加（全文は適用済みmigration参照）:
--   update public.global_aggregates set
--     n = n + 1, total_sum = total_sum + v_total,
--     f1_sum = f1_sum + (v_factor_scores->>'F1')::numeric, ...（F2〜F5同様）,
--     updated_at = now()
--   where id = 1;

create or replace function public.get_global_stats()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v record;
  v_min_n constant int := 30;
begin
  select * into v from public.global_aggregates where id = 1;
  if v is null or v.n < v_min_n then
    return jsonb_build_object('available', false, 'n', coalesce(v.n, 0), 'min_n', v_min_n);
  end if;
  return jsonb_build_object(
    'available', true,
    'n', v.n,
    'min_n', v_min_n,
    'avg_total', round(v.total_sum::numeric / v.n, 2),
    'factor_avg', jsonb_build_object(
      'F1', round(v.f1_sum / v.n, 3),
      'F2', round(v.f2_sum / v.n, 3),
      'F3', round(v.f3_sum / v.n, 3),
      'F4', round(v.f4_sum / v.n, 3),
      'F5', round(v.f5_sum / v.n, 3)
    )
  );
end;
$$;
revoke all on function public.get_global_stats() from public;
grant execute on function public.get_global_stats() to anon, authenticated;
