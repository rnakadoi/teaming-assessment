// チーム集計の持ち出し（2026-07-12 仕様変更: 統計CSVエクスポート＋集計PDF/CSV共通ヘルパー）
// 出力するのは統計値のみ（個人の生回答は含めない。匿名設計と両立）
import { ROLE_LABELS } from "./strings";
import type { GlobalStats, TeamStats, WaveStat } from "./team";

/** PDF/CSVが必要とするマスタの最小形（Masters から map して渡す） */
export interface ExportMasters {
  factors: { code: string; name: string }[];
  questions: { no: number; text: string }[];
}

export interface TeamExportInput {
  date: string; // YYYY-MM-DD
  stats: TeamStats;
  waves: WaveStat[];
  masters: ExportMasters | null;
  global: GlobalStats | null;
}

/** ばらつき（標準偏差）上位項目。item_stats が無い（n<3）場合は空配列 */
export function varianceTop(
  itemStats: TeamStats["item_stats"],
  questions: { no: number; text: string }[],
  limit = 3
): { no: number; text: string; avg: number; sd: number }[] {
  if (!itemStats) return [];
  return Object.entries(itemStats)
    .map(([no, s]) => ({
      no: Number(no),
      text: questions.find((q) => q.no === Number(no))?.text ?? `設問${no}`,
      avg: s.avg,
      sd: s.stddev,
    }))
    .sort((a, b) => b.sd - a.sd || a.no - b.no)
    .slice(0, limit);
}

/** 符号付き数値表記（+0.5 / -1.2 / 0） */
export function signed(n: number, digits = 0): string {
  const v = digits > 0 ? n.toFixed(digits) : String(n);
  return n > 0 ? `+${v}` : v;
}

/** CSVフィールドのエスケープ（カンマ・引用符・改行を含む場合は引用） */
function esc(field: string | number | null | undefined): string {
  if (field === null || field === undefined) return "";
  const s = String(field);
  if (/[",\r\n]/.test(s)) {
    return `"${s.replaceAll('"', '""')}"`;
  }
  return s;
}

function row(...fields: (string | number | null | undefined)[]): string {
  return fields.map(esc).join(",");
}

const FACTOR_CODES = ["F1", "F2", "F3", "F4", "F5"];

/**
 * チーム集計CSVを組み立てる。
 * セクション: 概要 / 因子別平均 / 設問別（n>=3のみ） / 役割別平均（n>=3のみ） / 実施回ごとの推移
 * Excel想定: BOM付きUTF-8・CRLF（downloadCsv 側で付与するのは改行のみ。BOMは本関数が先頭に含める）
 */
export function buildTeamStatsCsv(input: TeamExportInput): string {
  const { stats, waves, masters, global } = input;
  const lines: string[] = [];
  const factorName = (code: string) =>
    masters?.factors.find((f) => f.code === code)?.name ?? code;

  lines.push(row("言える化アセスメント チーム集計"));
  lines.push(row("チーム名", stats.team_name ?? "（未設定）"));
  lines.push(row("チームコード", stats.team_code));
  lines.push(row("出力日", input.date));
  lines.push(row("回答者数", stats.n));
  lines.push(row("総合スコア平均（−40〜+40）", stats.avg_total ?? ""));
  if (global?.available && global.avg_total !== undefined) {
    lines.push(row(`全体平均（${global.n}件）`, global.avg_total));
  }
  lines.push("");

  lines.push(row("因子別平均"));
  lines.push(
    row("因子コード", "因子名", "チーム平均", ...(global?.available ? ["全体平均"] : []))
  );
  for (const code of FACTOR_CODES) {
    const team = stats.factor_avg?.[code];
    if (team === undefined) continue;
    lines.push(
      row(
        code,
        factorName(code),
        team,
        ...(global?.available ? [global.factor_avg?.[code] ?? ""] : [])
      )
    );
  }
  lines.push("");

  lines.push(row("設問別（平均・標準偏差）"));
  if (stats.item_stats) {
    lines.push(row("設問番号", "設問", "平均", "標準偏差"));
    const entries = Object.entries(stats.item_stats).sort(
      (a, b) => Number(a[0]) - Number(b[0])
    );
    for (const [no, s] of entries) {
      const text =
        masters?.questions.find((q) => q.no === Number(no))?.text ?? `設問${no}`;
      lines.push(row(no, text, s.avg, s.stddev));
    }
  } else {
    lines.push(row(`回答者${stats.min_n_for_detail}名未満のため非表示（匿名性保護）`));
  }
  lines.push("");

  lines.push(row("役割別平均"));
  if (stats.by_role && Object.keys(stats.by_role).length > 0) {
    lines.push(row("役割", "総合平均"));
    for (const [role, avg] of Object.entries(stats.by_role)) {
      lines.push(row(ROLE_LABELS[role] ?? role, avg));
    }
  } else {
    lines.push(row("表示条件を満たさないため非表示（各役割2名以上・回答3名以上）"));
  }
  lines.push("");

  lines.push(row("実施回ごとの推移"));
  lines.push(
    row("実施回", "ラベル", "開始日", "受付", "回答数", "総合平均", ...FACTOR_CODES)
  );
  for (const w of waves) {
    lines.push(
      row(
        w.wave_no,
        w.label ?? "",
        w.created_at.slice(0, 10),
        w.closed_at ? "終了" : "受付中",
        w.n,
        w.avg_total ?? "",
        ...FACTOR_CODES.map((c) => w.factor_avg?.[c] ?? "")
      )
    );
  }

  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** CSV文字列をファイルとしてダウンロードする */
export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** チーム集計CSVのファイル名（例: チーム集計_ABC123_20260712.csv） */
export function teamCsvFilename(teamCode: string, date: string): string {
  return `チーム集計_${teamCode}_${date.replaceAll("-", "")}.csv`;
}
