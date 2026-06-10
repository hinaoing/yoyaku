"use client";

import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { sendLoginLink } from "@/lib/auth-actions";

const RESEND_COOLDOWN_SECONDS = 60;

type TurnstileRenderOptions = {
  sitekey: string;
  theme?: "auto" | "light" | "dark";
  size?: "normal" | "flexible" | "compact";
  callback?: (token: string) => void;
  "expired-callback"?: () => void;
  "error-callback"?: () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement | string, options: TurnstileRenderOptions) => string;
  reset: (widgetId?: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const turnstileContainerRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetIdRef = useRef<string | null>(null);
  const isConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const isTurnstileConfigured = Boolean(turnstileSiteKey);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken("");

    if (turnstileWidgetIdRef.current) {
      window.turnstile?.reset(turnstileWidgetIdRef.current);
    }
  }, []);

  const renderTurnstile = useCallback(() => {
    if (!turnstileSiteKey || !turnstileContainerRef.current || !window.turnstile || turnstileWidgetIdRef.current) {
      return;
    }

    turnstileWidgetIdRef.current = window.turnstile.render(turnstileContainerRef.current, {
      sitekey: turnstileSiteKey,
      theme: "light",
      size: "flexible",
      callback: (token) => {
        setTurnstileToken(token);
      },
      "expired-callback": () => {
        setTurnstileToken("");
        setMessage("確認の有効期限が切れました。もう一度チェックしてください。");
      },
      "error-callback": () => {
        setTurnstileToken("");
        setMessage("確認に失敗しました。しばらくしてからもう一度お試しください。");
      }
    });
  }, [turnstileSiteKey]);

  useEffect(() => {
    renderTurnstile();
  }, [renderTurnstile]);

  useEffect(() => {
    if (cooldownSeconds <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [cooldownSeconds]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (cooldownSeconds > 0) {
      return;
    }

    if (!isConfigured) {
      setMessage("Supabase の環境変数を設定してからログインできます。");
      return;
    }

    if (!isTurnstileConfigured) {
      setMessage("Turnstile の環境変数を設定してください。");
      return;
    }

    if (!turnstileToken) {
      setMessage("送信前に確認を完了してください。");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const result = await sendLoginLink(email, turnstileToken);

    setIsSubmitting(false);
    resetTurnstile();

    if (!result.ok) {
      setMessage(result.message);
      return;
    }

    setMessage(`${result.message} メール内のリンクを開いてください。`);
    setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
  }

  return (
    <>
      {isTurnstileConfigured ? (
        <Script
          async
          defer
          onLoad={renderTurnstile}
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        />
      ) : null}

      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-sumi">メールアドレス</span>
          <input
            className="w-full rounded-md border border-ink/15 bg-white px-3 py-3 outline-none ring-matcha/30 transition-all duration-200 placeholder:text-sumi/40 focus:border-matcha/50 focus:ring-4"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            required
            type="email"
            value={email}
          />
        </label>

        {isTurnstileConfigured ? (
          <div className="min-h-[65px] w-full overflow-hidden rounded-md" ref={turnstileContainerRef} />
        ) : (
          <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Turnstile の設定が必要です。
          </p>
        )}

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-4 py-3 font-medium text-white transition-all duration-200 hover:bg-ink/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-ink disabled:active:scale-100"
          disabled={isSubmitting || cooldownSeconds > 0 || !isConfigured || !isTurnstileConfigured}
          type="submit"
        >
          {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
          {isSubmitting
            ? "送信中..."
            : cooldownSeconds > 0
              ? `再送信まで ${cooldownSeconds} 秒`
              : !isConfigured
                ? "Supabase 設定が必要です"
                : !isTurnstileConfigured
                  ? "Turnstile 設定が必要です"
                  : "ログインリンクを送る"}
        </button>
        {message ? <p className="rounded-md border-l-[3px] border-matcha/40 bg-white px-4 py-3 text-sm leading-relaxed text-sumi shadow-soft">{message}</p> : null}
      </form>
    </>
  );
}
