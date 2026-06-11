import "server-only";

import { getAdminEmails } from "@/lib/admin";
import { sendEmail } from "@/lib/email/resend";

type TeacherApplicationEmailContext = {
  applicationId: string;
  applicantEmail: string;
  contactEmail: string;
  displayName: string;
  rejectionReason?: string | null;
};

function appUrl() {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function htmlBody(title: string, lines: string[]) {
  return [
    `<h1 style="font-size:20px;color:#17201b">${escapeHtml(title)}</h1>`,
    ...lines.map((line) => `<p style="line-height:1.7;color:#2f3a35">${line}</p>`),
    `<p style="margin-top:24px;color:#6b7280;font-size:13px">Yoyaku</p>`
  ].join("");
}

async function sendApplicationEmail(to: string, subject: string, text: string, html: string) {
  try {
    await sendEmail({ html, subject, text, to });
    return true;
  } catch (error) {
    console.error("Failed to send teacher application email:", error);
    return false;
  }
}

export async function sendTeacherApplicationSubmittedEmails(context: TeacherApplicationEmailContext) {
  const adminEmails = getAdminEmails();

  if (adminEmails.length === 0) {
    return false;
  }

  const reviewUrl = `${appUrl()}/admin/teacher-applications`;
  const text = [
    "新しい講師申請が届きました。",
    `申請者: ${context.displayName}`,
    `ログインメール: ${context.applicantEmail}`,
    `連絡先: ${context.contactEmail}`,
    `審査画面: ${reviewUrl}`
  ].join("\n");
  const html = htmlBody("新しい講師申請が届きました", [
    `<strong>申請者:</strong> ${escapeHtml(context.displayName)}`,
    `<strong>ログインメール:</strong> ${escapeHtml(context.applicantEmail)}`,
    `<strong>連絡先:</strong> ${escapeHtml(context.contactEmail)}`,
    `<a href="${escapeHtml(reviewUrl)}" style="color:#5f7f52">審査画面を開く</a>`
  ]);

  const results = await Promise.all(adminEmails.map((email) => sendApplicationEmail(email, "【Yoyaku】講師申請が届きました", text, html)));
  return results.every(Boolean);
}

export async function sendTeacherApplicationApprovedEmail(context: TeacherApplicationEmailContext) {
  const settingsUrl = `${appUrl()}/teacher/settings`;
  const text = [
    "講師申請が承認されました。",
    "講師設定ページからプロフィールやレッスンURLを確認してください。",
    `講師設定: ${settingsUrl}`
  ].join("\n");
  const html = htmlBody("講師申請が承認されました", [
    "講師としてYoyakuを利用できるようになりました。",
    `<a href="${escapeHtml(settingsUrl)}" style="color:#5f7f52">講師設定を開く</a>`
  ]);

  return sendApplicationEmail(context.contactEmail, "【Yoyaku】講師申請が承認されました", text, html);
}

export async function sendTeacherApplicationRejectedEmail(context: TeacherApplicationEmailContext) {
  const applicationUrl = `${appUrl()}/teacher-application`;
  const reason = context.rejectionReason || "理由は記載されていません。";
  const text = [
    "講師申請は今回は承認されませんでした。",
    `理由: ${reason}`,
    "内容を修正して再申請できます。",
    `申請ページ: ${applicationUrl}`
  ].join("\n");
  const html = htmlBody("講師申請は承認されませんでした", [
    `<strong>理由:</strong> ${escapeHtml(reason)}`,
    "内容を修正して再申請できます。",
    `<a href="${escapeHtml(applicationUrl)}" style="color:#5f7f52">申請ページを開く</a>`
  ]);

  return sendApplicationEmail(context.contactEmail, "【Yoyaku】講師申請の結果について", text, html);
}
