const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

type TurnstileVerifyResponse = {
  success: boolean;
  "error-codes"?: string[];
  action?: string;
  cdata?: string;
  challenge_ts?: string;
  hostname?: string;
};

export type TurnstileResult = {
  ok: boolean;
  message?: string;
};

export async function verifyTurnstileToken(token: string, remoteIp?: string | null): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    return { ok: false, message: "Turnstile の秘密鍵が設定されていません。" };
  }

  if (!token || token.length > 2048) {
    return { ok: false, message: "確認を完了してから送信してください。" };
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        secret,
        response: token,
        remoteip: remoteIp ?? undefined
      }),
      cache: "no-store"
    });

    const result = (await response.json()) as TurnstileVerifyResponse;

    if (!result.success) {
      return {
        ok: false,
        message: result["error-codes"]?.includes("timeout-or-duplicate")
          ? "確認の有効期限が切れました。もう一度チェックしてください。"
          : "確認に失敗しました。もう一度お試しください。"
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, message: "確認サービスに接続できませんでした。しばらくしてからもう一度お試しください。" };
  }
}
