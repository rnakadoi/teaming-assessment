import { supabase } from "./supabase";
import type { Json } from "./database.types";
import type { AnswerMap, FactorLevel } from "./scoring";

// RPC submit_assessment の返却ペイロード（supabase/migrations/20260703_add_submit_assessment_rpc.sql）
export interface SubmitResult {
  assessment_id: string;
  total: number;
  factor_scores: Record<string, number>;
  factor_sums: Record<string, number>;
  factor_levels: Record<string, FactorLevel>;
  pattern_code: string;
  adjusted: Record<string, number>;
  band: { min_score: number; max_score: number; description: string } | null;
  wave_id: string | null;
}

const ERROR_MESSAGES: Record<string, string> = {
  invalid_answers: "回答データが不正です。最初からやり直してください。",
  invalid_answer_value: "回答値が不正です。最初からやり直してください。",
  missing_answer: "未回答の設問があります。",
  invalid_role: "役割タグが不正です。",
  team_not_found: "チームコードが見つかりません。",
  wave_closed: "この実施回は回答の受付を終了しています。チーム作成者にご確認ください。",
  invalid_master: "設問マスタに問題があります。管理者にお問い合わせください。",
};

/**
 * 回答を送信し、サーバー計算の結果一式を受け取る。
 * 個人利用は waveCode/role を省略。チーム参加は waveCode（チームコード）を渡す。
 */
export async function submitAssessment(
  answers: AnswerMap,
  waveCode?: string,
  role?: "leader" | "member"
): Promise<SubmitResult> {
  const { data, error } = await supabase.rpc("submit_assessment", {
    p_answers: answers as unknown as Json,
    ...(waveCode ? { p_wave_code: waveCode } : {}),
    ...(role ? { p_role: role } : {}),
  });
  if (error) {
    throw new Error(`送信に失敗しました: ${error.message}`);
  }
  const res = data as unknown;
  if (res && typeof res === "object" && "error" in (res as Record<string, unknown>)) {
    const code = String((res as Record<string, unknown>).error);
    throw new Error(ERROR_MESSAGES[code] ?? `送信に失敗しました: ${code}`);
  }
  return res as SubmitResult;
}
