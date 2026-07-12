// lib/submit の Slack 通知結線テスト。supabase と notify をモックする。
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./supabase", () => ({ supabase: { rpc: vi.fn() } }));
vi.mock("./notify", () => ({ notifyError: vi.fn() }));

import { submitAssessment } from "./submit";
import { supabase } from "./supabase";
import { notifyError } from "./notify";

const rpcMock = vi.mocked(supabase.rpc);
const notifyMock = vi.mocked(notifyError);

const ANSWERS = { "1": 3 } as never;

describe("submitAssessment の通知結線", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    notifyMock.mockReset();
  });

  it("RPC エラー時は throw し notifyError('submit', …) を呼ぶ", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "boom" } } as never);
    await expect(submitAssessment(ANSWERS)).rejects.toThrow("送信に失敗しました: boom");
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock.mock.calls[0][0]).toBe("submit");
  });

  it("想定内のユーザー起因エラー（wave_closed / team_not_found）は通知しない", async () => {
    rpcMock.mockResolvedValue({ data: { error: "wave_closed" }, error: null } as never);
    await expect(submitAssessment(ANSWERS, "ABC123")).rejects.toThrow();
    rpcMock.mockResolvedValue({ data: { error: "team_not_found" }, error: null } as never);
    await expect(submitAssessment(ANSWERS, "ABC123")).rejects.toThrow();
    expect(notifyMock).not.toHaveBeenCalled();
  });

  it("システム起因のエラーコード（invalid_master 等）は通知する", async () => {
    rpcMock.mockResolvedValue({ data: { error: "invalid_master" }, error: null } as never);
    await expect(submitAssessment(ANSWERS)).rejects.toThrow();
    expect(notifyMock).toHaveBeenCalledTimes(1);
    expect(notifyMock.mock.calls[0][0]).toBe("submit");
  });

  it("成功時は結果を返し通知しない", async () => {
    const result = { assessment_id: "a1", total: 10 };
    rpcMock.mockResolvedValue({ data: result, error: null } as never);
    await expect(submitAssessment(ANSWERS)).resolves.toMatchObject(result);
    expect(notifyMock).not.toHaveBeenCalled();
  });
});
