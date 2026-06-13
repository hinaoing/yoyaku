import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit-logs";
import { LESSON_DURATION_MINUTES } from "@/lib/constants";
import { sendBookingConfirmedEmails } from "@/lib/email/booking-notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { addMinutesIso, formatTokyoDateKey, generateSlotsFromDateAvailability, getCurrentAndNextMonthRange } from "@/lib/time";

type BookingRouteContext = {
  params: Promise<{ teacherId: string }>;
};

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: Request, { params }: BookingRouteContext) {
  const { teacherId } = await params;
  const formData = await request.formData();
  const startsAt = formData.get("startsAt");

  if (typeof startsAt !== "string" || new Date(startsAt).getTime() <= Date.now()) {
    return redirectTo(request, `/teachers/${teacherId}?error=past-slot`);
  }

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return redirectTo(request, `/login?next=${encodeURIComponent(`/teachers/${teacherId}`)}`);
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (profile?.role !== "student") {
    return redirectTo(request, `/teachers/${teacherId}?error=student-required`);
  }

  const now = new Date();
  const adminSupabase = createAdminClient();
  const slotDate = formatTokyoDateKey(new Date(startsAt));
  const { currentMonthStart, nextMonthEnd } = getCurrentAndNextMonthRange(now);

  if (slotDate < currentMonthStart || slotDate > nextMonthEnd) {
    return redirectTo(request, `/teachers/${teacherId}?error=slot-unavailable`);
  }

  const [{ data: availability }, { data: teacherBookings }, { data: studentConflict }] = await Promise.all([
    supabase
      .from("date_availability")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("availability_date", slotDate),
    adminSupabase
      .from("bookings")
      .select("starts_at, status")
      .eq("teacher_id", teacherId)
      .eq("status", "confirmed")
      .gte("starts_at", now.toISOString()),
    adminSupabase
      .from("bookings")
      .select("id")
      .eq("student_id", user.id)
      .eq("starts_at", startsAt)
      .eq("status", "confirmed")
      .maybeSingle()
  ]);
  const offeredStarts = new Set(generateSlotsFromDateAvailability(availability ?? [], [], now).map((slot) => slot.startsAt));
  const teacherBookedStarts = new Set((teacherBookings ?? []).map((booking) => new Date(booking.starts_at).toISOString()));
  const availableStarts = new Set(generateSlotsFromDateAvailability(availability ?? [], teacherBookings ?? [], now).map((slot) => slot.startsAt));

  if (studentConflict) {
    return redirectTo(request, `/teachers/${teacherId}?error=student-conflict`);
  }

  if (teacherBookedStarts.has(new Date(startsAt).toISOString())) {
    return redirectTo(request, `/teachers/${teacherId}?error=teacher-booked`);
  }

  if (!offeredStarts.has(startsAt) || !availableStarts.has(startsAt)) {
    return redirectTo(request, `/teachers/${teacherId}?error=slot-unavailable`);
  }

  const endsAt = addMinutesIso(startsAt, LESSON_DURATION_MINUTES);
  const { data: createdBooking, error } = await adminSupabase
    .from("bookings")
    .insert({
      teacher_id: teacherId,
      student_id: user.id,
      starts_at: startsAt,
      ends_at: endsAt,
      status: "confirmed"
    })
    .select("id")
    .single();

  if (error) {
    const message = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
    const reason = message.includes("student") ? "student-conflict" : message.includes("duplicate") || message.includes("teacher") ? "teacher-booked" : "slot-unavailable";
    return redirectTo(request, `/teachers/${teacherId}?error=${reason}`);
  }

  await writeAuditLog(adminSupabase, {
    action: "booking.create",
    actorId: user.id,
    metadata: { endsAt, startsAt, studentId: user.id, teacherId },
    targetId: createdBooking.id,
    targetType: "booking"
  });

  await sendBookingConfirmedEmails(adminSupabase, createdBooking.id);

  revalidatePath(`/teachers/${teacherId}`);
  revalidatePath("/student/bookings");
  revalidatePath(`/student/bookings/${createdBooking.id}`);
  return redirectTo(request, `/student/bookings/${createdBooking.id}?booked=1`);
}
