import { StatusBanner } from "@/components/status-banner";
import { EmptyState } from "@/components/empty-state";
import { SupabaseSetup } from "@/components/supabase-setup";
import { TeacherBookingsCalendar } from "@/app/teacher/bookings/teacher-bookings-calendar";
import { CANCEL_CUTOFF_HOURS } from "@/lib/constants";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { requireRole } from "@/lib/supabase/auth";
import { formatTokyoDateKey, getCurrentAndNextMonthRange, listDatesBetween } from "@/lib/time";

type TeacherBookingsPageProps = {
  searchParams: Promise<{ canceled?: string; error?: string; hours?: string }>;
};

export default async function TeacherBookingsPage({ searchParams }: TeacherBookingsPageProps) {
  const { canceled, error } = await searchParams;

  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireRole("teacher");
  const now = new Date();
  const { currentMonthStart, nextMonthStart, nextMonthEnd } = getCurrentAndNextMonthRange(now);
  const dates = listDatesBetween(currentMonthStart, nextMonthEnd);
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, status, profiles(full_name, email)")
    .eq("teacher_id", user.id)
    .eq("status", "confirmed")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", new Date(`${nextMonthEnd}T23:59:59+09:00`).toISOString())
    .order("starts_at", { ascending: true });

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm font-medium tracking-wide text-matcha">講師メニュー</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">予約カレンダー</h1>
        <p className="mt-3 max-w-2xl text-sumi/75">今月と来月の予約をカレンダーで確認できます。日付を選ぶと、その日の予約詳細へ進めます。</p>
      </section>
      <StatusBanner message={canceled ? "予約をキャンセルしました。生徒にもメールで通知しました。" : undefined} />
      <StatusBanner
        message={
          error === "cutoff"
            ? `レッスン開始${CANCEL_CUTOFF_HOURS}時間前を過ぎているため、キャンセルできません。`
            : error
              ? "予約を更新できませんでした。"
              : undefined
        }
        tone="error"
      />

      {bookings && bookings.length > 0 ? (
        <TeacherBookingsCalendar bookings={bookings} dates={dates} nextMonthStart={nextMonthStart} todayKey={formatTokyoDateKey(now)} />
      ) : (
        <EmptyState title="予約はまだありません">生徒が予約すると、ここに表示されます。</EmptyState>
      )}
    </div>
  );
}
