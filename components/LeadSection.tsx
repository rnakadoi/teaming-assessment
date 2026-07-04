"use client";

// F-09: リード導線（スコア帯別コンテンツ＋任意メール登録）
// 登録なしでも全機能が使える。メールは明示同意時のみ leads に保存される
import { useState } from "react";
import { leadContentFor } from "@/lib/lead-content";
import { registerLead } from "@/lib/leads";

interface Props {
  total: number;
  assessmentId?: string;
}

export default function LeadSection({ total, assessmentId }: Props) {
  const content = leadContentFor(total);
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await registerLead(email, consent, assessmentId);
      setDone(true);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : "登録に失敗しました。");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border p-4 sm:p-6">
      {/* スコア帯別の静的コンテンツ */}
      <h2 className="mb-2 text-sm font-bold text-gray-700">{content.heading}</h2>
      <p className="mb-3 text-sm leading-relaxed text-gray-600">{content.lead}</p>
      <ul className="space-y-1 text-sm">
        {content.links.map((l) => (
          <li key={l.url}>
            <a
              href={l.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-700 underline"
            >
              {l.label}
            </a>
          </li>
        ))}
      </ul>

      {/* 任意メール登録 */}
      <div className="mt-6 border-t pt-4">
        {done ? (
          <p className="text-sm text-gray-700">
            ご登録ありがとうございます。組織づくりに役立つ情報をお送りします。
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              組織づくりに役立つ情報のご案内を希望する方は、メールアドレスをご登録ください（任意）。
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded border px-3 py-2 text-sm"
              aria-label="メールアドレス"
            />
            <label className="flex items-start gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5"
              />
              オーセンティックワークス株式会社からの情報提供に同意します。メールアドレスは案内送付の目的にのみ使用され、いつでも配信停止できます。
            </label>
            {message && <p className="text-sm text-red-600">{message}</p>}
            <button
              onClick={submit}
              disabled={busy || !email || !consent}
              className="rounded bg-gray-900 px-4 py-2 text-sm text-white disabled:opacity-40"
            >
              {busy ? "登録中…" : "登録する"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
