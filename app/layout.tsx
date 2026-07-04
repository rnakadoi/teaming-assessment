import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";
import { FOOTER_LINKS } from "@/lib/links";

export const metadata: Metadata = {
  metadataBase: new URL("https://teaming-assessment.vercel.app"),
  title: "「言える化」セルフアセスメント",
  description: "あなたの組織の「言える化」度合いを測定するセルフアセスメントです。",
  openGraph: {
    title: "「言える化」セルフアセスメント",
    description: "あなたの組織の「言える化」度合いを20問で測定。結果は5因子の分析つき。",
    images: ["/api/og"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "「言える化」セルフアセスメント",
    description: "あなたの組織の「言える化」度合いを20問で測定。結果は5因子の分析つき。",
    images: ["/api/og"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className="flex min-h-screen flex-col">
        {/* ヘッダー: 左=ホームボタン / 右=AUTHENTIC WORKS ロゴ（透過PNG） */}
        <header className="border-b border-brand-line bg-white">
          <div className="mx-auto flex w-full max-w-2xl items-center justify-between px-4 py-2.5">
            <Link
              href="/"
              aria-label="ホームへ戻る"
              className="flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-gray-600 hover:bg-brand-warm hover:text-brand-ink"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9.5V21h5v-6h4v6h5V9.5" />
              </svg>
              ホーム
            </Link>
            <a
              href="https://www.authentic-a.com/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="オーセンティックワークス株式会社"
              className="shrink-0"
            >
              <Image
                src="/aw-logo.png"
                alt="AUTHENTIC WORKS"
                width={168}
                height={50}
                priority
                className="h-7 w-auto"
              />
            </a>
          </div>
        </header>
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
        {/* 共通フッター4リンク（仕様§4・フロント固定実装） */}
        <footer className="border-t border-brand-line bg-brand-cream">
          <div className="mx-auto max-w-2xl px-4 py-6">
            <ul className="flex flex-col gap-2 text-xs text-brand-tealDeep sm:flex-row sm:flex-wrap sm:gap-x-6">
              {FOOTER_LINKS.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:opacity-70"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-500">
              <Link href="/privacy" className="text-brand-tealDeep underline hover:opacity-70">
                プライバシーポリシー
              </Link>
              <span className="mx-2">|</span>© オーセンティックワークス株式会社
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
