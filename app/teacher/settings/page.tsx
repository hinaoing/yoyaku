import { Save } from "lucide-react";
import { updateTeacherSettings } from "@/lib/actions";
import { requireRole } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { StatusBanner } from "@/components/status-banner";
import { SupabaseSetup } from "@/components/supabase-setup";

type SettingsPageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function TeacherSettingsPage({ searchParams }: SettingsPageProps) {
  const { saved, error } = await searchParams;
  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireRole("teacher");
  const { data: teacher } = await supabase
    .from("teachers")
    .select("display_name, bio, meeting_url")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium tracking-wide text-matcha">講師メニュー</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">講師設定</h1>
      </section>
      <StatusBanner message={saved ? "設定を保存しました。" : undefined} />
      <StatusBanner message={error ? "設定を保存できませんでした。" : undefined} tone="error" />

      <form action={updateTeacherSettings} className="grid gap-5 rounded-xl border border-ink/10 bg-white p-6 shadow-soft">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-sumi">表示名</span>
          <input
            className="rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none ring-matcha/30 transition-all duration-200 placeholder:text-sumi/40 focus:border-matcha/50 focus:ring-4"
            defaultValue={teacher?.display_name ?? user.email ?? ""}
            name="displayName"
            required
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-sumi">プロフィール</span>
          <textarea
            className="min-h-32 rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none ring-matcha/30 transition-all duration-200 placeholder:text-sumi/40 focus:border-matcha/50 focus:ring-4"
            defaultValue={teacher?.bio ?? ""}
            name="bio"
            placeholder="レッスン内容や得意分野を入力してください"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-sumi">固定レッスンURL</span>
          <input
            className="rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none ring-matcha/30 transition-all duration-200 placeholder:text-sumi/40 focus:border-matcha/50 focus:ring-4"
            defaultValue={teacher?.meeting_url ?? ""}
            name="meetingUrl"
            placeholder="https://zoom.us/..."
            type="url"
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
