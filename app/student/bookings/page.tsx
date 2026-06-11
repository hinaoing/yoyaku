import { Clock, ExternalLink } from "lucide-react";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { cancelBooking } from "@/lib/actions";
import { CANCEL_CUTOFF_HOURS } from "@/lib/constants";
import { requireRole } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { canCancelBooking, formatDateTimeJa, formatTimeJa } from "@/lib/time";
import { EmptyState } from "@/components/empty-state";
import { StatusBanner } from "@/components/status-banner";
import { SupabaseSetup } from "@/components/supabase-setup";

type StudentBookingsPageProps = {
  searchParams: Promise<{ booked?: string; canceled?: string; error?: string; hours?: string; login?: string }>;
};

export default async function StudentBookingsPage({ searchParams }: StudentBookingsPageProps) {
  const { booked, canceled, error, login } = await searchParams;
  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireRole("student");
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, status, teachers(display_name, meeting_url)")
    .eq("student_id", user.id)
    .eq("status", "confirmed")
    .order("starts_at", { ascending: true });

  const activeBookings = bookings ?? [];

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium tracking-wide text-matcha">生徒メニュー</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">予約一覧</h1>
      </section>
      <StatusBanner
        message={
          login
            ? "ログインしました。"
            : booked
              ? "予約が確定しました。"
              : canceled
                ? "予約をキャンセルしました。"
                : undefined
        }
      />
      <StatusBanner
        message={
          error === "cutoff"
            ? `レッスン開始${CANCEL_CUTOFF_HOURS}時間前を過ぎたため、キャンセルできません。`
            : error
              ? "予約を更新できませんでした。"
              : undefined
        }
        tone="error"
      />

      {activeBookings.length > 0 ? (
        <section className="grid gap-4">
          {activeBookings.map((booking) => {
            const teacher = Array.isArray(booking.teachers) ? booking.teachers[0] : booking.teachers;
            const lessonLabel = `${formatDateTimeJa(booking.starts_at)} - ${formatTimeJa(booking.ends_at)}`;
            return (
              <article className="group rounded-xl border border-ink/10 bg-white p-6 shadow-soft transition-all duration-200 hover:border-ink/15 hover:shadow-md" key={booking.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="hidden sm:grid size-11 shrink-0 place-items-center rounded-full bg-matcha/10 text-matcha">
                      <Clock size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-sumi/50">レッスン日時</p>
                      <h2 className="mt-1 text-xl font-semibold text-ink">
                        {lessonLabel}
                      </h2>
                      <p className="mt-1.5 text-sumi/70">{teacher?.display_name ?? "講師"}</p>
                    </div>
                  </div>
                  {teacher?.meeting_url ? (
                    <a
                      className="inline-flex items-center gap-2 rounded-lg border border-matcha/20 bg-matcha/[0.06] px-3 py-2 text-sm font-medium text-matcha transition-colors duration-150 hover:bg-matcha/10"
                      href={teacher.meeting_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink size={15} />
                      レッスンURL
                    </a>
                  ) : null}
                </div>
                {canCancelBooking(booking.starts_at) ? (
                  <form action={cancelBooking.bind(null, booking.id)} className="mt-5">
                    <CancelBookingButton lessonLabel={lessonLabel} />
                  </form>
                ) : (
                  <p className="mt-5 text-sm text-sumi/50">キャンセル期限を過ぎています。</p>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <EmptyState title="予約はまだありません">講師一覧からレッスンを予約できます。</EmptyState>
      )}
    </div>
  );
}
