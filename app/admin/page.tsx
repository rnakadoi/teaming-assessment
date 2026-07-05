"use client";

// /admin : オーセンティックワークス管理者ビュー（2026-07-05 仕様変更）
// 管理者コード（DB秘匿テーブル保管）で全チームの回答状況・閲覧コードを一覧できる
import { useEffect, useState } from "react";
import Link from "next/link";
import { adminListTeams, type AdminTeamRow } from "@/lib/team";

const ADMIN_CODE_KEY = "yieruka.admincode";
const viewCodeKey = (code: string) => `yieruka.viewcode.${code}`;

type State =
  | { phase: "gate" }
  | { phase: "loading" }
  | { phase: "ready"; teams: AdminTeamRow[] };

export default function AdminPage() {
  const [state, setState] = useState<State>({ phase: "gate" });
  const [input, setInput] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const load = (code: string) => {
    setState({ phase: "loading" });
    setMessage(null);
    adminListTeams(code)
      .then((teams) => {
        try {
          window.sessionStorage.setItem(ADMIN_CODE_KEY, code);
        } catch {
          /* noop */
        }
        setState({ phase: "ready", teams });
      })
      .catch((e: unknown) => {
        try {
          window.sessionStorage.removeItem(ADMIN_CODE_KEY);
        } catch {
          /* noop */
        }
        setMessage(e instanceof Error ? e.message : "取得に失敗しました。");
        setState({ phase: "gate" });
      });
  };

  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = window.sessionStorage.getItem(ADMIN_CODE_KEY);
    } catch {
      /* noop */
    }
    if (saved) load(saved);
  }, []);

  if (state.phase === "loading") {
    return <p className="py-16 text-center text-gray-500">読み込み中…</p>;
  }

  if (state.phase === "gate") {
    return (
      <section className="mx-auto max-w-md space-y-6 py-8">
        <h1 className="text-xl font-bold">管理者メニュー</h1>
        <p className="text-sm leading-relaxed text-gray-600">
          オーセンティックワークスの管理者コードを入力してください。全チームの回答状況と集計を閲覧できます。
        </p>
        <div className="space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            placeholder="管理者コード"
            className="w-full rounded border px-3 py-3 text-center font-mono text-lg tracking-widest"
            aria-label="管理者コード"
          />
          {message && <p className="text-sm text-red-600">{message}</p>}
          <button
            onClick={() => load(input)}
            disabled={input.length < 8}
            className="w-full rounded bg-brand-gold px-4 py-3 font-semibold text-brand-ink hover:bg-brand-goldDeep disabled:opacity-40"
          >
            一覧を表示する
          </button>
        </div>
      </section>
    );
  }

  const { teams } = state;

  return (
    <section className="space-y-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-xl font-bold">全チーム一覧（管理者）</h1>
        <span className="text-sm text-gray-500">{teams.length}チーム</span>
      </div>

      {teams.length === 0 ? (
        <p className="rounded-lg border p-6 text-sm text-gray-600">
          まだチームが作成されていません。
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-brand-warm text-left text-xs text-gray-500">
                <th className="px-3 py-2 font-normal">チーム名</th>
                <th className="px-3 py-2 font-normal">コード</th>
                <th className="px-3 py-2 font-normal">作成日</th>
                <th className="px-3 py-2 text-right font-normal">回答数</th>
                <th className="px-3 py-2 text-right font-normal">総合平均</th>
                <th className="px-3 py-2 font-normal">閲覧コード</th>
                <th className="px-3 py-2 font-normal"></th>
              </tr>
            </thead>
            <tbody>
              {teams.map((t) => (
                <tr key={t.code} className="border-b last:border-b-0">
                  <td className="px-3 py-2">{t.name ?? "（未設定）"}</td>
                  <td className="px-3 py-2 font-mono">{t.code}</td>
                  <td className="px-3 py-2 text-xs text-gray-500">
                    {new Date(t.created_at).toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{t.n}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {t.avg_total === null ? "—" : t.avg_total > 0 ? `+${t.avg_total}` : t.avg_total}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{t.view_code}</td>
                  <td className="px-3 py-2">
                    <Link
                      href={`/t/${t.code}/results`}
                      onClick={() => {
                        // 閲覧コードを事前セットして集計を直接開けるように
                        try {
                          window.sessionStorage.setItem(viewCodeKey(t.code), t.view_code);
                        } catch {
                          /* noop */
                        }
                      }}
                      className="text-brand-tealDeep underline"
                    >
                      集計を見る
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs leading-relaxed text-gray-400">
        個人の回答は匿名のため、管理者でも閲覧できません（人数・平均などの統計値のみ）。このページのURLと管理者コードは社外に共有しないでください。
      </p>
    </section>
  );
}
