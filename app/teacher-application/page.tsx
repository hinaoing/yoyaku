import { redirect } from "next/navigation";
import { Send } from "lucide-react";
import { StatusBanner } from "@/components/status-banner";
import { submitTeacherApplication } from "@/lib/actions";
import { requireUser } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { SupabaseSetup } from "@/components/supabase-setup";
import { TEACHER_APPLICATION_STATUS_LABELS } from "@/lib/teacher-application-validation";
import type { TeacherApplicationStatus } from "@/lib/types";

type TeacherApplicationPageProps = {
  searchParams: Promise<{ error?: string; submitted?: string }>;
};

export default async function TeacherApplicationPage({ searchParams }: TeacherApplicationPageProps) {
  const { error, submitted } = await searchParams;

  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireUser();
  const [{ data: profile }, { data: application }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase
      .from("teacher_applications")
      .select("id, display_name, bio, meeting_url, contact_email, message, status, rejection_reason")
      .eq("user_id", user.id)
      .maybeSingle()
  ]);

  if (profile?.role === "teacher") {
    redirect("/teacher/settings");
  }

  const status = application?.status as TeacherApplicationStatus | undefined;
  const canSubmit = !application || status === "rejected";

  if (status === "approved") {
    redirect("/teacher/settings");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <section>
        <p className="text-sm font-medium tracking-wide text-matcha">講師申請</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">講師として登録する</h1>
        <p className="mt-3 leading-relaxed text-sumi/75">
          プロフィール内容を送信すると、運営者が確認します。承認後に講師メニューを利用できます。
        </p>
      </section>

      <StatusBanner message={submitted ? "講師申請を送信しました。審査完了までお待ちください。" : undefined} />
      <StatusBanner message={error ? decodeURIComponent(error) : undefined} tone="error" />

      {application ? (
        <section className="rounded-xl border border-ink/10 bg-white p-5 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-matcha">現在の申請状況</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">
                {TEACHER_APPLICATION_STATUS_LABELS[status ?? "pending"]}
              </h2>
            </div>
            {status === "pending" ? (
              <span className="rounded-full bg-matcha/10 px-3 py-1 text-sm font-medium text-matcha">審査中</span>
            ) : null}
            {status === "rejected" ? (
              <span className="rounded-full bg-sakura/10 px-3 py-1 text-sm font-medium text-sakura">再申請できます</span>
            ) : null}
          </div>
          {status === "rejected" && application.rejection_reason ? (
            <div className="mt-4 rounded-lg border border-sakura/20 bg-sakura/[0.06] p-4 text-sm text-sumi">
              <p className="font-medium text-sakura">却下理由</p>
              <p className="mt-1 leading-relaxed">{application.rejection_reason}</p>
            </div>
          ) : null}
        </section>
      ) : null}

      {canSubmit ? (
        <form action={submitTeacherApplication} className="grid gap-5 rounded-xl border border-ink/10 bg-white p-6 shadow-soft">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-sumi">表示名</span>
            <input
              className="rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none ring-matcha/30 transition-all duration-200 placeholder:text-sumi/40 focus:border-matcha/50 focus:ring-4"
              defaultValue={application?.display_name ?? user.email ?? ""}
              maxLength={80}
              name="displayName"
              required
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-sumi">プロフィール</span>
            <textarea
              className="min-h-32 rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none ring-matcha/30 transition-all duration-200 placeholder:text-sumi/40 focus:border-matcha/50 focus:ring-4"
              defaultValue={application?.bio ?? ""}
              maxLength={1000}
              name="bio"
              placeholder="レッスン内容、得意分野、経験などを入力してください。"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-sumi">レッスンURL</span>
            <input
              className="rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none ring-matcha/30 transition-all duration-200 placeholder:text-sumi/40 focus:border-matcha/50 focus:ring-4"
              defaultValue={application?.meeting_url ?? ""}
              name="meetingUrl"
              placeholder="https://zoom.us/..."
              type="url"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-sumi">連絡先メールアドレス</span>
            <input
              className="rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none ring-matcha/30 transition-all duration-200 placeholder:text-sumi/40 focus:border-matcha/50 focus:ring-4"
              defaultValue={application?.contact_email ?? user.email ?? ""}
              name="contactEmail"
              required
              type="email"
            />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-medium text-sumi">申請メッセージ</span>
            <textarea
              className="min-h-28 rounded-lg border border-ink/15 bg-white px-4 py-3 outline-none ring-matcha/30 transition-all duration-200 placeholder:text-sumi/40 focus:border-matcha/50 focus:ring-4"
              defaultValue={application?.message ?? ""}
              maxLength={1000}
              name="message"
              placeholder="運営者に伝えたいことがあれば入力してください。"
            />
          </label>
          <button className="inline-flex w-fit items-center gap-2 rounded-lg bg-ink px-5 py-3 font-medium text-white transition-all duration-200 hover:bg-sumi active:scale-[0.98]">
            <Send size={18} />
            申請する
          </button>
        </form>
      ) : (
        <div className="rounded-xl border border-ink/10 bg-white p-6 text-sumi/70 shadow-soft">
          申請は審査中です。結果が出るまでしばらくお待ちください。
        </div>
      )}
    </div>
  );
}
