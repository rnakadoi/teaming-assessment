"use client";

// /admin : オーセンティックワークス管理者ビュー（2026-07-05 仕様変更）
// 管理者コード（DB秘匿テーブル保管）で全チームの回答状況・閲覧コードを一覧できる
// 2026-07-12 仕様変更: 一括削除（削除範囲2択）・集計PDF/管理情報PDF/CSVの一覧からのダウンロードを追加
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  adminDeleteTeams,
  adminListTeams,
  fetchGlobalStats,
  fetchTeamStats,
  fetchWaveStats,
  type AdminTeamRow,
} from "@/lib/team";
import { fetchMasters } from "@/lib/masters";
import {
  buildTeamStatsCsv,
  downloadCsv,
  teamCsvFilename,
  type ExportMasters,
  type TeamExportInput,
} from "@/lib/team-export";
import { ADMIN_STRINGS as A } from "@/lib/strings";
import { notifyError } from "@/lib/notify";

const ADMIN_CODE_KEY = "yieruka.admincode";
const viewCodeKey = (code: string) => `yieruka.viewcode.${code}`;

type State =
  | { phase: "gate" }
  | { phase: "loading" }
  | { phase: "ready"; teams: AdminTeamRow[] };

/** 削除範囲（2026-07-12 仕様変更: 削除前にどちらかを確認する） */
type DeleteMode = "team_only" | "with_assessments";

const today = () => new Date().toLocaleDateString("sv-SE");

export default function AdminPage() {
  const [state, setState] = useState<State>({ phase: "gate" });
  const [input, setInput] = useState("");
  const [adminCode, setAdminCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyCode, setBusyCode] = useState<string | null>(null);
  // 一括削除
  const [selected, setSelected] = useState<string[]>([]);
  const [deleteMode, setDeleteMode] = useState<DeleteMode>("team_only");
  const [confirming, setConfirming] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const load = (code: string) => {
    setState({ phase: "loading" });
    setMessage(null);
    adminListTeams(code)
      .then((teams) => {
        setAdminCode(code);
        try {
          window.sessionStorage.setItem(ADMIN_CODE_KEY, code);
        } catch {
          /* noop */
        }
        setState({ phase: "ready", teams });
      })
      .catch((e: unknown) => {
        try {
          window.sessionStorage.removeItem(ADMIN_CODE_KEY);
        } catch {
          /* noop */
        }
        notifyError("admin", e);
        setMessage(e instanceof Error ? e.message : "取得に失敗しました。");
        setState({ phase: "gate" });
      });
  };

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.sessionStorage.getItem(ADMIN_CODE_KEY);
    } catch {
      /* noop */
    }
    if (saved) load(saved);
  }, []);

  const logout = () => {
    try {
      window.sessionStorage.removeItem(ADMIN_CODE_KEY);
    } catch {
      /* noop */
    }
    setAdminCode("");
    setInput("");
    setSelected([]);
    setNotice(null);
    setState({ phase: "gate" });
  };

  /** 集計PDF/CSVの共通データ取得（統計＋wave推移＋マスタ＋全体平均） */
  const fetchExportInput = async (row: AdminTeamRow): Promise<TeamExportInput> => {
    const [stats, waves, mastersRaw, global] = await Promise.all([
      fetchTeamStats(row.code, row.view_code),
      fetchWaveStats(row.code, row.view_code).catch(() => []),
      fetchMasters().catch(() => null),
      fetchGlobalStats().catch(() => null),
    ]);
    const masters: ExportMasters | null = mastersRaw
      ? {
          factors: mastersRaw.factors.map((f) => ({ code: f.code, name: f.name })),
          questions: mastersRaw.questions.map((q) => ({ no: q.no, text: q.text })),
        }
      : null;
    return { date: today(), stats, waves, masters, global };
  };

  // 一覧から: チーム集計PDF
  const downloadResultPdf = async (row: AdminTeamRow) => {
    setBusyCode(row.code);
    setMessage(null);
    try {
      const input = await fetchExportInput(row);
      const { downloadTeamResultPdf } = await import("@/lib/pdf/TeamResultPdf");
      await downloadTeamResultPdf(input);
    } catch (e: unknown) {
      notifyError("admin-pdf", e);
      setMessage(e instanceof Error ? e.message : "PDF生成に失敗しました。");
    } finally {
      setBusyCode(null);
    }
  };

  // 一覧から: 管理情報PDF（3コード再出力）
  const downloadAdminPdf = async (row: AdminTeamRow) => {
    setBusyCode(row.code);
    setMessage(null);
    try {
      const { downloadTeamAdminPdf } = await import("@/lib/pdf/TeamPdfs");
      await downloadTeamAdminPdf({
        teamName: row.name,
        code: row.code,
        viewCode: row.view_code,
        resetCode: row.reset_code,
        createdAt: row.created_at.slice(0, 10),
        origin: window.location.origin,
      });
    } catch (e: unknown) {
      notifyError("admin-pdf", e);
      setMessage(e instanceof Error ? e.message : "PDF生成に失敗しました。");
    } finally {
      setBusyCode(null);
    }
  };

  // 一覧から: 統計CSV
  const downloadStatsCsv = async (row: AdminTeamRow) => {
    setBusyCode(row.code);
    setMessage(null);
    try {
      const input = await fetchExportInput(row);
      downloadCsv(teamCsvFilename(row.code, input.date), buildTeamStatsCsv(input));
    } catch (e: unknown) {
      notifyError("admin-csv", e);
      setMessage(e instanceof Error ? e.message : "CSV生成に失敗しました。");
    } finally {
      setBusyCode(null);
    }
  };

  const toggleSelect = (code: string) => {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
    setConfirming(false);
  };

  const handleDelete = async () => {
    if (selected.length === 0) return;
    setDeleteBusy(true);
    setMessage(null);
    try {
      const res = await adminDeleteTeams(
        adminCode,
        selected,
        deleteMode === "with_assessments"
      );
      setNotice(
        A.deleteDone(res.teamsDeleted, deleteMode === "with_assessments", res.assessmentsDeleted)
      );
      setSelected([]);
      setConfirming(false);
      const teams = await adminListTeams(adminCode);
      setState({ phase: "ready", teams });
    } catch (e: unknown) {
      notifyError("admin-delete", e);
      setMessage(e instanceof Error ? e.message : "削除に失敗しました。");
    } finally {
      setDeleteBusy(false);
    }
  };

  if (state.phase === "loading") {
    return <p className="py-16 text-center text-gray-500">読み込み中…</p>;
  }

  if (state.phase === "gate") {
    return (
      <section className="mx-auto max-w-md space-y-6 py-8">
        <h1 className="text-xl font-bold">管理者メニュー</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          オーセンティックワークスの管理者コードを入力してください。全チームの回答状況と集計を閲覧できます。
        </p>
        <div className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="管理者コード"
            className="w-full rounded border px-3 py-3 text-center font-mono text-lg tracking-widest"
            aria-label="管理者コード"
          />
          {message && <p className="text-sm text-red-600">{message}</p>}
          <button
            onClick={() => load(input)}
            disabled={input.length < 8}
            className="w-full rounded bg-brand-gold px-4 py-3 font-semibold text-brand-ink hover:bg-brand-goldDeep disabled:opacity-40"
          >
            一覧を表示する
          </button>
        </div>
      </section>
    );
  }

  const { teams } = state;

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">全チーム一覧（管理者）</h1>
        <div className="flex items-baseline gap-3">
          <span className="text-sm text-gray-500">{teams.length}チーム</span>
          <button onClick={logout} className="text-xs text-gray-400 underline">
            ログアウト
          </button>
        </div>
      </div>

      {notice && (
        <p className="rounded border border-brand-gold bg-brand-goldSoft p-3 text-sm text-brand-goldInk">
          {notice}
        </p>
      )}
      {message && <p className="text-sm text-red-600">{message}</p>}

      {/* 一括削除バー（複数選択→削除範囲を確認の上で実行） */}
      {teams.length > 0 && (
        <div className="space-y-3 rounded-lg border p-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-gray-600">
              選択中: <strong>{selected.length}</strong> 件
            </span>
            <select
              value={deleteMode}
              onChange={(e) => {
                setDeleteMode(e.target.value as DeleteMode);
                setConfirming(false);
              }}
              className="min-w-0 flex-1 rounded border px-2 py-2 text-xs"
              aria-label="削除範囲"
            >
              <option value="team_only">{A.deleteScopeTeamOnly}</option>
              <option value="with_assessments">{A.deleteScopeWithAssessments}</option>
            </select>
            <button
              onClick={() => setConfirming(true)}
              disabled={selected.length === 0 || deleteBusy}
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-40"
            >
              {A.deleteButton}
            </button>
          </div>
          {confirming && selected.length > 0 && (
            <div className="space-y-2 rounded border border-red-200 bg-red-50 p-3 text-sm">
              <p className="font-bold text-red-800">{A.deleteConfirmTitle}</p>
              <p className="text-red-800">
                対象: {selected.join(", ")}（{selected.length}件）
              </p>
              <p className="text-red-800">
                削除範囲:{" "}
                {deleteMode === "team_only"
                  ? A.deleteScopeTeamOnly
                  : A.deleteScopeWithAssessments}
              </p>
              <p className="text-xs text-red-700">{A.deleteIrreversible}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => void handleDelete()}
                  disabled={deleteBusy}
                  className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteBusy ? A.deleteBusy : A.deleteExecute}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={deleteBusy}
                  className="rounded border px-4 py-2 text-sm"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {teams.length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-gray-600">
          まだチームが作成されていません。
        </p>
      ) : (
        <ul className="space-y-4">
          {teams.map((t) => (
            <li key={t.code} className="space-y-3 rounded-lg border p-4 sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selected.includes(t.code)}
                    onChange={() => toggleSelect(t.code)}
                    className="mt-1 h-4 w-4"
                    aria-label={`${t.name ?? t.code} を削除対象に選択`}
                  />
                  <div>
                    <div className="font-bold">{t.name ?? "（未設定）"}</div>
                    <div className="text-xs text-gray-500">
                      コード: <code className="rounded bg-gray-100 px-1">{t.code}</code>
                      　作成日: {new Date(t.created_at).toLocaleDateString("ja-JP")}
                      　閲覧コード: <code className="rounded bg-gray-100 px-1">{t.view_code}</code>
                    </div>
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div>
                    回答 <strong className="tabular-nums">{t.n}</strong> 名
                  </div>
                  <div className="text-xs text-gray-500 tabular-nums">
                    総合平均:{" "}
                    {t.avg_total === null
                      ? "—"
                      : t.avg_total > 0
                        ? `+${t.avg_total}`
                        : t.avg_total}
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Link
                  href={`/t/${t.code}/results`}
                  onClick={() => {
                    // 閲覧コードを事前セットして集計を直接開けるように
                    try {
                      window.sessionStorage.setItem(viewCodeKey(t.code), t.view_code);
                    } catch {
                      /* noop */
                    }
                  }}
                  className="flex-1 rounded bg-brand-gold px-4 py-2.5 text-center text-sm font-semibold text-brand-ink hover:bg-brand-goldDeep"
                >
                  集計を見る
                </Link>
                <button
                  onClick={() => void downloadResultPdf(t)}
                  disabled={busyCode === t.code || t.n === 0}
                  className="flex-1 rounded border px-4 py-2.5 text-center text-sm hover:bg-brand-warm disabled:opacity-40"
                >
                  {busyCode === t.code ? A.generating : A.resultPdfButton}
                </button>
                <button
                  onClick={() => void downloadAdminPdf(t)}
                  disabled={busyCode === t.code}
                  className="flex-1 rounded border px-4 py-2.5 text-center text-sm hover:bg-brand-warm disabled:opacity-40"
                >
                  {busyCode === t.code ? A.generating : A.adminPdfButton}
                </button>
                <button
                  onClick={() => void downloadStatsCsv(t)}
                  disabled={busyCode === t.code || t.n === 0}
                  className="flex-1 rounded border px-4 py-2.5 text-center text-sm hover:bg-brand-warm disabled:opacity-40"
                >
                  {busyCode === t.code ? A.generating : A.csvButton}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs leading-relaxed text-gray-400">
        個人の回答は匿名のため、管理者でも閲覧できません（人数・平均などの統計値のみ）。このページのURLと管理者コードは社外に共有しないでください。
      </p>
    </section>
  );
}
