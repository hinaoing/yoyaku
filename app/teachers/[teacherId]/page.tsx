import { User, Video } from "lucide-react";
import { BookingCalendar } from "@/app/teachers/[teacherId]/booking-calendar";
import { EmptyState } from "@/components/empty-state";
import { StatusBanner } from "@/components/status-banner";
import { SupabaseSetup } from "@/components/supabase-setup";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { requireUser } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTeacherAvatarUrlMap } from "@/lib/teacher-avatars";
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
  const adminSupabase = createAdminClient();
  const { currentMonthStart, nextMonthStart, nextMonthEnd } = getCurrentAndNextMonthRange(now);
  const [{ data: availability }, { data: teacherBookings }, { data: studentBookings }] = await Promise.all([
    supabase
      .from("date_availability")
      .select("*")
      .eq("teacher_id", teacherId)
      .gte("availability_date", currentMonthStart)
      .lte("availability_date", nextMonthEnd)
      .order("availability_date")
      .order("start_time"),
    adminSupabase
      .from("bookings")
      .select("starts_at, status")
      .eq("teacher_id", teacherId)
      .eq("status", "confirmed")
      .gte("starts_at", now.toISOString()),
    adminSupabase
      .from("bookings")
      .select("starts_at, status")
      .eq("student_id", user.id)
      .eq("status", "confirmed")
      .gte("starts_at", now.toISOString())
  ]);
  const dates = listDatesBetween(currentMonthStart, nextMonthEnd);
  const slots = generateSlotsFromDateAvailability(availability ?? [], [...(teacherBookings ?? []), ...(studentBookings ?? [])], now);
  const avatarUrls = await getTeacherAvatarUrlMap([teacher.user_id]);
  const errorMessage =
    error === "student-required"
      ? "予約するには学生アカウントでログインしてください。"
      : error === "student-conflict"
        ? "同じ時間にすでに別の予約があります。別の時間を選んでください。"
      : error === "teacher-booked"
        ? "この時間は他の生徒に予約されました。別の時間を選んでください。"
      : error === "past-slot"
        ? "過去の時間、または開始済みの時間は予約できません。別の時間を選んでください。"
      : error === "slot-unavailable"
        ? "この時間は予約できません。別の枠を選んでください。"
        : undefined;
  const avatarUrl = avatarUrls.get(teacher.user_id) ?? null;

  return (
    <div className="space-y-6">
      {/* Profile banner — compact horizontal layout */}
      <section className="rounded-xl border border-ink/10 bg-white p-5 shadow-soft sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {avatarUrl ? (
            <img alt="" className="size-14 shrink-0 rounded-full border border-ink/10 object-cover" src={avatarUrl} />
          ) : (
            <div className="grid size-14 shrink-0 place-items-center rounded-full bg-matcha/10 text-matcha">
              <User size={26} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium tracking-wide text-matcha">講師プロフィール</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-ink">{teacher.display_name}</h1>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-sumi/70">{teacher.bio || "プロフィールはまだ登録されていません。"}</p>
            {teacher.meeting_url ? (
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-matcha/[0.07] px-3 py-1.5 text-sm text-sumi/70">
                <Video size={15} className="text-matcha" />
                予約後にレッスンURLが表示されます
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Calendar section — full width */}
      <section className="space-y-4">
        <div>
          <p className="text-sm font-medium tracking-wide text-matcha">空き時間</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-ink">今月・来月の予約枠</h2>
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
