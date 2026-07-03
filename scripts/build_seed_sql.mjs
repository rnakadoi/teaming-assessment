// content/batches/*.json から pattern_analyses の seed SQL を生成する
// 使い方: node scripts/build_seed_sql.mjs
// 出力: content/seed_pattern_analyses.sql（upsert。243件揃う前の部分投入にも使える）
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(__dirname, "..", "content", "batches");
const OUT = join(__dirname, "..", "content", "seed_pattern_analyses.sql");

const esc = (s) => String(s).replaceAll("'", "''");

const items = new Map();
for (const f of readdirSync(BATCH_DIR).filter((x) => x.endsWith(".json")).sort()) {
  const arr = JSON.parse(readFileSync(join(BATCH_DIR, f), "utf-8"));
  for (const it of arr) {
    if (!/^[HML]{5}$/.test(it?.pattern_code ?? "")) continue;
    items.set(it.pattern_code, it);
  }
}

const values = [...items.values()].map((it) => {
  const links = esc(JSON.stringify(it.links ?? []));
  return `('${it.pattern_code}', '${esc(it.summary)}', '${esc(it.background)}', '${esc(it.first_step)}', '${esc(it.sound_step)}', '${links}'::jsonb)`;
});

const sql = `-- pattern_analyses seed（自動生成: scripts/build_seed_sql.mjs / ${items.size}件）
insert into public.pattern_analyses (pattern_code, summary, background, first_step, sound_step, links) values
${values.join(",\n")}
on conflict (pattern_code) do update set
  summary = excluded.summary,
  background = excluded.background,
  first_step = excluded.first_step,
  sound_step = excluded.sound_step,
  links = excluded.links;
`;

writeFileSync(OUT, sql, "utf-8");
console.log(`OK: ${items.size}件 → ${OUT}（${sql.length}文字）`);
