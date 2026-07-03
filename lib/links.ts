// 共通フッター4リンク（仕様§4 リンク表示ルール。フロント固定実装・DBに持たない）
export interface FooterLink {
  label: string;
  url: string;
}

export const FOOTER_LINKS: FooterLink[] = [
  { label: "SOUNDカード公式サイト", url: "https://www.soundmethod.jp/" },
  { label: "SOUNDコーチ養成講座", url: "https://www.soundmethod.jp/program" },
  { label: "オーセンティックワークス株式会社", url: "https://www.authentic-a.com/" },
  { label: "中土井僚 note", url: "https://note.com/nakadoi" },
];
