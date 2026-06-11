import { redirect } from "next/navigation";
import { CheckCircle, XCircle } from "lucide-react";
import { approveTeacherApplication, rejectTeacherApplication } from "@/lib/actions";
import { isAdminEmail } from "@/lib/admin";
import { StatusBanner } from "@/components/status-banner";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { SupabaseSetup } from "@/components/supabase-setup";
import { TEACHER_APPLICATION_STATUS_LABELS } from "@/lib/teacher-application-validation";
import type { TeacherApplicationStatus } from "@/lib/types";

type AdminTeacherApplicationsPageProps = {
  searchParams: Promise<{ approved?: string; error?: string; rejected?: string }>;
};

type ApplicationRow = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string | null;
  meeting_url: string | null;
  contact_email: string;
  message: string | null;
  status: TeacherApplicationStatus;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  profiles: { email: string | null; full_name: string | null } | Array<{ email: string | null; full_name: string | null }> | null;
};

export default async function AdminTeacherApplicationsPage({ searchParams }: AdminTeacherApplicationsPageProps) {
  const { approved, error, rejected } = await searchParams;

  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { user } = await requireUser();

  if (!isAdminEmail(user.email)) {
    redirect("/teachers");
  }

  const adminSupabase = createAdminClient();
  const { data: applications } = await adminSupabase
    .from("teacher_applications")
    .select("id, user_id, display_name, bio, meeting_url, contact_email, message, status, rejection_reason, created_at, updated_at, profiles(email, full_name)")
    .order("created_at", { ascending: false })
    .returns<ApplicationRow[]>();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium tracking-wide text-matcha">管理</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">講師申請</h1>
        <p className="mt-3 max-w-2xl text-sumi/75">申請内容を確認し、講師登録を承認または却下します。</p>
      </section>

      <StatusBanner message={approved ? "講師申請を承認しました。" : undefined} />
      <StatusBanner message={rejected ? "講師申請を却下しました。" : undefined} />
      <StatusBanner message={error ? "処理できませんでした。申請の状態を確認してください。" : undefined} tone="error" />

      <section className="grid gap-4">
        {applications && applications.length > 0 ? (
          applications.map((application) => {
            const profile = Array.isArray(application.profiles) ? application.profiles[0] : application.profiles;
            const approveAction = approveTeacherApplication.bind(null, application.id);

            return (
              <article className="rounded-xl border border-ink/10 bg-white p-6 shadow-soft" key={application.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-semibold text-ink">{application.display_name}</h2>
                      <span className="rounded-full bg-matcha/10 px-2.5 py-1 text-xs font-medium text-matcha">
                        {TEACHER_APPLICATION_STATUS_LABELS[application.status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-sumi/60">
                      ログイン: {profile?.email ?? "不明"} / 連絡先: {application.contact_email}
                    </p>
                  </div>
                  <p className="text-sm text-sumi/50">申請日: {new Date(application.created_at).toLocaleDateString("ja-JP")}</p>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-paper/70 p-4">
                    <p className="text-sm font-medium text-sumi">プロフィール</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-sumi/75">
                      {application.bio || "未入力"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-paper/70 p-4">
                    <p className="text-sm font-medium text-sumi">申請メッセージ</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-sumi/75">
                      {application.message || "未入力"}
                    </p>
                    {application.meeting_url ? (
                      <a className="mt-3 inline-block text-sm font-medium text-matcha hover:text-matcha/80" href={application.meeting_url}>
                        レッスンURLを確認する
                      </a>
                    ) : null}
                  </div>
                </div>

                {application.rejection_reason ? (
                  <div className="mt-4 rounded-lg border border-sakura/20 bg-sakura/[0.06] p-4 text-sm text-sumi">
                    <p className="font-medium text-sakura">却下理由</p>
                    <p className="mt-1">{application.rejection_reason}</p>
                  </div>
                ) : null}

                {application.status === "pending" ? (
                  <div className="mt-5 grid gap-3 border-t border-ink/10 pt-5 md:grid-cols-[auto_1fr]">
                    <form action={approveAction}>
                      <button className="inline-flex items-center gap-2 rounded-lg bg-matcha px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-matcha/90">
                        <CheckCircle size={17} />
                        承認する
                      </button>
                    </form>
                    <form action={rejectTeacherApplication} className="flex flex-col gap-2 sm:flex-row">
                      <input name="applicationId" type="hidden" value={application.id} />
                      <input
                        className="min-w-0 flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 text-sm outline-none ring-sakura/20 transition-all focus:border-sakura/40 focus:ring-4"
                        name="rejectionReason"
                        placeholder="却下理由"
                      />
                      <button className="inline-flex items-center justify-center gap-2 rounded-lg border border-sakura/25 px-4 py-2.5 text-sm font-medium text-sakura transition-colors hover:bg-sakura/[0.06]">
                        <XCircle size={17} />
                        却下する
                      </button>
                    </form>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="rounded-xl border border-dashed border-ink/15 bg-white p-10 text-center shadow-soft">
            <h2 className="text-lg font-semibold text-ink">申請はまだありません</h2>
            <p className="mt-2 text-sumi/65">講師申請が届くとここに表示されます。</p>
          </div>
        )}
      </section>
    </div>
  );
}
