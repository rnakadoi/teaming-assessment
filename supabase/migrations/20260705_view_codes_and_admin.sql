-- 仕様変更（2026-07-05 オーナー承認済み設計）
-- 適用済み: Supabase MCP apply_migration:
--   add_view_codes_and_admin → fix_gen_code_extensions_schema で確定
-- (1) 3コード体系: 参加コード(6)/閲覧コード(8)/リセットコード(10) — サーバー側生成
-- (2) teams の直接SELECT/INSERTを封鎖（コード漏洩防止）→ RPC経由に統一
-- (3) 集計RPC（get_team_stats/get_team_wave_stats）は閲覧コード必須に
-- (4) 管理者コード（admin_secrets・RLSポリシー無し=全遮断）＋ admin_list_teams RPC
-- 備考: 既存チーム（旧方式）には view_code/reset_code を補完発行済み

alter table public.teams
  add column if not exists view_code text,
  add column if not exists reset_code text;

drop policy if exists sel_teams on public.teams;
drop policy if exists ins_teams on public.teams;

-- コード生成（紛らわしい文字除外・pgcrypto は extensions スキーマ）
create or replace function public._gen_code(p_len int)
returns text language plpgsql volatile as $$
declare
  v_chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  v_out text := '';
  i int;
begin
  for i in 1..p_len loop
    v_out := v_out || substr(v_chars, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 31), 1);
  end loop;
  return v_out;
end;
$$;
revoke all on function public._gen_code(int) from public;

create or replace function public.create_team(p_name text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_code text; v_view text; v_reset text;
  v_team_id uuid; v_wave_id uuid; v_try int := 0;
begin
  loop
    v_try := v_try + 1;
    v_code := public._gen_code(6);
    exit when not exists (select 1 from public.teams where code = v_code);
    if v_try >= 5 then return jsonb_build_object('error', 'code_generation_failed'); end if;
  end loop;
  v_view := public._gen_code(8);
  v_reset := public._gen_code(10);
  insert into public.teams (code, name, view_code, reset_code)
  values (v_code, nullif(trim(coalesce(p_name, '')), ''), v_view, v_reset)
  returning id into v_team_id;
  insert into public.waves (team_id, wave_no) values (v_team_id, 1) returning id into v_wave_id;
  return jsonb_build_object('team_id', v_team_id, 'wave_id', v_wave_id,
    'code', v_code, 'view_code', v_view, 'reset_code', v_reset);
end;
$$;
revoke all on function public.create_team(text) from public;
grant execute on function public.create_team(text) to anon, authenticated;

create or replace function public.get_team_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select jsonb_build_object('id', id, 'code', code, 'name', name)
    into v from public.teams where code = upper(trim(p_code));
  if v is null then return jsonb_build_object('error', 'team_not_found'); end if;
  return v;
end;
$$;
revoke all on function public.get_team_by_code(text) from public;
grant execute on function public.get_team_by_code(text) to anon, authenticated;

create or replace function public.reset_view_code(p_code text, p_reset_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_new text;
begin
  select id into v_id from public.teams
   where code = upper(trim(p_code)) and reset_code = upper(trim(p_reset_code));
  if v_id is null then return jsonb_build_object('error', 'invalid_reset_code'); end if;
  v_new := public._gen_code(8);
  update public.teams set view_code = v_new where id = v_id;
  return jsonb_build_object('view_code', v_new);
end;
$$;
revoke all on function public.reset_view_code(text, text) from public;
grant execute on function public.reset_view_code(text, text) to anon, authenticated;

-- get_team_stats(text,text) / get_team_wave_stats(text,text):
-- 20260704_update_get_team_stats.sql / 20260704_add_get_team_wave_stats.sql の本体に
-- view_code 照合（不一致: invalid_view_code / 不明コード: team_not_found）を追加した版。
-- 全文は適用済みmigration（add_view_codes_and_admin）参照。

create table if not exists public.admin_secrets (
  k text primary key,
  v text not null
);
alter table public.admin_secrets enable row level security;
insert into public.admin_secrets (k, v)
values ('admin_code', public._gen_code(14))
on conflict (k) do nothing;

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
