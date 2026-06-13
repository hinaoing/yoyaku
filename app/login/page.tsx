import { LoginForm } from "@/app/login/login-form";
import { StatusBanner } from "@/components/status-banner";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

function loginErrorMessage(error?: string) {
  if (!error) {
    return null;
  }

  if (error.includes("期限切れ") || error.includes("expired")) {
    return {
      title: "ログインリンクの期限が切れています",
      body: "ログインリンクは一定時間が過ぎると使えません。メールアドレスを入力し直して、新しいリンクを送信してください。"
    };
  }

  if (error.includes("古いログインリンク") || error.includes("code verifier") || error.includes("invalid")) {
    return {
      title: "このログインリンクは使用できません",
      body: "古いリンク、または一度使用したリンクの可能性があります。ログイン画面を再読み込みして、新しいリンクを送信してください。"
    };
  }

  if (error.includes("セッション") || error.includes("session")) {
    return {
      title: "ログイン状態を確認できませんでした",
      body: "ブラウザのCookieが無効になっている、またはリンクが古い可能性があります。新しいログインリンクを送信してください。"
    };
  }

  return {
    title: "ログインできませんでした",
    body: error
  };
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const formattedError = loginErrorMessage(error);

  if (hasSupabaseConfig()) {
    const supabase = await createClient();
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user && !error) {
      redirect("/student/bookings");
    }
  }

  return (
    <div className="relative mx-auto grid min-h-[80vh] max-w-md content-center gap-6">
      <div className="pointer-events-none absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-matcha/[0.06] blur-3xl" aria-hidden="true" />
      <div className="relative">
        <p className="text-sm font-medium tracking-wide text-matcha">オンラインレッスン予約</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">ログイン</h1>
        <p className="mt-3 leading-relaxed text-sumi/75">メールに届くリンクから、講師または生徒として予約を管理できます。</p>
      </div>
      <StatusBanner
        message={formattedError ? `${formattedError.title}。${formattedError.body}` : undefined}
        tone="error"
      />
      <section className="relative rounded-xl border border-ink/10 bg-paper p-6 shadow-soft">
        <LoginForm />
      </section>
    </div>
  );
}
