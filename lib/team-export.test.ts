import { describe, expect, it } from "vitest";
import {
  buildTeamStatsCsv,
  signed,
  teamCsvFilename,
  varianceTop,
  type TeamExportInput,
} from "./team-export";
import type { TeamStats, WaveStat } from "./team";

const baseStats: TeamStats = {
  team_code: "ABC123",
  team_name: "営業1課",
  n: 5,
  avg_total: 12.4,
  factor_avg: { F1: 0.5, F2: -0.2, F3: 1.1, F4: 0, F5: 0.8 },
  item_stats: {
    "1": { avg: 3.2, stddev: 1.3 },
    "2": { avg: 4.0, stddev: 0.5 },
    "3": { avg: 2.8, stddev: 1.3 },
  },
  by_role: { leader: 10.5, member: 13.2 },
  min_n_for_detail: 3,
};

const waves: WaveStat[] = [
  {
    wave_no: 1,
    label: null,
    created_at: "2026-07-01T00:00:00+00:00",
    closed_at: "2026-07-10T00:00:00+00:00",
    n: 5,
    avg_total: 12.4,
    factor_avg: { F1: 0.5, F2: -0.2, F3: 1.1, F4: 0, F5: 0.8 },
  },
  {
    wave_no: 2,
    label: "研修後",
    created_at: "2026-07-11T00:00:00+00:00",
    closed_at: null,
    n: 0,
    avg_total: null,
    factor_avg: null,
  },
];

const masters = {
  factors: [
    { code: "F1", name: "言える場の開放度" },
    { code: "F2", name: "フィードバックの循環" },
    { code: "F3", name: "当事者意識・自律" },
    { code: "F4", name: "対話・会議の質" },
    { code: "F5", name: "関係性の土壌" },
  ],
  questions: [
    { no: 1, text: "会議で反対意見, 言えている" },
    { no: 2, text: '本音を"言える"' },
    { no: 3, text: "設問3のテキスト" },
  ],
};

const input: TeamExportInput = {
  date: "2026-07-12",
  stats: baseStats,
  waves,
  masters,
  global: {
    available: true,
    n: 42,
    min_n: 30,
    avg_total: 8.1,
    factor_avg: { F1: 0.3, F2: 0.1, F3: 0.9, F4: -0.1, F5: 0.5 },
  },
};

describe("buildTeamStatsCsv", () => {
  it("BOM付きUTF-8・CRLFで出力する", () => {
    const csv = buildTeamStatsCsv(input);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("\r\n");
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("概要セクションにチーム情報と全体平均を含む", () => {
    const csv = buildTeamStatsCsv(input);
    expect(csv).toContain("チーム名,営業1課");
    expect(csv).toContain("チームコード,ABC123");
    expect(csv).toContain("回答者数,5");
    expect(csv).toContain("総合スコア平均（−40〜+40）,12.4");
    expect(csv).toContain("全体平均（42件）,8.1");
  });

  it("因子別平均に因子名と全体平均列を含む", () => {
    const csv = buildTeamStatsCsv(input);
    expect(csv).toContain("因子コード,因子名,チーム平均,全体平均");
    expect(csv).toContain("F1,言える場の開放度,0.5,0.3");
  });

  it("カンマ・引用符を含む設問文をエスケープする", () => {
    const csv = buildTeamStatsCsv(input);
    expect(csv).toContain('"会議で反対意見, 言えている"');
    expect(csv).toContain('"本音を""言える"""');
  });

  it("実施回の推移に受付状態を含む", () => {
    const csv = buildTeamStatsCsv(input);
    expect(csv).toContain("1,,2026-07-01,終了,5,12.4,0.5,-0.2,1.1,0,0.8");
    expect(csv).toContain("2,研修後,2026-07-11,受付中,0,,,,,,");
  });

  it("n<3（item_stats/by_role が null）は非表示注記を出す", () => {
    const csv = buildTeamStatsCsv({
      ...input,
      stats: { ...baseStats, n: 2, item_stats: null, by_role: null },
      global: null,
    });
    expect(csv).toContain("回答者3名未満のため非表示（匿名性保護）");
    expect(csv).toContain("表示条件を満たさないため非表示");
    expect(csv).not.toContain("全体平均（");
  });

  it("役割別平均に日本語ラベルを使う", () => {
    const csv = buildTeamStatsCsv(input);
    expect(csv).toContain("リーダー・管理職,10.5");
    expect(csv).toContain("メンバー,13.2");
  });

  it("mastersがnullでも因子コード・設問番号で出力できる", () => {
    const csv = buildTeamStatsCsv({ ...input, masters: null });
    expect(csv).toContain("F1,F1,0.5");
    expect(csv).toContain("1,設問1,3.2,1.3");
  });
});

describe("varianceTop", () => {
  it("標準偏差の降順・同値は設問番号昇順で上位を返す", () => {
    const top = varianceTop(baseStats.item_stats, masters.questions, 3);
    expect(top.map((t) => t.no)).toEqual([1, 3, 2]);
    expect(top[0].text).toBe("会議で反対意見, 言えている");
  });

  it("item_statsがnullなら空配列", () => {
    expect(varianceTop(null, masters.questions)).toEqual([]);
  });

  it("設問マスタに無い番号はフォールバック表記", () => {
    const top = varianceTop({ "9": { avg: 3, stddev: 2 } }, masters.questions, 1);
    expect(top[0].text).toBe("設問9");
  });
});

describe("signed / teamCsvFilename", () => {
  it("符号付き表記", () => {
    expect(signed(5)).toBe("+5");
    expect(signed(-2)).toBe("-2");
    expect(signed(0)).toBe("0");
    expect(signed(1.234, 2)).toBe("+1.23");
  });

  it("ファイル名は日付のハイフンを除去", () => {
    expect(teamCsvFilename("ABC123", "2026-07-12")).toBe(
      "チーム集計_ABC123_20260712.csv"
    );
  });
});
