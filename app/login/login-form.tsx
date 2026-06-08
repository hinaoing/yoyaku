"use client";

import { useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { sendLoginLink } from "@/lib/auth-actions";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isConfigured) {
      setMessage("Supabase の環境変数を設定してからログインできます。");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const result = await sendLoginLink(email, window.location.origin);

    setIsSubmitting(false);
    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setMessage(`${result.message} メール内のリンクを開いてください。`);
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className="mb-2 block text-sm font-medium text-sumi">メールアドレス</span>
        <input
          className="w-full rounded-md border border-ink/15 bg-white px-3 py-3 outline-none ring-matcha/30 focus:ring-4"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
          required
          type="email"
          value={email}
        />
      </label>
      <button
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || !isConfigured}
        type="submit"
      >
        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
        {isSubmitting ? "送信中..." : !isConfigured ? "Supabase 設定が必要です" : "ログインリンクを送る"}
      </button>
      {message ? <p className="rounded-md bg-white px-3 py-2 text-sm text-sumi shadow-soft">{message}</p> : null}
    </form>
  );
}
