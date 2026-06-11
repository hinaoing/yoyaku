import Link from "next/link";
import { ArrowRight, User, Video } from "lucide-react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { EmptyState } from "@/components/empty-state";
import { SupabaseSetup } from "@/components/supabase-setup";
import { requireUser } from "@/lib/supabase/auth";
import { getTeacherAvatarUrlMap } from "@/lib/teacher-avatars";

export default async function TeachersPage() {
  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase } = await requireUser();
  const { data: teachers } = await supabase
    .from("teachers")
    .select("user_id, display_name, bio, meeting_url")
    .order("display_name");
  const avatarUrls = await getTeacherAvatarUrlMap((teachers ?? []).map((teacher) => teacher.user_id));

  return (
    <div className="space-y-8">
      <section className="grid gap-3">
        <p className="text-sm font-medium tracking-wide text-matcha">講師一覧</p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink">オンラインレッスンを予約する</h1>
        <p className="max-w-2xl leading-relaxed text-sumi/70">
          希望する講師を選び、空いている25分枠から予約できます。予約はすぐに確定します。
        </p>
      </section>

      {teachers && teachers.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {teachers.map((teacher) => {
            const avatarUrl = avatarUrls.get(teacher.user_id) ?? null;

            return (
              <Link
                className="group rounded-xl border border-ink/10 bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-matcha/30 hover:shadow-lg"
                href={`/teachers/${teacher.user_id}`}
                key={teacher.user_id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {avatarUrl ? (
                      <img alt="" className="size-11 shrink-0 rounded-full border border-ink/10 object-cover" src={avatarUrl} />
                    ) : (
                      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-matcha/10 text-matcha">
                        <User size={20} />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-semibold text-ink">{teacher.display_name}</h2>
                      <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-sumi/70">
                        {teacher.bio || "プロフィールはまだ登録されていません。"}
                      </p>
                    </div>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-matcha/10 text-matcha transition-all duration-200 group-hover:bg-matcha group-hover:text-white">
                    <ArrowRight size={17} />
                  </span>
                </div>
                {teacher.meeting_url ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink/[0.04] px-3 py-1 text-xs font-medium text-sumi/60">
                    <Video size={14} />
                    オンライン対応
                  </div>
                ) : null}
              </Link>
            );
          })}
        </section>
      ) : (
        <EmptyState title="講師がまだ登録されていません">
          Supabaseで講師ロールを付与し、講師設定ページからプロフィールを登録してください。
        </EmptyState>
      )}
    </div>
  );
}
