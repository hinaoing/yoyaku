import Link from "next/link";
import { ArrowRight, Video } from "lucide-react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { EmptyState } from "@/components/empty-state";
import { SupabaseSetup } from "@/components/supabase-setup";
import { requireUser } from "@/lib/supabase/auth";

export default async function TeachersPage() {
  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase } = await requireUser();
  const { data: teachers } = await supabase
    .from("teachers")
    .select("user_id, display_name, bio, meeting_url")
    .order("display_name");

  return (
    <div className="space-y-7">
      <section className="grid gap-3">
        <p className="text-sm font-medium text-matcha">講師一覧</p>
        <h1 className="max-w-2xl text-3xl font-semibold text-ink">オンラインレッスンを予約する</h1>
        <p className="max-w-2xl text-sumi/75">
          希望する講師を選び、空いている30分枠から予約できます。予約はすぐに確定します。
        </p>
      </section>

      {teachers && teachers.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {teachers.map((teacher) => (
            <Link
              className="group rounded-lg border border-ink/10 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:border-matcha/40"
              href={`/teachers/${teacher.user_id}`}
              key={teacher.user_id}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-ink">{teacher.display_name}</h2>
                  <p className="mt-2 line-clamp-3 text-sm leading-6 text-sumi/75">
                    {teacher.bio || "プロフィールはまだ登録されていません。"}
                  </p>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-md bg-matcha/10 text-matcha">
                  <ArrowRight size={18} />
                </span>
              </div>
              {teacher.meeting_url ? (
                <p className="mt-5 inline-flex items-center gap-2 text-sm text-sumi/70">
                  <Video size={16} />
                  オンライン対応
                </p>
              ) : null}
            </Link>
          ))}
        </section>
      ) : (
        <EmptyState title="講師がまだ登録されていません">
          Supabaseで講師ロールを付与し、講師設定ページからプロフィールを登録してください。
        </EmptyState>
      )}
    </div>
  );
}
