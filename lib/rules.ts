// item_rules 評価（層3・仕様書v2.0 §3.3 / H2_矛盾ペア定義.md）
// - contradiction: 項目Aの補正後素点 ≥ threshold_high(+1) かつ 項目B ≤ threshold_low(−1) で発火。
//   発火ペアのうちスコア差が大きい順に最大2件表示
// - style: uniform（20問すべて同一回答）/ neutral_heavy（「どちらでもない」が min_count 問以上）。
//   uniform 発火時は neutral_heavy を抑制（全問同一の中立回答は uniform として扱う）
// - top: 最高点・最低点項目コメント。テンプレートの {質問文} を最高→最低の順に置換。全問同点なら非表示

export interface ItemRuleLite {
  id: number;
  rule_type: string;
  params: unknown; // jsonb
  comment_template: string;
}

export interface RuleInput {
  /** 質問番号 → 補正後素点（−2〜+2） */
  adjusted: Record<number, number>;
  /** 質問番号 → 生回答（1..5） */
  rawAnswers: Record<number, number>;
  /** 質問番号 → 質問文（top/bottom 用） */
  questionTexts: Record<number, string>;
}

export interface FiredComment {
  ruleType: string;
  comment: string;
}

const NEUTRAL_RAW = 3;
const MAX_CONTRADICTIONS = 2;

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function numParam(params: Record<string, unknown>, key: string, fallback: number): number {
  const v = params[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** item_rules を評価し、表示するコメントを 矛盾ペア→スタイル→top/bottom の順で返す */
export function evaluateItemRules(rules: ItemRuleLite[], input: RuleInput): FiredComment[] {
  const out: FiredComment[] = [];
  const nos = Object.keys(input.rawAnswers).map(Number);

  // --- contradiction: 発火判定 → スコア差降順（同差は id 昇順）→ 上位2件 ---
  const fired: { rule: ItemRuleLite; gap: number }[] = [];
  for (const rule of rules) {
    if (rule.rule_type !== "contradiction") continue;
    const p = asRecord(rule.params);
    const highQ = numParam(p, "high_q", NaN);
    const lowQ = numParam(p, "low_q", NaN);
    if (!Number.isFinite(highQ) || !Number.isFinite(lowQ)) continue;
    const thHigh = numParam(p, "threshold_high", 1);
    const thLow = numParam(p, "threshold_low", -1);
    const high = input.adjusted[highQ];
    const low = input.adjusted[lowQ];
    if (high === undefined || low === undefined) continue;
    if (high >= thHigh && low <= thLow) {
      fired.push({ rule, gap: high - low });
    }
  }
  fired.sort((a, b) => b.gap - a.gap || a.rule.id - b.rule.id);
  for (const f of fired.slice(0, MAX_CONTRADICTIONS)) {
    out.push({ ruleType: "contradiction", comment: f.rule.comment_template });
  }

  // --- style: uniform → neutral_heavy（uniform 発火時は抑制） ---
  const rawValues = nos.map((no) => input.rawAnswers[no]);
  const isUniform = rawValues.length > 0 && rawValues.every((v) => v === rawValues[0]);
  const neutralCount = rawValues.filter((v) => v === NEUTRAL_RAW).length;

  for (const rule of rules) {
    if (rule.rule_type !== "style") continue;
    const p = asRecord(rule.params);
    const kind = typeof p.kind === "string" ? p.kind : "";
    if (kind === "uniform" && isUniform) {
      out.push({ ruleType: "style", comment: rule.comment_template });
    } else if (kind === "neutral_heavy" && !isUniform) {
      const minCount = numParam(p, "min_count", 16);
      if (neutralCount >= minCount) {
        out.push({ ruleType: "style", comment: rule.comment_template });
      }
    }
  }

  // --- top/bottom: 最高・最低項目（同点は設問番号の小さい方。全問同点なら非表示） ---
  const topRule = rules.find((r) => r.rule_type === "top");
  if (topRule && nos.length > 0) {
    const sorted = [...nos].sort((a, b) => a - b);
    let topNo = sorted[0];
    let bottomNo = sorted[0];
    for (const no of sorted) {
      const adj = input.adjusted[no];
      if (adj === undefined) continue;
      if (adj > (input.adjusted[topNo] ?? -Infinity)) topNo = no;
      if (adj < (input.adjusted[bottomNo] ?? Infinity)) bottomNo = no;
    }
    if (input.adjusted[topNo] !== input.adjusted[bottomNo]) {
      let comment = topRule.comment_template;
      comment = comment.replace("{質問文}", input.questionTexts[topNo] ?? `設問${topNo}`);
      comment = comment.replace("{質問文}", input.questionTexts[bottomNo] ?? `設問${bottomNo}`);
      out.push({ ruleType: "top", comment });
    }
  }

  return out;
}
