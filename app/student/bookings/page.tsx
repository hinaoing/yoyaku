import { CalendarX, ExternalLink } from "lucide-react";
import { cancelBooking } from "@/lib/actions";
import { CANCEL_CUTOFF_HOURS } from "@/lib/constants";
import { requireRole } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { canCancelBooking, formatDateTimeJa } from "@/lib/time";
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
    .order("starts_at", { ascending: true });

  const activeBookings = (bookings ?? []).filter((booking) => booking.status === "confirmed");

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium text-matcha">生徒メニュー</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">予約一覧</h1>
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
            return (
              <article className="rounded-lg border border-ink/10 bg-white p-5 shadow-soft" key={booking.id}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-sumi/65">レッスン日時</p>
                    <h2 className="mt-1 text-xl font-semibold text-ink">{formatDateTimeJa(booking.starts_at)}</h2>
                    <p className="mt-2 text-sumi">{teacher?.display_name ?? "講師"}</p>
                  </div>
                  {teacher?.meeting_url ? (
                    <a
                      className="inline-flex items-center gap-2 rounded-md border border-ink/15 px-3 py-2 text-sm hover:bg-paper"
                      href={teacher.meeting_url}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink size={16} />
                      レッスンURL
                    </a>
                  ) : null}
                </div>
                {canCancelBooking(booking.starts_at) ? (
                  <form action={cancelBooking.bind(null, booking.id)} className="mt-5">
                    <button className="inline-flex items-center gap-2 rounded-md border border-sakura/35 px-3 py-2 text-sm text-ink hover:bg-sakura/10">
                      <CalendarX size={16} />
                      キャンセル
                    </button>
                  </form>
                ) : (
                  <p className="mt-5 text-sm text-sumi/65">キャンセル期限を過ぎています。</p>
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
