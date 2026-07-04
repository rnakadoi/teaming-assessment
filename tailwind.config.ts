import type { Config } from "tailwindcss";

// オーセンティックワークス コーポレートカラー（配色レビュー確定版: A案＋ティール副色）
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          gold: "#F5B722", // 主役アクセント（ボタン・進捗・選択中・スコア）
          goldDeep: "#D99A0A", // ゴールドのホバー/スコア数値
          goldSoft: "#FEF6E1", // 選択中の面
          goldInk: "#5A4A17", // 選択中の文字
          teal: "#1A8E95", // 副色（データ2系列目）
          tealDeep: "#147078", // リンク文字（白地でAA確保）
          ink: "#2E2A20", // 見出し/ゴールド上の文字
          body: "#FBFAF6", // 本文背景（ウォームオフ白）
          cream: "#F6F3EB", // フッター
          warm: "#F5F2EA", // 補助パネル
          line: "#EBE6D9", // 罫線
        },
      },
    },
  },
  plugins: [],
};
export default config;
