import Link from "next/link";
import { ArrowLeft, Clock, ExternalLink, UserRound } from "lucide-react";
import { CancelBookingButton } from "@/components/cancel-booking-button";
import { EmptyState } from "@/components/empty-state";
import { StatusBanner } from "@/components/status-banner";
import { cancelBooking } from "@/lib/actions";
import { CANCEL_CUTOFF_HOURS } from "@/lib/constants";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { requireRole } from "@/lib/supabase/auth";
import { canCancelBooking, formatDateTimeJa, formatTimeJa } from "@/lib/time";
import { SupabaseSetup } from "@/components/supabase-setup";

type StudentBookingDetailPageProps = {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<{ booked?: string; error?: string }>;
};

export default async function StudentBookingDetailPage({ params, searchParams }: StudentBookingDetailPageProps) {
  const { bookingId } = await params;
  const { booked, error } = await searchParams;

  if (!hasSupabaseConfig()) {
    return <SupabaseSetup />;
  }

  const { supabase, user } = await requireRole("student");
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, starts_at, ends_at, status, canceled_at, teachers(display_name, meeting_url)")
    .eq("id", bookingId)
    .eq("student_id", user.id)
    .maybeSingle();

  if (!booking) {
    return <EmptyState title="予約が見つかりません">予約一覧からもう一度選択してください。</EmptyState>;
  }

  const teacher = Array.isArray(booking.teachers) ? booking.teachers[0] : booking.teachers;
  const lessonLabel = `${formatDateTimeJa(booking.starts_at)} - ${formatTimeJa(booking.ends_at)}`;
  const isConfirmed = booking.status === "confirmed";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link className="inline-flex items-center gap-2 text-sm font-medium text-matcha transition-colors hover:text-matcha/80" href="/student/bookings">
        <ArrowLeft size={16} />
        予約一覧へ戻る
      </Link>

      <section>
        <p className="text-sm font-medium tracking-wide text-matcha">予約詳細</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-ink">{lessonLabel}</h1>
      </section>

      <StatusBanner
        message={booked ? "予約が完了しました。詳細を確認できます。" : undefined}
      />
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
              <Clock size={18} />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-sumi/50">レッスン日時</p>
              <p className="mt-1 text-lg font-semibold text-ink">{lessonLabel}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-matcha/10 text-matcha">
              <UserRound size={18} />
            </span>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-sumi/50">講師</p>
              <p className="mt-1 text-lg font-semibold text-ink">{teacher?.display_name ?? "講師"}</p>
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-ink/10 pt-5">
          {teacher?.meeting_url ? (
            <a
              className="inline-flex items-center gap-2 rounded-lg border border-matcha/20 bg-matcha/[0.06] px-4 py-2 text-sm font-medium text-matcha transition-colors hover:bg-matcha/10"
              href={teacher.meeting_url}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={15} />
              レッスンURLを開く
            </a>
          ) : null}
          {isConfirmed && canCancelBooking(booking.starts_at) ? (
            <form action={cancelBooking.bind(null, booking.id)}>
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
