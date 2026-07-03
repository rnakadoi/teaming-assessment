"use client";

// /team/new : チーム作成（F-06: 6文字コード発行→共有URL表示）
import { useState } from "react";
import Link from "next/link";
import { createTeam, type CreatedTeam } from "@/lib/team";
import { TEAM_STRINGS as S } from "@/lib/strings";

type Phase = "input" | "creating" | "done" | "error";

export default function TeamNewPage() {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [created, setCreated] = useState<CreatedTeam | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl = created
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/t/${created.code}`
    : "";

  const submit = async () => {
    setPhase("creating");
    setMessage(null);
    try {
      const team = await createTeam(name);
      setCreated(team);
      setPhase("done");
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "チーム作成に失敗しました。");
      setPhase("error");
    }
  };

  if (phase === "done" && created) {
    return (
      <section className="space-y-6">
        <h1 className="text-xl font-bold">{S.createdTitle}</h1>

        <div className="rounded-lg border p-6 text-center">
          <p className="text-sm text-gray-500">{S.codeLabel}</p>
          <p className="my-2 font-mono text-4xl font-bold tracking-widest">{created.code}</p>
        </div>

        <div className="space-y-2 rounded-lg border p-4 sm:p-6">
          <p className="text-sm font-bold text-gray-700">{S.shareUrlLabel}</p>
          <p className="break-all rounded bg-gray-50 p-3 font-mono text-sm">{shareUrl}</p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(shareUrl);
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
              } catch {
                /* コピー不可でもURLは画面に表示済み */
              }
            }}
            className="w-full rounded bg-gray-900 px-4 py-3 text-white"
          >
            {copied ? S.copiedUrl : S.copyUrl}
          </button>
        </div>

        <p className="text-xs text-gray-500">{S.note}</p>

        <div className="flex flex-col gap-3">
          <Link href={`/t/${created.code}`} className="rounded border px-4 py-3 text-center">
            {S.answerSelfLink}
          </Link>
          <Link
            href={`/t/${created.code}/results`}
            className="rounded border px-4 py-3 text-center"
          >
            {S.resultsLink}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <h1 className="text-xl font-bold">{S.newTitle}</h1>
      <p className="text-sm leading-relaxed text-gray-600">{S.newLead}</p>

      <div className="space-y-2">
        <label htmlFor="team-name" className="text-sm text-gray-700">
          {S.nameLabel}
        </label>
        <input
          id="team-name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={S.namePlaceholder}
          maxLength={50}
          className="w-full rounded border px-3 py-2"
        />
      </div>

      {message && <p className="text-sm text-red-600">{message}</p>}

      <button
        onClick={submit}
        disabled={phase === "creating"}
        className="w-full rounded bg-gray-900 px-4 py-3 text-white disabled:opacity-50"
      >
        {phase === "creating" ? S.creating : S.createButton}
      </button>
    </section>
  );
}
