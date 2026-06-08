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
  return `送信回数が多すぎます。${minutes}分後にもう一度お試しください。`;
}

export async function sendLoginLink(
  emailInput: string,
  origin: string,
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
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/student/bookings?login=1")}`;
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: {
        redirectTo
      }
    });

    if (error) {
      return { ok: false, message: `ログインリンクを作成できませんでした: ${error.message}` };
    }

    const actionLink = data.properties?.action_link;

    if (!actionLink) {
      return { ok: false, message: "ログインリンクを作成できませんでした。" };
    }

    await sendEmail({
      to: email,
      subject: "Yoyaku ログインリンク",
      text: `Yoyakuにログインするには、次のリンクを開いてください: ${actionLink}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #17201b;">
          <p>Yoyakuにログインするには、下のボタンをクリックしてください。</p>
          <p style="margin: 24px 0;">
            <a href="${actionLink}" style="display: inline-block; background: #17201b; color: #ffffff; padding: 12px 18px; border-radius: 6px; text-decoration: none; font-weight: 700;">
              Yoyakuにログイン
            </a>
          </p>
          <p>ボタンが開かない場合は、以下のURLをブラウザに貼り付けてください。</p>
          <p style="word-break: break-all; color: #5f7f52;">${actionLink}</p>
        </div>
      `
    });

    return { ok: true, message: "ログインリンクをメールで送信しました。" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "ログインリンクを送信できませんでした。"
    };
  }
}
