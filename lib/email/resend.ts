import "server-only";

type SendEmailParams = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

type ResendError = {
  message?: string;
  name?: string;
};

export async function sendEmail({ to, subject, html, text }: SendEmailParams) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM || "Yoyaku <onboarding@resend.dev>";

  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      text
    })
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ResendError | null;
    throw new Error(error?.message || `Resend failed with status ${response.status}.`);
  }
}
