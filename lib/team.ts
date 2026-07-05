import { supabase } from "./supabase";

// 3コード体系（2026-07-05 仕様変更）:
//   参加コード(6文字)=回答用 / 閲覧コード(8文字)=集計閲覧用 / リセットコード(10文字)=閲覧コード再発行用
// teams への直接 SELECT/INSERT は RLS で封鎖済み。すべて security definer RPC 経由。

export interface CreatedTeam {
  teamId: string;
  waveId: string;
  code: string;
  viewCode: string;
  resetCode: string;
}

/** チーム＋初回waveを作成し、3コードを受け取る（コード生成はサーバー側） */
export async function createTeam(name?: string): Promise<CreatedTeam> {
  const { data, error } = await supabase.rpc("create_team", {
    p_name: name?.trim() || undefined,
  });
  if (error) throw new Error(`チーム作成に失敗しました: ${error.message}`);
  const res = data as unknown as {
    error?: string;
    team_id: string;
    wave_id: string;
    code: string;
    view_code: string;
    reset_code: string;
  };
  if (res?.error) throw new Error(`チーム作成に失敗しました: ${res.error}`);
  return {
    teamId: res.team_id,
    waveId: res.wave_id,
    code: res.code,
    viewCode: res.view_code,
    resetCode: res.reset_code,
  };
}

export interface TeamInfo {
  id: string;
  code: string;
  name: string | null;
}

/** コードからチーム基本情報（id/code/name）を取得。見つからなければ null */
export async function fetchTeamByCode(code: string): Promise<TeamInfo | null> {
  const normalized = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(normalized)) return null;
  const { data, error } = await supabase.rpc("get_team_by_code", { p_code: normalized });
  if (error) throw new Error(`チーム照会に失敗しました: ${error.message}`);
  const res = data as unknown as { error?: string; id: string; code: string; name: string | null };
  if (res?.error) return null;
  return { id: res.id, code: res.code, name: res.name };
}

/** 閲覧コードをリセットコードで再発行する。成功時は新しい閲覧コードを返す */
export async function resetViewCode(code: string, resetCode: string): Promise<string> {
  const { data, error } = await supabase.rpc("reset_view_code", {
    p_code: code.trim().toUpperCase(),
    p_reset_code: resetCode.trim().toUpperCase(),
  });
  if (error) throw new Error(`再発行に失敗しました: ${error.message}`);
  const res = data as unknown as { error?: string; view_code?: string };
  if (res?.error || !res.view_code) {
    throw new Error("リセットコードが正しくありません。管理情報PDFをご確認ください。");
  }
  return res.view_code;
}

// get_team_stats の返却
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

export class ViewCodeError extends Error {
  constructor() {
    super("閲覧コードが正しくありません。");
    this.name = "ViewCodeError";
  }
}

/** チーム集計を取得する（閲覧コード必須） */
export async function fetchTeamStats(code: string, viewCode: string): Promise<TeamStats> {
  const { data, error } = await supabase.rpc("get_team_stats", {
    p_code: code.trim().toUpperCase(),
    p_view_code: viewCode.trim().toUpperCase(),
  });
  if (error) throw new Error(`チーム集計の取得に失敗しました: ${error.message}`);
  const res = data as unknown as { error?: string } & TeamStats;
  if (res?.error === "invalid_view_code") throw new ViewCodeError();
  if (res?.error) throw new Error("チームが見つかりません。コードをご確認ください。");
  return res;
}

/** 新しい実施回（wave）を発行する。以後の回答は最新waveに紐づく */
export async function createWave(teamId: string, label?: string): Promise<{ waveId: string; waveNo: number }> {
  const { data: maxRow, error: e1 } = await supabase
    .from("waves")
    .select("wave_no")
    .eq("team_id", teamId)
    .order("wave_no", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (e1) throw new Error(`実施回の照会に失敗しました: ${e1.message}`);
  const next = (maxRow?.wave_no ?? 0) + 1;
  const { data, error } = await supabase
    .from("waves")
    .insert({ team_id: teamId, wave_no: next, label: label?.trim() || null })
    .select("id, wave_no")
    .single();
  if (error) throw new Error(`実施回の発行に失敗しました: ${error.message}`);
  return { waveId: data.id, waveNo: data.wave_no };
}

// get_team_wave_stats の返却
export interface WaveStat {
  wave_no: number;
  label: string | null;
  created_at: string;
  n: number;
  avg_total: number | null;
  factor_avg: Record<string, number> | null;
}

/** wave（実施回）別の集計を取得する（閲覧コード必須） */
export async function fetchWaveStats(code: string, viewCode: string): Promise<WaveStat[]> {
  const { data, error } = await supabase.rpc("get_team_wave_stats", {
    p_code: code.trim().toUpperCase(),
    p_view_code: viewCode.trim().toUpperCase(),
  });
  if (error) throw new Error(`実施回別集計の取得に失敗しました: ${error.message}`);
  const res = data as unknown as { error?: string; waves?: WaveStat[] };
  if (res?.error === "invalid_view_code") throw new ViewCodeError();
  if (res?.error) throw new Error("チームが見つかりません。");
  return res.waves ?? [];
}

// ---------- 管理者（AW社内） ----------
export interface AdminTeamRow {
  code: string;
  name: string | null;
  created_at: string;
  view_code: string;
  n: number;
  avg_total: number | null;
}

/** 管理者コードで全チーム一覧（回答状況・閲覧コード付き）を取得 */
export async function adminListTeams(adminCode: string): Promise<AdminTeamRow[]> {
  const { data, error } = await supabase.rpc("admin_list_teams", {
    p_admin_code: adminCode.trim().toUpperCase(),
  });
  if (error) throw new Error(`一覧の取得に失敗しました: ${error.message}`);
  const res = data as unknown as { error?: string; teams?: AdminTeamRow[] };
  if (res?.error) throw new Error("管理者コードが正しくありません。");
  return res.teams ?? [];
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
