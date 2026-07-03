# 開発進捗記録 — teaming-assessment（「言える化」アセスメント v2）

- 最終更新: 2026-07-04（このセッションで中断）
- 対象仕様: `050ツール/言える化アセスメント_開発仕様書_v2.0.md`
- リポジトリ: https://github.com/rnakadoi/teaming-assessment （ブランチ `main`）
- ローカル作業ディレクトリ: `C:\Users\nakad\workspace\teaming-assessment`
- Supabase: プロジェクト `teaming-assessment` / Ref `jsomgzvmcdnfqmtpnpew` / Tokyo / Free
- 本番: https://teaming-assessment.vercel.app/ （main への push で自動デプロイ）

## 現在地サマリ

- **フェーズ0（雛形・migration）**: 完了済み（前セッション）
- **フェーズ1（個人利用の一気通貫）**: コード実装は完了。**残るはコンテンツ（243パターン分析文）とE2E最終検証のみ**
- **フェーズ2（チーム・ベンチマーク）**: コード実装・DB検証まで完了。フロントの通し確認（実ブラウザ）が未
- **フェーズ3（継続利用・導線・公開）**: 未着手

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
| 1-13 | フェーズ1検証（E2E・RLS・スマホ） | 🟡 RLS検証スクリプト作成済み（`scripts/verify_rls.mjs`）。DB側検証は済。**実ブラウザE2E未** |

### フェーズ2
| ID | 内容 | 状態 |
|---|---|---|
| 2-1 | チーム作成 `/team/new` | ✅ 完了 |
| 2-2 | チーム参加回答 `/t/[code]` | ✅ 完了 |
| 2-3 | `get_team_stats` 確認・拡張 | ✅ 完了（team_name追加・役割2名未満非表示・**集約ネストの実行時エラー42803を修正**） |
| 2-4 | チーム集計画面 `/t/[code]/results` | ✅ 完了 |
| 2-5 | 個人結果にベンチマーク表示 | ✅ 完了 |
| 2-6 | フェーズ2検証 | 🟡 DB側（n<3制御・チーム分離・不明コード）検証済み。**実ブラウザ確認未** |

### フェーズ3（未着手）
3-1 経時比較 / 3-2 リード導線 / 3-3 OGP / 3-4 プライバシーポリシー / 3-5 公開前チェック

## このセッションで行ったDB変更（Supabase MCPで適用済み）

すべて本番DB（`jsomgzvmcdnfqmtpnpew`）に適用済み。SQLは `supabase/migrations/` にも記録:

1. `add_submit_assessment_rpc` → `fix_submit_assessment_total_score`: `submit_assessment(answers, wave_code, role)` RPC 新設（サーバー再計算＋INSERT＋結果返却）。→ `supabase/migrations/20260703_add_submit_assessment_rpc.sql`
2. `seed_item_rules`: item_rules 15行（矛盾ペア12＋スタイル2＋top/bottom 1）。→ `supabase/migrations/20260703_seed_item_rules.sql`
3. `seed_pattern_analyses_approved10`: 承認済み10パターンをupsert。
4. `update_get_team_stats_name_and_role_guard` → `fix_get_team_stats_nested_aggregates`: get_team_stats 拡張＋バグ修正。→ `supabase/migrations/20260704_update_get_team_stats.sql`

### ⚠ 後片付けが必要な検証用データ（要削除）

DB検証のため作成したテスト用チームが残っている。本番公開前に削除すること:

- チーム `ZZTEST`（検証用チーム、回答3件）
- チーム `ZZTST2`（検証用チーム2、回答2件）

削除SQL例（WHERE条件必須）:
```sql
delete from public.assessments a using public.waves w, public.teams t
  where a.wave_id = w.id and w.team_id = t.id and t.code in ('ZZTEST','ZZTST2');
delete from public.waves w using public.teams t
  where w.team_id = t.id and t.code in ('ZZTEST','ZZTST2');
delete from public.teams where code in ('ZZTEST','ZZTST2');
```
※ WHERE無しDELETEは環境の安全機構でブロックされるため、上記のように必ず条件を付ける。

## 検証コマンド

```bash
npm install
npm run build         # ✓ Compiled successfully（7ルート）
npm test              # vitest: 44 passed（scoring 31 + rules 13）
node scripts/verify_rls.mjs   # anonキーでRLS検証（未実行。次回実施）
```

## コンテンツ生成パイプライン（243パターン）

別スレッドで生成した分析文JSONを受け取ったら:

1. 受領JSON（`[{pattern_code, summary, background, first_step, sound_step, links}]`）を `content/batches/batch-NN.json` に配置
2. `node scripts/validate_content.mjs` で機械検査（網羅・重複・文字数・禁止語・URLホワイトリスト・必須リンク・隣接類似度）
3. `node scripts/build_seed_sql.mjs` で `content/seed_pattern_analyses.sql` を生成（upsert）
4. Supabase へ apply（承認xlsxレビュー後）
5. 生成指示書は `content/GENERATION_GUIDE.md`、承認済み10件は `content/batches/batch-00.json`

## 次回の着手候補

1. 243パターン受領 → 検査 → seed投入（1-11/1-12 完了）
2. 実ブラウザでのE2E（回答→結果→MD出力／チーム作成→参加→集計）（1-13/2-6）
3. フェーズ3（3-1〜3-5）
4. 公開前: 検証用チーム ZZTEST/ZZTST2 の削除、リンク疎通確認、旧v1サイト閉鎖
