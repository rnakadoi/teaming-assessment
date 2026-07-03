"use client";

// F-05: MD出力（「MDをダウンロード」「コピーしてAIに相談」＋トースト）
import { useEffect, useState } from "react";
import { EXPORT_STRINGS as S } from "@/lib/strings";

interface Props {
  /** 出力するMD全文 */
  markdown: string;
  /** ファイル名用日付（YYYYMMDD） */
  filenameDate: string;
}

export default function ExportActions({ markdown, filenameDate }: Props) {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const download = () => {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `言える化アセスメント結果_${filenameDate}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      setToast(S.copied);
    } catch {
      setToast(S.copyFailed);
    }
  };

  return (
    <div className="rounded-lg border p-4 sm:p-6">
      <h2 className="mb-3 text-sm font-bold text-gray-700">{S.heading}</h2>
      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={download} className="flex-1 rounded border px-4 py-3 hover:bg-gray-50">
          {S.download}
        </button>
        <button
          onClick={copy}
          className="flex-1 rounded bg-gray-900 px-4 py-3 text-white hover:bg-gray-700"
        >
          {S.copy}
        </button>
      </div>
      <p className="mt-3 text-xs text-gray-400">{S.note}</p>

      {/* トースト */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-3rem)] max-w-md -translate-x-1/2 rounded bg-gray-900 px-4 py-3 text-center text-sm text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
