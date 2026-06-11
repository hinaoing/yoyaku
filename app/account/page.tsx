import { Camera, Save } from "lucide-react";
import { StatusBanner } from "@/components/status-banner";
import { SupabaseSetup } from "@/components/supabase-setup";
import { updateAccountProfile } from "@/lib/actions";
import { requireUser } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";

type AccountPageProps = {
  searchParams: Promise<{ error?: string; saved?: string }>;
};

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "U";
}

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

      <form action={updateAccountProfile} className="grid gap-6 rounded-xl border border-ink/10 bg-white p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-4">
          {profile?.avatar_url ? (
            <img alt="" className="size-20 rounded-full border border-ink/10 object-cover" src={profile.avatar_url} />
          ) : (
            <div className="grid size-20 place-items-center rounded-full bg-matcha/10 text-2xl font-semibold text-matcha">
              {initials(displayLabel)}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-sumi">ログインメール</p>
            <p className="mt-1 text-sumi/70">{user.email}</p>
          </div>
        </div>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-sumi">表示名</span>
          <input
            className="rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none ring-matcha/30 transition-all duration-200 placeholder:text-sumi/40 focus:border-matcha/50 focus:ring-4"
            defaultValue={displayName}
            maxLength={80}
            name="fullName"
            placeholder={user.email ?? "表示名"}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-sumi">プロフィール画像</span>
          <span className="flex items-center gap-2 rounded-lg border border-dashed border-ink/20 bg-paper/60 px-4 py-4 text-sm text-sumi/70">
            <Camera size={18} />
            jpg、png、webp、2MB以内
          </span>
          <input
            accept="image/jpeg,image/png,image/webp"
            className="rounded-lg border border-ink/15 bg-white px-4 py-3 text-sm outline-none ring-matcha/30 transition-all duration-200 file:mr-4 file:rounded-md file:border-0 file:bg-matcha/10 file:px-3 file:py-2 file:text-matcha focus:border-matcha/50 focus:ring-4"
            name="avatar"
            type="file"
          />
        </label>

        <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-ink px-5 py-3 font-medium text-white transition-all duration-200 hover:bg-sumi active:scale-[0.98]">
          <Save size={18} />
          保存する
        </button>
      </form>
    </div>
  );
}
