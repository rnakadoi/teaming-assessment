import { describe, it, expect } from "vitest";
import { evaluateItemRules, type ItemRuleLite, type RuleInput } from "./rules";

// H2_矛盾ペア定義.md の格納形式に準拠したフィクスチャ
const contradiction = (
  id: number,
  high_q: number,
  low_q: number,
  comment: string
): ItemRuleLite => ({
  id,
  rule_type: "contradiction",
  params: { high_q, low_q, threshold_high: 1, threshold_low: -1, priority_key: "score_gap" },
  comment_template: comment,
});

const RULES: ItemRuleLite[] = [
  contradiction(1, 2, 8, "P01コメント"),
  contradiction(2, 14, 20, "P02コメント"),
  contradiction(3, 5, 12, "P03コメント"),
  { id: 13, rule_type: "style", params: { kind: "uniform" }, comment_template: "S01コメント" },
  {
    id: 14,
    rule_type: "style",
    params: { kind: "neutral_heavy", min_count: 16 },
    comment_template: "S02コメント",
  },
  {
    id: 15,
    rule_type: "top",
    params: {},
    comment_template:
      "最も高かったのは「{質問文}」、最も低かったのは「{質問文}」でした。強みを起点に、最も低い項目に手を入れるのが定石です。",
  },
];

const QUESTION_TEXTS: Record<number, string> = {};
for (let i = 1; i <= 20; i++) QUESTION_TEXTS[i] = `設問${i}の文`;

/** adjusted / raw を部分上書きで作る（デフォルト: 全問 adjusted=0 / raw=3） */
function input(over: {
  adjusted?: Record<number, number>;
  raw?: Record<number, number>;
}): RuleInput {
  const adjusted: Record<number, number> = {};
  const raw: Record<number, number> = {};
  for (let i = 1; i <= 20; i++) {
    adjusted[i] = 0;
    raw[i] = 3;
  }
  return {
    adjusted: { ...adjusted, ...(over.adjusted ?? {}) },
    rawAnswers: { ...raw, ...(over.raw ?? {}) },
    questionTexts: QUESTION_TEXTS,
  };
}

describe("矛盾ペア（contradiction）", () => {
  it("高≥+1 かつ 低≤−1 で発火する（境界値ちょうど）", () => {
    const r = evaluateItemRules(RULES, input({ adjusted: { 2: 1, 8: -1 } }));
    expect(r.map((c) => c.comment)).toContain("P01コメント");
  });

  it("高=0 では発火しない", () => {
    const r = evaluateItemRules(RULES, input({ adjusted: { 2: 0, 8: -2 } }));
    expect(r.map((c) => c.comment)).not.toContain("P01コメント");
  });

  it("低=0 では発火しない", () => {
    const r = evaluateItemRules(RULES, input({ adjusted: { 2: 2, 8: 0 } }));
    expect(r.map((c) => c.comment)).not.toContain("P01コメント");
  });

  it("スコア差上位2件のみ表示（3ペア発火時）", () => {
    const r = evaluateItemRules(
      RULES,
      input({
        adjusted: {
          2: 1, 8: -1,   // P01: gap 2
          14: 2, 20: -2, // P02: gap 4
          5: 2, 12: -1,  // P03: gap 3
        },
      })
    );
    const contradictions = r.filter((c) => c.ruleType === "contradiction");
    expect(contradictions).toHaveLength(2);
    expect(contradictions[0].comment).toBe("P02コメント"); // gap最大が先頭
    expect(contradictions[1].comment).toBe("P03コメント");
  });
});

describe("回答スタイル検知（style）", () => {
  it("S01: 20問すべて同一回答で発火（例: 全問4）", () => {
    const raw: Record<number, number> = {};
    for (let i = 1; i <= 20; i++) raw[i] = 4;
    const r = evaluateItemRules(RULES, input({ raw }));
    expect(r.map((c) => c.comment)).toContain("S01コメント");
  });

  it("S02: 「どちらでもない」16問で発火", () => {
    // デフォルトは全問3（=20問中立）なので、4問だけ非中立にして16問中立にする
    const r = evaluateItemRules(RULES, input({ raw: { 1: 4, 2: 5, 3: 1, 4: 2 } }));
    expect(r.map((c) => c.comment)).toContain("S02コメント");
  });

  it("S02: 中立15問では発火しない", () => {
    const r = evaluateItemRules(RULES, input({ raw: { 1: 4, 2: 5, 3: 1, 4: 2, 5: 4 } }));
    expect(r.map((c) => c.comment)).not.toContain("S02コメント");
  });

  it("全問同一(全問3)のときは S01 のみ発火し S02 は抑制", () => {
    const r = evaluateItemRules(RULES, input({}));
    const comments = r.map((c) => c.comment);
    expect(comments).toContain("S01コメント");
    expect(comments).not.toContain("S02コメント");
  });
});

describe("top/bottom（最高・最低項目コメント）", () => {
  it("最高・最低の質問文がテンプレートに順に埋め込まれる", () => {
    const r = evaluateItemRules(RULES, input({ adjusted: { 7: 2, 13: -2 }, raw: { 7: 1, 13: 1 } }));
    const tb = r.find((c) => c.ruleType === "top");
    expect(tb).toBeDefined();
    expect(tb!.comment).toBe(
      "最も高かったのは「設問7の文」、最も低かったのは「設問13の文」でした。強みを起点に、最も低い項目に手を入れるのが定石です。"
    );
  });

  it("全問同点（差がない）ときは表示しない", () => {
    const r = evaluateItemRules(RULES, input({}));
    expect(r.find((c) => c.ruleType === "top")).toBeUndefined();
  });

  it("同点のときは設問番号の小さい方を採用する", () => {
    const r = evaluateItemRules(
      RULES,
      input({ adjusted: { 4: 2, 9: 2, 11: -2, 15: -2 }, raw: { 4: 1, 9: 5, 11: 5, 15: 5 } })
    );
    const tb = r.find((c) => c.ruleType === "top");
    expect(tb!.comment).toContain("「設問4の文」");
    expect(tb!.comment).toContain("「設問11の文」");
  });
});

describe("表示順・その他", () => {
  it("矛盾ペア→スタイル→top/bottom の順で返す", () => {
    const r = evaluateItemRules(
      RULES,
      input({
        adjusted: { 2: 2, 8: -2 },
        raw: { 2: 5, 8: 5 }, // 18問が3 → S02発火（16問以上）
      })
    );
    const types = r.map((c) => c.ruleType);
    expect(types).toEqual(["contradiction", "style", "top"]);
  });

  it("未知の rule_type は無視する", () => {
    const rules: ItemRuleLite[] = [
      { id: 99, rule_type: "unknown_type", params: {}, comment_template: "X" },
    ];
    expect(evaluateItemRules(rules, input({}))).toEqual([]);
  });
});
