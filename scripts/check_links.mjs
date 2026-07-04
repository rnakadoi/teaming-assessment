// 外部リンク疎通チェック（タスク3-5 公開前チェック）
// H1_リンク導線設計.md のカタログ＋共通フッターの全URLに GET を投げ、
// ステータスを一覧表示する。リダイレクトは追従（Wixサイトは301/302が普通のため）。
// 使い方: node scripts/check_links.mjs

const URLS = [
  // soundmethod.jp
  "https://www.soundmethod.jp/",
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
  "https://www.authentic-a.com/",
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
  "https://www.authentic-a.com/case08", // 承認済みサンプル6で使用（カタログ外）
  "https://www.authentic-a.com/seminar05",
  "https://www.authentic-a.com/seminar02",
  "https://www.authentic-a.com/seminar09",
  "https://www.authentic-a.com/solution-decision-making03",
  // note
  "https://note.com/nakadoi",
  "https://note.com/sound_card",
];

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) link-checker/1.0 (teaming-assessment pre-release)";

let ng = 0;
for (const url of URLS) {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(15000),
    });
    const ok = res.status >= 200 && res.status < 400;
    if (!ok) ng++;
    console.log(`${ok ? "✓" : "✗"} ${res.status} ${url}`);
  } catch (e) {
    ng++;
    console.log(`✗ ERR ${url} (${e.message})`);
  }
}

console.log(ng === 0 ? `\n全${URLS.length}件 疎通OK` : `\n${ng}/${URLS.length}件 NG`);
process.exit(ng === 0 ? 0 : 1);
