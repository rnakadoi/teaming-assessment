// F-09: スコア帯連動の静的コンテンツ（リード導線）
// URL は H1_リンク導線設計.md のカタログ内のみ使用（捏造防止）。
// 書籍の個別リンクはオーナー指定待ちのため、当面 note プロフィールを読み物導線とする。
import type { FooterLink } from "./links";

export interface LeadContent {
  heading: string;
  lead: string;
  links: FooterLink[];
}

/** 総合スコアから帯グループ（high/mid/low）を判定してコンテンツを返す */
export function leadContentFor(total: number): LeadContent {
  if (total >= 21) {
    return {
      heading: "次の一手を探しているチームへ",
      lead:
        "言える土台があるチームは、その力を「何のために使うか」で次の段階へ進みます。ビジョンの共創や、より高度な協働への学びをおすすめします。",
      links: [
        { label: "法人セミナー: 「進化する協働」チーミング", url: "https://www.authentic-a.com/seminar09" },
        { label: "ビジョン共創プログラム", url: "https://www.authentic-a.com/solution-decision-making03" },
        { label: "中土井僚 note（組織開発の読み物）", url: "https://note.com/nakadoi" },
      ],
    };
  }
  if (total >= 0) {
    return {
      heading: "ここから言える化を育てたいチームへ",
      lead:
        "決定的な問題はなくても、言える化を支える「仕掛け」はこれから作れます。組織開発の基本と、対話の道具から始めるのがおすすめです。",
      links: [
        { label: "法人セミナー: 組織開発入門", url: "https://www.authentic-a.com/seminar02" },
        { label: "SOUNDカードとは", url: "https://www.soundmethod.jp/about-card" },
        { label: "中土井僚 note（組織開発の読み物）", url: "https://note.com/nakadoi" },
      ],
    };
  }
  return {
    heading: "「言えない」を変えたいチームへ",
    lead:
      "言えない状態は、意欲ではなく仕掛けの問題です。心理的安全性と成果を両立させる考え方と、安全に始められる道具をご紹介します。",
    links: [
      {
        label: "法人セミナー: 心理的安全性＆成果創出の「両効き」マネジメント",
        url: "https://www.authentic-a.com/seminar05",
      },
      { label: "SOUNDカードとは", url: "https://www.soundmethod.jp/about-card" },
      { label: "“本音合宿”サポート", url: "https://www.authentic-a.com/solution-organization-development04" },
    ],
  };
}
