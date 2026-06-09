"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CANCEL_CUTOFF_HOURS, LESSON_DURATION_MINUTES } from "@/lib/constants";
import {
  canCancelBooking,
  addMinutesIso,
  formatTokyoDateKey,
  formatTokyoTimeKey
} from "@/lib/time";
import { validateAvailabilitySlots } from "@/lib/availability-validation";
import type { AvailabilityInput } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, requireUser } from "@/lib/supabase/auth";

function ensureTime(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export async function createBooking(teacherId: string, startsAt: string) {
  const { user } = await requireRole("student");
  const adminSupabase = createAdminClient();
  const endsAt = addMinutesIso(startsAt, LESSON_DURATION_MINUTES);

  const { error } = await adminSupabase.from("bookings").insert({
    teacher_id: teacherId,
    student_id: user.id,
    starts_at: startsAt,
    ends_at: endsAt,
    status: "confirmed"
  });

  if (error) {
    redirect(`/teachers/${teacherId}?error=slot-unavailable`);
  }

  revalidatePath(`/teachers/${teacherId}`);
  revalidatePath("/student/bookings");
  redirect("/student/bookings?booked=1");
}

export async function cancelBooking(bookingId: string) {
  const { supabase, user } = await requireUser();
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("id, starts_at, teacher_id, student_id")
    .eq("id", bookingId)
    .single();

  if (error || !booking) {
    redirect("/student/bookings?error=not-found");
  }

  if (booking.student_id !== user.id) {
    redirect("/student/bookings?error=forbidden");
  }

  if (!canCancelBooking(booking.starts_at)) {
    redirect(`/student/bookings?error=cutoff&hours=${CANCEL_CUTOFF_HOURS}`);
  }

  const { error: cancelError } = await supabase
    .from("bookings")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (cancelError) {
    redirect("/student/bookings?error=cancel");
  }

  revalidatePath("/student/bookings");
  revalidatePath("/teacher/bookings");
  redirect("/student/bookings?canceled=1");
}

export async function upsertDateAvailability(
  slots: AvailabilityInput[],
  startDate: string,
  endDate: string
) {
  const { supabase, user } = await requireRole("teacher");
  const now = new Date();
  const todayKey = formatTokyoDateKey(now);
  const validationIssues = validateAvailabilitySlots(slots, { endDate, now, startDate });

  if (validationIssues.length > 0) {
    redirect("/teacher/availability?error=invalid");
  }

  const futureDeleteStart = startDate > todayKey ? startDate : todayKey;
  const futureDeleteQuery = supabase
    .from("date_availability")
    .delete()
    .eq("teacher_id", user.id)
    .lte("availability_date", endDate);
  const futureDelete =
    startDate > todayKey
      ? await futureDeleteQuery.gte("availability_date", futureDeleteStart)
      : await futureDeleteQuery.gt("availability_date", futureDeleteStart);

  if (futureDelete.error) {
    redirect("/teacher/availability?error=save");
  }

  if (todayKey >= startDate && todayKey <= endDate) {
    const currentRows = await supabase
      .from("date_availability")
      .delete()
      .eq("teacher_id", user.id)
      .eq("availability_date", todayKey)
      .gt("start_time", `${formatTokyoTimeKey(now)}:00`);

    if (currentRows.error) {
      redirect("/teacher/availability?error=save");
    }
  }

  if (slots.length > 0) {
    const { error } = await supabase.from("date_availability").insert(
      slots.map((slot) => ({
        teacher_id: user.id,
        availability_date: slot.availability_date,
        start_time: slot.start_time,
        end_time: slot.end_time
      }))
    );

    if (error) {
      redirect("/teacher/availability?error=save");
    }
  }

  revalidatePath("/teacher/availability");
  revalidatePath(`/teachers/${user.id}`);
  redirect("/teacher/availability?saved=1");
}

export async function saveDateAvailability(formData: FormData) {
  const startDate = ensureTime(formData.get("rangeStart"));
  const endDate = ensureTime(formData.get("rangeEnd"));
  const dates = formData.getAll("slotDate");
  const starts = formData.getAll("slotStart");
  const ends = formData.getAll("slotEnd");
  const slots: AvailabilityInput[] = [];

  for (let index = 0; index < dates.length; index += 1) {
    const availabilityDate = ensureTime(dates[index]);
    const startTime = ensureTime(starts[index]);
    const endTime = ensureTime(ends[index]);

    if (availabilityDate && startTime && endTime) {
      slots.push({ availability_date: availabilityDate, start_time: startTime, end_time: endTime });
    }
  }

  await upsertDateAvailability(slots, startDate, endDate);
}

export async function updateTeacherSettings(formData: FormData) {
  const { supabase, user } = await requireRole("teacher");
  const displayName = ensureTime(formData.get("displayName")).trim();
  const bio = ensureTime(formData.get("bio")).trim();
  const meetingUrl = ensureTime(formData.get("meetingUrl")).trim();

  const { error } = await supabase.from("teachers").upsert({
    user_id: user.id,
    display_name: displayName || user.email || "講師",
    bio,
    meeting_url: meetingUrl
  });

  if (error) {
    redirect("/teacher/settings?error=save");
  }

  revalidatePath("/teacher/settings");
  revalidatePath("/teachers");
  revalidatePath(`/teachers/${user.id}`);
  redirect("/teacher/settings?saved=1");
}
