// スコア計算ライブラリ（仕様書v2.0 §3.2）
// 1. 素点 = 回答(1..5) − 3 → −2..+2
// 2. 補正後素点 = 素点 × polarity
// 3. 総合スコア = 補正後素点の合計（−40〜+40）
// 4. 因子スコア = 因子内補正後素点の平均（−2.0〜+2.0、表示・DB保存用）
// 5. 因子水準 = 因子内補正後素点の合計を整数閾値で判定（H/M/L）
// 6. パターンコード = F1〜F5の水準を並べた5文字

export type FactorLevel = "H" | "M" | "L";

/** 質問マスタのうちスコア計算に必要な最小フィールド */
export interface QuestionLite {
  no: number;
  polarity: number; // +1 | -1
  factor_id: number; // 1..5 (= F1..F5)
}

/** 質問番号 → 生回答(1..5) */
export type AnswerMap = Record<number, number>;

export interface ScoringResult {
  /** 総合スコア（−40〜+40） */
  total: number;
  /** 因子コード → 平均（−2.0〜+2.0） */
  factorScores: Record<string, number>;
  /** 因子コード → 補正後素点の整数合計 */
  factorSums: Record<string, number>;
  /** 因子コード → 水準（H/M/L） */
  factorLevels: Record<string, FactorLevel>;
  /** F1〜F5の水準を並べた5文字（例 'HMLLM'） */
  patternCode: string;
  /** 質問番号 → 補正後素点（−2〜+2） */
  adjusted: Record<number, number>;
}

/**
 * 因子の項目数 → H/L判定の整数閾値（仕様§3.2の表と等価）
 * F1(4項目): H≥+3/L≤−3、F2・F5(3項目): H≥+2/L≤−2、F3・F4(5項目): H≥+4/L≤−4
 */
export const FACTOR_LEVEL_THRESHOLDS: Record<number, number> = {
  3: 2,
  4: 3,
  5: 4,
};

const FACTOR_CODES = ["F1", "F2", "F3", "F4", "F5"] as const;

/** 因子内合計と項目数から水準を判定する */
export function judgeFactorLevel(sum: number, itemCount: number): FactorLevel {
  const threshold = FACTOR_LEVEL_THRESHOLDS[itemCount];
  if (threshold === undefined) {
    throw new Error(`未定義の項目数です: ${itemCount}`);
  }
  if (sum >= threshold) return "H";
  if (sum <= -threshold) return "L";
  return "M";
}

/** 20問の回答からスコア一式を計算する */
export function computeScores(questions: QuestionLite[], answers: AnswerMap): ScoringResult {
  if (questions.length !== 20) {
    throw new Error(`質問マスタは20問必要です（受領: ${questions.length}）`);
  }

  const adjusted: Record<number, number> = {};
  let total = 0;
  const sums: Record<string, number> = { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 };
  const counts: Record<string, number> = { F1: 0, F2: 0, F3: 0, F4: 0, F5: 0 };

  for (const q of questions) {
    const raw = answers[q.no];
    if (raw === undefined) {
      throw new Error(`設問${q.no}が未回答です`);
    }
    if (!Number.isInteger(raw) || raw < 1 || raw > 5) {
      throw new Error(`設問${q.no}の回答値が不正です: ${raw}（1〜5の整数）`);
    }
    const adj = (raw - 3) * q.polarity;
    adjusted[q.no] = adj;
    total += adj;
    const code = `F${q.factor_id}`;
    sums[code] += adj;
    counts[code] += 1;
  }

  const factorScores: Record<string, number> = {};
  const factorLevels: Record<string, FactorLevel> = {};
  for (const code of FACTOR_CODES) {
    if (counts[code] === 0) {
      throw new Error(`因子${code}に設問が割り当てられていません`);
    }
    factorScores[code] = sums[code] / counts[code];
    factorLevels[code] = judgeFactorLevel(sums[code], counts[code]);
  }

  const patternCode = FACTOR_CODES.map((c) => factorLevels[c]).join("");

  return { total, factorScores, factorSums: sums, factorLevels, patternCode, adjusted };
}
