"use client";

// F-03: 因子別レーダーチャート（recharts。5因子平均 −2〜+2）
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

interface Props {
  /** 因子コード順（F1..F5）の表示名 */
  factors: { code: string; name: string }[];
  /** 因子コード → 平均スコア（−2.0〜+2.0） */
  scores: Record<string, number>;
  /** 比較系列（チーム平均等。省略可） */
  compare?: { label: string; scores: Record<string, number> };
}

export default function FactorRadar({ factors, scores, compare }: Props) {
  const data = factors.map((f) => ({
    name: f.name,
    score: scores[f.code] ?? 0,
    ...(compare ? { compareScore: compare.scores[f.code] ?? 0 } : {}),
  }));

  return (
    <div className="h-72 w-full sm:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="70%">
          <PolarGrid />
          <PolarAngleAxis dataKey="name" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[-2, 2]} tickCount={5} tick={{ fontSize: 10 }} />
          <Radar name="あなた" dataKey="score" stroke="#111827" fill="#111827" fillOpacity={0.25} />
          {compare && (
            <Radar
              name={compare.label}
              dataKey="compareScore"
              stroke="#9ca3af"
              fill="#9ca3af"
              fillOpacity={0.15}
            />
          )}
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
