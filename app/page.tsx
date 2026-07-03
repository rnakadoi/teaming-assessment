import Link from "next/link";

// / : ランディング（v1踏襲＋チーム作成導線）
export default function Home() {
  return (
    <section className="space-y-6">
      <h1 className="text-2xl font-bold">「言える化」セルフアセスメント</h1>
      <p className="text-gray-600">
        あなたの組織の「言える化」度合いを測定します。20問・所要3〜5分。
      </p>
      <div className="flex flex-col gap-3">
        <Link href="/assessment" className="rounded bg-gray-900 px-4 py-3 text-center text-white">
          アセスメントを開始する
        </Link>
        <Link href="/team/new" className="rounded border px-4 py-3 text-center">
          チームで実施する（チーム作成）
        </Link>
      </div>
      <p className="text-xs text-gray-400">TODO: スコア説明・利用の流れ（フェーズ1）</p>
    </section>
  );
}
