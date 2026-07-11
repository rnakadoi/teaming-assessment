// クライアントで捕捉したエラーを /api/notify-error へ fire-and-forget で送る。
// await しない・失敗しても UI に影響させない。開発環境では送信せず console.warn のみ。
// 送ってよいのは source（画面名）とエラーメッセージだけ。
// 回答値・スコア・メールアドレス・閲覧/リセット/管理者コードを含めてはならない。
export function notifyError(source: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err);
  const detail = err instanceof Error ? err.stack : undefined;

  if (process.env.NODE_ENV !== "production") {
    console.warn(`[notify-error] ${source}: ${message}`);
    return;
  }

  try {
    void fetch("/api/notify-error", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source, message, detail }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // fetch 自体が同期例外を投げる環境でも無視する
  }
}
