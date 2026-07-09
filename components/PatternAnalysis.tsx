"use client";

// F-04: 243パターン分析のアコーディオン段階表示
// 見立て → 構造分析 → 最初の一歩 → SOUNDの観点 → 関連リンク（＋層3コメントは親側で続けて表示）
import { useState } from "react";
import type { PatternAnalysis as PatternAnalysisRow, PatternLink } from "@/lib/masters";
import { PATTERN_STRINGS as S } from "@/lib/strings";

interface Props {
  patternCode: string;
  analysis: PatternAnalysisRow | null;
}

/** links jsonb を安全に PatternLink[] へ変換する */
export function parseLinks(raw: unknown): PatternLink[] {
  if (!Array.isArray(raw)) return [];
  const out: PatternLink[] = [];
  for (const item of raw) {
    if (
      item &&
      typeof item === "object" &&
      typeof (item as Record<string, unknown>).label === "string" &&
      typeof (item as Record<string, unknown>).url === "string"
    ) {
      out.push({ label: (item as PatternLink).label, url: (item as PatternLink).url });
    }
  }
  return out;
}

function Section({
  title,
  body,
  defaultOpen,
}: {
  title: string;
  body: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="font-bold">{title}</span>
        <span className="text-gray-400">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <p className="whitespace-pre-wrap pb-4 text-base leading-relaxed text-gray-700">{body}</p>
      )}
    </div>
  );
}

export default function PatternAnalysis({ patternCode, analysis }: Props) {
  const links = analysis ? parseLinks(analysis.links) : [];

  return (
    <div className="rounded-lg border p-4 sm:p-6">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-gray-700">{S.heading}</h2>
        <span className="rounded bg-gray-100 px-2 py-1 font-mono text-xs text-gray-500">
          {S.patternCodeLabel(patternCode)}
        </span>
      </div>

      {!analysis ? (
        <p className="py-4 text-base text-gray-500">{S.notReady}</p>
      ) : (
        <>
          {analysis.summary && <Section title={S.sectionSummary} body={analysis.summary} defaultOpen />}
          {analysis.background && <Section title={S.sectionBackground} body={analysis.background} />}
          {analysis.first_step && <Section title={S.sectionFirstStep} body={analysis.first_step} />}
          {analysis.sound_step && <Section title={S.sectionSoundStep} body={analysis.sound_step} />}
          {links.length > 0 && (
            <div className="pt-4">
              <h3 className="mb-2 text-base font-bold">{S.sectionLinks}</h3>
              <ul className="space-y-1 text-base">
                {links.map((l) => (
                  <li key={l.url}>
                    <a
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-brand-tealDeep underline"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
