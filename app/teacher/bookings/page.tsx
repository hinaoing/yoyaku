import { Calendar, ExternalLink } from "lucide-react";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { StatusBanner } from "@/components/status-banner";
import { cancelTeacherBooking } from "@/lib/actions";
import { requireRole } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { canCancelBooking, formatDateTimeJa, formatTimeJa } from "@/lib/time";
import { EmptyState } from "@/components/empty-state";
import { SupabaseSetup } from "@/components/supabase-setup";

type TeacherBookingsPageProps = {
  searchParams: Promise<{ canceled?: string; error?: string; hours?: string }>;
};

export default async function TeacherBookingsPage({ searchParams }: TeacherBookingsPageProps) {
  const { canceled, error } = await searchParams;

  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireRole("teacher");
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, status, profiles(full_name, email)")
    .eq("teacher_id", user.id)
    .eq("status", "confirmed")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium tracking-wide text-matcha">講師メニュー</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">予約一覧</h1>
      </section>
      <StatusBanner message={canceled ? "予約をキャンセルしました。生徒にもメールで通知しました。" : undefined} />
      <StatusBanner
        message={
          error === "cutoff"
            ? "レッスン開始12時間前を過ぎているため、キャンセルできません。"
            : error
              ? "予約をキャンセルできませんでした。"
              : undefined
        }
        tone="error"
      />

      {bookings && bookings.length > 0 ? (
        <section className="grid gap-4">
          {bookings.map((booking) => {
            const student = Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles;
            const lessonLabel = `${formatDateTimeJa(booking.starts_at)} - ${formatTimeJa(booking.ends_at)}`;
            return (
              <article className="group rounded-xl border border-ink/10 bg-white p-6 shadow-soft transition-all duration-200 hover:border-ink/15 hover:shadow-md" key={booking.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:grid size-11 shrink-0 place-items-center rounded-full bg-matcha/10 text-matcha">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-sumi/50">レッスン日時</p>
                      <h2 className="mt-1 text-xl font-semibold text-ink">{lessonLabel}</h2>
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-sumi/70">
                        <span className="font-medium text-sumi">{student?.full_name || student?.email || "生徒"}</span>
                        {student?.email ? (
                          <a className="inline-flex items-center gap-1 rounded-md text-matcha transition-colors hover:text-matcha/80" href={`mailto:${student.email}`}>
                            <ExternalLink size={13} />
                            連絡する
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  {canCancelBooking(booking.starts_at) ? (
                    <form action={cancelTeacherBooking.bind(null, booking.id)}>
                      <CancelBookingButton lessonLabel={lessonLabel} />
                    </form>
                  ) : (
                    <p className="rounded-lg bg-ink/[0.04] px-3 py-2 text-sm text-sumi/50">キャンセル期限を過ぎています。</p>
                  )}
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
