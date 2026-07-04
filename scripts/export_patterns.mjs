// pattern_analyses の全件を anon キーで取得し、リポジトリに記録として保存する
// （DB反映済みコンテンツの版管理用。anon SELECT 可の確認も兼ねる）
// 使い方: node scripts/export_patterns.mjs
// 出力: content/patterns_db_export.json
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(join(__dirname, "..", ".env.local"), "utf-8")
    .split(/\r?\n/)
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
);

const res = await fetch(
  `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/pattern_analyses?select=pattern_code,summary,background,first_step,sound_step,links&order=pattern_code&limit=300`,
  {
    headers: {
      apikey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
    },
  }
);
if (!res.ok) {
  console.error(`取得失敗: ${res.status}`);
  process.exit(1);
}
const rows = await res.json();
const OUT = join(__dirname, "..", "content", "patterns_db_export.json");
writeFileSync(OUT, JSON.stringify(rows, null, 2), "utf-8");
console.log(`OK: ${rows.length}件 → ${OUT}（anon SELECT 確認済み）`);
