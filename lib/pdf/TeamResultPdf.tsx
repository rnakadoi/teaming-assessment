// チーム集計結果PDF（2026-07-12 仕様変更: Metamo OrgResultPdf の移植）
// 総合平均・因子別平均（全体平均比較）・ばらつき上位・役割別平均・実施回推移を1枚に集約。
// 出力するのは統計値のみ（個人の生回答は含めない。匿名設計と両立）
// ヘッダー=AWロゴ / フッター=コピーライト・会社名・URL（base.tsx 共通）
import { pdf } from "@react-pdf/renderer";
import { AwPage, Document, PDF_COLORS, pdfStyles, StyleSheet, Text, View } from "./base";
import { signed, varianceTop, type TeamExportInput } from "@/lib/team-export";
import { APP_TITLE, ROLE_LABELS, TEAM_STRINGS } from "@/lib/strings";

const FACTOR_CODES = ["F1", "F2", "F3", "F4", "F5"];

const s = StyleSheet.create({
  statRow: { flexDirection: "row", gap: 8, marginTop: 8 },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: PDF_COLORS.line,
    borderRadius: 6,
    padding: 8,
    alignItems: "center",
  },
  statValue: { fontSize: 16, fontWeight: "bold", color: PDF_COLORS.goldDeep },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.line,
    paddingVertical: 4,
  },
  cellName: { flex: 3 },
  cellNum: { flex: 1, textAlign: "right" },
  varItem: { marginBottom: 5 },
  varMeta: { fontSize: 8, color: PDF_COLORS.sub },
});

function TeamResultDocument({ input }: { input: TeamExportInput }) {
  const st = input.stats;
  const global = input.global;
  const factorName = (code: string) =>
    input.masters?.factors.find((f) => f.code === code)?.name ?? code;
  const variance = varianceTop(st.item_stats, input.masters?.questions ?? []);

  return (
    <Document title={`${APP_TITLE} チーム集計`} author="オーセンティックワークス株式会社">
      <AwPage headerTitle={`${APP_TITLE} チーム集計`}>
        <Text style={pdfStyles.h1}>
          チーム集計{st.team_name ? `: ${st.team_name}` : ""}
        </Text>
        <Text style={pdfStyles.small}>
          チームコード: {st.team_code}　／　出力日: {input.date}　／　回答者数: {st.n}名
        </Text>

        {st.n === 0 ? (
          <Text style={[pdfStyles.body, { marginTop: 12 }]}>{TEAM_STRINGS.statsEmpty}</Text>
        ) : (
          <View>
            {/* 総合平均（＋全体平均） */}
            <View style={s.statRow}>
              <View style={s.statBox}>
                <Text style={pdfStyles.small}>総合スコア平均（−40〜+40）</Text>
                <Text style={s.statValue}>
                  {st.avg_total === null ? "—" : signed(st.avg_total, 1)}
                </Text>
              </View>
              {global?.available && global.avg_total !== undefined && (
                <View style={s.statBox}>
                  <Text style={pdfStyles.small}>全体平均（これまでの全{global.n}件）</Text>
                  <Text style={[s.statValue, { color: PDF_COLORS.gray }]}>
                    {signed(global.avg_total, 1)}
                  </Text>
                </View>
              )}
            </View>

            {/* 因子別平均 */}
            {st.factor_avg && (
              <View>
                <Text style={pdfStyles.h2}>因子別平均（−2〜+2）</Text>
                <View style={[s.row, { borderBottomColor: PDF_COLORS.gray }]}>
                  <Text style={[s.cellName, pdfStyles.small]}>因子</Text>
                  <Text style={[s.cellNum, pdfStyles.small]}>チーム平均</Text>
                  {global?.available && (
                    <Text style={[s.cellNum, pdfStyles.small]}>全体平均</Text>
                  )}
                </View>
                {FACTOR_CODES.filter((c) => st.factor_avg?.[c] !== undefined).map((c) => (
                  <View key={c} style={s.row}>
                    <Text style={s.cellName}>{factorName(c)}</Text>
                    <Text style={s.cellNum}>{signed(st.factor_avg?.[c] ?? 0, 3)}</Text>
                    {global?.available && (
                      <Text style={s.cellNum}>
                        {global.factor_avg?.[c] !== undefined
                          ? signed(global.factor_avg[c], 3)
                          : "—"}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {st.n < st.min_n_for_detail ? (
              <Text style={[pdfStyles.small, { marginTop: 10 }]}>
                {TEAM_STRINGS.statsFewNote(st.min_n_for_detail)}
              </Text>
            ) : (
              <View>
                {/* ばらつき上位項目 */}
                {variance.length > 0 && (
                  <View>
                    <Text style={pdfStyles.h2}>{TEAM_STRINGS.statsVariance}</Text>
                    {variance.map((v) => (
                      <View key={v.no} style={s.varItem}>
                        <Text style={pdfStyles.body}>
                          {v.no}. {v.text}
                        </Text>
                        <Text style={s.varMeta}>
                          平均 {v.avg.toFixed(2)}　／　標準偏差 {v.sd.toFixed(2)}
                        </Text>
                      </View>
                    ))}
                    <Text style={s.varMeta}>
                      回答が割れている項目は、メンバーごとに見えている景色が違う場所です。まずここから対話を始めるのがおすすめです。
                    </Text>
                  </View>
                )}

                {/* 役割別平均 */}
                {st.by_role && Object.keys(st.by_role).length > 0 && (
                  <View>
                    <Text style={pdfStyles.h2}>{TEAM_STRINGS.statsByRole}</Text>
                    {Object.entries(st.by_role).map(([role, avg]) => (
                      <View key={role} style={s.row}>
                        <Text style={s.cellName}>{ROLE_LABELS[role] ?? role}</Text>
                        <Text style={s.cellNum}>{signed(avg, 2)}</Text>
                      </View>
                    ))}
                    <Text style={[s.varMeta, { marginTop: 3 }]}>
                      ※2名以上の役割のみ表示されます。
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* 実施回ごとの推移 */}
            {input.waves.length > 1 && (
              <View>
                <Text style={pdfStyles.h2}>{TEAM_STRINGS.waveHeading}</Text>
                <View style={[s.row, { borderBottomColor: PDF_COLORS.gray }]}>
                  <Text style={[s.cellName, pdfStyles.small]}>実施回</Text>
                  <Text style={[s.cellNum, pdfStyles.small]}>開始日</Text>
                  <Text style={[s.cellNum, pdfStyles.small]}>受付</Text>
                  <Text style={[s.cellNum, pdfStyles.small]}>回答数</Text>
                  <Text style={[s.cellNum, pdfStyles.small]}>総合平均</Text>
                </View>
                {input.waves.map((w) => (
                  <View key={w.wave_no} style={s.row}>
                    <Text style={s.cellName}>
                      第{w.wave_no}回{w.label ? `（${w.label}）` : ""}
                    </Text>
                    <Text style={s.cellNum}>{w.created_at.slice(0, 10)}</Text>
                    <Text style={s.cellNum}>{w.closed_at ? "終了" : "受付中"}</Text>
                    <Text style={s.cellNum}>{w.n}</Text>
                    <Text style={s.cellNum}>
                      {w.avg_total === null ? "—" : signed(w.avg_total, 1)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={[pdfStyles.small, { marginTop: 10 }]}>
              {TEAM_STRINGS.statsAnonymity}
            </Text>
          </View>
        )}
      </AwPage>
    </Document>
  );
}

/** チーム集計PDFを生成してダウンロードする */
export async function downloadTeamResultPdf(input: TeamExportInput): Promise<void> {
  const blob = await pdf(<TeamResultDocument input={input} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `チーム集計_${input.stats.team_code}_${input.date.replaceAll("-", "")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
