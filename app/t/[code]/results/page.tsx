"use client";

// /t/{code}/results : チーム集計（F-06: 人数・平均・レーダー・ばらつき上位・役割別・匿名性注意）
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
  type TeamInfo,
  type TeamStats,
  type WaveStat,
} from "@/lib/team";
import { TEAM_STRINGS as S } from "@/lib/strings";

type State =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; stats: TeamStats };

const ROLE_LABELS: Record<string, string> = {
  leader: "リーダー・管理職",
  member: "メンバー",
  unspecified: "未回答",
};

export default function TeamResultsPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const [state, setState] = useState<State>({ phase: "loading" });
  const [masters, setMasters] = useState<Masters | null>(null);
  const [waves, setWaves] = useState<WaveStat[]>([]);
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [waveConfirm, setWaveConfirm] = useState(false);
  const [waveBusy, setWaveBusy] = useState(false);
  const [waveMsg, setWaveMsg] = useState<string | null>(null);

  const loadWaves = useCallback(() => {
    fetchWaveStats(code)
      .then(setWaves)
      .catch(() => setWaves([]));
  }, [code]);

  useEffect(() => {
    fetchTeamStats(code)
      .then((stats) => setState({ phase: "ready", stats }))
      .catch((e: unknown) =>
        setState({ phase: "error", message: e instanceof Error ? e.message : S.notFound })
      );
    fetchMasters()
      .then(setMasters)
      .catch(() => setMasters(null));
    fetchTeamByCode(code)
      .then(setTeam)
      .catch(() => setTeam(null));
    loadWaves();
  }, [code, loadWaves]);

  const issueWave = async () => {
    if (!team) return;
    setWaveBusy(true);
    setWaveMsg(null);
    try {
      const { waveNo } = await createWave(team.id);
      setWaveMsg(S.waveNewDone(waveNo));
      setWaveConfirm(false);
      loadWaves();
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

      {stats.n === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-gray-600">{S.statsEmpty}</p>
      ) : (
        <>
          {/* 総合平均 */}
          <div className="rounded-lg border p-6 text-center">
            <p className="text-sm text-gray-500">{S.statsAvgTotal}（−40〜+40）</p>
            <p className="my-2 text-5xl font-bold tabular-nums">
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
            <div className="space-y-2 rounded bg-gray-50 p-3">
              <p className="text-sm text-gray-700">{S.waveNewConfirm}</p>
              <div className="flex gap-2">
                <button
                  onClick={issueWave}
                  disabled={waveBusy}
                  className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-50"
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
      <p className="rounded-lg bg-gray-50 p-4 text-xs leading-relaxed text-gray-500">
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
