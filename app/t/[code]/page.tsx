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
type Phase = "loading" | "not-found" | "intro" | "answering" | "error";

export default function TeamJoinPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const code = params.code.toUpperCase();
  const [team, setTeam] = useState<TeamInfo | null>(null);
  const [phase, setPhase] = useState<Phase>("loading");
  const [role, setRole] = useState<Role>(undefined);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchTeamByCode(code)
      .then((t) => {
        if (!t) {
          setPhase("not-found");
        } else {
          setTeam(t);
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
                  role === value ? "border-gray-900 bg-gray-900 text-white" : "border-gray-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setPhase("answering")}
          className="w-full rounded bg-gray-900 px-4 py-3 text-white"
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
