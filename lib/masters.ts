import { supabase } from "./supabase";
import type { Tables } from "./database.types";

export type Question = Tables<"questions">;
export type Factor = Tables<"factors">;
export type ScoreBand = Tables<"score_bands">;
export type PatternAnalysis = Tables<"pattern_analyses">;
export type ItemRule = Tables<"item_rules">;

export type PatternLink = { label: string; url: string };

export interface Masters {
  questions: Question[];
  factors: Factor[];
  scoreBands: ScoreBand[];
}

/** マスタ3表（questions / factors / score_bands）を一括取得する */
export async function fetchMasters(): Promise<Masters> {
  const [q, f, b] = await Promise.all([
    supabase.from("questions").select("*").order("no"),
    supabase.from("factors").select("*").order("sort_order"),
    supabase.from("score_bands").select("*").order("min_score", { ascending: false }),
  ]);
  if (q.error) throw new Error(`questions取得失敗: ${q.error.message}`);
  if (f.error) throw new Error(`factors取得失敗: ${f.error.message}`);
  if (b.error) throw new Error(`score_bands取得失敗: ${b.error.message}`);
  return { questions: q.data, factors: f.data, scoreBands: b.data };
}

/** 総合スコアに対応するスコア帯解説を返す */
export function findScoreBand(bands: ScoreBand[], total: number): ScoreBand | undefined {
  return bands.find((b) => total >= b.min_score && total <= b.max_score);
}

/** パターンコード（例 'HMLLM'）の分析文を取得する。未投入なら null */
export async function fetchPatternAnalysis(code: string): Promise<PatternAnalysis | null> {
  const { data, error } = await supabase
    .from("pattern_analyses")
    .select("*")
    .eq("pattern_code", code)
    .maybeSingle();
  if (error) throw new Error(`pattern_analyses取得失敗: ${error.message}`);
  return data;
}

/** item_rules（層3ルール）を全件取得する */
export async function fetchItemRules(): Promise<ItemRule[]> {
  const { data, error } = await supabase.from("item_rules").select("*").order("id");
  if (error) throw new Error(`item_rules取得失敗: ${error.message}`);
  return data;
}
