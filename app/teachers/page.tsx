import Link from "next/link";
import { ArrowRight, User, Video } from "lucide-react";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { EmptyState } from "@/components/empty-state";
import { SupabaseSetup } from "@/components/supabase-setup";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/auth";
import { getTeacherAvatarUrlMap } from "@/lib/teacher-avatars";
import { generateSlotsFromDateAvailability, getCurrentAndNextMonthRange } from "@/lib/time";
import type { Booking, DateAvailability, Teacher } from "@/lib/types";

type BookingAvailabilityRow = Pick<Booking, "starts_at" | "status"> & {
  teacher_id: string;
};

export default async function TeachersPage() {
  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireUser();
  const { data: teachers } = await supabase
    .from("teachers")
    .select("user_id, display_name, bio, meeting_url")
    .order("display_name");
  const teacherRows = (teachers ?? []) as Teacher[];
  const teacherIds = teacherRows.map((teacher) => teacher.user_id);
  const now = new Date();
  const { currentMonthStart, nextMonthEnd } = getCurrentAndNextMonthRange(now);

  const adminSupabase = createAdminClient();
  const [{ data: availability }, { data: teacherBookings }, { data: studentBookings }] = teacherIds.length > 0
    ? await Promise.all([
      supabase
        .from("date_availability")
        .select("*")
        .in("teacher_id", teacherIds)
        .gte("availability_date", currentMonthStart)
        .lte("availability_date", nextMonthEnd)
        .order("availability_date")
        .order("start_time"),
      adminSupabase
        .from("bookings")
        .select("teacher_id, starts_at, status")
        .in("teacher_id", teacherIds)
        .eq("status", "confirmed")
        .gte("starts_at", now.toISOString())
        .returns<BookingAvailabilityRow[]>(),
      adminSupabase
        .from("bookings")
        .select("starts_at, status")
        .eq("student_id", user.id)
        .eq("status", "confirmed")
        .gte("starts_at", now.toISOString())
        .returns<Pick<Booking, "starts_at" | "status">[]>()
    ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const availabilityByTeacher = new Map<string, DateAvailability[]>();
  for (const slot of (availability ?? []) as DateAvailability[]) {
    availabilityByTeacher.set(slot.teacher_id, [...(availabilityByTeacher.get(slot.teacher_id) ?? []), slot]);
  }

  const bookingsByTeacher = new Map<string, Pick<Booking, "starts_at" | "status">[]>();
  for (const booking of teacherBookings ?? []) {
    bookingsByTeacher.set(booking.teacher_id, [...(bookingsByTeacher.get(booking.teacher_id) ?? []), booking]);
  }

  const availableTeachers = teacherRows.filter((teacher) => {
    const slots = generateSlotsFromDateAvailability(
      availabilityByTeacher.get(teacher.user_id) ?? [],
      [...(bookingsByTeacher.get(teacher.user_id) ?? []), ...(studentBookings ?? [])],
      now
    );

    return slots.length > 0;
  });
  const avatarUrls = await getTeacherAvatarUrlMap(availableTeachers.map((teacher) => teacher.user_id));

  return (
    <div className="space-y-8">
      <section className="grid gap-3">
        <p className="text-sm font-medium tracking-wide text-matcha">講師一覧</p>
        <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-ink">オンラインレッスンを予約する</h1>
        <p className="max-w-2xl leading-relaxed text-sumi/70">
          希望する講師を選び、空いている25分枠から予約できます。予約はすぐに確定します。
        </p>
      </section>

      {availableTeachers.length > 0 ? (
        <section className="grid gap-4 md:grid-cols-2">
          {availableTeachers.map((teacher) => {
            const avatarUrl = avatarUrls.get(teacher.user_id) ?? null;

            return (
              <Link
                className="group rounded-xl border border-ink/10 bg-white p-6 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-matcha/30 hover:shadow-lg"
                href={`/teachers/${teacher.user_id}`}
                key={teacher.user_id}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {avatarUrl ? (
                      <img alt="" className="size-11 shrink-0 rounded-full border border-ink/10 object-cover" src={avatarUrl} />
                    ) : (
                      <div className="grid size-11 shrink-0 place-items-center rounded-full bg-matcha/10 text-matcha">
                        <User size={20} />
                      </div>
                    )}
                    <div>
                      <h2 className="text-lg font-semibold text-ink">{teacher.display_name}</h2>
                      <p className="mt-1.5 line-clamp-3 whitespace-pre-line text-sm leading-relaxed text-sumi/70">
                        {teacher.bio || "プロフィールはまだ登録されていません。"}
                      </p>
                    </div>
                  </div>
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-matcha/10 text-matcha transition-all duration-200 group-hover:bg-matcha group-hover:text-white">
                    <ArrowRight size={17} />
                  </span>
                </div>
                {teacher.meeting_url ? (
                  <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-ink/[0.04] px-3 py-1 text-xs font-medium text-sumi/60">
                    <Video size={14} />
                    オンライン対応
                  </div>
                ) : null}
              </Link>
            );
          })}
        </section>
      ) : (
        <EmptyState title="現在予約できる講師がいません">
          空き時間が追加されるまでお待ちください。
        </EmptyState>
      )}
    </div>
  );
}
