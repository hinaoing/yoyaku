import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { LESSON_DURATION_MINUTES } from "@/lib/constants";
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
    return redirectTo(request, `/teachers/${teacherId}?error=slot-unavailable`);
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

  const [{ data: availability }, { data: bookings }] = await Promise.all([
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
      .gte("starts_at", now.toISOString())
  ]);
  const availableStarts = new Set(generateSlotsFromDateAvailability(availability ?? [], bookings ?? [], now).map((slot) => slot.startsAt));

  if (!availableStarts.has(startsAt)) {
    return redirectTo(request, `/teachers/${teacherId}?error=slot-unavailable`);
  }

  const endsAt = addMinutesIso(startsAt, LESSON_DURATION_MINUTES);
  const { error } = await adminSupabase.from("bookings").insert({
    teacher_id: teacherId,
    student_id: user.id,
    starts_at: startsAt,
    ends_at: endsAt,
    status: "confirmed"
  });

  if (error) {
    return redirectTo(request, `/teachers/${teacherId}?error=slot-unavailable`);
  }

  revalidatePath(`/teachers/${teacherId}`);
  revalidatePath("/student/bookings");
  return redirectTo(request, `/teachers/${teacherId}?booked=1`);
}
