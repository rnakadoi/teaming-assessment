import type { Metadata } from "next";
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
        <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">{children}</main>
        {/* 共通フッター4リンク（仕様§4・フロント固定実装） */}
        <footer className="border-t bg-gray-50">
          <div className="mx-auto max-w-2xl px-4 py-6">
            <ul className="flex flex-col gap-2 text-xs text-gray-500 sm:flex-row sm:flex-wrap sm:gap-x-6">
              {FOOTER_LINKS.map((l) => (
                <li key={l.url}>
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-gray-700"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-gray-400">
              <Link href="/privacy" className="underline hover:text-gray-600">
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
