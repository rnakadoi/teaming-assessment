import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "「言える化」セルフアセスメント",
  description: "あなたの組織の「言える化」度合いを測定するセルフアセスメントです。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <main className="mx-auto max-w-2xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
