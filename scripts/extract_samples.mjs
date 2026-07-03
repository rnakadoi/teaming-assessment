// 承認済みサンプル10件（H1_サンプル分析文_10パターン_v2.md）を JSON へ抽出する
// 使い方: node scripts/extract_samples.mjs
// 出力: content/batches/batch-00.json
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SRC = String.raw`C:\Users\nakad\OneDrive\021Scoat\030セッション\050ツール\引き継ぎ\H1_サンプル分析文_10パターン_v2.md`;
const OUT = join(__dirname, "..", "content", "batches", "batch-00.json");

const md = readFileSync(SRC, "utf-8");

// "## 1. HHHHH（...）" 単位で分割
const sections = md.split(/^## \d+\. /m).slice(1);
if (sections.length < 10) {
  console.error(`サンプル節が10未満: ${sections.length}`);
  process.exit(1);
}

/** "**見立て（summary）**: 本文" 形式のフィールドを抜き出す（閉じ括弧の全半角ゆらぎ許容） */
function field(section, en) {
  const re = new RegExp(
    String.raw`\*\*[^*（(]*[（(]${en}[）)]\*\*[:：]\s*([\s\S]*?)(?=\n\n|\n\*\*|$)`
  );
  const m = section.match(re);
  return m ? m[1].trim() : null;
}

function links(section) {
  const m = section.match(/\*\*関連リンク\*\*[:：]\s*(.*)/);
  if (!m) return [];
  const out = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let l;
  while ((l = re.exec(m[1])) !== null) out.push({ label: l[1], url: l[2] });
  return out;
}

const items = [];
for (const sec of sections.slice(0, 10)) {
  const code = sec.match(/^([HML]{5})/)?.[1];
  if (!code) {
    console.error(`パターンコードが読めない節: ${sec.slice(0, 40)}...`);
    process.exit(1);
  }
  const item = {
    pattern_code: code,
    summary: field(sec, "summary"),
    background: field(sec, "background"),
    first_step: field(sec, "first_step"),
    sound_step: field(sec, "sound_step"),
    links: links(sec),
  };
  for (const k of ["summary", "background", "first_step", "sound_step"]) {
    if (!item[k]) {
      console.error(`${code}: ${k} が抽出できない`);
      process.exit(1);
    }
  }
  if (item.links.length === 0) {
    console.error(`${code}: links が抽出できない`);
    process.exit(1);
  }
  items.push(item);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(items, null, 2), "utf-8");

for (const it of items) {
  const len =
    it.summary.length + it.background.length + it.first_step.length + it.sound_step.length;
  console.log(`${it.pattern_code}: 計${len}字, links=${it.links.length}`);
}
console.log(`OK: ${items.length}件 → ${OUT}`);
