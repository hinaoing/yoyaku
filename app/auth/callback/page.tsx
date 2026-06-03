"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("ログインを確認しています...");

  useEffect(() => {
    let isMounted = true;

    async function finishLogin() {
      const supabase = createClient();
      const next = searchParams.get("next") || "/student/bookings?login=1";
      const code = searchParams.get("code");
      const errorDescription = searchParams.get("error_description");

      if (errorDescription) {
        router.replace(`/login?error=${encodeURIComponent(errorDescription)}`);
        return;
      }

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          if (error.message.toLowerCase().includes("code verifier")) {
            router.replace(
              `/login?error=${encodeURIComponent(
                "古いログインリンクです。ログイン画面を再読み込みして、新しいリンクを送信してください。"
              )}`
            );
            return;
          }

          router.replace(`/login?error=${encodeURIComponent(error.message)}`);
          return;
        }
      }

      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) {
        if (isMounted) {
          setMessage("ログインセッションを確認できませんでした。もう一度ログインリンクを送信してください。");
        }
        return;
      }

      const syncResponse = await fetch("/auth/sync-profile", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!syncResponse.ok) {
        const body = (await syncResponse.json().catch(() => null)) as { error?: string } | null;
        router.replace(`/login?error=${encodeURIComponent(body?.error ?? "プロフィールを同期できませんでした。")}`);
        return;
      }

      router.replace(next);
    }

    finishLogin();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="mx-auto max-w-md rounded-lg border border-ink/10 bg-white p-6 text-center shadow-soft">
      <p className="text-sm font-medium text-matcha">Yoyaku</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">ログイン処理中</h1>
      <p className="mt-3 text-sumi/75">{message}</p>
    </div>
  );
}
