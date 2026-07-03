import Link from "next/link";

// / : ランディング（個人実施＋チーム作成導線）
export default function Home() {
  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold leading-snug">
          「言える化」セルフアセスメント
        </h1>
        <p className="leading-relaxed text-gray-600">
          会議で本当のことが言えているか——。あなたの組織・チームの「言える化」の度合いを、
          20問のセルフチェックで測定します。所要時間は3〜5分です。
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link href="/assessment" className="rounded bg-gray-900 px-4 py-3 text-center text-white">
          アセスメントを開始する
        </Link>
        <Link href="/team/new" className="rounded border px-4 py-3 text-center">
          チームで実施する（チーム作成）
        </Link>
      </div>

      <div className="space-y-4 rounded-lg border p-4 sm:p-6">
        <h2 className="text-sm font-bold text-gray-700">わかること</h2>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gray-600">
          <li>
            総合スコア（−40〜+40）と9段階の解説 —— チームの「言える化」の現在地
          </li>
          <li>
            5つの因子（言える場の開放度／フィードバックの循環／当事者意識・自律／対話・会議の質／関係性の土壌）ごとのスコアとレーダーチャート
          </li>
          <li>
            回答パターンに応じた構造分析と「最初の一歩」の提案
          </li>
          <li>
            結果をMarkdownで持ち出して、生成AIに相談したりチームの対話の材料にしたりできます
          </li>
        </ul>
      </div>

      <div className="space-y-2 text-xs leading-relaxed text-gray-400">
        <p>回答は匿名です。個人を特定する情報は収集しません。</p>
        <p>
          直近のチームの会議や話し合いの場面を思い浮かべながら、直感でお答えください。
        </p>
      </div>
    </section>
  );
}
