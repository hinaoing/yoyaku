import { LoginForm } from "@/app/login/login-form";
import { StatusBanner } from "@/components/status-banner";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
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
      <StatusBanner message={error ? `ログインできませんでした: ${error}` : undefined} tone="error" />
      <section className="relative rounded-xl border border-ink/10 bg-paper p-6 shadow-soft">
        <LoginForm />
      </section>
    </div>
  );
}
