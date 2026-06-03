import { CalendarPlus, Clock, Video } from "lucide-react";
import { createBooking } from "@/lib/actions";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { formatDateTimeJa, generateSlotsFromDateAvailability, getCurrentAndNextMonthRange } from "@/lib/time";
import { EmptyState } from "@/components/empty-state";
import { StatusBanner } from "@/components/status-banner";
import { SupabaseSetup } from "@/components/supabase-setup";

type TeacherPageProps = {
  params: Promise<{ teacherId: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function TeacherPage({ params, searchParams }: TeacherPageProps) {
  const { teacherId } = await params;
  const { error } = await searchParams;
  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const supabase = await createClient();
  const { data: teacher } = await supabase
    .from("teachers")
    .select("user_id, display_name, bio, meeting_url")
    .eq("user_id", teacherId)
    .single();

  if (!teacher) {
    return <EmptyState title="講師が見つかりません">講師一覧からもう一度選択してください。</EmptyState>;
  }

  const { currentMonthStart, nextMonthEnd } = getCurrentAndNextMonthRange();
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
      .gte("starts_at", new Date().toISOString())
  ]);
  const slots = generateSlotsFromDateAvailability(availability ?? [], bookings ?? []);

  return (
    <div className="grid gap-7 lg:grid-cols-[1fr_1.25fr]">
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

      <section className="space-y-4">
        <div>
          <p className="text-sm font-medium text-matcha">空き時間</p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">今月・来月の予約枠</h2>
        </div>
        <StatusBanner
          message={error === "slot-unavailable" ? "この時間は予約できません。別の枠を選んでください。" : undefined}
          tone="error"
        />

        {slots.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {slots.map((slot) => (
              <form
                action={createBooking.bind(null, teacher.user_id, slot.startsAt)}
                className="rounded-lg border border-ink/10 bg-white p-4 shadow-soft"
                key={slot.startsAt}
              >
                <p className="flex items-center gap-2 font-medium text-ink">
                  <Clock size={17} />
                  {formatDateTimeJa(slot.startsAt)}
                </p>
                <button className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-sm font-medium text-white">
                  <CalendarPlus size={17} />
                  予約する
                </button>
              </form>
            ))}
          </div>
        ) : (
          <EmptyState title="予約できる時間がありません">
            講師の空き時間が追加されるまでお待ちください。
          </EmptyState>
        )}
      </section>
    </div>
  );
}
