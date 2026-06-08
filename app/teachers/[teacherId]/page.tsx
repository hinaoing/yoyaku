import { Video } from "lucide-react";
import { BookingCalendar } from "@/app/teachers/[teacherId]/booking-calendar";
import { EmptyState } from "@/components/empty-state";
import { StatusBanner } from "@/components/status-banner";
import { SupabaseSetup } from "@/components/supabase-setup";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/auth";
import {
  formatTokyoDateKey,
  generateSlotsFromDateAvailability,
  getCurrentAndNextMonthRange,
  listDatesBetween
} from "@/lib/time";
import type { UserRole } from "@/lib/types";

type TeacherPageProps = {
  params: Promise<{ teacherId: string }>;
  searchParams: Promise<{ booked?: string; error?: string }>;
};

export default async function TeacherPage({ params, searchParams }: TeacherPageProps) {
  const { teacherId } = await params;
  const { booked, error } = await searchParams;
  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const viewerRole = (profile?.role as UserRole | undefined) ?? null;
  const { data: teacher } = await supabase
    .from("teachers")
    .select("user_id, display_name, bio, meeting_url")
    .eq("user_id", teacherId)
    .single();

  if (!teacher) {
    return <EmptyState title="講師が見つかりません">講師一覧からもう一度選択してください。</EmptyState>;
  }

  const now = new Date();
  const { currentMonthStart, nextMonthStart, nextMonthEnd } = getCurrentAndNextMonthRange(now);
  const [{ data: availability }, { data: bookings }] = await Promise.all([
    supabase
      .from("date_availability")
      .select("*")
      .eq("teacher_id", teacherId)
      .gte("availability_date", currentMonthStart)
      .lte("availability_date", nextMonthEnd)
      .order("availability_date")
      .order("start_time"),
    supabase
      .from("bookings")
      .select("starts_at, status")
      .eq("teacher_id", teacherId)
      .gte("starts_at", now.toISOString())
  ]);
  const dates = listDatesBetween(currentMonthStart, nextMonthEnd);
  const slots = generateSlotsFromDateAvailability(availability ?? [], bookings ?? [], now);
  const errorMessage =
    error === "student-required"
      ? "予約するには学生アカウントでログインしてください。"
      : error === "slot-unavailable"
        ? "この時間は予約できません。別の枠を選んでください。"
        : undefined;

  return (
    <div className="grid gap-7 lg:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.35fr)]">
      <section className="rounded-lg border border-ink/10 bg-white p-6 shadow-soft">
        <p className="text-sm font-medium text-matcha">講師プロフィール</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{teacher.display_name}</h1>
        <p className="mt-4 leading-7 text-sumi/80">{teacher.bio || "プロフィールはまだ登録されていません。"}</p>
        {teacher.meeting_url ? (
          <p className="mt-5 inline-flex items-center gap-2 rounded-md bg-matcha/10 px-3 py-2 text-sm text-sumi">
            <Video size={16} />
            予約後にレッスンURLが表示されます
          </p>
        ) : null}
      </section>

      <section className="min-w-0 space-y-4">
        <div>
          <p className="text-sm font-medium text-matcha">空き時間</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">今月・来月の予約枠</h2>
        </div>
        <StatusBanner message={booked ? "予約が完了しました。予約一覧でも確認できます。" : undefined} />
        <StatusBanner message={errorMessage} tone="error" />

        <BookingCalendar
          dates={dates}
          nextMonthStart={nextMonthStart}
          slots={slots}
          teacherId={teacher.user_id}
          todayKey={formatTokyoDateKey(now)}
          viewerRole={viewerRole}
        />
      </section>
    </div>
  );
}
