"use client";

// /result : 個人結果（F-02 総合スコア＋9段階解説。F-03/F-04/F-05 は後続タスクで追加）
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ExportActions from "@/components/ExportActions";
import FactorRadar from "@/components/FactorRadar";
import LeadSection from "@/components/LeadSection";
import PatternAnalysis from "@/components/PatternAnalysis";
import { buildResultMarkdown } from "@/lib/markdown";
import {
  fetchItemRules,
  fetchMasters,
  fetchPatternAnalysis,
  type ItemRule,
  type Masters,
  type PatternAnalysis as PatternAnalysisRow,
} from "@/lib/masters";
import { appendHistory, loadHistory, type HistoryEntry } from "@/lib/history";
import { evaluateItemRules, type FiredComment } from "@/lib/rules";
import { fetchBenchmark, type Benchmark } from "@/lib/team";
import { submitAssessment, type SubmitResult } from "@/lib/submit";
import type { AnswerMap } from "@/lib/scoring";
import {
  HISTORY_STRINGS as HS,
  LEVEL_LABELS,
  PATTERN_STRINGS as PS,
  RESULT_STRINGS as S,
  STORAGE_KEY_ANSWERS,
  STORAGE_KEY_RESULT,
} from "@/lib/strings";

/** 保存ペイロード: RPC結果＋生回答（層3スタイル検知に使用）＋実施日 */
export type StoredResult = SubmitResult & { raw_answers?: AnswerMap; taken_at?: string };

type State =
  | { phase: "loading" }
  | { phase: "no-answers" }
  | { phase: "error"; message: string }
  | { phase: "ready"; result: StoredResult };

function loadStoredResult(): StoredResult | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY_RESULT);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredResult;
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
  // StrictMode の effect 二重実行やリロード連打による二重送信を防ぐ
  const submittingRef = useRef(false);
  const [masters, setMasters] = useState<Masters | null>(null);
  const [pattern, setPattern] = useState<PatternAnalysisRow | null>(null);
  const [itemRules, setItemRules] = useState<ItemRule[]>([]);
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [prevEntry, setPrevEntry] = useState<HistoryEntry | null>(null);

  useEffect(() => {
    fetchMasters()
      .then(setMasters)
      .catch(() => setMasters(null)); // レーダー等はマスタ取得成功時のみ表示
    fetchItemRules()
      .then(setItemRules)
      .catch(() => setItemRules([])); // 層3は取得成功時のみ表示
  }, []);

  // パターン分析文の取得（未投入なら null → 準備中表示）
  useEffect(() => {
    if (state.phase !== "ready") return;
    fetchPatternAnalysis(state.result.pattern_code)
      .then(setPattern)
      .catch(() => setPattern(null));
  }, [state]);

  // F-08: 前回比（今回分のエントリを末尾から1件除外して直前の実施を探す）
  useEffect(() => {
    if (state.phase !== "ready") return;
    const h = loadHistory();
    const r = state.result;
    const revIdx = [...h]
      .reverse()
      .findIndex(
        (e) =>
          e.taken_at === r.taken_at && e.total === r.total && e.pattern_code === r.pattern_code
      );
    const filtered = revIdx === -1 ? h : h.filter((_, i) => i !== h.length - 1 - revIdx);
    setPrevEntry(filtered.length > 0 ? filtered[filtered.length - 1] : null);
  }, [state]);

  // F-07: ベンチマーク（母数100件未満は available=false → 非表示）
  useEffect(() => {
    if (state.phase !== "ready") return;
    fetchBenchmark(state.result.total)
      .then(setBenchmark)
      .catch(() => setBenchmark(null));
  }, [state]);

  // 層3: item_rules 評価（矛盾ペア上位2件＋スタイル検知＋top/bottom）
  const itemComments = useMemo<FiredComment[]>(() => {
    if (state.phase !== "ready" || !masters || itemRules.length === 0) return [];
    const raw = state.result.raw_answers;
    if (!raw) return [];
    const adjusted: Record<number, number> = {};
    for (const [k, v] of Object.entries(state.result.adjusted)) adjusted[Number(k)] = v;
    const questionTexts: Record<number, string> = {};
    for (const q of masters.questions) questionTexts[q.no] = q.text;
    return evaluateItemRules(itemRules, { adjusted, rawAnswers: raw, questionTexts });
  }, [state, masters, itemRules]);

  // F-05: MD出力（マスタ・分析・層3が揃った時点の内容で生成）
  const markdown = useMemo<string | null>(() => {
    if (state.phase !== "ready" || !masters) return null;
    const r = state.result;
    return buildResultMarkdown({
      date: r.taken_at ?? new Date().toLocaleDateString("sv-SE"),
      total: r.total,
      bandDescription: r.band?.description ?? null,
      patternCode: r.pattern_code,
      factorScores: r.factor_scores,
      factorLevels: r.factor_levels,
      factors: masters.factors,
      questions: masters.questions,
      rawAnswers: r.raw_answers ?? {},
      analysis: pattern,
      itemComments,
    });
  }, [state, masters, pattern, itemComments]);

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
    if (submittingRef.current) return;
    submittingRef.current = true;
    setState({ phase: "loading" });
    submitAssessment(answers)
      .then((result) => {
        const stored: StoredResult = {
          ...result,
          raw_answers: answers,
          taken_at: new Date().toLocaleDateString("sv-SE"), // YYYY-MM-DD（ローカル時刻）
        };
        // F-08: 個人履歴に追記（前回比表示用）
        appendHistory({
          taken_at: stored.taken_at!,
          total: result.total,
          factor_scores: result.factor_scores,
          pattern_code: result.pattern_code,
        });
        try {
          window.sessionStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(stored));
          window.sessionStorage.removeItem(STORAGE_KEY_ANSWERS);
        } catch {
          // 保存不可でも表示は継続
        }
        setState({ phase: "ready", result: stored });
      })
      .catch((e: unknown) => {
        submittingRef.current = false; // 失敗時は再送信を許可
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
        <Link href="/assessment" className="inline-block rounded bg-brand-gold px-4 py-3 text-brand-ink hover:bg-brand-goldDeep">
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
        <p className="my-2 text-5xl font-bold tabular-nums text-brand-goldDeep">
          {result.total > 0 ? `+${result.total}` : result.total}
        </p>
        {result.band && (
          <div className="mt-4 rounded bg-brand-warm p-4 text-left">
            <h2 className="mb-1 text-sm font-bold text-gray-700">{S.bandHeading}</h2>
            <p className="text-sm leading-relaxed text-gray-700">{result.band.description}</p>
          </div>
        )}
        {/* F-08: 前回比（この端末の履歴に前回実施がある場合のみ） */}
        {prevEntry && (
          <p className="mt-3 text-xs text-gray-500">
            {prevEntry.total === result.total
              ? HS.same(prevEntry.taken_at)
              : HS.diffText(prevEntry.taken_at, prevEntry.total, result.total - prevEntry.total)}
          </p>
        )}
        {/* F-07: ベンチマーク（母数100件以上のときのみ） */}
        {benchmark?.available && benchmark.top_percent !== undefined && (
          <p className="mt-3 text-xs text-gray-500">
            {S.benchmarkText(benchmark.n, benchmark.top_percent)}
          </p>
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

      {/* 層3: item_rules による補足コメント */}
      {itemComments.length > 0 && (
        <div className="rounded-lg border p-4 sm:p-6">
          <h2 className="mb-3 text-sm font-bold text-gray-700">{PS.itemCommentsHeading}</h2>
          <ul className="space-y-3">
            {itemComments.map((c, i) => (
              <li key={i} className="text-sm leading-relaxed text-gray-700">
                {c.comment}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* F-05: MD出力（ダウンロード・コピー） */}
      {markdown && (
        <ExportActions
          markdown={markdown}
          filenameDate={(result.taken_at ?? new Date().toLocaleDateString("sv-SE")).replaceAll("-", "")}
        />
      )}

      {/* F-09: リード導線（帯別コンテンツ＋任意メール登録） */}
      <LeadSection total={result.total} assessmentId={result.assessment_id} />

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
