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
    <div className="mx-auto grid max-w-md gap-6 pt-10">
      <div>
        <p className="text-sm font-medium text-matcha">オンラインレッスン予約</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">ログイン</h1>
        <p className="mt-3 text-sumi/75">メールに届くリンクから、講師または生徒として予約を管理できます。</p>
      </div>
      <StatusBanner message={error ? `ログインできませんでした: ${error}` : undefined} tone="error" />
      <section className="rounded-lg border border-ink/10 bg-paper p-5 shadow-soft">
        <LoginForm />
      </section>
    </div>
  );
}
