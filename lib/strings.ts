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

export const TEAM_STRINGS = {
  newTitle: "チームで実施する",
  newLead:
    "チームコードを発行し、メンバーに共有URLを配るだけで、チーム全体の「言える化」を集計できます。回答は匿名です。",
  nameLabel: "チーム名（任意・集計画面に表示されます）",
  namePlaceholder: "例: 営業1課",
  createButton: "チームコードを発行する",
  creating: "発行中…",
  createdTitle: "チームを作成しました",
  codeLabel: "チームコード",
  shareUrlLabel: "メンバーへの共有URL",
  copyUrl: "URLをコピー",
  copiedUrl: "コピーしました",
  resultsLink: "集計画面を開く",
  answerSelfLink: "自分も回答する",
  note: "コードとURLは再表示できません。この画面を閉じる前に控えてください。",
  joinTitle: (name: string | null, code: string) =>
    name ? `「${name}」のアセスメント` : `チーム ${code} のアセスメント`,
  joinLead: "回答は匿名で送信され、チームには集計値のみが表示されます。",
  roleLabel: "あなたの役割（任意）",
  roleUnspecified: "回答しない",
  roleLeader: "リーダー・管理職",
  roleMember: "メンバー",
  startButton: "回答をはじめる",
  notFound: "チームが見つかりません。URLまたはコードをご確認ください。",
  loading: "チーム情報を確認しています…",
  statsTitle: "チーム集計",
  statsN: (n: number) => `回答者数: ${n}名`,
  statsAvgTotal: "総合スコア平均",
  statsRadar: "因子別平均",
  statsFewNote: (min: number) =>
    `回答者が${min}名未満のため、分布・役割別の表示は行いません（匿名性保護のため）。`,
  statsVariance: "ばらつきが大きい項目（対話の起点に）",
  statsByRole: "役割別の平均",
  statsAnonymity:
    "個人の回答は表示されません。少人数の場合は誰の回答か推測できてしまう可能性があるため、結果をメンバーの詮索に使わないことをチームで合意した上でご活用ください。",
  statsEmpty: "まだ回答がありません。共有URLからメンバーに回答してもらいましょう。",
} as const;

/** sessionStorage キー（回答マップ {"1":4,...,"20":2}） */
export const STORAGE_KEY_ANSWERS = "yieruka.answers.v1";
/** sessionStorage キー（結果表示用ペイロード） */
export const STORAGE_KEY_RESULT = "yieruka.result.v1";
