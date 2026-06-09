import { ExternalLink } from "lucide-react";
import { requireRole } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { formatDateTimeJa, formatTimeJa } from "@/lib/time";
import { EmptyState } from "@/components/empty-state";
import { SupabaseSetup } from "@/components/supabase-setup";

export default async function TeacherBookingsPage() {
  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireRole("teacher");
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, status, profiles(full_name, email)")
    .eq("teacher_id", user.id)
    .eq("status", "confirmed")
    .order("starts_at", { ascending: true });

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-matcha">講師メニュー</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">予約一覧</h1>
      </section>

      {bookings && bookings.length > 0 ? (
        <section className="grid gap-4">
          {bookings.map((booking) => {
            const student = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
            return (
              <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft" key={booking.id}>
                <p className="text-sm text-sumi/65">レッスン日時</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">
                  {formatDateTimeJa(booking.starts_at)} - {formatTimeJa(booking.ends_at)}
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-sumi">
                  <span>{student?.full_name || student?.email || "生徒"}</span>
                  {student?.email ? (
                    <a className="inline-flex items-center gap-1 text-matcha" href={`mailto:${student.email}`}>
                      <ExternalLink size={14} />
                      連絡する
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState title="予約はまだありません">生徒が予約すると、ここに表示されます。</EmptyState>
      )}
    </div>
  );
}
