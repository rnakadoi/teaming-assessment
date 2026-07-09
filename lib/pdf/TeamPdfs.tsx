// チーム作成時のPDF2種（S-3）
//  1) 管理情報PDF（作成者用・取扱注意）: 参加/閲覧/リセットの3コード＋URL＋紛失時手順
//  2) メンバー配布用案内PDF: サーベイの意図・目的・内容・回答手順・匿名性の説明＋参加コード/URL
// ヘッダー=AWロゴ / フッター=コピーライト・会社名・URL（base.tsx 共通）
import { pdf } from "@react-pdf/renderer";
import type { ReactElement } from "react";
import { AwPage, Document, PDF_COLORS, pdfStyles, StyleSheet, Text, View } from "./base";
import { APP_TITLE } from "@/lib/strings";

export interface TeamPdfInput {
  teamName: string | null;
  code: string; // 参加コード
  viewCode: string; // 閲覧コード
  resetCode: string; // リセットコード
  createdAt: string; // YYYY-MM-DD
  origin: string; // https://teaming-assessment.vercel.app
}

const s = StyleSheet.create({
  codeBox: {
    borderWidth: 1,
    borderColor: PDF_COLORS.line,
    borderRadius: 6,
    padding: 10,
    marginBottom: 8,
  },
  codeLabel: { fontSize: 8.5, color: PDF_COLORS.sub, marginBottom: 2 },
  codeValue: { fontSize: 18, fontWeight: "bold", color: PDF_COLORS.ink, letterSpacing: 2 },
  codeNote: { fontSize: 8, color: PDF_COLORS.sub, marginTop: 3 },
  url: { fontSize: 9, color: PDF_COLORS.teal },
  warn: {
    backgroundColor: PDF_COLORS.warm,
    borderRadius: 6,
    padding: 10,
    marginTop: 10,
  },
  li: { fontSize: 9.5, color: PDF_COLORS.gray, marginBottom: 3 },
  factorName: { fontWeight: "bold", color: PDF_COLORS.ink },
});

function AdminDocument({ input }: { input: TeamPdfInput }) {
  const joinUrl = `${input.origin}/t/${input.code}`;
  const resultsUrl = `${input.origin}/t/${input.code}/results`;
  return (
    <Document title={`${APP_TITLE} チーム管理情報`} author="オーセンティックワークス株式会社">
      <AwPage headerTitle={`${APP_TITLE} チーム管理情報`}>
        <Text style={pdfStyles.h1}>チーム管理情報（取扱注意）</Text>
        <Text style={pdfStyles.small}>
          チーム名: {input.teamName || "（未設定）"}　／　作成日: {input.createdAt}
        </Text>
        <Text style={[pdfStyles.body, { marginTop: 8, marginBottom: 10 }]}>
          本書はチーム作成者向けの管理情報です。3つのコードの役割が異なりますのでご注意ください。
          このPDFは再発行できません。必ず安全な場所に保管してください。
        </Text>

        <View style={s.codeBox}>
          <Text style={s.codeLabel}>① 参加コード（メンバー全員に共有してください）</Text>
          <Text style={s.codeValue}>{input.code}</Text>
          <Text style={s.codeNote}>回答用URL: {joinUrl}</Text>
        </View>

        <View style={s.codeBox}>
          <Text style={s.codeLabel}>
            ② 閲覧コード（チーム集計を見せたい人にだけ共有してください）
          </Text>
          <Text style={s.codeValue}>{input.viewCode}</Text>
          <Text style={s.codeNote}>
            集計ページ: {resultsUrl}　※開くと閲覧コードの入力を求められます
          </Text>
        </View>

        <View style={s.codeBox}>
          <Text style={s.codeLabel}>
            ③ リセットコード（作成者のみ保管。他の人に渡さないでください）
          </Text>
          <Text style={s.codeValue}>{input.resetCode}</Text>
          <Text style={s.codeNote}>
            閲覧コードを忘れた・漏れた場合に、新しい閲覧コードを自分で再発行するためのコードです
          </Text>
        </View>

        <View style={s.warn}>
          <Text style={{ fontWeight: "bold", color: PDF_COLORS.ink, marginBottom: 4 }}>
            閲覧コードを忘れた／漏れてしまったときは
          </Text>
          <Text style={s.li}>
            1. 集計ページ（上記URL）を開き、「閲覧コードを忘れた場合」を選びます
          </Text>
          <Text style={s.li}>2. ③のリセットコードを入力すると、新しい閲覧コードが発行されます</Text>
          <Text style={s.li}>
            3. 古い閲覧コードはその時点で無効になります（漏れた場合の対処にもなります）
          </Text>
          <Text style={[s.li, { marginTop: 4 }]}>
            ※リセットコードも紛失した場合、コードの復元はできません。新しいチームを作成し、メンバーに再回答を依頼してください。
          </Text>
        </View>

        <Text style={pdfStyles.h2}>チーム集計でできること</Text>
        <Text style={s.li}>・回答人数と総合スコア平均、5因子ごとの平均（レーダーチャート）</Text>
        <Text style={s.li}>
          ・回答が割れている項目（対話の起点）と役割別の平均 ※回答3名以上で表示
        </Text>
        <Text style={s.li}>・実施回（第1回・第2回…）ごとの推移。定期実施で変化を追えます</Text>
        <Text style={s.li}>
          ・個人の回答は表示されません（匿名）。集計は上記の統計値のみです
        </Text>
      </AwPage>
    </Document>
  );
}

function GuideDocument({ input }: { input: TeamPdfInput }) {
  const joinUrl = `${input.origin}/t/${input.code}`;
  return (
    <Document title={`${APP_TITLE} のご案内`} author="オーセンティックワークス株式会社">
      <AwPage headerTitle={`${APP_TITLE} ご案内`}>
        <Text style={pdfStyles.h1}>{APP_TITLE} のご案内</Text>
        {input.teamName && (
          <Text style={pdfStyles.small}>対象チーム: {input.teamName}</Text>
        )}

        <Text style={pdfStyles.h2}>このアセスメントの目的</Text>
        <Text style={[pdfStyles.body, { marginBottom: 6 }]}>
          「言える化」とは、メンバーが対人関係上のリスクを恐れず、本音や意見を安心して表現でき、
          それが協働の進化に活かされている状態のことです。このアセスメントは、いまのチームがどれくらい
          「本当のことを言える」状態にあるかを5つの観点から見える化し、チームで対話するための
          材料をつくることを目的としています。
        </Text>
        <Text style={pdfStyles.body}>
          個人の評価やランク付けを行うものではありません。うまく答えようとせず、
          最近のチームの会議や話し合いの場面を思い浮かべて、直感でお答えください。
          正直な回答こそが、チームにとって最も価値のあるデータになります。
        </Text>

        <Text style={pdfStyles.h2}>内容と所要時間</Text>
        <Text style={s.li}>・設問: 20問（5段階で回答）／所要時間: 3〜5分</Text>
        <Text style={s.li}>
          ・見える化される5つの観点: <Text style={s.factorName}>言える場の開放度</Text>／
          <Text style={s.factorName}>フィードバックの循環</Text>／
          <Text style={s.factorName}>当事者意識・自律</Text>／
          <Text style={s.factorName}>対話・会議の質</Text>／
          <Text style={s.factorName}>関係性の土壌</Text>
        </Text>
        <Text style={s.li}>
          ・回答後、あなた自身の結果（スコア・分析・明日からの一歩）がその場で表示されます
        </Text>

        <Text style={pdfStyles.h2}>回答方法</Text>
        <View style={s.codeBox}>
          <Text style={s.codeLabel}>回答用URL（スマートフォンでも回答できます）</Text>
          <Text style={s.url}>{joinUrl}</Text>
          <Text style={[s.codeLabel, { marginTop: 6 }]}>チームコード</Text>
          <Text style={s.codeValue}>{input.code}</Text>
        </View>
        <Text style={s.li}>1. 上記URLを開きます（コードはURLに含まれています）</Text>
        <Text style={s.li}>2. あなたの役割（リーダー／メンバー）を選びます ※任意です</Text>
        <Text style={s.li}>3. 20問に回答すると、あなた自身の診断結果が表示されます</Text>

        <Text style={pdfStyles.h2}>安心して回答いただくために</Text>
        <Text style={s.li}>・回答は匿名です。氏名などの個人情報は収集しません</Text>
        <Text style={s.li}>
          ・チームに共有されるのは人数・平均などの統計値のみで、誰がどう答えたかは誰にも分かりません
        </Text>
        <Text style={s.li}>
          ・あなた個人の詳しい結果は、あなたの画面にだけ表示されます（保存・共有はご自身の判断です）
        </Text>

        <Text style={[pdfStyles.small, { marginTop: 14 }]}>
          本アセスメントは、オーセンティックワークス株式会社が提供する SOUNDメソッド®の知見に
          基づいています。
        </Text>
      </AwPage>
    </Document>
  );
}

async function download(doc: ReactElement, filename: string): Promise<void> {
  const blob = await pdf(doc).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** 管理情報PDF（作成者用・3コード）をダウンロード */
export async function downloadTeamAdminPdf(input: TeamPdfInput): Promise<void> {
  await download(<AdminDocument input={input} />, `チーム管理情報_${input.code}.pdf`);
}

/** メンバー配布用案内PDFをダウンロード */
export async function downloadTeamGuidePdf(input: TeamPdfInput): Promise<void> {
  await download(<GuideDocument input={input} />, `言える化アセスメント案内_${input.code}.pdf`);
}
