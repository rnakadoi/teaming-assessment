// F-05: MD出力テンプレート（仕様§4）
// 内容: 相談用プロンプト（冒頭）→実施日・総合スコア・帯解説→因子表→分析全文（5フィールド）
//       →層3コメント→回答一覧→共通フッターリンク
import { FOOTER_LINKS } from "./links";
import type { Factor, PatternAnalysis, Question } from "./masters";
import type { FiredComment } from "./rules";
import type { AnswerMap, FactorLevel } from "./scoring";
import { APP_TITLE, LEVEL_LABELS, SCALE_OPTIONS } from "./strings";
import { parseLinks } from "@/components/PatternAnalysis";

/** 相談用プロンプト（F-05冒頭。2026-07-09 フィードバックで画像生成の提案指示を追加） */
export const CONSULT_PROMPT = [
  "あなたは組織開発の専門家です。以下は私のチームの『言える化』アセスメント結果です。結果を踏まえて、(1) この結果から読み取れる私のチームの構造的な課題、(2) 明日から始められる最初の一歩、を私との対話を通じて一緒に考えてください。まず結果への見立てを聞かせてください。",
  "",
  "また、見立てを共有したあとに一度だけ、「この結果をメタファで表現した風刺イラスト風のイメージ画像を作成することもできますが、ご希望ですか？」と私に尋ねてください。私が希望した場合のみ、次の方針で画像を生成してください。",
  "・会議室の風景をそのまま描くのではなく、チームの状態を象徴するメタファ（例: 航海中の船の乗組員、オーケストラ、氷山、庭園、動物の群れ、機械仕掛けの工場など）を結果に合わせて一つ選ぶ",
  "・5つの因子（言える場の開放度／フィードバックの循環／当事者意識・自律／対話・会議の質／関係性の土壌）の高低を、そのメタファ内の視覚要素に対応させる",
  "・タッチは新聞の風刺画やエディトリアルイラスト調。ユーモアと示唆を含めつつ、特定の個人を揶揄する表現は避ける",
  "・生成後に、画像のどの要素がどの因子・状態を表しているかを2〜3行で説明する",
].join("\n");

export interface MarkdownInput {
  /** 実施日（YYYY-MM-DD） */
  date: string;
  total: number;
  bandDescription: string | null;
  patternCode: string;
  factorScores: Record<string, number>;
  factorLevels: Record<string, FactorLevel>;
  factors: Pick<Factor, "code" | "name">[];
  questions: Pick<Question, "no" | "text">[];
  rawAnswers: AnswerMap;
  analysis: PatternAnalysis | null;
  itemComments: FiredComment[];
}

const signed = (n: number, digits = 0) =>
  `${n > 0 ? "+" : ""}${digits > 0 ? n.toFixed(digits) : n}`;

const scaleLabel = (value: number) =>
  SCALE_OPTIONS.find((o) => o.value === value)?.label ?? String(value);

/** 結果一式からMD文書を組み立てる */
export function buildResultMarkdown(input: MarkdownInput): string {
  const lines: string[] = [];

  // 相談用プロンプト（冒頭）
  lines.push(CONSULT_PROMPT, "", "---", "");

  // ヘッダ＋総合スコア
  lines.push(`# ${APP_TITLE} 診断結果`, "");
  lines.push(`- 実施日: ${input.date}`);
  lines.push(`- 総合スコア: ${signed(input.total)}（−40〜+40）`);
  if (input.bandDescription) lines.push(`- スコア帯解説: ${input.bandDescription}`);
  lines.push("");

  // 因子表
  lines.push("## 因子別スコア", "");
  lines.push("| 因子 | スコア（−2〜+2） | 水準 |");
  lines.push("|---|---|---|");
  for (const f of input.factors) {
    const score = input.factorScores[f.code] ?? 0;
    const level = input.factorLevels[f.code];
    lines.push(`| ${f.name} | ${signed(score, 2)} | ${LEVEL_LABELS[level] ?? level} |`);
  }
  lines.push("");

  // パターン分析（5フィールド全文）
  lines.push(`## パターン分析（パターン: ${input.patternCode}）`, "");
  if (!input.analysis) {
    lines.push("（このパターンの分析文は準備中です）", "");
  } else {
    const a = input.analysis;
    if (a.summary) lines.push("### 見立て", "", a.summary, "");
    if (a.background) lines.push("### 構造分析", "", a.background, "");
    if (a.first_step) lines.push("### 最初の一歩", "", a.first_step, "");
    if (a.sound_step) lines.push("### SOUNDの観点", "", a.sound_step, "");
    const links = parseLinks(a.links);
    if (links.length > 0) {
      lines.push("### 関連リンク", "");
      for (const l of links) lines.push(`- [${l.label}](${l.url})`);
      lines.push("");
    }
  }

  // 層3コメント
  if (input.itemComments.length > 0) {
    lines.push("## 回答の組み合わせから見えること", "");
    for (const c of input.itemComments) lines.push(`- ${c.comment}`);
    lines.push("");
  }

  // 回答一覧
  lines.push("## 回答一覧", "");
  lines.push("| # | 設問 | 回答 |");
  lines.push("|---|---|---|");
  for (const q of [...input.questions].sort((a, b) => a.no - b.no)) {
    const raw = input.rawAnswers[q.no];
    lines.push(`| ${q.no} | ${q.text} | ${raw !== undefined ? scaleLabel(raw) : "—"} |`);
  }
  lines.push("");

  // 共通フッター
  lines.push("---", "");
  for (const l of FOOTER_LINKS) lines.push(`- [${l.label}](${l.url})`);
  lines.push("");

  return lines.join("\n");
}
