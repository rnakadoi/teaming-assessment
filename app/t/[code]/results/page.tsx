// /t/{code}/results : チーム集計（get_team_stats RPC）— フェーズ2
export default function TeamResultsPage({ params }: { params: { code: string } }) {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">チーム集計（{params.code}）</h1>
      <p className="text-gray-500">
        TODO: 人数・平均レーダー・ばらつき上位・役割別ギャップ（3名未満は分布非表示）（F-06）
      </p>
    </section>
  );
}
