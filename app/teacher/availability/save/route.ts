import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { protectedBookingViolations } from "@/lib/availability-bookings";
import { writeAuditLog } from "@/lib/audit-logs";
import { validateAvailabilitySlots } from "@/lib/availability-validation";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/supabase/auth";
import { formatTokyoDateKey, formatTokyoTimeKey } from "@/lib/time";
import type { AvailabilityInput } from "@/lib/types";

function ensureString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url), { status: 303 });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const startDate = ensureString(formData.get("rangeStart"));
  const endDate = ensureString(formData.get("rangeEnd"));
  const dates = formData.getAll("slotDate");
  const starts = formData.getAll("slotStart");
  const ends = formData.getAll("slotEnd");
  const slots: AvailabilityInput[] = [];

  for (let index = 0; index < dates.length; index += 1) {
    const availabilityDate = ensureString(dates[index]);
    const startTime = ensureString(starts[index]);
    const endTime = ensureString(ends[index]);

    if (availabilityDate && startTime && endTime) {
      slots.push({ availability_date: availabilityDate, start_time: startTime, end_time: endTime });
    }
  }

  const { supabase, user } = await requireRole("teacher");
  const now = new Date();
  const todayKey = formatTokyoDateKey(now);
  const validationIssues = validateAvailabilitySlots(slots, { endDate, now, startDate });

  if (validationIssues.length > 0) {
    return redirectTo(request, "/teacher/availability?error=invalid");
  }

  const adminSupabase = createAdminClient();
  const { data: bookedLessons, error: bookingError } = await adminSupabase
    .from("bookings")
    .select("starts_at, ends_at")
    .eq("teacher_id", user.id)
    .eq("status", "confirmed")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", new Date(`${endDate}T23:59:59+09:00`).toISOString());

  if (bookingError) {
    return redirectTo(request, "/teacher/availability?error=save");
  }

  if (protectedBookingViolations(slots, bookedLessons ?? []).length > 0) {
    return redirectTo(request, "/teacher/availability?error=booked");
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
    return redirectTo(request, "/teacher/availability?error=save");
  }

  if (todayKey >= startDate && todayKey <= endDate) {
    const currentRows = await supabase
      .from("date_availability")
      .delete()
      .eq("teacher_id", user.id)
      .eq("availability_date", todayKey)
      .gt("start_time", `${formatTokyoTimeKey(now)}:00`);

    if (currentRows.error) {
      return redirectTo(request, "/teacher/availability?error=save");
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
      return redirectTo(request, "/teacher/availability?error=save");
    }
  }

  await writeAuditLog(adminSupabase, {
    action: "availability.update",
    actorId: user.id,
    metadata: { endDate, slotCount: slots.length, startDate },
    targetId: user.id,
    targetType: "date_availability"
  });

  revalidatePath("/teacher/availability");
  revalidatePath(`/teachers/${user.id}`);
  return redirectTo(request, "/teacher/availability?saved=1");
}
