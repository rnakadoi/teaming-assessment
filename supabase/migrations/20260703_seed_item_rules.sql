-- item_rules seed（H2_矛盾ペア定義.md 準拠）
-- 適用済み: 2026-07-03（Supabase MCP apply_migration: seed_item_rules）
-- 矛盾ペア12組（P01〜P12）＋回答スタイル検知2種（S01/S02）＋top/bottom 1種
-- 発火条件: 高側 補正後素点≥+1 かつ 低側≤−1。表示はスコア差上位2件まで（フロント lib/rules.ts 実装）
insert into public.item_rules (rule_type, params, comment_template) values
-- P01 和やかさと率直さの分離
('contradiction', '{"high_q": 2, "low_q": 8, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "和やかさと率直さの分離"}'::jsonb,
 '場の雰囲気は温かい一方、言いにくいテーマは避けられているようです。「仲の良さ」が率直さのブレーキになっていないか、振り返る価値がありそうです。'),
-- P02 下向きにだけ開いた安全
('contradiction', '{"high_q": 14, "low_q": 20, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "下向きにだけ開いた安全"}'::jsonb,
 '挑戦を後押しする空気がある一方、上司に向かうフィードバックは止まっているようです。安心感が「上から下」への一方向になっていないかが問いどころです。'),
-- P03 建前のFB循環
('contradiction', '{"high_q": 5, "low_q": 12, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "建前のFB循環"}'::jsonb,
 'フィードバックはできている認識の一方で、決定への不満は場の外で語られているようです。FBが機能している範囲が、実は限られている可能性があります。'),
-- P04 管理された実行力
('contradiction', '{"high_q": 10, "low_q": 11, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "管理された実行力"}'::jsonb,
 '行動は決まり実行も回る一方、担当の決定は上司に集中しているようです。実行力はあるのに、決める経験がメンバーに蓄積されていない状態かもしれません。'),
-- P05 非公式でだけ言える
('contradiction', '{"high_q": 13, "low_q": 1, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "非公式でだけ言える"}'::jsonb,
 '雑談や個人的な話はできるのに、会議では口が閉じるようです。「言えない」のではなく「あの場では言わない」——公式の場の何が発言を止めているのかが手がかりになります。'),
-- P06 議題化と納得の乖離
('contradiction', '{"high_q": 8, "low_q": 12, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "議題化と納得の乖離"}'::jsonb,
 '難しいテーマも場に出る一方、決まった後の不満は外で語られているようです。「出す」はできても「決め方への納得」が置き去りになっている可能性があります。'),
-- P07 前向きさによる回避
('contradiction', '{"high_q": 19, "low_q": 15, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "前向きさによる回避"}'::jsonb,
 '「何ができるか」を語る前向きさがある一方、原因の検討では主語が自分たちの外に出ていくようです。ポジティブさが、痛みを伴う内省の回避になっていないかが問いどころです。'),
-- P08 多様性の認識と規範の同居
('contradiction', '{"high_q": 9, "low_q": 3, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "多様性の認識と規範の同居"}'::jsonb,
 '違いに気づく力はあるのに、話し合いは「べき論」で進むようです。認識した違いが、規範によって押し戻されている状態かもしれません。'),
-- P09 形式上の双方向性
('contradiction', '{"high_q": 20, "low_q": 6, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "形式上の双方向性"}'::jsonb,
 '上司へのフィードバックの機会はある一方、話し合い自体は上長の意向を軸に進んでいるようです。FBの「機会」はあっても「影響力」を持てているかが分かれ目です。'),
-- P10 言いっぱなしの場
('contradiction', '{"high_q": 1, "low_q": 10, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "言いっぱなしの場"}'::jsonb,
 '多くの声が出る活発さがある一方、行動への収束が弱いようです。「言っても変わらない」の学習が始まる前に、収束の型を足す価値がありそうです。'),
-- P11 器はあるが舵がない
('contradiction', '{"high_q": 17, "low_q": 16, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "器はあるが舵がない"}'::jsonb,
 '誰もがテーマを持ち込める開かれた場である一方、話の迷子を戻す機能が弱いようです。開放性を活かすには、ファシリテーションという舵が必要な段階かもしれません。'),
-- P12 土壌なきフィードバック
('contradiction', '{"high_q": 5, "low_q": 18, "threshold_high": 1, "threshold_low": -1, "priority_key": "score_gap", "name": "土壌なきフィードバック"}'::jsonb,
 '率直な指摘はし合える一方、感謝や承認のやりとりは少ないようです。土壌のないフィードバックは「詰め」に転じやすく、打たれ強い人しか残らない場になる懸念があります。'),
-- S01 全問同一回答
('style', '{"kind": "uniform"}'::jsonb,
 'すべての項目が同じ回答になっています。もし迷った項目があれば、具体的な会議の場面を一つ思い浮かべて再回答すると、より役立つ結果になります。'),
-- S02 「どちらでもない」16問以上
('style', '{"kind": "neutral_heavy", "min_count": 16}'::jsonb,
 '「どちらでもない」が大半を占めています。判断を保留したくなる項目が多いこと自体が、組織の状態を映している可能性もあります。直近の会議を一つ思い浮かべて再回答してみるのも一案です。'),
-- top/bottom（テンプレート1種。{質問文} を最高→最低の順にフロントで置換）
('top', '{}'::jsonb,
 '最も高かったのは「{質問文}」、最も低かったのは「{質問文}」でした。強みを起点に、最も低い項目に手を入れるのが定石です。');
