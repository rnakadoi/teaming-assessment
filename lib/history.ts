// 個人の実施履歴（F-08: localStorage に保存し前回比を表示する）
// キー: yieruka.history.v1 / 値: HistoryEntry[]（古い順）

export interface HistoryEntry {
  taken_at: string; // YYYY-MM-DD
  total: number;
  factor_scores: Record<string, number>;
  pattern_code: string;
}

const KEY = "yieruka.history.v1";
const MAX_ENTRIES = 20;

export function loadHistory(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (e) => e && typeof e.total === "number" && typeof e.taken_at === "string"
    );
  } catch {
    return [];
  }
}

/** 履歴に1件追記する（最大件数を超えたら古いものから削除） */
export function appendHistory(entry: HistoryEntry): void {
  try {
    const next = [...loadHistory(), entry].slice(-MAX_ENTRIES);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // localStorage 不可（プライベートモード等）でも機能全体は継続
  }
}
