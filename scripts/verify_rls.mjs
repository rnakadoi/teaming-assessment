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

// 2. teams SELECT（コード運用のため許可されている）
{
  const res = await fetch(`${BASE}/rest/v1/teams?select=code&limit=1`, { headers: HEADERS });
  const body = await res.json();
  check("anon は teams を SELECT できる（コード照合運用）", res.ok && Array.isArray(body), `status=${res.status}`);
}

// 3. RPC get_team_stats（存在しないコード → error 応答のみ。生データは返らない）
{
  const res = await fetch(`${BASE}/rest/v1/rpc/get_team_stats`, {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ p_code: "ZZZZZZ" }),
  });
  const body = await res.json();
  check(
    "anon は get_team_stats を実行できる（不明コードは error）",
    res.ok && body?.error === "team_not_found",
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
