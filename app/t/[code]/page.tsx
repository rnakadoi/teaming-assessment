"use client";

// /t/{code} : チーム参加回答（F-06: コード検証→役割タグ任意→回答→wave紐付け送信）
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AssessmentForm from "@/components/AssessmentForm";
import { fetchTeamByCode, type TeamInfo } from "@/lib/team";
import { submitAssessment } from "@/lib/submit";
import type { AnswerMap } from "@/lib/scoring";
import { STORAGE_KEY_RESULT, TEAM_STRINGS as S } from "@/lib/strings";

type Role = "leader" | "member" | undefined;
type Phase = "loading" | "not-found" | "closed" | "intro" | "already" | "answering" | "error";

/** この端末で回答済みかを記録するキー（S-4: 再回答の強制を防ぐ） */
const submittedKey = (code: string) => `yieruka.submitted.team.${code}`;

export default function TeamJoinPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [role, setRole] = useState<Role>(undefined);
  const [message, setMessage] = useState<string | null>(null);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamByCode(code)
      .then((t) => {
        if (!t) {
          setPhase("not-found");
          return;
        }
        setTeam(t);
        // 受付終了中の実施回には回答できない（2026-07-12 仕様変更）
        if (t.latestWaveClosed) {
          setPhase("closed");
          return;
        }
        // 回答済み端末は回答フローに入れず案内画面へ
        let done: string | null = null;
        try {
          done = window.localStorage.getItem(submittedKey(code));
        } catch {
          /* noop */
        }
        if (done) {
          setSubmittedAt(done);
          setPhase("already");
        } else {
          setPhase("intro");
        }
      })
      .catch(() => setPhase("not-found"));
  }, [code]);

  const complete = async (answers: AnswerMap) => {
    try {
      const result = await submitAssessment(answers, code, role);
      const stored = {
        ...result,
        raw_answers: answers,
        taken_at: new Date().toLocaleDateString("sv-SE"),
      };
      try {
        window.sessionStorage.setItem(STORAGE_KEY_RESULT, JSON.stringify(stored));
        window.sessionStorage.removeItem(`yieruka.answers.team.${code}`);
        window.localStorage.setItem(submittedKey(code), stored.taken_at);
      } catch {
        /* 保存不可でも遷移は継続 */
      }
      router.push("/result");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "送信に失敗しました。");
      throw e; // AssessmentForm 側で review 状態へ戻す
    }
  };

  if (phase === "loading") {
    return <p className="py-16 text-center text-gray-500">{S.loading}</p>;
  }

  if (phase === "not-found") {
    return (
      <section className="space-y-6 py-8 text-center">
        <p className="text-gray-600">{S.notFound}</p>
        <Link href="/" className="inline-block rounded border px-4 py-3">
          トップへ戻る
        </Link>
      </section>
    );
  }

  if (phase === "closed") {
    return (
      <section className="space-y-6">
        <h1 className="text-xl font-bold">{S.joinTitle(team?.name ?? null, code)}</h1>
        <div className="rounded-lg border border-brand-line bg-brand-warm p-4 sm:p-6">
          <p className="text-sm font-bold text-brand-ink">{S.joinClosedTitle}</p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{S.joinClosedLead}</p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href={`/t/${code}/results`}
            className="rounded bg-brand-gold px-4 py-3 text-center font-semibold text-brand-ink hover:bg-brand-goldDeep"
          >
            チームの集計を見る
          </Link>
          <Link href="/" className="rounded border px-4 py-3 text-center">
            トップへ戻る
          </Link>
        </div>
      </section>
    );
  }

  if (phase === "already") {
    return (
      <section className="space-y-6">
        <h1 className="text-xl font-bold">{S.joinTitle(team?.name ?? null, code)}</h1>
        <div className="rounded-lg border border-brand-line bg-brand-warm p-4 sm:p-6">
          <p className="text-sm font-bold text-brand-ink">
            このチームには回答済みです{submittedAt ? `（${submittedAt}）` : ""}
          </p>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            再度回答する必要はありません。チームの集計は下のボタンから閲覧できます（閲覧コードが必要です）。
          </p>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            href={`/t/${code}/results`}
            className="rounded bg-brand-gold px-4 py-3 text-center font-semibold text-brand-ink hover:bg-brand-goldDeep"
          >
            チームの集計を見る
          </Link>
          <Link href="/result" className="rounded border px-4 py-3 text-center">
            自分の診断結果を見る
          </Link>
          <button
            onClick={() => setPhase("intro")}
            className="text-sm text-gray-500 underline"
          >
            新しい実施回などで、もう一度回答する
          </button>
        </div>
      </section>
    );
  }

  if (phase === "intro") {
    return (
      <section className="space-y-6">
        <h1 className="text-xl font-bold">{S.joinTitle(team?.name ?? null, code)}</h1>
        <p className="text-sm leading-relaxed text-gray-600">{S.joinLead}</p>

        <div className="space-y-2">
          <p className="text-sm text-gray-700">{S.roleLabel}</p>
          <div className="flex flex-col gap-2" role="radiogroup" aria-label={S.roleLabel}>
            {(
              [
                [undefined, S.roleUnspecified],
                ["leader", S.roleLeader],
                ["member", S.roleMember],
              ] as [Role, string][]
            ).map(([value, label]) => (
              <button
                key={label}
                role="radio"
                aria-checked={role === value}
                onClick={() => setRole(value)}
                className={`rounded border px-4 py-3 text-left ${
                  role === value
                    ? "border-brand-gold bg-brand-goldSoft font-semibold text-brand-goldInk"
                    : "border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setPhase("answering")}
          className="w-full rounded bg-brand-gold px-4 py-3 text-brand-ink hover:bg-brand-goldDeep"
        >
          {S.startButton}
        </button>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">{S.joinTitle(team?.name ?? null, code)}</h1>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <AssessmentForm onComplete={complete} storageKey={`yieruka.answers.team.${code}`} />
    </section>
  );
}
