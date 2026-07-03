// /api/og : OGP画像動的生成（@vercel/og）— フェーズ3
export const runtime = "edge";

export async function GET() {
  // TODO: satori/@vercel/og でスコア＋レーダーのOG画像を生成（F-10）
  return new Response("OGP endpoint stub", { status: 200 });
}
