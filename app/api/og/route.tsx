// /api/og : OGP画像動的生成（F-10）
// スコアのみを描画する（分析文は含めない・仕様§4）。?total=12 のように総合スコアを渡す。
// パラメータなし（または不正値）の場合はタイトルのみのデフォルト画像を返す。
import { ImageResponse } from "@vercel/og";

export const runtime = "edge";

function parseTotal(value: string | null): number | null {
  if (value === null) return null;
  const n = Number(value);
  if (!Number.isInteger(n) || n < -40 || n > 40) return null;
  return n;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const total = parseTotal(searchParams.get("total"));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#111827",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 44, opacity: 0.9 }}>「言える化」セルフアセスメント</div>
        {total !== null ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ fontSize: 30, marginTop: 40, opacity: 0.7 }}>総合スコア（−40〜+40）</div>
            <div style={{ fontSize: 160, fontWeight: 700, lineHeight: 1.1 }}>
              {total > 0 ? `+${total}` : `${total}`}
            </div>
          </div>
        ) : (
          <div style={{ fontSize: 32, marginTop: 40, opacity: 0.7 }}>
            あなたのチームは、本当のことが言えていますか？
          </div>
        )}
        <div style={{ fontSize: 24, marginTop: 48, opacity: 0.6 }}>
          20問・3〜5分／オーセンティックワークス株式会社
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
