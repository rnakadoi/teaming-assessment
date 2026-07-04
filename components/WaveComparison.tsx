"use client";

// F-08: wave（実施回）間の比較チャート＋一覧表
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WaveStat } from "@/lib/team";

interface Props {
  waves: WaveStat[];
}

export default function WaveComparison({ waves }: Props) {
  const answered = waves.filter((w) => w.n > 0);
  const data = answered.map((w) => ({
    name: w.label || `第${w.wave_no}回`,
    avg: w.avg_total,
    n: w.n,
  }));

  return (
    <div>
      {data.length >= 2 && (
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis domain={[-40, 40]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="avg"
                name="総合スコア平均"
                stroke="#111827"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
      <table className="mt-3 w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-gray-500">
            <th className="py-2 font-normal">実施回</th>
            <th className="py-2 text-right font-normal">回答者数</th>
            <th className="py-2 text-right font-normal">総合平均</th>
          </tr>
        </thead>
        <tbody>
          {waves.map((w) => (
            <tr key={w.wave_no} className="border-b last:border-b-0">
              <td className="py-2">
                {w.label || `第${w.wave_no}回`}
                <span className="ml-2 text-xs text-gray-400">
                  {new Date(w.created_at).toLocaleDateString("ja-JP")}〜
                </span>
              </td>
              <td className="py-2 text-right tabular-nums">{w.n}</td>
              <td className="py-2 text-right tabular-nums">
                {w.avg_total === null ? "—" : w.avg_total > 0 ? `+${w.avg_total}` : w.avg_total}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
