# 開発進捗記録 — teaming-assessment（「言える化」アセスメント v2）

- 最終更新: 2026-07-05（フェーズ3実装後）
- 対象仕様: `050ツール/言える化アセスメント_開発仕様書_v2.0.md`
- リポジトリ: https://github.com/rnakadoi/teaming-assessment （ブランチ `main`）
- ローカル作業ディレクトリ: `C:\Users\nakad\workspace\teaming-assessment`
- Supabase: プロジェクト `teaming-assessment` / Ref `jsomgzvmcdnfqmtpnpew` / Tokyo / Free
- 本番: https://teaming-assessment.vercel.app/ （main への push で自動デプロイ）

## 現在地サマリ

- **フェーズ0（雛形・migration）**: 完了済み（前セッション）
- **フェーズ1（個人利用の一気通貫）**: コード実装は完了。**残るはコンテンツ（243パターン分析文）とE2E最終検証のみ**
- **フェーズ2（チーム・ベンチマーク）**: コード実装・DB検証まで完了。フロントの通し確認（実ブラウザ）が未
- **フェーズ3（継続利用・導線・公開）**: 実装完了。残: デプロイ後の Lighthouse・OGP実機検証のみ

## タスク別ステータス（仕様書§13）

### フェーズ1
| ID | 内容 | 状態 |
|---|---|---|
| 1-1 | マスタ取得データ層＋型定義 | ✅ 完了 |
| 1-2 | 回答UI（20問・5段階・進捗・sessionStorage） | ✅ 完了 |
| 1-3 | `lib/scoring.ts`＋単体テスト | ✅ 完了（テスト31件パス） |
| 1-4 | `submit_assessment` RPC migration | ✅ 完了（DB適用・スモークテスト済み） |
| 1-5 | 結果画面: 総合スコア＋帯解説 | ✅ 完了 |
| 1-6 | レーダーチャート | ✅ 完了 |
| 1-7 | パターン分析アコーディオン＋リンク | ✅ 完了 |
| 1-8 | `lib/rules.ts` item_rules評価＋単体テスト | ✅ 完了（テスト13件パス。計44件） |
| 1-9 | MD出力（DL・コピー・トースト） | ✅ 完了 |
| 1-10 | 共通フッター＋ランディング文言 | ✅ 完了 |
| 1-11 | 【コンテンツ】243パターン分析文生成＋機械検査 | ⏸ **別スレッドで生成中**（受領待ち）。承認済み10件のみ投入済み |
| 1-12 | 【コンテンツ】seed投入 | 🟡 部分完了（item_rules 15行＋承認済み10パターン投入済み。残233件は受領後） |
| 1-13 | フェーズ1検証（E2E・RLS・スマホ） | ✅ 完了（RLS 6項目パス／Playwright E2E: 回答→結果→MDコピー／375px表示確認。**StrictMode二重送信バグを検出し修正済み**） |

### フェーズ2
| ID | 内容 | 状態 |
|---|---|---|
| 2-1 | チーム作成 `/team/new` | ✅ 完了 |
| 2-2 | チーム参加回答 `/t/[code]` | ✅ 完了 |
| 2-3 | `get_team_stats` 確認・拡張 | ✅ 完了（team_name追加・役割2名未満非表示・**集約ネストの実行時エラー42803を修正**） |
| 2-4 | チーム集計画面 `/t/[code]/results` | ✅ 完了 |
| 2-5 | 個人結果にベンチマーク表示 | ✅ 完了 |
| 2-6 | フェーズ2検証 | ✅ 完了（DB側＋Playwright E2E: チーム作成→コード発行→参加回答→集計。n=1は平均のみ、n=3は分散上位・役割別・匿名注意まで確認） |

### フェーズ3
| ID | 内容 | 状態 |
|---|---|---|
| 3-1 | 経時比較（wave発行・比較チャート・個人前回比） | ✅ 完了（`get_team_wave_stats` RPC 追加・DB適用済み） |
| 3-2 | リード導線（帯別コンテンツ＋leads登録） | ✅ 完了（書籍の個別リンクはオーナー指定待ち→当面 note 導線） |
| 3-3 | OGP画像（@vercel/og・スコアのみ） | ✅ 完了（`/api/og?total=N`。実機検証はデプロイ後） |
| 3-4 | プライバシーポリシー＋フッター | ✅ 完了（`/privacy`） |
| 3-5 | 公開前チェック | 🟡 リンク疎通29件OK・favicon・README 済み。**残: デプロイ後の Lighthouse / OGPシェア検証 / 旧v1サイト閉鎖** |

## このセッションで行ったDB変更（Supabase MCPで適用済み）

すべて本番DB（`jsomgzvmcdnfqmtpnpew`）に適用済み。SQLは `supabase/migrations/` にも記録:

1. `add_submit_assessment_rpc` → `fix_submit_assessment_total_score`: `submit_assessment(answers, wave_code, role)` RPC 新設（サーバー再計算＋INSERT＋結果返却）。→ `supabase/migrations/20260703_add_submit_assessment_rpc.sql`
2. `seed_item_rules`: item_rules 15行（矛盾ペア12＋スタイル2＋top/bottom 1）。→ `supabase/migrations/20260703_seed_item_rules.sql`
3. `seed_pattern_analyses_approved10`: 承認済み10パターンをupsert。
4. `update_get_team_stats_name_and_role_guard` → `fix_get_team_stats_nested_aggregates`: get_team_stats 拡張＋バグ修正。→ `supabase/migrations/20260704_update_get_team_stats.sql`

### ✅ 検証用データの後片付け（2026-07-04 完了）

DB/E2E検証で作成したテストチーム（ZZTEST / ZZTST2 / 2E5JK8）と個人テスト回答は**すべて削除済み**。
assessments / teams / waves は現在0行（マスタ・分析文10件・item_rules 15行は保持）。

## 検証コマンド

```bash
npm install
npm run build         # ✓ Compiled successfully（7ルート）
npm test              # vitest: 44 passed（scoring 31 + rules 13）
node scripts/verify_rls.mjs   # anonキーでRLS検証（2026-07-04 全6項目パス）
```

## コンテンツ生成パイプライン（243パターン）

別スレッドで生成した分析文JSONを受け取ったら:

1. 受領JSON（`[{pattern_code, summary, background, first_step, sound_step, links}]`）を `content/batches/batch-NN.json` に配置
2. `node scripts/validate_content.mjs` で機械検査（網羅・重複・文字数・禁止語・URLホワイトリスト・必須リンク・隣接類似度）
3. `node scripts/build_seed_sql.mjs` で `content/seed_pattern_analyses.sql` を生成（upsert）
4. Supabase へ apply（承認xlsxレビュー後）
5. 生成指示書は `content/GENERATION_GUIDE.md`、承認済み10件は `content/batches/batch-00.json`

## 既知の軽微事項（ブロッカーではない）

- レーダーチャートの因子名ラベルが375px幅で左右わずかに見切れる（recharts の余白調整で対応可）
- 3-2 の書籍リンクはオーナー指定待ち（現状は note プロフィールで代替）

## ⚠ 未push（重要）

このリポジトリのローカルコミットは **git push が本セッションの権限でブロックされたため GitHub 未反映**。
手元で `git push origin main` を実行すると Vercel に自動デプロイされる。

## 次回の着手候補

1. **git push**（→ Vercel 自動デプロイ → 本番URL確認）
2. 243パターン受領 → validate_content.mjs → build_seed_sql.mjs → seed投入（1-11/1-12 完了）
3. デプロイ後の公開前チェック残: Lighthouse・OGPシェア検証（`/api/og?total=12` の見た目確認）
4. 公開判断後: 旧v1サイト閉鎖・旧LLM APIキー失効（仕様§11）
