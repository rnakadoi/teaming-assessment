// lib/notify のユニットテスト。fire-and-forget と開発環境スキップを検証する。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { notifyError } from "./notify";

async function flushMicrotasks(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe("notifyError", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    warnSpy.mockRestore();
  });

  it("非 production では送信せず console.warn のみ", async () => {
    vi.stubEnv("NODE_ENV", "development");
    notifyError("submit", new Error("boom"));
    await flushMicrotasks();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
  });

  it("production では /api/notify-error に source と message を POST する", async () => {
    vi.stubEnv("NODE_ENV", "production");
    notifyError("submit", new Error("boom"));
    await flushMicrotasks();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/notify-error");
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as {
      source: string;
      message: string;
    };
    expect(init.method).toBe("POST");
    expect(body.source).toBe("submit");
    expect(body.message).toBe("boom");
  });

  it("Error 以外の値も message へ文字列化する", async () => {
    vi.stubEnv("NODE_ENV", "production");
    notifyError("pdf", "string failure");
    await flushMicrotasks();
    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const body = JSON.parse(init.body as string) as { message: string };
    expect(body.message).toBe("string failure");
  });

  it("fetch が失敗しても throw せず UI に影響しない（fire-and-forget）", async () => {
    vi.stubEnv("NODE_ENV", "production");
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(() => notifyError("submit", new Error("boom"))).not.toThrow();
    await flushMicrotasks();
  });
});
