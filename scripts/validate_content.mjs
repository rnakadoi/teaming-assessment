// 243パターン分析文の機械検査（仕様書v2.0 §8-2）
// 使い方: node scripts/validate_content.mjs
// 入力: content/batches/*.json（[{pattern_code, summary, background, first_step, sound_step, links}]）
// 検査: 全コード網羅・重複なし・文字数レンジ・禁止語（断定表現）・
//        links URLホワイトリスト・必須リンク・隣接パターン類似度
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(__dirname, "..", "content", "batches");

// --- 全243コード（F1..F5 × H/M/L） ---
const LEVELS = ["H", "M", "L"];
const ALL_CODES = [];
for (const a of LEVELS)
  for (const b of LEVELS)
    for (const c of LEVELS)
      for (const d of LEVELS)
        for (const e of LEVELS) ALL_CODES.push(a + b + c + d + e);

// --- URLホワイトリスト（H1_リンク導線設計.md のカタログ＋承認済みサンプル使用分） ---
const URL_WHITELIST = new Set([
  // soundmethod.jp
  "https://www.soundmethod.jp/about-method",
  "https://www.soundmethod.jp/about-card",
  "https://www.soundmethod.jp/program",
  "https://www.soundmethod.jp/case01",
  "https://www.soundmethod.jp/case02",
  "https://www.soundmethod.jp/case03",
  "https://www.soundmethod.jp/case04",
  "https://www.soundmethod.jp/case05",
  "https://www.soundmethod.jp/faq",
  // authentic-a.com
  "https://www.authentic-a.com/sound-method",
  "https://www.authentic-a.com/theoryu02",
  "https://www.authentic-a.com/solution-organization-development04",
  "https://www.authentic-a.com/solution-organization-development03",
  "https://www.authentic-a.com/solution-organization-development02",
  "https://www.authentic-a.com/solution-leadership-development04",
  "https://www.authentic-a.com/solution-leadership-development03",
  "https://www.authentic-a.com/solution-leadership-development02",
  "https://www.authentic-a.com/case01",
  "https://www.authentic-a.com/case02",
  "https://www.authentic-a.com/case05",
  "https://www.authentic-a.com/seminar05",
  "https://www.authentic-a.com/seminar02",
  "https://www.authentic-a.com/seminar09",
  "https://www.authentic-a.com/solution-decision-making03",
  // note
  "https://note.com/nakadoi",
  "https://note.com/sound_card",
  // 承認済みサンプル6（LLHHM）で使用（カタログ外だがオーナー承認済み。要リンク疎通確認）
  "https://www.authentic-a.com/case08",
]);

const REQUIRED_LINK = "https://www.soundmethod.jp/about-method";

// --- 禁止語（断定・診断口調） ---
const BANNED = ["に違いありません", "に違いない", "断言でき", "絶対に", "明らかです", "明らかに問題"];

// --- 文字数レンジ ---
const FIELD_RANGES = {
  summary: [150, 380],
  background: [380, 750],
  first_step: [200, 480],
  sound_step: [90, 260],
};
const TOTAL_HARD = [800, 1700]; // エラー
const TOTAL_TARGET = [950, 1500]; // 警告

// --- バッチ読込 ---
let files = [];
try {
  files = readdirSync(BATCH_DIR).filter((f) => f.endsWith(".json")).sort();
} catch {
  console.error(`バッチディレクトリがない: ${BATCH_DIR}`);
  process.exit(1);
}

const items = new Map(); // code -> item
const errors = [];
const warns = [];

for (const f of files) {
  let arr;
  try {
    arr = JSON.parse(readFileSync(join(BATCH_DIR, f), "utf-8"));
  } catch (e) {
    errors.push(`${f}: JSONパース失敗 (${e.message})`);
    continue;
  }
  if (!Array.isArray(arr)) {
    errors.push(`${f}: 配列でない`);
    continue;
  }
  for (const it of arr) {
    const code = it?.pattern_code;
    if (!code || !/^[HML]{5}$/.test(code)) {
      errors.push(`${f}: 不正コード ${JSON.stringify(code)}`);
      continue;
    }
    if (items.has(code)) {
      errors.push(`${code}: 重複（${f}）`);
      continue;
    }
    items.set(code, { ...it, _file: f });
  }
}

// --- 網羅性 ---
const missing = ALL_CODES.filter((c) => !items.has(c));
if (missing.length > 0) {
  warns.push(`未生成 ${missing.length}件: ${missing.slice(0, 12).join(",")}${missing.length > 12 ? "…" : ""}`);
}

// --- 各件検査 ---
for (const [code, it] of items) {
  const fields = ["summary", "background", "first_step", "sound_step"];
  let total = 0;
  for (const k of fields) {
    const v = it[k];
    if (typeof v !== "string" || v.length === 0) {
      errors.push(`${code}: ${k} が空`);
      continue;
    }
    total += v.length;
    const [lo, hi] = FIELD_RANGES[k];
    if (v.length < lo || v.length > hi) {
      warns.push(`${code}: ${k} ${v.length}字（目安${lo}〜${hi}）`);
    }
  }
  if (total < TOTAL_HARD[0] || total > TOTAL_HARD[1]) {
    errors.push(`${code}: 合計${total}字（許容${TOTAL_HARD[0]}〜${TOTAL_HARD[1]}）`);
  } else if (total < TOTAL_TARGET[0] || total > TOTAL_TARGET[1]) {
    warns.push(`${code}: 合計${total}字（目標${TOTAL_TARGET[0]}〜${TOTAL_TARGET[1]}）`);
  }

  const text = fields.map((k) => it[k] ?? "").join("");
  for (const w of BANNED) {
    if (text.includes(w)) errors.push(`${code}: 禁止語「${w}」`);
  }
  // 見立てトーン・問いかけの存在（軽い検査）
  if (!/想定され/.test(text)) warns.push(`${code}: 「想定され」不使用（トーン確認）`);
  if (!/でしょうか/.test(text)) warns.push(`${code}: 問いかけ表現なし`);

  // links
  const links = it.links;
  if (!Array.isArray(links) || links.length === 0) {
    errors.push(`${code}: links なし`);
  } else {
    if (links.length > 3) errors.push(`${code}: links ${links.length}件（最大3）`);
    if (!links.some((l) => l?.url === REQUIRED_LINK)) {
      errors.push(`${code}: 必須リンク（SOUNDメソッド概要）なし`);
    }
    for (const l of links) {
      if (!l?.label || !l?.url) {
        errors.push(`${code}: link 形式不正 ${JSON.stringify(l)}`);
      } else if (!URL_WHITELIST.has(l.url)) {
        errors.push(`${code}: ホワイトリスト外URL ${l.url}`);
      }
    }
  }
}

// --- 隣接パターン類似度（1因子違いのペアの bigram Jaccard） ---
function bigrams(s) {
  const set = new Set();
  for (let i = 0; i < s.length - 1; i++) set.add(s.slice(i, i + 2));
  return set;
}
function jaccard(a, b) {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter || 1);
}
const SIM_THRESHOLD = 0.6;
const simPairs = [];
const codesArr = [...items.keys()];
const bigramCache = new Map();
const bodyOf = (code) => {
  if (!bigramCache.has(code)) {
    const it = items.get(code);
    bigramCache.set(code, bigrams(`${it.summary}${it.background}${it.first_step}`));
  }
  return bigramCache.get(code);
};
for (const code of codesArr) {
  for (let pos = 0; pos < 5; pos++) {
    for (const lv of LEVELS) {
      if (lv <= code[pos]) continue; // 各ペア1回だけ
      const other = code.slice(0, pos) + lv + code.slice(pos + 1);
      if (!items.has(other)) continue;
      const sim = jaccard(bodyOf(code), bodyOf(other));
      if (sim > SIM_THRESHOLD) simPairs.push(`${code}↔${other}: 類似度${sim.toFixed(2)}`);
    }
  }
}
for (const p of simPairs) warns.push(`隣接類似: ${p}`);

// --- 結果 ---
console.log(`読込: ${files.length}ファイル ${items.size}/243件`);
console.log(`エラー: ${errors.length}件 / 警告: ${warns.length}件`);
if (errors.length) {
  console.log("\n== エラー ==");
  for (const e of errors) console.log(`  ✗ ${e}`);
}
if (warns.length) {
  console.log("\n== 警告 ==");
  for (const w of warns) console.log(`  ⚠ ${w}`);
}
process.exit(errors.length > 0 ? 1 : 0);
