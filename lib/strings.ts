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

export const RESULT_STRINGS = {
  title: "診断結果",
  totalLabel: "総合スコア",
  totalRange: (min: number, max: number) => `（${min}〜+${max}）`,
  bandHeading: "スコア帯の解説",
  noAnswers: "回答データが見つかりません。アセスメントに回答してください。",
  goAssessment: "アセスメントに回答する",
  submitError: "結果の送信に失敗しました。",
  retry: "再送信",
  loading: "結果を集計しています…",
  retake: "もう一度回答する",
  radarHeading: "因子別スコア",
  factorTableFactor: "因子",
  factorTableScore: "スコア（−2〜+2）",
  factorTableLevel: "水準",
} as const;

/** 因子水準の表示ラベル */
export const LEVEL_LABELS: Record<string, string> = {
  H: "高",
  M: "中",
  L: "低",
};

export const EXPORT_STRINGS = {
  heading: "結果を持ち出す",
  download: "MDをダウンロード",
  copy: "コピーしてAIに相談",
  copied: "コピーしました。AIチャットに貼り付けて相談してください。",
  copyFailed: "コピーに失敗しました。ダウンロードをご利用ください。",
  note: "結果はこの端末にのみ保存されます。ページを閉じる前に保存してください。",
} as const;

export const PATTERN_STRINGS = {
  heading: "あなたのチームのパターン分析",
  patternCodeLabel: (code: string) => `パターン: ${code}`,
  sectionSummary: "見立て",
  sectionBackground: "構造分析",
  sectionFirstStep: "最初の一歩",
  sectionSoundStep: "SOUNDの観点",
  sectionLinks: "関連リンク",
  notReady: "このパターンの分析文は準備中です。公開までしばらくお待ちください。",
  itemCommentsHeading: "回答の組み合わせから見えること",
} as const;

/** sessionStorage キー（回答マップ {"1":4,...,"20":2}） */
export const STORAGE_KEY_ANSWERS = "yieruka.answers.v1";
/** sessionStorage キー（結果表示用ペイロード） */
export const STORAGE_KEY_RESULT = "yieruka.result.v1";
