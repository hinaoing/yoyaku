import Link from "next/link";
import { ArrowLeft, Calendar, ExternalLink, Mail, UserRound } from "lucide-react";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { EmptyState } from "@/components/empty-state";
import { StatusBanner } from "@/components/status-banner";
import { cancelTeacherBooking } from "@/lib/actions";
import { CANCEL_CUTOFF_HOURS } from "@/lib/constants";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { requireRole } from "@/lib/supabase/auth";
import { canCancelBooking, formatDateTimeJa, formatTimeJa } from "@/lib/time";
import { SupabaseSetup } from "@/components/supabase-setup";

type TeacherBookingDetailPageProps = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ error?: string }>;
};

type StudentProfile = {
  avatar_url: string | null;
  email: string | null;
  full_name: string | null;
};

export default async function TeacherBookingDetailPage({ params, searchParams }: TeacherBookingDetailPageProps) {
  const { bookingId } = await params;
  const { error } = await searchParams;

  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireRole("teacher");
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, status, canceled_at, profiles(full_name, email, avatar_url), teachers(meeting_url)")
    .eq("id", bookingId)
    .eq("teacher_id", user.id)
    .maybeSingle();

  if (!booking) {
    return <EmptyState title="予約が見つかりません">予約一覧からもう一度選択してください。</EmptyState>;
  }

  const student = (Array.isArray(booking.profiles) ? booking.profiles[0] : booking.profiles) as StudentProfile | null;
  const teacher = Array.isArray(booking.teachers) ? booking.teachers[0] : booking.teachers;
  const studentName = student?.full_name || student?.email || "生徒";
  const lessonLabel = `${formatDateTimeJa(booking.starts_at)} - ${formatTimeJa(booking.ends_at)}`;
  const isConfirmed = booking.status === "confirmed";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm font-medium text-matcha transition-colors hover:text-matcha/80" href="/teacher/bookings">
        <ArrowLeft size={16} />
        予約一覧へ戻る
      </Link>

      <section>
        <p className="text-sm font-medium tracking-wide text-matcha">予約詳細</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{lessonLabel}</h1>
      </section>

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

      <section className="rounded-xl border border-ink/10 bg-white p-6 shadow-soft">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-matcha/10 text-matcha">
              <Calendar size={18} />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-sumi/50">レッスン日時</p>
              <p className="mt-1 text-lg font-semibold text-ink">{lessonLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            {student?.avatar_url ? (
              <img alt="" className="size-10 shrink-0 rounded-full border border-ink/10 object-cover" src={student.avatar_url} />
            ) : (
              <span className="grid size-10 place-items-center rounded-full bg-matcha/10 text-matcha">
                <UserRound size={18} />
              </span>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-sumi/50">生徒</p>
              <p className="mt-1 text-lg font-semibold text-ink">{studentName}</p>
              {student?.email ? <p className="mt-1 text-sm text-sumi/60">{student.email}</p> : null}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-5">
          {student?.email ? (
            <a className="inline-flex items-center gap-2 rounded-lg border border-matcha/20 bg-matcha/[0.06] px-4 py-2 text-sm font-medium text-matcha transition-colors hover:bg-matcha/10" href={`mailto:${student.email}`}>
              <Mail size={15} />
              生徒に連絡する
            </a>
          ) : null}
          {teacher?.meeting_url ? (
            <a
              className="inline-flex items-center gap-2 rounded-lg border border-ink/15 bg-white px-4 py-2 text-sm font-medium text-sumi transition-colors hover:bg-paper"
              href={teacher.meeting_url}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={15} />
              レッスンURL
            </a>
          ) : null}
          {isConfirmed && canCancelBooking(booking.starts_at) ? (
            <form action={cancelTeacherBooking.bind(null, booking.id)}>
              <CancelBookingButton lessonLabel={lessonLabel} />
            </form>
          ) : null}
          {!isConfirmed ? <span className="rounded-full bg-sakura/10 px-3 py-1 text-sm font-medium text-sakura">キャンセル済み</span> : null}
          {isConfirmed && !canCancelBooking(booking.starts_at) ? (
            <span className="text-sm text-sumi/50">キャンセル期限を過ぎています。</span>
          ) : null}
        </div>
      </section>
    </div>
  );
}
