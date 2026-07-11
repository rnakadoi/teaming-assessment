// /api/notify-error のユニットテスト。Slack への実送信はせず fetch をモックする。
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

const WEBHOOK = "https://hooks.slack.com/services/T000/B000/XXXX";

function jsonRequest(body: unknown, contentType = "application/json"): Request {
  return new Request("http://localhost/api/notify-error", {
    method: "POST",
    headers: { "content-type": contentType },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

/** モック fetch が Slack に送った text ペイロードを返す */
function sentText(fetchMock: ReturnType<typeof vi.fn>, call = 0): string {
  const init = fetchMock.mock.calls[call][1] as RequestInit;
  return (JSON.parse(init.body as string) as { text: string }).text;
}

describe("POST /api/notify-error", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn().mockResolvedValue(new Response("ok"));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("SLACK_WEBHOOK_URL", WEBHOOK);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("SLACK_WEBHOOK_URL 未設定なら 204 でスキップし送信しない", async () => {
    vi.stubEnv("SLACK_WEBHOOK_URL", "");
    const res = await POST(jsonRequest({ source: "t1-unset", message: "boom" }));
    expect(res.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("Content-Type が application/json でなければ 415", async () => {
    const res = await POST(
      jsonRequest({ source: "t2-ct", message: "boom" }, "text/plain"),
    );
    expect(res.status).toBe(415);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("JSON として不正な body は 400", async () => {
    const res = await POST(jsonRequest("{not json"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("source / message が欠けていれば 400", async () => {
    const noSource = await POST(jsonRequest({ message: "boom" }));
    const noMessage = await POST(jsonRequest({ source: "t4-missing" }));
    const wrongType = await POST(jsonRequest({ source: "t4-missing", message: 42 }));
    expect(noSource.status).toBe(400);
    expect(noMessage.status).toBe(400);
    expect(wrongType.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("正常系: Webhook に source と message を含む text を POST して 204", async () => {
    const res = await POST(
      jsonRequest({ source: "t5-ok", message: "RPC failed", detail: "code=500" }),
    );
    expect(res.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe(WEBHOOK);
    const text = sentText(fetchMock);
    expect(text).toContain("t5-ok");
    expect(text).toContain("RPC failed");
    expect(text).toContain("code=500");
  });

  it("detail は 500 文字に切り詰める", async () => {
    const detail = "a".repeat(500) + "Z";
    const res = await POST(jsonRequest({ source: "t6-trunc", message: "boom", detail }));
    expect(res.status).toBe(204);
    const text = sentText(fetchMock);
    expect(text).toContain("a".repeat(500));
    expect(text).not.toContain("Z");
  });

  it("同一 source+message の連投は抑制される（別 message は通す）", async () => {
    const first = await POST(jsonRequest({ source: "t7-dedupe", message: "same" }));
    const second = await POST(jsonRequest({ source: "t7-dedupe", message: "same" }));
    const other = await POST(jsonRequest({ source: "t7-dedupe", message: "other" }));
    expect(first.status).toBe(204);
    expect(second.status).toBe(204);
    expect(other.status).toBe(204);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sentText(fetchMock, 0)).toContain("same");
    expect(sentText(fetchMock, 1)).toContain("other");
  });

  it("Webhook への送信が失敗しても 204（クライアントに影響させない）", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    const res = await POST(jsonRequest({ source: "t8-fail", message: "boom" }));
    expect(res.status).toBe(204);
  });
});
