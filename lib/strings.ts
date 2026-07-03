// UI文言定数（仕様§9: 文言はコンポーネント外に定数化しi18n可能な構造に）

/** 5段階回答の選択肢（値は生回答1..5） */
export const SCALE_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "そう思わない" },
  { value: 2, label: "あまりそう思わない" },
  { value: 3, label: "どちらでもない" },
  { value: 4, label: "ややそう思う" },
  { value: 5, label: "そう思う" },
];

export const ASSESSMENT_STRINGS = {
  title: "「言える化」セルフアセスメント",
  progressLabel: (current: number, total: number) => `${current} / ${total} 問`,
  back: "前の問いに戻る",
  loading: "設問を読み込んでいます…",
  loadError: "設問の読み込みに失敗しました。時間をおいて再度お試しください。",
  retry: "再読み込み",
  reviewTitle: "全20問の回答が完了しました",
  reviewNote: "「結果を見る」を押すと結果が表示されます（回答は匿名で送信されます）。",
  seeResults: "結果を見る",
  submitting: "送信中…",
  instruction: "最近のチームの会議や話し合いを思い浮かべて、当てはまるものを選んでください。",
} as const;

/** sessionStorage キー（回答マップ {"1":4,...,"20":2}） */
export const STORAGE_KEY_ANSWERS = "yieruka.answers.v1";
/** sessionStorage キー（結果表示用ペイロード） */
export const STORAGE_KEY_RESULT = "yieruka.result.v1";
