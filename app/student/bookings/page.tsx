import { StudentBookingsCalendar } from "@/app/student/bookings/student-bookings-calendar";
import { CANCEL_CUTOFF_HOURS } from "@/lib/constants";
import { requireRole } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { formatTokyoDateKey, getCurrentAndNextMonthRange, listDatesBetween } from "@/lib/time";
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
  const now = new Date();
  const { currentMonthStart, nextMonthStart, nextMonthEnd } = getCurrentAndNextMonthRange(now);
  const dates = listDatesBetween(currentMonthStart, nextMonthEnd);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, status, teachers(display_name, meeting_url)")
    .eq("student_id", user.id)
    .eq("status", "confirmed")
    .gte("starts_at", new Date(`${currentMonthStart}T00:00:00+09:00`).toISOString())
    .lte("starts_at", new Date(`${nextMonthEnd}T23:59:59+09:00`).toISOString())
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
        <StudentBookingsCalendar bookings={activeBookings} dates={dates} nextMonthStart={nextMonthStart} todayKey={formatTokyoDateKey(now)} />
      ) : (
        <EmptyState title="今月・来月の予約はまだありません">講師一覧からレッスンを予約できます。</EmptyState>
      )}
    </div>
  );
}
