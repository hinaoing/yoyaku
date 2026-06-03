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
        <p className="text-sm font-medium text-matcha">講師メニュー</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">講師設定</h1>
      </section>
      <StatusBanner message={saved ? "設定を保存しました。" : undefined} />
      <StatusBanner message={error ? "設定を保存できませんでした。" : undefined} tone="error" />

      <form action={updateTeacherSettings} className="grid gap-4 rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-sumi">表示名</span>
          <input
            className="rounded-md border border-ink/15 px-3 py-3"
            defaultValue={teacher?.display_name ?? user.email ?? ""}
            name="displayName"
            required
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-sumi">プロフィール</span>
          <textarea
            className="min-h-32 rounded-md border border-ink/15 px-3 py-3"
            defaultValue={teacher?.bio ?? ""}
            name="bio"
            placeholder="レッスン内容や得意分野を入力してください"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium text-sumi">固定レッスンURL</span>
          <input
            className="rounded-md border border-ink/15 px-3 py-3"
            defaultValue={teacher?.meeting_url ?? ""}
            name="meetingUrl"
            placeholder="https://zoom.us/..."
            type="url"
          />
        </label>
        <button className="inline-flex w-fit items-center gap-2 rounded-md bg-ink px-4 py-3 font-medium text-white">
          <Save size={18} />
          保存する
        </button>
      </form>
    </div>
  );
}
