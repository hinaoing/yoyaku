import { requireRole } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { formatTokyoDateKey, formatTokyoTimeKey, getCurrentAndNextMonthRange, listDatesBetween, roundUpToNextLessonTime } from "@/lib/time";
import { StatusBanner } from "@/components/status-banner";
import { SupabaseSetup } from "@/components/supabase-setup";
import { AvailabilityCalendar } from "@/app/teacher/availability/availability-calendar";
import { createAdminClient } from "@/lib/supabase/admin";

type AvailabilityPageProps = {
  searchParams: Promise<{ saved?: string; error?: string }>;
};

export default async function AvailabilityPage({ searchParams }: AvailabilityPageProps) {
  const { saved, error } = await searchParams;
  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireRole("teacher");
  const now = new Date();
  const { currentMonthStart, nextMonthStart, nextMonthEnd } = getCurrentAndNextMonthRange(now);
  const adminSupabase = createAdminClient();
  const [{ data: availability }, { data: bookedLessons }] = await Promise.all([
    supabase
      .from("date_availability")
      .select("id, teacher_id, availability_date, start_time, end_time")
      .eq("teacher_id", user.id)
      .gte("availability_date", currentMonthStart)
      .lte("availability_date", nextMonthEnd)
      .order("availability_date")
      .order("start_time"),
    adminSupabase
      .from("bookings")
      .select("starts_at, ends_at")
      .eq("teacher_id", user.id)
      .eq("status", "confirmed")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", new Date(`${nextMonthEnd}T23:59:59+09:00`).toISOString())
  ]);
  const dates = listDatesBetween(currentMonthStart, nextMonthEnd);

  const errorMessage =
    error === "invalid"
      ? "時間帯が重複しているか、過去または開始時間が30分単位ではない時間が含まれています。"
      : error
        ? "空き時間を保存できませんでした。"
        : undefined;

  return (
    <div className="w-full max-w-full space-y-6">
      <section>
        <p className="text-sm font-medium text-matcha">講師メニュー</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">空き時間設定</h1>
        <p className="mt-3 max-w-2xl text-sumi/75">
          今月と来月の予約可能時間をカレンダーで設定します。レッスンは25分、開始時間は30分単位です。終了時間は自動で設定されます。過去の日時は編集できません。
        </p>
      </section>
      <StatusBanner message={saved ? "空き時間を保存しました。" : undefined} />
      <StatusBanner message={errorMessage} tone="error" />

      <AvailabilityCalendar
        currentTime={formatTokyoTimeKey(now)}
        dates={dates}
        defaultStartTime={roundUpToNextLessonTime(now)}
        initialSlots={availability ?? []}
        lockedBookings={bookedLessons ?? []}
        nextMonthStart={nextMonthStart}
        rangeEnd={nextMonthEnd}
        rangeStart={currentMonthStart}
        todayKey={formatTokyoDateKey(now)}
      />
    </div>
  );
}
