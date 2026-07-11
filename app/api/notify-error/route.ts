// /api/notify-error : クライアントで起きたエラーを Slack Incoming Webhook へ通知する。
// SLACK_WEBHOOK_URL はサーバー専用環境変数（NEXT_PUBLIC_ を付けない・クライアントに漏らさない）。
// 未設定なら 204 で無害にスキップする。
// 通知に含めるのは source（画面名）・エラーメッセージ・発生時刻のみ。
// 回答値・スコア・メールアドレス・閲覧/リセット/管理者コードは送信しない（呼び出し側の契約）。
export const runtime = "nodejs";

const SOURCE_MAX = 100;
const MESSAGE_MAX = 500;
const DETAIL_MAX = 500;
const SUPPRESS_WINDOW_MS = 5 * 60 * 1000;
const RECENT_MAX_ENTRIES = 1000;

// 同一 source+message の連投抑制。プロセス内メモリの best-effort であり、
// 再起動や複数インスタンスをまたぐ抑制は保証しない（それで十分な用途）。
const recentlySent = new Map<string, number>();

function shouldSuppress(key: string, now: number): boolean {
  const last = recentlySent.get(key);
  if (last !== undefined && now - last < SUPPRESS_WINDOW_MS) return true;
  if (recentlySent.size >= RECENT_MAX_ENTRIES) {
    for (const [k, t] of recentlySent) {
      if (now - t >= SUPPRESS_WINDOW_MS) recentlySent.delete(k);
    }
    if (recentlySent.size >= RECENT_MAX_ENTRIES) recentlySent.clear();
  }
  recentlySent.set(key, now);
  return false;
}

export async function POST(req: Request): Promise<Response> {
  if (!req.headers.get("content-type")?.includes("application/json")) {
    return new Response(null, { status: 415 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const { source, message, detail } = (body ?? {}) as {
    source?: unknown;
    message?: unknown;
    detail?: unknown;
  };
  if (typeof source !== "string" || source.trim() === "") {
    return new Response(null, { status: 400 });
  }
  if (typeof message !== "string" || message.trim() === "") {
    return new Response(null, { status: 400 });
  }

  const webhook = process.env.SLACK_WEBHOOK_URL;
  if (!webhook) return new Response(null, { status: 204 });

  const safeSource = source.slice(0, SOURCE_MAX);
  const safeMessage = message.slice(0, MESSAGE_MAX);
  if (shouldSuppress(`${safeSource}\n${safeMessage}`, Date.now())) {
    return new Response(null, { status: 204 });
  }

  const occurredAt = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  let text = `:rotating_light: [Ieruka] ${safeSource} — ${safeMessage}（${occurredAt} JST）`;
  if (typeof detail === "string" && detail !== "") {
    text += `\n\`\`\`${detail.slice(0, DETAIL_MAX)}\`\`\``;
  }

  try {
    await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    // 通知の失敗はクライアントに影響させない（ログにも残さない）
  }
  return new Response(null, { status: 204 });
}
