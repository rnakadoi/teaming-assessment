"use client";

// F-01: 20問・5段階・1問1画面・進捗バー・戻る・sessionStorage保持
// 個人利用(/assessment)とチーム参加(/t/[code])の両方から使う共通フォーム

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchMasters, type Question } from "@/lib/masters";
import type { AnswerMap } from "@/lib/scoring";
import { ASSESSMENT_STRINGS as S, SCALE_OPTIONS, STORAGE_KEY_ANSWERS } from "@/lib/strings";

interface Props {
  /** 全問回答後「結果を見る」で呼ばれる。送信処理は呼び出し側の責務 */
  onComplete: (answers: AnswerMap) => void | Promise<void>;
  /** sessionStorage のキー（チームモードでは別キーにして混線を防ぐ） */
  storageKey?: string;
}

type Phase = "loading" | "error" | "answering" | "review" | "submitting";

function loadSaved(key: string): AnswerMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    const out: AnswerMap = {};
    for (const [k, v] of Object.entries(parsed)) {
      const no = Number(k);
      if (no >= 1 && no <= 20 && Number.isInteger(v) && v >= 1 && v <= 5) out[no] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export default function AssessmentForm({ onComplete, storageKey = STORAGE_KEY_ANSWERS }: Props) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [index, setIndex] = useState(0); // 表示中の設問（0-based）
  const [phase, setPhase] = useState<Phase>("loading");

  const load = useCallback(() => {
    setPhase("loading");
    fetchMasters()
      .then((m) => {
        setQuestions(m.questions);
        const saved = loadSaved(storageKey);
        setAnswers(saved);
        // 途中再開: 最初の未回答問へ
        const firstUnanswered = m.questions.findIndex((q) => saved[q.no] === undefined);
        if (firstUnanswered === -1) {
          setIndex(m.questions.length - 1);
          setPhase("review");
        } else {
          setIndex(firstUnanswered);
          setPhase("answering");
        }
      })
      .catch(() => setPhase("error"));
  }, [storageKey]);

  useEffect(() => {
    load();
  }, [load]);

  const persist = useCallback(
    (next: AnswerMap) => {
      try {
        window.sessionStorage.setItem(storageKey, JSON.stringify(next));
      } catch {
        // プライベートモード等で保存不可でも回答継続は妨げない
      }
    },
    [storageKey]
  );

  const select = useCallback(
    (value: number) => {
      const q = questions[index];
      if (!q) return;
      const next = { ...answers, [q.no]: value };
      setAnswers(next);
      persist(next);
      if (index + 1 < questions.length) {
        setIndex(index + 1);
      } else {
        setPhase("review");
      }
    },
    [answers, index, persist, questions]
  );

  // キーボード操作: 1〜5で回答、←で戻る（§9）
  useEffect(() => {
    if (phase !== "answering") return;
    const handler = (e: KeyboardEvent) => {
      if (e.key >= "1" && e.key <= "5") {
        select(Number(e.key));
      } else if (e.key === "ArrowLeft" && index > 0) {
        setIndex(index - 1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase, index, select]);

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.no] !== undefined).length,
    [questions, answers]
  );

  if (phase === "loading") {
    return <p className="py-16 text-center text-gray-500">{S.loading}</p>;
  }

  if (phase === "error") {
    return (
      <div className="space-y-4 py-16 text-center">
        <p className="text-gray-600">{S.loadError}</p>
        <button onClick={load} className="rounded border px-4 py-2">
          {S.retry}
        </button>
      </div>
    );
  }

  if (phase === "review" || phase === "submitting") {
    return (
      <div className="space-y-6 py-8 text-center">
        <h2 className="text-lg font-bold">{S.reviewTitle}</h2>
        <p className="text-sm text-gray-600">{S.reviewNote}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={async () => {
              setPhase("submitting");
              try {
                await onComplete(answers);
              } catch {
                setPhase("review");
              }
            }}
            disabled={phase === "submitting"}
            className="rounded bg-gray-900 px-4 py-3 text-white disabled:opacity-50"
          >
            {phase === "submitting" ? S.submitting : S.seeResults}
          </button>
          <button
            onClick={() => {
              setPhase("answering");
              setIndex(questions.length - 1);
            }}
            disabled={phase === "submitting"}
            className="rounded border px-4 py-3 disabled:opacity-50"
          >
            {S.back}
          </button>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const progressPct = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="space-y-6">
      {/* 進捗 */}
      <div>
        <div className="mb-1 flex justify-between text-xs text-gray-500">
          <span>{S.progressLabel(index + 1, questions.length)}</span>
          <span>{progressPct}%</span>
        </div>
        <div
          className="h-2 w-full rounded bg-gray-200"
          role="progressbar"
          aria-valuenow={progressPct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-2 rounded bg-gray-900 transition-all" style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      <p className="text-xs text-gray-500">{S.instruction}</p>

      {/* 設問（元資料の表記のまま表示・整形しない） */}
      <h2 className="min-h-[4.5rem] text-lg font-bold leading-relaxed">
        {q.no}. {q.text}
      </h2>

      {/* 5段階選択肢 */}
      <div className="flex flex-col gap-2" role="radiogroup" aria-label={`設問${q.no}`}>
        {SCALE_OPTIONS.map((opt) => {
          const selected = answers[q.no] === opt.value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={selected}
              onClick={() => select(opt.value)}
              className={`rounded border px-4 py-3 text-left transition-colors ${
                selected
                  ? "border-gray-900 bg-gray-900 text-white"
                  : "border-gray-300 bg-white hover:bg-gray-50"
              }`}
            >
              <span className="mr-2 text-xs text-gray-400">{opt.value}</span>
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* 戻る */}
      <div>
        <button
          onClick={() => setIndex(Math.max(0, index - 1))}
          disabled={index === 0}
          className="text-sm text-gray-500 underline disabled:opacity-30"
        >
          ← {S.back}
        </button>
      </div>
    </div>
  );
}
