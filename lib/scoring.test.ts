import { describe, it, expect } from "vitest";
import {
  computeScores,
  FACTOR_LEVEL_THRESHOLDS,
  type QuestionLite,
  type AnswerMap,
} from "./scoring";

// seed_masters.sql と同一のマスタ（no / polarity / factor_id）
// F1(id=1): ①⑧⑫⑰ / F2(id=2): ⑤⑭⑳ / F3(id=3): ③⑥⑦⑪⑮ / F4(id=4): ④⑨⑩⑯⑲ / F5(id=5): ②⑬⑱
const QUESTIONS: QuestionLite[] = [
  { no: 1, polarity: -1, factor_id: 1 },
  { no: 2, polarity: 1, factor_id: 5 },
  { no: 3, polarity: -1, factor_id: 3 },
  { no: 4, polarity: -1, factor_id: 4 },
  { no: 5, polarity: 1, factor_id: 2 },
  { no: 6, polarity: -1, factor_id: 3 },
  { no: 7, polarity: -1, factor_id: 3 },
  { no: 8, polarity: 1, factor_id: 1 },
  { no: 9, polarity: 1, factor_id: 4 },
  { no: 10, polarity: 1, factor_id: 4 },
  { no: 11, polarity: -1, factor_id: 3 },
  { no: 12, polarity: -1, factor_id: 1 },
  { no: 13, polarity: 1, factor_id: 5 },
  { no: 14, polarity: 1, factor_id: 2 },
  { no: 15, polarity: -1, factor_id: 3 },
  { no: 16, polarity: -1, factor_id: 4 },
  { no: 17, polarity: 1, factor_id: 1 },
  { no: 18, polarity: -1, factor_id: 5 },
  { no: 19, polarity: 1, factor_id: 4 },
  { no: 20, polarity: 1, factor_id: 2 },
];

const FACTOR_QUESTIONS: Record<string, number[]> = {
  F1: [1, 8, 12, 17],
  F2: [5, 14, 20],
  F3: [3, 6, 7, 11, 15],
  F4: [4, 9, 10, 16, 19],
  F5: [2, 13, 18],
};

/** 全問「どちらでもない」(3) をベースに部分上書きした回答を作る */
function answers(overrides: Record<number, number> = {}): AnswerMap {
  const a: AnswerMap = {};
  for (const q of QUESTIONS) a[q.no] = 3;
  return { ...a, ...overrides };
}

/** 補正後素点が adjusted になる生回答値: polarity=+1 → 3+adjusted、polarity=−1 → 3−adjusted */
function rawFor(no: number, adjusted: number): number {
  const q = QUESTIONS.find((x) => x.no === no)!;
  return 3 + adjusted * q.polarity;
}

/** 因子内の補正後素点合計が sum になるような回答上書きを作る（sum は −2n〜+2n） */
function factorOverrides(factorCode: string, sum: number): Record<number, number> {
  const nos = FACTOR_QUESTIONS[factorCode];
  const o: Record<number, number> = {};
  let rest = sum;
  for (const no of nos) {
    const v = Math.max(-2, Math.min(2, rest));
    o[no] = rawFor(no, v);
    rest -= v;
  }
  if (rest !== 0) throw new Error(`sum ${sum} not representable for ${factorCode}`);
  return o;
}

describe("computeScores: 全問一律の極値・中立", () => {
  it("全問+2（ポジ設問=5・ネガ設問=1）→ 総合+40・全因子H・HHHHH", () => {
    const a = answers();
    for (const q of QUESTIONS) a[q.no] = q.polarity === 1 ? 5 : 1;
    const r = computeScores(QUESTIONS, a);
    expect(r.total).toBe(40);
    expect(r.patternCode).toBe("HHHHH");
    expect(Object.values(r.factorScores)).toEqual([2, 2, 2, 2, 2]);
  });

  it("全問−2（ポジ設問=1・ネガ設問=5）→ 総合−40・全因子L・LLLLL", () => {
    const a = answers();
    for (const q of QUESTIONS) a[q.no] = q.polarity === 1 ? 1 : 5;
    const r = computeScores(QUESTIONS, a);
    expect(r.total).toBe(-40);
    expect(r.patternCode).toBe("LLLLL");
    expect(Object.values(r.factorScores)).toEqual([-2, -2, -2, -2, -2]);
  });

  it("全問0（すべて3）→ 総合0・全因子M・MMMMM", () => {
    const r = computeScores(QUESTIONS, answers());
    expect(r.total).toBe(0);
    expect(r.patternCode).toBe("MMMMM");
    expect(Object.values(r.factorScores)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("computeScores: 極性反転の検証", () => {
  it("ネガ設問①に「そう思う」(5) → 補正後素点は−2", () => {
    const r = computeScores(QUESTIONS, answers({ 1: 5 }));
    expect(r.adjusted[1]).toBe(-2);
    expect(r.total).toBe(-2);
  });

  it("ポジ設問⑤に「そう思う」(5) → 補正後素点は+2", () => {
    const r = computeScores(QUESTIONS, answers({ 5: 5 }));
    expect(r.adjusted[5]).toBe(2);
    expect(r.total).toBe(2);
  });
});

// 因子水準の整数閾値（仕様§3.2）: F1(4問) H≥+3/L≤−3、F2・F5(3問) H≥+2/L≤−2、F3・F4(5問) H≥+4/L≤−4
describe.each([
  ["F1", 0, 3],
  ["F2", 1, 2],
  ["F3", 2, 4],
  ["F4", 3, 4],
  ["F5", 4, 2],
] as const)("因子水準の境界値: %s", (code, pos, threshold) => {
  it(`合計+${threshold} → H`, () => {
    const r = computeScores(QUESTIONS, answers(factorOverrides(code, threshold)));
    expect(r.factorLevels[code]).toBe("H");
    expect(r.patternCode[pos]).toBe("H");
  });
  it(`合計+${threshold - 1} → M`, () => {
    const r = computeScores(QUESTIONS, answers(factorOverrides(code, threshold - 1)));
    expect(r.factorLevels[code]).toBe("M");
    expect(r.patternCode[pos]).toBe("M");
  });
  it(`合計−${threshold} → L`, () => {
    const r = computeScores(QUESTIONS, answers(factorOverrides(code, -threshold)));
    expect(r.factorLevels[code]).toBe("L");
    expect(r.patternCode[pos]).toBe("L");
  });
  it(`合計−${threshold - 1} → M`, () => {
    const r = computeScores(QUESTIONS, answers(factorOverrides(code, -(threshold - 1))));
    expect(r.factorLevels[code]).toBe("M");
    expect(r.patternCode[pos]).toBe("M");
  });
});

describe("computeScores: 因子スコア（平均）", () => {
  it("F2で補正後 +2,+1,0 → 平均1.0（3項目）", () => {
    const a = answers({ 5: rawFor(5, 2), 14: rawFor(14, 1), 20: rawFor(20, 0) });
    const r = computeScores(QUESTIONS, a);
    expect(r.factorScores.F2).toBeCloseTo(1.0);
    expect(r.factorSums.F2).toBe(3);
  });

  it("F1で補正後 +1,0,0,0 → 平均0.25（4項目）", () => {
    const a = answers({ 8: rawFor(8, 1) });
    const r = computeScores(QUESTIONS, a);
    expect(r.factorScores.F1).toBeCloseTo(0.25);
  });
});

describe("computeScores: パターンコードの並び順", () => {
  it("F1〜F5の順に水準文字を並べる（例: F1のみH → HMMMM）", () => {
    const r = computeScores(QUESTIONS, answers(factorOverrides("F1", 3)));
    expect(r.patternCode).toBe("HMMMM");
  });
});

describe("computeScores: 入力検証", () => {
  it("回答が20問に満たない場合はエラー", () => {
    const a = answers();
    delete a[7];
    expect(() => computeScores(QUESTIONS, a)).toThrow();
  });

  it("回答値が1〜5の範囲外ならエラー", () => {
    expect(() => computeScores(QUESTIONS, answers({ 1: 6 }))).toThrow();
    expect(() => computeScores(QUESTIONS, answers({ 1: 0 }))).toThrow();
  });
});

describe("FACTOR_LEVEL_THRESHOLDS", () => {
  it("項目数→閾値の対応が仕様通り（3問:2, 4問:3, 5問:4）", () => {
    expect(FACTOR_LEVEL_THRESHOLDS[3]).toBe(2);
    expect(FACTOR_LEVEL_THRESHOLDS[4]).toBe(3);
    expect(FACTOR_LEVEL_THRESHOLDS[5]).toBe(4);
  });
});
