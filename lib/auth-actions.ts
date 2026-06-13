"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";
import { checkRateLimit, clearExpiredRateLimitEntries } from "@/lib/rate-limit";
import { verifyTurnstileToken } from "@/lib/turnstile";

type SendLoginLinkResult = {
  ok: boolean;
  message: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getClientIp(headerStore: Headers) {
  return (
    headerStore.get("cf-connecting-ip") ||
    headerStore.get("x-real-ip") ||
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function formatRetryMessage(seconds?: number) {
  const minutes = Math.max(1, Math.ceil((seconds ?? 60) / 60));
  return `短時間に複数回送信されています。安全のため一時的に制限しました。${minutes}分後にもう一度お試しください。`;
}

function getConfiguredAppUrl() {
  const appUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.NODE_ENV !== "production" ? "http://localhost:3001" : undefined);

  if (!appUrl) {
    throw new Error("APP_URL を設定してください。");
  }

  const url = new URL(appUrl);

  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("APP_URL は https URL にしてください。");
  }

  return url.origin;
}

function buildAuthCallbackUrl() {
  const url = new URL("/auth/callback", getConfiguredAppUrl());
  url.searchParams.set("next", "/student/bookings?login=1");
  return url.toString();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function sendLoginLink(
  emailInput: string,
  turnstileToken: string
): Promise<SendLoginLinkResult> {
  const email = normalizeEmail(emailInput);

  if (!email || !email.includes("@")) {
    return { ok: false, message: "メールアドレスを確認してください。" };
  }

  try {
    clearExpiredRateLimitEntries();

    const headerStore = await headers();
    const clientIp = getClientIp(headerStore);
    const ipLimit = checkRateLimit(`login-link:ip:${clientIp}`, 10, 15 * 60 * 1000);

    if (!ipLimit.allowed) {
      return { ok: false, message: formatRetryMessage(ipLimit.retryAfterSeconds) };
    }

    const emailLimit = checkRateLimit(`login-link:email:${email}`, 3, 15 * 60 * 1000);

    if (!emailLimit.allowed) {
      return { ok: false, message: formatRetryMessage(emailLimit.retryAfterSeconds) };
    }

    const turnstile = await verifyTurnstileToken(turnstileToken, clientIp === "unknown" ? null : clientIp);

    if (!turnstile.ok) {
      return { ok: false, message: turnstile.message ?? "確認に失敗しました。もう一度お試しください。" };
    }

    const supabaseAdmin = createAdminClient();
    const redirectTo = buildAuthCallbackUrl();
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo
      }
    });

    if (error) {
      return { ok: false, message: `ログインリンクを作成できませんでした。時間をおいてもう一度お試しください。(${error.message})` };
    }

    const actionLink = data.properties?.action_link;

    if (!actionLink) {
      return { ok: false, message: "ログインリンクを作成できませんでした。" };
    }

    await sendEmail({
      to: email,
      subject: "【Yoyaku】ログインリンク",
      text: [
        "Yoyakuにログインするには、次のリンクを開いてください。",
        actionLink,
        "",
        "このリンクは一度だけ使用できます。期限切れ、またはすでに使用済みの場合は、ログイン画面から新しいリンクを送信してください。",
        "心当たりがない場合は、このメールを破棄してください。"
      ].join("\n"),
      html: `
        <div style="font-family: Arial, 'Hiragino Sans', 'Yu Gothic', sans-serif; line-height: 1.7; color: #17201b; background: #fbfbf7; padding: 24px;">
          <div style="max-width: 560px; margin: 0 auto; border: 1px solid #e5e7df; border-radius: 14px; background: #ffffff; padding: 24px;">
          <p style="margin:0 0 8px;color:#5f7f52;font-size:13px;font-weight:700;">Yoyaku</p>
          <h1 style="margin:0;font-size:22px;color:#17201b;">ログインリンク</h1>
          <p>Yoyakuにログインするには、下のボタンをクリックしてください。</p>
          <p style="margin: 24px 0;">
            <a href="${escapeHtml(actionLink)}" style="display: inline-block; background: #5f7f52; color: #ffffff; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">
              Yoyakuにログイン
            </a>
          </p>
          <div style="padding:12px 14px;border-radius:8px;background:#f6f7f2;color:#4b5563;font-size:13px;">
            このリンクは一度だけ使用できます。期限切れ、またはすでに使用済みの場合は、ログイン画面から新しいリンクを送信してください。
          </div>
          <p>ボタンが開かない場合は、以下のURLをブラウザに貼り付けてください。</p>
          <p style="word-break: break-all; color: #5f7f52;">${escapeHtml(actionLink)}</p>
          <p style="margin-top:24px;color:#6b7280;font-size:12px;">心当たりがない場合は、このメールを破棄してください。</p>
          </div>
        </div>
      `
    });

    return { ok: true, message: "ログインリンクを送信しました。メール内のボタンを開くとログインできます。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "ログインリンクを送信できませんでした。時間をおいてもう一度お試しください。"
    };
  }
}
