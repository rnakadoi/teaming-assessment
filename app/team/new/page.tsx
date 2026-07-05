"use client";

// /team/new : チーム作成（2026-07-05 仕様変更: 3コード発行＋管理情報PDF＋メンバー案内PDF）
import { useState } from "react";
import Link from "next/link";
import { createTeam, type CreatedTeam } from "@/lib/team";
import { TEAM_STRINGS as S } from "@/lib/strings";
import type { TeamPdfInput } from "@/lib/pdf/TeamPdfs";

type Phase = "input" | "creating" | "done" | "error";

export default function TeamNewPage() {
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [created, setCreated] = useState<CreatedTeam | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pdfBusy, setPdfBusy] = useState<"admin" | "guide" | null>(null);
  const [adminPdfDone, setAdminPdfDone] = useState(false);

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

  const pdfInput = (): TeamPdfInput => ({
    teamName: name.trim() || null,
    code: created!.code,
    viewCode: created!.viewCode,
    resetCode: created!.resetCode,
    createdAt: new Date().toLocaleDateString("sv-SE"),
    origin: window.location.origin,
  });

  const downloadPdf = async (kind: "admin" | "guide") => {
    if (!created) return;
    setPdfBusy(kind);
    setMessage(null);
    try {
      const m = await import("@/lib/pdf/TeamPdfs");
      if (kind === "admin") {
        await m.downloadTeamAdminPdf(pdfInput());
        setAdminPdfDone(true);
      } else {
        await m.downloadTeamGuidePdf(pdfInput());
      }
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "PDFの生成に失敗しました。");
    } finally {
      setPdfBusy(null);
    }
  };

  if (phase === "done" && created) {
    return (
      <section className="space-y-6">
        <h1 className="text-xl font-bold">{S.createdTitle}</h1>

        {/* 最重要: 管理情報PDFの保存 */}
        <div className="rounded-lg border-2 border-brand-gold bg-brand-goldSoft p-4 sm:p-6">
          <h2 className="mb-1 text-sm font-bold text-brand-goldInk">
            まず「チーム管理情報PDF」を保存してください
          </h2>
          <p className="mb-3 text-xs leading-relaxed text-brand-goldInk">
            この画面を閉じるとコードは再表示できません。管理情報PDFには3つのコードと紛失時の手順がすべて記載されています。
          </p>
          <button
            onClick={() => downloadPdf("admin")}
            disabled={pdfBusy !== null}
            className="w-full rounded bg-brand-gold px-4 py-3 font-semibold text-brand-ink hover:bg-brand-goldDeep disabled:opacity-50"
          >
            {pdfBusy === "admin"
              ? "生成中…"
              : adminPdfDone
                ? "✓ 保存済み（もう一度ダウンロード）"
                : "チーム管理情報PDFをダウンロード（必須）"}
          </button>
        </div>

        {/* 3コード表示 */}
        <div className="space-y-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-gray-500">① 参加コード（メンバー全員に共有）</p>
            <p className="my-1 font-mono text-3xl font-bold tracking-widest">{created.code}</p>
            <p className="break-all rounded bg-brand-warm p-2 font-mono text-xs">{shareUrl}</p>
            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                } catch {
                  /* URLは画面に表示済み */
                }
              }}
              className="mt-2 w-full rounded border border-brand-line px-4 py-2 text-sm hover:bg-brand-warm"
            >
              {copied ? S.copiedUrl : S.copyUrl}
            </button>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-xs text-gray-500">
              ② 閲覧コード（集計を見せたい人にだけ共有）
            </p>
            <p className="my-1 font-mono text-2xl font-bold tracking-widest">
              {created.viewCode}
            </p>
            <p className="text-xs text-gray-400">
              集計ページを開く際に必要です。回答者全員には不要です。
            </p>
          </div>

          <div className="rounded-lg border p-4">
            <p className="text-xs text-gray-500">③ リセットコード（作成者のみ保管）</p>
            <p className="my-1 font-mono text-2xl font-bold tracking-widest">
              {created.resetCode}
            </p>
            <p className="text-xs text-gray-400">
              閲覧コードを忘れた・漏れた時に、新しい閲覧コードを再発行するためのコードです。
            </p>
          </div>
        </div>

        {/* メンバー案内PDF */}
        <div className="rounded-lg border p-4 sm:p-6">
          <h2 className="mb-1 text-sm font-bold text-gray-700">メンバーへの案内</h2>
          <p className="mb-3 text-xs leading-relaxed text-gray-500">
            サーベイの目的・内容・回答方法・匿名性の説明と参加コードをまとめた案内PDFです。メンバーにそのまま配布できます。
          </p>
          <button
            onClick={() => downloadPdf("guide")}
            disabled={pdfBusy !== null}
            className="w-full rounded border border-brand-line px-4 py-3 hover:bg-brand-warm disabled:opacity-50"
          >
            {pdfBusy === "guide" ? "生成中…" : "メンバー配布用の案内PDFをダウンロード"}
          </button>
        </div>

        {message && <p className="text-sm text-red-600">{message}</p>}

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
      <p className="text-xs leading-relaxed text-gray-500">
        作成すると「参加コード」「閲覧コード（集計閲覧用）」「リセットコード（閲覧コード再発行用）」の3つが発行され、管理情報PDFとして保存できます。
      </p>

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
        className="w-full rounded bg-brand-gold px-4 py-3 font-semibold text-brand-ink hover:bg-brand-goldDeep disabled:opacity-50"
      >
        {phase === "creating" ? S.creating : S.createButton}
      </button>
    </section>
  );
}
