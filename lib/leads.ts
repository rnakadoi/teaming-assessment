import { supabase } from "./supabase";

/**
 * リード登録（F-09）。leads は anon INSERT のみのため .select() は付けない。
 * 登録なしでも全機能が使える任意導線であること（仕様§4 F-09）。
 */
export async function registerLead(
  email: string,
  consent: boolean,
  assessmentId?: string
): Promise<void> {
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error("メールアドレスの形式をご確認ください。");
  }
  if (!consent) {
    throw new Error("ご案内の送付に同意いただける場合のみ登録できます。");
  }
  const { error } = await supabase.from("leads").insert({
    email: trimmed,
    consent: true,
    assessment_id: assessmentId ?? null,
  });
  if (error) {
    throw new Error(`登録に失敗しました: ${error.message}`);
  }
}
