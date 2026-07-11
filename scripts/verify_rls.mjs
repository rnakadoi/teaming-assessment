// RLS 検証スクリプト（タスク1-13 / 2-6）
// anon（publishable）キーで以下を確認する:
//   1. assessments の SELECT が不可（空配列が返る＝生回答は読めない）
//   2. teams はコード照合で SELECT 可
//   3. RPC get_team_stats が集計のみ返す
//   4. RPC submit_assessment の入力検証が効く
// 使い方: node scripts/verify_rls.mjs （.env.local から接続情報を読む）
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, "..", ".env.local"), "utf-8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);
const BASE = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const HEADERS = { apikey: KEY, Authorization: `Bearer ${KEY}` };

let failed = 0;
const check = (name, ok, detail) => {
  console.log(`${ok ? "✓" : "✗"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failed++;
};

// 1. assessments SELECT → 空配列（SELECTポリシー無し）
{
  const res = await fetch(`${BASE}/rest/v1/assessments?select=id,answers&limit=5`, {
    headers: HEADERS,
  });
  const body = await res.json();
  check(
    "anon は assessments の生回答を読めない",
    res.ok && Array.isArray(body) && body.length === 0,
    `status=${res.status} rows=${Array.isArray(body) ? body.length : "?"}`
  );
}

// 2. teams SELECT（2026-07-05 仕様変更: 閲覧/リセットコード漏洩防止のため直接SELECT不可）
{
  const res = await fetch(`${BASE}/rest/v1/teams?select=code,view_code&limit=1`, {
    headers: HEADERS,
  });
  const body = await res.json();
  check(
    "anon は teams（閲覧コード等）を直接読めない",
    res.ok && Array.isArray(body) && body.length === 0,
    `status=${res.status} rows=${Array.isArray(body) ? body.length : "?"}`
  );
}

// 2b. admin_secrets（管理者コード）は完全遮断
{
  const res = await fetch(`${BASE}/rest/v1/admin_secrets?select=v&limit=1`, { headers: HEADERS });
  const body = await res.json();
  check(
    "anon は admin_secrets（管理者コード）を読めない",
    res.ok && Array.isArray(body) && body.length === 0,
    `status=${res.status} rows=${Array.isArray(body) ? body.length : "?"}`
  );
}

// 3. RPC get_team_stats（存在しないコード → error 応答のみ。生データは返らない）
{
  const res = await fetch(`${BASE}/rest/v1/rpc/get_team_stats`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ p_code: "ZZZZZZ", p_view_code: "X" }),
  });
  const body = await res.json();
  check(
    "anon は get_team_stats を実行できる（不明コードは error）",
    res.ok && body?.error === "team_not_found",
    JSON.stringify(body).slice(0, 80)
  );
}

// 3b. 管理者RPCは誤コードを拒否する
{
  const res = await fetch(`${BASE}/rest/v1/rpc/admin_list_teams`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ p_admin_code: "WRONG" }),
  });
  const body = await res.json();
  check(
    "admin_list_teams は誤った管理者コードを拒否する",
    res.ok && body?.error === "invalid_admin_code",
    JSON.stringify(body).slice(0, 80)
  );
}

// 4. RPC submit_assessment の入力検証（20問未満は invalid_answers）
{
  const res = await fetch(`${BASE}/rest/v1/rpc/submit_assessment`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ p_answers: { 1: 3 } }),
  });
  const body = await res.json();
  check(
    "submit_assessment は不正入力を弾く",
    res.ok && body?.error === "invalid_answers",
    JSON.stringify(body).slice(0, 80)
  );
}

// 4b. 管理機能スイート（2026-07-12 仕様変更）の新RPC・ポリシー確認
{
  const res = await fetch(`${BASE}/rest/v1/rpc/admin_delete_teams`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ p_admin_code: "WRONG", p_codes: ["ZZZZZZ"] }),
  });
  const body = await res.json();
  check(
    "admin_delete_teams は誤った管理者コードを拒否する",
    res.ok && body?.error === "invalid_admin_code",
    JSON.stringify(body).slice(0, 80)
  );
}
{
  const res = await fetch(`${BASE}/rest/v1/rpc/set_wave_closed`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ p_code: "ZZZZZZ", p_view_code: "X", p_closed: true }),
  });
  const body = await res.json();
  check(
    "set_wave_closed は不明コードを拒否する",
    res.ok && body?.error === "team_not_found",
    JSON.stringify(body).slice(0, 80)
  );
}
{
  const res = await fetch(`${BASE}/rest/v1/rpc/create_wave`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ p_code: "ZZZZZZ", p_view_code: "X" }),
  });
  const body = await res.json();
  check(
    "create_wave は不明コードを拒否する",
    res.ok && body?.error === "team_not_found",
    JSON.stringify(body).slice(0, 80)
  );
}
{
  const res = await fetch(`${BASE}/rest/v1/waves?select=id&limit=1`, { headers: HEADERS });
  const body = await res.json();
  check(
    "anon は waves を直接読めない（create_wave RPC 移行後）",
    res.ok && Array.isArray(body) && body.length === 0,
    `status=${res.status} rows=${Array.isArray(body) ? body.length : "?"}`
  );
}

// 5. leads / pattern_analyses / questions のポリシー確認
{
  const res = await fetch(`${BASE}/rest/v1/leads?select=email&limit=1`, { headers: HEADERS });
  const body = await res.json();
  check(
    "anon は leads（メールアドレス）を読めない",
    res.ok && Array.isArray(body) && body.length === 0,
    `status=${res.status} rows=${Array.isArray(body) ? body.length : "?"}`
  );
}
{
  const res = await fetch(`${BASE}/rest/v1/questions?select=no&limit=1`, { headers: HEADERS });
  const body = await res.json();
  check("anon はマスタ（questions）を読める", res.ok && Array.isArray(body) && body.length === 1, `status=${res.status}`);
}

console.log(failed === 0 ? "\nRLS検証: 全項目パス" : `\nRLS検証: ${failed}項目失敗`);
process.exit(failed === 0 ? 0 : 1);
