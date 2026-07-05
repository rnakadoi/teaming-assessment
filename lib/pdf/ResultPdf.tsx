// 診断結果PDF（S-7）: スコア・因子表・パターン分析全文・層3コメント・回答一覧
// ヘッダー=AWロゴ / フッター=コピーライト・会社名・URL（base.tsx 共通）
import { pdf } from "@react-pdf/renderer";
import { AwPage, Document, PDF_COLORS, pdfStyles, StyleSheet, Text, View } from "./base";
import type { Factor, PatternAnalysis, Question } from "@/lib/masters";
import type { FiredComment } from "@/lib/rules";
import type { AnswerMap, FactorLevel } from "@/lib/scoring";
import { LEVEL_LABELS, SCALE_OPTIONS } from "@/lib/strings";
import { parseLinks } from "@/components/PatternAnalysis";

export interface ResultPdfInput {
  date: string; // YYYY-MM-DD
  total: number;
  bandDescription: string | null;
  patternCode: string;
  factorScores: Record<string, number>;
  factorLevels: Record<string, FactorLevel>;
  factors: Pick<Factor, "code" | "name">[];
  questions: Pick<Question, "no" | "text">[];
  rawAnswers: AnswerMap;
  analysis: PatternAnalysis | null;
  itemComments: FiredComment[];
}

const s = StyleSheet.create({
  scoreBox: {
    backgroundColor: PDF_COLORS.warm,
    borderRadius: 6,
    padding: 14,
    alignItems: "center",
    marginBottom: 4,
  },
  scoreLabel: { fontSize: 9, color: PDF_COLORS.sub, marginBottom: 6 },
  scoreValue: { fontSize: 34, fontWeight: "bold", color: PDF_COLORS.goldDeep, lineHeight: 1 },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.line,
    paddingVertical: 4,
  },
  cellName: { flex: 3 },
  cellNum: { flex: 1, textAlign: "right" },
  ansNo: { width: 24 },
  ansText: { flex: 1, paddingRight: 8 },
  ansValue: { width: 90, textAlign: "right" },
  fieldTitle: { fontWeight: "bold", color: PDF_COLORS.ink, marginBottom: 2 },
  linkText: { color: PDF_COLORS.teal, fontSize: 9 },
});

const signed = (n: number, digits = 0) =>
  `${n > 0 ? "+" : ""}${digits > 0 ? n.toFixed(digits) : n}`;

function ResultDocument({ input }: { input: ResultPdfInput }) {
  const scaleLabel = (v: number) =>
    SCALE_OPTIONS.find((o) => o.value === v)?.label ?? String(v);
  const links = input.analysis ? parseLinks(input.analysis.links) : [];

  return (
    <Document
      title="「言える化」セルフアセスメント 診断結果"
      author="オーセンティックワークス株式会社"
    >
      <AwPage headerTitle="「言える化」セルフアセスメント 診断結果">
        <Text style={pdfStyles.h1}>「言える化」セルフアセスメント 診断結果</Text>
        <Text style={pdfStyles.small}>実施日: {input.date}</Text>

        <View style={[s.scoreBox, { marginTop: 10 }]}>
          <Text style={s.scoreLabel}>総合スコア（−40〜+40）</Text>
          <Text style={s.scoreValue}>{signed(input.total)}</Text>
        </View>
        {input.bandDescription && (
          <Text style={pdfStyles.body}>{input.bandDescription}</Text>
        )}

        <Text style={pdfStyles.h2}>因子別スコア</Text>
        <View style={[s.row, { borderBottomColor: PDF_COLORS.gray }]}>
          <Text style={[s.cellName, pdfStyles.small]}>因子</Text>
          <Text style={[s.cellNum, pdfStyles.small]}>スコア（−2〜+2）</Text>
          <Text style={[s.cellNum, pdfStyles.small]}>水準</Text>
        </View>
        {input.factors.map((f) => (
          <View key={f.code} style={s.row}>
            <Text style={s.cellName}>{f.name}</Text>
            <Text style={s.cellNum}>{signed(input.factorScores[f.code] ?? 0, 2)}</Text>
            <Text style={s.cellNum}>
              {LEVEL_LABELS[input.factorLevels[f.code]] ?? input.factorLevels[f.code]}
            </Text>
          </View>
        ))}

        <Text style={pdfStyles.h2}>パターン分析（パターン: {input.patternCode}）</Text>
        {!input.analysis ? (
          <Text style={pdfStyles.body}>（このパターンの分析文は準備中です）</Text>
        ) : (
          <View>
            {input.analysis.summary && (
              <View>
                <Text style={s.fieldTitle}>■ 見立て</Text>
                <Text style={[pdfStyles.body, { marginBottom: 8 }]}>{input.analysis.summary}</Text>
              </View>
            )}
            {input.analysis.background && (
              <View>
                <Text style={s.fieldTitle}>■ 構造分析</Text>
                <Text style={[pdfStyles.body, { marginBottom: 8 }]}>
                  {input.analysis.background}
                </Text>
              </View>
            )}
            {input.analysis.first_step && (
              <View>
                <Text style={s.fieldTitle}>■ 最初の一歩</Text>
                <Text style={[pdfStyles.body, { marginBottom: 8 }]}>
                  {input.analysis.first_step}
                </Text>
              </View>
            )}
            {input.analysis.sound_step && (
              <View>
                <Text style={s.fieldTitle}>■ SOUNDの観点</Text>
                <Text style={[pdfStyles.body, { marginBottom: 8 }]}>
                  {input.analysis.sound_step}
                </Text>
              </View>
            )}
            {links.length > 0 && (
              <View>
                <Text style={s.fieldTitle}>■ 関連リンク</Text>
                {links.map((l) => (
                  <Text key={l.url} style={s.linkText}>
                    ・{l.label}　{l.url}
                  </Text>
                ))}
              </View>
            )}
          </View>
        )}

        {input.itemComments.length > 0 && (
          <View>
            <Text style={pdfStyles.h2}>回答の組み合わせから見えること</Text>
            {input.itemComments.map((c, i) => (
              <Text key={i} style={[pdfStyles.body, { marginBottom: 4 }]}>
                ・{c.comment}
              </Text>
            ))}
          </View>
        )}

        <Text style={pdfStyles.h2} break>
          回答一覧
        </Text>
        {[...input.questions]
          .sort((a, b) => a.no - b.no)
          .map((q) => (
            <View key={q.no} style={s.row}>
              <Text style={[s.ansNo, pdfStyles.small]}>{q.no}.</Text>
              <Text style={[s.ansText, { fontSize: 8.5 }]}>{q.text}</Text>
              <Text style={[s.ansValue, { fontSize: 8.5 }]}>
                {input.rawAnswers[q.no] !== undefined ? scaleLabel(input.rawAnswers[q.no]) : "—"}
              </Text>
            </View>
          ))}
      </AwPage>
    </Document>
  );
}

/** 診断結果PDFを生成してダウンロードする */
export async function downloadResultPdf(input: ResultPdfInput): Promise<void> {
  const blob = await pdf(<ResultDocument input={input} />).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `言える化アセスメント結果_${input.date.replaceAll("-", "")}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
