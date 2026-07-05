"use client";

// /t/{code}/results : チーム集計（2026-07-05 仕様変更: 閲覧コードゲート＋リセット再発行）
// 集計はチーム内の特定の人（閲覧コードを知る人）のみ閲覧可能
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FactorRadar from "@/components/FactorRadar";
import WaveComparison from "@/components/WaveComparison";
import { fetchMasters, type Masters } from "@/lib/masters";
import {
  createWave,
  fetchTeamByCode,
  fetchTeamStats,
  fetchWaveStats,
  resetViewCode,
  ViewCodeError,
  type TeamInfo,
  type TeamStats,
  type WaveStat,
} from "@/lib/team";
import { TEAM_STRINGS as S } from "@/lib/strings";

type State =
  | { phase: "gate" }
  | { phase: "reset" }
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; stats: TeamStats };

const ROLE_LABELS: Record<string, string> = {
  leader: "リーダー・管理職",
  member: "メンバー",
  unspecified: "未回答",
};

/** 認証済み閲覧コードの保存キー（端末内。再入力を省く） */
const viewCodeKey = (code: string) => `yieruka.viewcode.${code}`;

export default function TeamResultsPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [masters, setMasters] = useState<Masters | null>(null);
  const [waves, setWaves] = useState<WaveStat[]>([]);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [viewCode, setViewCode] = useState("");
  const [gateInput, setGateInput] = useState("");
  const [resetInput, setResetInput] = useState("");
  const [newViewCode, setNewViewCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [gateMsg, setGateMsg] = useState<string | null>(null);
  const [waveConfirm, setWaveConfirm] = useState(false);
  const [waveBusy, setWaveBusy] = useState(false);
  const [waveMsg, setWaveMsg] = useState<string | null>(null);

  const loadStats = useCallback(
    (vc: string) => {
      setState({ phase: "loading" });
      setGateMsg(null);
      fetchTeamStats(code, vc)
        .then((stats) => {
          setViewCode(vc);
          try {
            window.sessionStorage.setItem(viewCodeKey(code), vc);
          } catch {
            /* noop */
          }
          setState({ phase: "ready", stats });
          fetchWaveStats(code, vc)
            .then(setWaves)
            .catch(() => setWaves([]));
        })
        .catch((e: unknown) => {
          if (e instanceof ViewCodeError) {
            try {
              window.sessionStorage.removeItem(viewCodeKey(code));
            } catch {
              /* noop */
            }
            setGateMsg("閲覧コードが正しくありません。");
            setState({ phase: "gate" });
          } else {
            setState({
              phase: "error",
              message: e instanceof Error ? e.message : S.notFound,
            });
          }
        });
    },
    [code]
  );

  useEffect(() => {
    fetchMasters()
      .then(setMasters)
      .catch(() => setMasters(null));
    fetchTeamByCode(code)
      .then(setTeam)
      .catch(() => setTeam(null));
    // 端末に保存済みの閲覧コードがあれば自動で開く
    let saved: string | null = null;
    try {
      saved = window.sessionStorage.getItem(viewCodeKey(code));
    } catch {
      /* noop */
    }
    if (saved) {
      loadStats(saved);
    } else {
      setState({ phase: "gate" });
    }
  }, [code, loadStats]);

  const doReset = async () => {
    setBusy(true);
    setGateMsg(null);
    try {
      const vc = await resetViewCode(code, resetInput);
      setNewViewCode(vc);
      setResetInput("");
      loadStats(vc);
    } catch (e: unknown) {
      setGateMsg(e instanceof Error ? e.message : "再発行に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  const issueWave = async () => {
    if (!team) return;
    setWaveBusy(true);
    setWaveMsg(null);
    try {
      const { waveNo } = await createWave(team.id);
      setWaveMsg(S.waveNewDone(waveNo));
      setWaveConfirm(false);
      fetchWaveStats(code, viewCode)
        .then(setWaves)
        .catch(() => setWaves([]));
    } catch (e: unknown) {
      setWaveMsg(e instanceof Error ? e.message : "発行に失敗しました。");
    } finally {
      setWaveBusy(false);
    }
  };

  // ばらつき（SD）上位3項目
  const varianceTop = useMemo(() => {
    if (state.phase !== "ready" || !state.stats.item_stats || !masters) return [];
    return Object.entries(state.stats.item_stats)
      .map(([no, s]) => ({
        no: Number(no),
        text: masters.questions.find((q) => q.no === Number(no))?.text ?? `設問${no}`,
        avg: s.avg,
        sd: s.stddev,
      }))
      .sort((a, b) => b.sd - a.sd || a.no - b.no)
      .slice(0, 3);
  }, [state, masters]);

  if (state.phase === "loading") {
    return <p className="py-16 text-center text-gray-500">{S.loading}</p>;
  }

  // ---- 閲覧コード入力ゲート ----
  if (state.phase === "gate") {
    return (
      <section className="mx-auto max-w-md space-y-6 py-8">
        <h1 className="text-xl font-bold">チーム集計の閲覧</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          チーム
          <span className="mx-1 font-mono">{code}</span>
          の集計を閲覧するには「閲覧コード」（8文字）が必要です。チーム作成者にご確認ください。
        </p>
        {newViewCode && (
          <div className="rounded-lg border-2 border-brand-gold bg-brand-goldSoft p-4">
            <p className="text-xs font-bold text-brand-goldInk">
              新しい閲覧コードが発行されました。必ず控えてください:
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-brand-ink">
              {newViewCode}
            </p>
          </div>
        )}
        <div className="space-y-3">
          <input
            type="text"
            value={gateInput}
            onChange={(e) => setGateInput(e.target.value.toUpperCase())}
            placeholder="閲覧コード（8文字）"
            maxLength={8}
            className="w-full rounded border px-3 py-3 text-center font-mono text-lg tracking-widest"
            aria-label="閲覧コード"
          />
          {gateMsg && <p className="text-sm text-red-600">{gateMsg}</p>}
          <button
            onClick={() => loadStats(gateInput)}
            disabled={gateInput.length !== 8}
            className="w-full rounded bg-brand-gold px-4 py-3 font-semibold text-brand-ink hover:bg-brand-goldDeep disabled:opacity-40"
          >
            集計を表示する
          </button>
          <button
            onClick={() => {
              setGateMsg(null);
              setState({ phase: "reset" });
            }}
            className="w-full text-sm text-gray-500 underline"
          >
            閲覧コードを忘れた場合（リセットコードで再発行）
          </button>
        </div>
      </section>
    );
  }

  // ---- リセットコードによる閲覧コード再発行 ----
  if (state.phase === "reset") {
    return (
      <section className="mx-auto max-w-md space-y-6 py-8">
        <h1 className="text-xl font-bold">閲覧コードの再発行</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          チーム作成時の「管理情報PDF」に記載されたリセットコード（10文字）を入力すると、新しい閲覧コードを発行します。古い閲覧コードは無効になります。
        </p>
        <div className="space-y-3">
          <input
            type="text"
            value={resetInput}
            onChange={(e) => setResetInput(e.target.value.toUpperCase())}
            placeholder="リセットコード（10文字）"
            maxLength={10}
            className="w-full rounded border px-3 py-3 text-center font-mono text-lg tracking-widest"
            aria-label="リセットコード"
          />
          {gateMsg && <p className="text-sm text-red-600">{gateMsg}</p>}
          <button
            onClick={doReset}
            disabled={busy || resetInput.length !== 10}
            className="w-full rounded bg-brand-gold px-4 py-3 font-semibold text-brand-ink hover:bg-brand-goldDeep disabled:opacity-40"
          >
            {busy ? "再発行中…" : "新しい閲覧コードを発行する"}
          </button>
          <button
            onClick={() => {
              setGateMsg(null);
              setState({ phase: "gate" });
            }}
            className="w-full text-sm text-gray-500 underline"
          >
            閲覧コードの入力に戻る
          </button>
        </div>
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="space-y-6 py-8 text-center">
        <p className="text-gray-600">{state.message}</p>
        <Link href="/" className="inline-block rounded border px-4 py-3">
          トップへ戻る
        </Link>
      </section>
    );
  }

  const { stats } = state;

  return (
    <section className="space-y-8">
      <div>
        <h1 className="text-xl font-bold">
          {S.statsTitle}
          {stats.team_name ? `: ${stats.team_name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          コード <span className="font-mono">{stats.team_code}</span> ／ {S.statsN(stats.n)}
        </p>
      </div>

      {newViewCode && (
        <div className="rounded-lg border-2 border-brand-gold bg-brand-goldSoft p-4">
          <p className="text-xs font-bold text-brand-goldInk">
            新しい閲覧コード（必ず控えてください。古いコードは無効になりました）:
          </p>
          <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-brand-ink">
            {newViewCode}
          </p>
        </div>
      )}

      {stats.n === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-gray-600">{S.statsEmpty}</p>
      ) : (
        <>
          {/* 総合平均 */}
          <div className="rounded-lg border p-6 text-center">
            <p className="text-sm text-gray-500">{S.statsAvgTotal}（−40〜+40）</p>
            <p className="my-2 text-5xl font-bold tabular-nums text-brand-goldDeep">
              {stats.avg_total !== null && stats.avg_total > 0
                ? `+${stats.avg_total}`
                : stats.avg_total}
            </p>
          </div>

          {/* 因子別平均レーダー */}
          {masters && stats.factor_avg && (
            <div className="rounded-lg border p-4 sm:p-6">
              <h2 className="mb-2 text-sm font-bold text-gray-700">{S.statsRadar}</h2>
              <FactorRadar
                factors={masters.factors.map((f) => ({ code: f.code, name: f.name }))}
                scores={stats.factor_avg}
              />
            </div>
          )}

          {/* 3名未満は分布・役割別非表示 */}
          {stats.n < stats.min_n_for_detail ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {S.statsFewNote(stats.min_n_for_detail)}
            </p>
          ) : (
            <>
              {/* ばらつき上位項目（対話の起点） */}
              {varianceTop.length > 0 && (
                <div className="rounded-lg border p-4 sm:p-6">
                  <h2 className="mb-3 text-sm font-bold text-gray-700">{S.statsVariance}</h2>
                  <ul className="space-y-3">
                    {varianceTop.map((v) => (
                      <li key={v.no} className="text-sm">
                        <p className="leading-relaxed">
                          {v.no}. {v.text}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          平均 {v.avg.toFixed(2)} ／ 標準偏差 {v.sd.toFixed(2)}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs text-gray-400">
                    回答が割れている項目は、メンバーごとに見えている景色が違う場所です。まずここから対話を始めるのがおすすめです。
                  </p>
                </div>
              )}

              {/* 役割別平均 */}
              {stats.by_role && Object.keys(stats.by_role).length > 0 && (
                <div className="rounded-lg border p-4 sm:p-6">
                  <h2 className="mb-3 text-sm font-bold text-gray-700">{S.statsByRole}</h2>
                  <table className="w-full text-sm">
                    <tbody>
                      {Object.entries(stats.by_role).map(([role, avg]) => (
                        <tr key={role} className="border-b last:border-b-0">
                          <td className="py-2">{ROLE_LABELS[role] ?? role}</td>
                          <td className="py-2 text-right tabular-nums">
                            {avg > 0 ? `+${avg}` : avg}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="mt-3 text-xs text-gray-400">
                    ※2名以上の役割のみ表示されます。リーダーとメンバーで差が大きい場合、見えている景色のギャップ自体が対話のテーマになります。
                  </p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* F-08: 実施回ごとの推移＋新しい回の発行 */}
      <div className="rounded-lg border p-4 sm:p-6">
        <h2 className="mb-3 text-sm font-bold text-gray-700">{S.waveHeading}</h2>
        {waves.length > 0 && <WaveComparison waves={waves} />}
        <div className="mt-4 space-y-2">
          {waveMsg && <p className="text-sm text-gray-700">{waveMsg}</p>}
          {!waveConfirm ? (
            <button
              onClick={() => setWaveConfirm(true)}
              disabled={!team}
              className="rounded border px-4 py-2 text-sm disabled:opacity-40"
            >
              {S.waveNewButton}
            </button>
          ) : (
            <div className="space-y-2 rounded bg-brand-warm p-3">
              <p className="text-sm text-gray-700">{S.waveNewConfirm}</p>
              <div className="flex gap-2">
                <button
                  onClick={issueWave}
                  disabled={waveBusy}
                  className="rounded bg-brand-gold px-4 py-2 text-sm font-semibold text-brand-ink hover:bg-brand-goldDeep disabled:opacity-50"
                >
                  {waveBusy ? "発行中…" : "発行する"}
                </button>
                <button
                  onClick={() => setWaveConfirm(false)}
                  disabled={waveBusy}
                  className="rounded border px-4 py-2 text-sm"
                >
                  やめる
                </button>
              </div>
            </div>
          )}
          <p className="text-xs text-gray-400">{S.waveNewNote}</p>
        </div>
      </div>

      {/* 匿名性の注意書き */}
      <p className="rounded-lg bg-brand-warm p-4 text-xs leading-relaxed text-gray-500">
        {S.statsAnonymity}
      </p>

      <div className="text-center">
        <Link href={`/t/${code}`} className="text-sm text-gray-500 underline">
          このチームで回答する
        </Link>
      </div>
    </section>
  );
}
