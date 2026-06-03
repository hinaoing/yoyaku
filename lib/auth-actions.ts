"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email/resend";

type SendLoginLinkResult = {
  ok: boolean;
  message: string;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function sendLoginLink(emailInput: string, origin: string): Promise<SendLoginLinkResult> {
  const email = normalizeEmail(emailInput);

  if (!email || !email.includes("@")) {
    return { ok: false, message: "メールアドレスを確認してください。" };
  }

  try {
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
          <p>ボタンが開けない場合は、以下のURLをブラウザに貼り付けてください。</p>
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
