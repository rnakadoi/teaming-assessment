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
| 1-11 | 【コンテンツ】243パターン分析文生成＋機械検査 | ✅ 完了（別スレッドで生成・投入。2026-07-05 DB上で機械検査: 網羅243/重複0/欠損0/禁止語0/カタログ外URL0/必須リンク充足） |
| 1-12 | 【コンテンツ】seed投入 | ✅ 完了（243件＋item_rules 15行。DB全文を `content/patterns_db_export.json` に記録） |
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
- 243件機械検査での軽微フラグ4件（レビュー時の参考）: `LLMML`(940字)・`LLMMM`(948字)は目標950字にわずかに未達／`LMHLL`・`LMLMM`は「問いかけで閉じる」基準に非準拠（文意は自然・断定調ではない）

## 2026-07-05 仕様変更（オーナー承認済み・実装完了）

1. **結果PDFダウンロード**: `@react-pdf/renderer`＋Zen Kaku Gothic New（OFL・public/fonts同梱）。全PDF共通でヘッダー=AWロゴ／フッター=©・会社名・URL・ページ番号（`lib/pdf/base.tsx`）。※メール添付送信はオーナー判断で取り下げ
2. **3コード体系＋閲覧制御**: チーム作成は `create_team` RPC（参加6/閲覧8/リセット10文字をサーバー生成）。teams直接SELECT/INSERTはRLS封鎖。集計RPCは閲覧コード必須。閲覧コード紛失時はリセットコードでセルフ再発行（`reset_view_code`）。作成画面で「管理情報PDF（3コード＋手順）」「メンバー配布用案内PDF（意図・目的・内容）」をDL可能
3. **回答済み判定**: `/t/[code]` は送信済み端末（localStorage `yieruka.submitted.team.*`）に「回答済み」画面を表示し再回答を強制しない
4. **管理者ビュー `/admin`**: 管理者コード（`admin_secrets` テーブル・RLS全遮断）で全チームの回答状況・閲覧コードを一覧。コードはオーナーへ別途伝達済み（PROGRESSには記載しない）
5. E2E検証済み: チーム作成→PDF2種→回答→回答済み画面→閲覧ゲート（誤コード拒否）→リセット再発行→admin一覧。RLS 8項目パス

## 2026-07-09 フィードバック対応（実装完了）

1. タイトルを『言える化アセスメントツール"Ieruka"™』へ統一（APP_TITLE定数・全画面/OGP/PDF3種/MD。PDFの™グリフ表示確認済み）
2. 診断結果画面の本文文字サイズを拡大（text-sm→text-base）
3. 回答5段階を横並びセグメント化（375pxで5列表示・キーボード1〜5維持）
4. **全体平均比較**: `global_aggregates`（件数＋総和のみの累積集計・送信時インクリメント・全行走査不要）＋`get_global_stats` RPC。個人/チーム両レーダーに「全体平均」系列＋凡例。**表示閾値 n>=30**（統計安定＋匿名性希釈。ベンチマーク上位%は従来どおり n>=100）。閾値一時引き下げで表示動作も実証済み
5. MD/コピーの相談プロンプトに画像生成指示を追記（AIが見立て後に生成希望を尋ねる／会議風景の直接描写禁止・メタファ1つ選択・風刺画調・個人揶揄禁止・要素説明付き）

備考: 設問文はオーナー側でDB更新済みの新表現がそのまま全出力（画面/PDF/MD）に反映される（マスタ参照設計のため改修不要）。

## 2026-07-12 仕様変更（管理機能スイート: Metamo移植＋新規）

1. **チームの一括削除（/admin）**: 複数選択→削除範囲2択（①チーム情報のみ削除=回答は匿名で全体統計に残る／②回答データも完全削除）→赤色確認パネル→実行・件数通知。RPC `admin_delete_teams`（FK: waves=CASCADE / assessments.wave_id=SET NULL を利用。global_aggregates は累積スナップショット仕様のため減算しない）
2. **チーム集計PDF**: `lib/pdf/TeamResultPdf.tsx`（総合平均・因子別平均＋全体平均比較・ばらつき上位3・役割別・実施回推移）。集計画面と /admin の両方からDL可
3. **管理画面からのPDF再ダウンロード**: `admin_list_teams` v2 が reset_code を返し、一覧から「管理情報PDF（3コード）」を再出力可能に
4. **統計CSVエクスポート**: `lib/team-export.ts`（BOM付きUTF-8・CRLF・エスケープ・セクション構成: 概要/因子別/設問別/役割別/wave推移）。統計値のみで生回答は含めない。vitest 13件
5. **実施回の受付クローズ**: `waves.closed_at`＋`set_wave_closed`/`create_wave` RPC（閲覧コード必須）。最新waveクローズ中は `submit_assessment` が `wave_closed` で拒否し、参加ページは受付終了画面を表示。waves の anon 直接アクセス（sel/ins）は剥奪し RPC 経由に統一
6. 別スレッド並行開発: エラーSlack通知・週次DBバックアップ（aw-chief-of-staff/docs/HANDOFF_IERUKA_*.md 参照。マージ順=本件→通知→バックアップ）

## 残タスク

1. Lighthouse 計測（任意・本番URLで実施可能）
2. 公開判断後: 旧v1サイト閉鎖・旧LLM APIキー失効（仕様§11）
3. 書籍リンクのカタログ追加（オーナー指定があれば lead-content.ts / リンクカタログへ反映）

※ 2026-07-05 push 済み・本番反映確認済み（新ランディング・/privacy・OGP画像）。243パターンも同日DB反映・検査済みで、**アプリは全機能が本番で動作する状態**。
