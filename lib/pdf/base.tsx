// PDF共通基盤（@react-pdf/renderer）
// 仕様: ヘッダー=AWロゴ / フッター=コピーライト・会社名・会社URL（全PDF共通）
// 注意: このモジュールはクライアントでの動的 import 専用（フォント登録が走るため）
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import type { ReactNode } from "react";

// 日本語フォント（Zen Kaku Gothic New / OFL）— public/fonts に同梱
Font.register({
  family: "ZenKaku",
  fonts: [
    { src: "/fonts/ZenKakuGothicNew-Regular.ttf", fontWeight: "normal" },
    { src: "/fonts/ZenKakuGothicNew-Bold.ttf", fontWeight: "bold" },
  ],
});
// 日本語は単語区切りが無いため文字単位で折り返す
Font.registerHyphenationCallback((word) =>
  word.length === 1 ? [word] : Array.from(word)
);

export const PDF_COLORS = {
  gold: "#F5B722",
  goldDeep: "#D99A0A",
  teal: "#1A8E95",
  ink: "#2E2A20",
  gray: "#575757",
  sub: "#8A8375",
  line: "#EBE6D9",
  warm: "#F6F3EB",
};

export const pdfStyles = StyleSheet.create({
  page: {
    fontFamily: "ZenKaku",
    fontSize: 9.5,
    color: PDF_COLORS.gray,
    paddingTop: 64,
    paddingBottom: 56,
    paddingHorizontal: 48,
    lineHeight: 1.6,
  },
  header: {
    position: "absolute",
    top: 20,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.line,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 8, color: PDF_COLORS.sub },
  logo: { height: 18, width: 60, objectFit: "contain" },
  footerLine: {
    position: "absolute",
    bottom: 34,
    left: 48,
    right: 48,
    borderTopWidth: 1,
    borderTopColor: PDF_COLORS.line,
  },
  footerLeft: {
    position: "absolute",
    bottom: 20,
    left: 48,
    fontSize: 7.5,
    color: PDF_COLORS.sub,
  },
  footerRight: {
    position: "absolute",
    bottom: 20,
    right: 48,
    fontSize: 7.5,
    color: PDF_COLORS.sub,
  },
  h1: { fontSize: 16, fontWeight: "bold", color: PDF_COLORS.ink, marginBottom: 10 },
  h2: {
    fontSize: 11,
    fontWeight: "bold",
    color: PDF_COLORS.ink,
    marginTop: 14,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.line,
  },
  body: { fontSize: 9.5, color: PDF_COLORS.gray },
  small: { fontSize: 8, color: PDF_COLORS.sub },
});

/** 全PDF共通ページ: AWロゴヘッダー＋コピーライトフッター */
export function AwPage({
  headerTitle,
  children,
}: {
  headerTitle: string;
  children: ReactNode;
}) {
  return (
    <Page size="A4" style={pdfStyles.page}>
      <View style={pdfStyles.header} fixed>
        {/* eslint-disable-next-line jsx-a11y/alt-text */}
        <Image src="/aw-logo.png" style={pdfStyles.logo} />
        <Text style={pdfStyles.headerTitle}>{headerTitle}</Text>
      </View>
      {children}
      {/* フッター: 公式ドキュメント準拠の fixed Text 直置きパターン */}
      <View style={pdfStyles.footerLine} fixed />
      <Text style={pdfStyles.footerLeft} fixed>
        © オーセンティックワークス株式会社　https://www.authentic-a.com/
      </Text>
      <Text
        style={pdfStyles.footerRight}
        fixed
        render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
      />
    </Page>
  );
}

export { Document, Image, Page, StyleSheet, Text, View };
