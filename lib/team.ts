import { supabase } from "./supabase";

// 紛らわしい文字（I/L/O/0/1）を除いた6文字コード用文字集合
const CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const TEAM_CODE_LENGTH = 6;

/** 6文字のチームコードを生成する（I/L/O/0/1 除外） */
export function generateTeamCode(): string {
  const buf = new Uint32Array(TEAM_CODE_LENGTH);
  crypto.getRandomValues(buf);
  let code = "";
  for (let i = 0; i < TEAM_CODE_LENGTH; i++) {
    code += CODE_CHARS[buf[i] % CODE_CHARS.length];
  }
  return code;
}

export interface CreatedTeam {
  teamId: string;
  code: string;
  waveId: string;
}

/** チーム＋初回wave（wave_no=1）を作成する。コード衝突時は再生成して最大3回試行 */
export async function createTeam(name?: string): Promise<CreatedTeam> {
  let lastError: string = "";
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateTeamCode();
    const teamRes = await supabase
      .from("teams")
      .insert({ code, name: name?.trim() || null })
      .select("id, code")
      .single();
    if (teamRes.error) {
      lastError = teamRes.error.message;
      if (teamRes.error.code === "23505") continue; // unique violation → 再生成
      throw new Error(`チーム作成に失敗しました: ${teamRes.error.message}`);
    }
    const waveRes = await supabase
      .from("waves")
      .insert({ team_id: teamRes.data.id, wave_no: 1 })
      .select("id")
      .single();
    if (waveRes.error) {
      throw new Error(`初回waveの作成に失敗しました: ${waveRes.error.message}`);
    }
    return { teamId: teamRes.data.id, code: teamRes.data.code, waveId: waveRes.data.id };
  }
  throw new Error(`チームコードの発行に失敗しました: ${lastError}`);
}

export interface TeamInfo {
  id: string;
  code: string;
  name: string | null;
}

/** コードからチームを取得する（大文字化して照合）。見つからなければ null */
export async function fetchTeamByCode(code: string): Promise<TeamInfo | null> {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) return null;
  const { data, error } = await supabase
    .from("teams")
    .select("id, code, name")
    .eq("code", normalized)
    .maybeSingle();
  if (error) throw new Error(`チーム照会に失敗しました: ${error.message}`);
  return data;
}

// get_team_stats の返却（migration_init_schema.sql 準拠）
export interface TeamStats {
  team_code: string;
  team_name: string | null;
  n: number;
  avg_total: number | null;
  factor_avg: Record<string, number> | null;
  /** n>=3 のときのみ。質問番号 → {avg, stddev} */
  item_stats: Record<string, { avg: number; stddev: number }> | null;
  /** n>=3 のときのみ。役割 → 総合平均 */
  by_role: Record<string, number> | null;
  min_n_for_detail: number;
}

/** チーム集計を取得する（security definer RPC 経由・生回答は返らない） */
export async function fetchTeamStats(code: string): Promise<TeamStats> {
  const { data, error } = await supabase.rpc("get_team_stats", {
    p_code: code.trim().toUpperCase(),
  });
  if (error) throw new Error(`チーム集計の取得に失敗しました: ${error.message}`);
  const res = data as unknown;
  if (res && typeof res === "object" && "error" in (res as Record<string, unknown>)) {
    throw new Error("チームが見つかりません。コードをご確認ください。");
  }
  return res as TeamStats;
}

// get_benchmark の返却
export interface Benchmark {
  available: boolean;
  n: number;
  min_n?: number;
  percentile_below?: number;
  top_percent?: number;
}

/** ベンチマーク（全回答中の相対位置）。母数100未満は available=false */
export async function fetchBenchmark(total: number): Promise<Benchmark> {
  const { data, error } = await supabase.rpc("get_benchmark", { p_total: total });
  if (error) throw new Error(`ベンチマーク取得に失敗しました: ${error.message}`);
  return data as unknown as Benchmark;
}
