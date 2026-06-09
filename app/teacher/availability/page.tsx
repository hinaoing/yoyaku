import { requireRole } from "@/lib/supabase/auth";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { formatTokyoDateKey, formatTokyoTimeKey, getCurrentAndNextMonthRange, listDatesBetween, roundUpToNextLessonTime } from "@/lib/time";
import { StatusBanner } from "@/components/status-banner";
import { SupabaseSetup } from "@/components/supabase-setup";
import { AvailabilityCalendar } from "@/app/teacher/availability/availability-calendar";

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
  const { data: availability } = await supabase
    .from("date_availability")
    .select("id, teacher_id, availability_date, start_time, end_time")
    .eq("teacher_id", user.id)
    .gte("availability_date", currentMonthStart)
    .lte("availability_date", nextMonthEnd)
    .order("availability_date")
    .order("start_time");
  const dates = listDatesBetween(currentMonthStart, nextMonthEnd);

  const errorMessage =
    error === "invalid"
      ? "時間帯が重複しているか、過去または30分単位ではない時間が含まれています。"
      : error
        ? "空き時間を保存できませんでした。"
        : undefined;

  return (
    <div className="w-full max-w-full space-y-6">
      <section>
        <p className="text-sm font-medium text-matcha">講師メニュー</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">空き時間設定</h1>
        <p className="mt-3 max-w-2xl text-sumi/75">
          今月と来月の予約可能時間をカレンダーで設定します。レッスンは25分、空き時間の開始・終了は30分単位です。過去の日時は編集できません。
        </p>
      </section>
      <StatusBanner message={saved ? "空き時間を保存しました。" : undefined} />
      <StatusBanner message={errorMessage} tone="error" />

      <AvailabilityCalendar
        currentTime={formatTokyoTimeKey(now)}
        dates={dates}
        defaultStartTime={roundUpToNextLessonTime(now)}
        initialSlots={availability ?? []}
        nextMonthStart={nextMonthStart}
        rangeEnd={nextMonthEnd}
        rangeStart={currentMonthStart}
        todayKey={formatTokyoDateKey(now)}
      />
    </div>
  );
}
