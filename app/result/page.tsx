"use client";

// /result : 個人結果（F-02 総合スコア＋9段階解説。F-03/F-04/F-05 は後続タスクで追加）
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import FactorRadar from "@/components/FactorRadar";
import PatternAnalysis from "@/components/PatternAnalysis";
import {
  fetchMasters,
  fetchPatternAnalysis,
  type Masters,
  type PatternAnalysis as PatternAnalysisRow,
} from "@/lib/masters";
import { submitAssessment, type SubmitResult } from "@/lib/submit";
import type { AnswerMap } from "@/lib/scoring";
import {
  LEVEL_LABELS,
  RESULT_STRINGS as S,
  STORAGE_KEY_ANSWERS,
  STORAGE_KEY_RESULT,
} from "@/lib/strings";

type State =
  | { phase: "loading" }
  | { phase: "no-answers" }
  | { phase: "error"; message: string }
  | { phase: "ready"; result: SubmitResult };

function loadStoredResult(): SubmitResult | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY_RESULT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SubmitResult;
    if (typeof parsed.total !== "number" || typeof parsed.pattern_code !== "string") return null;
    return parsed;
  } catch {
    return null;
  }
}

function loadStoredAnswers(): AnswerMap | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY_ANSWERS);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (Object.keys(parsed).length !== 20) return null;
    return parsed as AnswerMap;
  } catch {
    return null;
  }
}

export default function ResultPage() {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [masters, setMasters] = useState<Masters | null>(null);
  const [pattern, setPattern] = useState<PatternAnalysisRow | null>(null);

  useEffect(() => {
    fetchMasters()
      .then(setMasters)
      .catch(() => setMasters(null)); // レーダー等はマスタ取得成功時のみ表示
  }, []);

  // パターン分析文の取得（未投入なら null → 準備中表示）
  useEffect(() => {
    if (state.phase !== "ready") return;
    fetchPatternAnalysis(state.result.pattern_code)
      .then(setPattern)
      .catch(() => setPattern(null));
  }, [state]);

  const run = useCallback(() => {
    // 再読込時は保存済み結果を再利用（二重送信を防ぐ）
    const stored = loadStoredResult();
    if (stored) {
      setState({ phase: "ready", result: stored });
      return;
    }
    const answers = loadStoredAnswers();
    if (!answers) {
      setState({ phase: "no-answers" });
      return;
    }
    setState({ phase: "loading" });
    submitAssessment(answers)
      .then((result) => {
        try {
          window.sessionStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(result));
          window.sessionStorage.removeItem(STORAGE_KEY_ANSWERS);
        } catch {
          // 保存不可でも表示は継続
        }
        setState({ phase: "ready", result });
      })
      .catch((e: unknown) => {
        setState({ phase: "error", message: e instanceof Error ? e.message : S.submitError });
      });
  }, []);

  useEffect(() => {
    run();
  }, [run]);

  if (state.phase === "loading") {
    return <p className="py-16 text-center text-gray-500">{S.loading}</p>;
  }

  if (state.phase === "no-answers") {
    return (
      <section className="space-y-6 py-8 text-center">
        <p className="text-gray-600">{S.noAnswers}</p>
        <Link href="/assessment" className="inline-block rounded bg-gray-900 px-4 py-3 text-white">
          {S.goAssessment}
        </Link>
      </section>
    );
  }

  if (state.phase === "error") {
    return (
      <section className="space-y-4 py-16 text-center">
        <p className="text-gray-600">{state.message}</p>
        <button onClick={run} className="rounded border px-4 py-2">
          {S.retry}
        </button>
      </section>
    );
  }

  const { result } = state;

  return (
    <section className="space-y-8">
      <h1 className="text-xl font-bold">{S.title}</h1>

      {/* F-02: 総合スコア＋スコア帯解説 */}
      <div className="rounded-lg border p-6 text-center">
        <p className="text-sm text-gray-500">
          {S.totalLabel} <span className="text-xs">{S.totalRange(-40, 40)}</span>
        </p>
        <p className="my-2 text-5xl font-bold tabular-nums">
          {result.total > 0 ? `+${result.total}` : result.total}
        </p>
        {result.band && (
          <div className="mt-4 rounded bg-gray-50 p-4 text-left">
            <h2 className="mb-1 text-sm font-bold text-gray-700">{S.bandHeading}</h2>
            <p className="text-sm leading-relaxed text-gray-700">{result.band.description}</p>
          </div>
        )}
      </div>

      {/* F-03: 因子別レーダーチャート＋因子表 */}
      {masters && (
        <div className="rounded-lg border p-4 sm:p-6">
          <h2 className="mb-2 text-sm font-bold text-gray-700">{S.radarHeading}</h2>
          <FactorRadar
            factors={masters.factors.map((f) => ({ code: f.code, name: f.name }))}
            scores={result.factor_scores}
          />
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="py-2 font-normal">{S.factorTableFactor}</th>
                <th className="py-2 text-right font-normal">{S.factorTableScore}</th>
                <th className="py-2 text-right font-normal">{S.factorTableLevel}</th>
              </tr>
            </thead>
            <tbody>
              {masters.factors.map((f) => {
                const score = result.factor_scores[f.code] ?? 0;
                const level = result.factor_levels[f.code];
                return (
                  <tr key={f.code} className="border-b last:border-b-0">
                    <td className="py-2">{f.name}</td>
                    <td className="py-2 text-right tabular-nums">
                      {score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">{LEVEL_LABELS[level] ?? level}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* F-04: パターン分析（アコーディオン段階表示＋関連リンク） */}
      <PatternAnalysis patternCode={result.pattern_code} analysis={pattern} />

      {/* F-05: MD出力（タスク1-9） */}

      <div className="text-center">
        <Link
          href="/assessment"
          className="text-sm text-gray-500 underline"
          onClick={() => {
            try {
              window.sessionStorage.removeItem(STORAGE_KEY_RESULT);
            } catch {
              /* noop */
            }
          }}
        >
          {S.retake}
        </Link>
      </div>
    </section>
  );
}
