import { AccountProfileForm } from "@/app/account/account-profile-form";
import { StatusBanner } from "@/components/status-banner";
import { SupabaseSetup } from "@/components/supabase-setup";
import { updateAccountProfile } from "@/lib/actions";
import { requireUser } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type AccountPageProps = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

function errorMessage(error?: string) {
  if (!error) {
    return undefined;
  }

  if (error === "avatar") {
    return "プロフィール画像をアップロードできませんでした。";
  }

  if (error === "save") {
    return "プロフィールを保存できませんでした。";
  }

  return decodeURIComponent(error);
}

export default async function AccountPage({ searchParams }: AccountPageProps) {
  const { error, saved } = await searchParams;

  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = profile?.full_name ?? "";
  const displayLabel = displayName || user.email || "User";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <p className="text-sm font-medium tracking-wide text-matcha">アカウント</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">プロフィール</h1>
        <p className="mt-3 leading-relaxed text-sumi/75">表示名とプロフィール画像を更新できます。表示名は予約一覧やメールの宛名にも使用されます。</p>
      </section>

      <StatusBanner message={saved ? "プロフィールを保存しました。" : undefined} />
      <StatusBanner message={errorMessage(error)} tone="error" />

      <AccountProfileForm
        action={updateAccountProfile}
        avatarUrl={profile?.avatar_url ?? null}
        displayLabel={displayLabel}
        displayName={displayName}
        email={user.email}
      />
    </div>
  );
}
