// /t/{code} : チーム参加（回答）— フェーズ2
export default function TeamJoinPage({ params }: { params: { code: string } }) {
  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">チーム回答（{params.code}）</h1>
      <p className="text-gray-500">TODO: 役割タグ選択→20問回答（F-06）</p>
    </section>
  );
}
