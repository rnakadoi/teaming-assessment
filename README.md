# 「言える化」セルフアセスメント v2（teaming-assessment）

組織・チームの「言える化」（メンバーが対人関係上のリスクを恐れず、本音や意見を安心して表現でき、それが協働の進化に活かされている状態）の度合いを測定するセルフアセスメント。

- 本番: https://teaming-assessment.vercel.app/
- 提供: オーセンティックワークス株式会社

## 機能

- 20問・5段階のセルフアセスメント（匿名・3〜5分）
- 総合スコア（−40〜+40）＋9段階の帯解説
- 5因子（言える場の開放度／フィードバックの循環／当事者意識・自律／対話・会議の質／関係性の土壌）のレーダーチャート
- 243パターン（H/M/L^5）の構造分析文＋SOUNDメソッド®の観点＋関連リンク
- 回答の組み合わせに応じた補足コメント（矛盾ペア・回答スタイル検知・最高/最低項目）
- 結果のMarkdown出力（ダウンロード／生成AI相談用コピー）
- チームモード: 6文字コード発行→URL共有→匿名集計（回答3名未満は平均のみ）
- 実施回（wave）ごとの経時比較、個人の前回比（localStorage）
- ベンチマーク（母数100件以上で表示）

## 技術構成

| 層 | 技術 |
|---|---|
| フロント | Next.js 14.2（App Router）+ TypeScript + Tailwind CSS + recharts |
| DB | Supabase（PostgreSQL + RLS + security definer RPC） |
| ホスティング | Vercel（main への push で自動デプロイ） |
| OGP | @vercel/og（edge runtime・スコアのみ描画） |

**設計原則**: 実行時にLLM APIを呼ばない（分析文は事前生成しDBから参照）／無料枠内で運用（実行時コスト0円）／回答は匿名（個人情報は明示同意時のメールアドレスのみ）。

## 開発

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY を設定
                             # SLACK_WEBHOOK_URL（任意）: Slack Incoming Webhook URL を設定するとクライアントエラーが Slack 通知される（Vercel は Production 環境変数に登録）
npm run dev                  # http://localhost:3000
npm run build                # 本番ビルド
npm test                     # vitest（スコア計算・層3ルールの単体テスト）
```

### 検証スクリプト

```bash
node scripts/verify_rls.mjs      # anonキーでのRLS検証（生回答・メールが読めないこと等）
node scripts/check_links.mjs     # 外部リンク（カタログ＋フッター）の疎通確認
node scripts/validate_content.mjs # 243パターン分析文の機械検査
node scripts/build_seed_sql.mjs   # 分析文JSON → seed SQL 生成
```

## ディレクトリ

```
app/            ルーティング（/ /assessment /result /team/new /t/[code] /t/[code]/results /privacy /api/og）
components/     AssessmentForm / FactorRadar / PatternAnalysis / ExportActions / WaveComparison / LeadSection
lib/            scoring（スコア計算）/ rules（層3）/ masters / submit / team / markdown / history / leads ほか
supabase/migrations/  適用済みSQLの記録
content/        243パターン分析文の受入パイプライン（batches/ 検査・seed生成）
scripts/        検証・生成ツール
```

## スコアリング仕様（要点）

1. 素点 = 回答(1..5) − 3 → −2..+2、補正後素点 = 素点 × 極性（ネガ設問は反転）
2. 総合 = 補正後素点の合計（−40〜+40）→ 9段階の帯解説
3. 因子スコア = 因子内平均（−2.0〜+2.0）、因子水準 = 因子内整数合計の閾値判定（3問:±2 / 4問:±3 / 5問:±4）
4. パターンコード = F1〜F5の水準5文字（例 `HMLLM`）→ 243パターン分析文

詳細は開発仕様書 v2.0（社内文書）および `PROGRESS.md` を参照。
