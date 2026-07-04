import Link from "next/link";

// /privacy : プライバシーポリシー（仕様§9・タスク3-4）
export const metadata = {
  title: "プライバシーポリシー | 「言える化」セルフアセスメント",
};

export default function PrivacyPage() {
  return (
    <section className="space-y-6">
      <h1 className="text-xl font-bold">プライバシーポリシー</h1>
      <p className="text-sm leading-relaxed text-gray-600">
        「言える化」セルフアセスメント（以下「本サービス」）は、オーセンティックワークス株式会社（以下「当社」）が提供します。本サービスにおける情報の取り扱いは以下のとおりです。
      </p>

      <div className="space-y-5 text-sm leading-relaxed text-gray-700">
        <div>
          <h2 className="mb-1 font-bold">1. 回答の匿名性</h2>
          <p>
            アセスメントの回答は匿名で送信・保存されます。氏名・所属・IPアドレスなど、個人を特定できる情報は回答と一緒に収集・保存しません。
          </p>
        </div>

        <div>
          <h2 className="mb-1 font-bold">2. 収集する情報</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>20問への回答内容と、そこから算出されるスコア・分析パターン（匿名）</li>
            <li>チームで実施する場合のチーム名（任意入力）と役割タグ（任意）</li>
            <li>
              情報提供を希望された場合のメールアドレス（明示的な同意をいただいた場合のみ）
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-1 font-bold">3. 利用目的</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>診断結果の算出・表示、チーム集計、全体統計（ベンチマーク）の作成</li>
            <li>登録されたメールアドレスへの、組織づくりに関する情報のご案内</li>
            <li>本サービスの品質向上のための統計的な分析</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-1 font-bold">4. ブラウザへの保存</h2>
          <p>
            回答の途中経過・診断結果・実施履歴は、お使いのブラウザ（sessionStorage / localStorage）にのみ保存され、当社のサーバーには回答・スコア以外を送信しません。ブラウザのデータを削除すると、これらの情報も削除されます。本サービスは広告目的のCookieを使用しません。
          </p>
        </div>

        <div>
          <h2 className="mb-1 font-bold">5. 第三者提供</h2>
          <p>
            法令に基づく場合を除き、収集した情報を第三者に提供しません。データの保管には Supabase（データベース）および Vercel（ホスティング）を利用しています。
          </p>
        </div>

        <div>
          <h2 className="mb-1 font-bold">6. メール配信の停止・登録情報の削除</h2>
          <p>
            ご案内メールはいつでも配信停止できます。登録したメールアドレスの削除をご希望の場合は、下記の問い合わせ先までご連絡ください。
          </p>
        </div>

        <div>
          <h2 className="mb-1 font-bold">7. お問い合わせ</h2>
          <p>
            本ポリシーに関するお問い合わせは、
            <a
              href="https://www.authentic-a.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-tealDeep underline"
            >
              オーセンティックワークス株式会社
            </a>
            のサイトよりお願いします。
          </p>
        </div>

        <div>
          <h2 className="mb-1 font-bold">8. 改定</h2>
          <p>本ポリシーは必要に応じて改定されることがあります。改定後の内容は本ページに掲載します。</p>
        </div>
      </div>

      <p className="text-xs text-gray-400">制定日: 2026年7月</p>

      <div>
        <Link href="/" className="text-sm text-gray-500 underline">
          トップへ戻る
        </Link>
      </div>
    </section>
  );
}
