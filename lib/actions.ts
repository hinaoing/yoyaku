"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CANCEL_CUTOFF_HOURS, LESSON_DURATION_MINUTES } from "@/lib/constants";
import { sendBookingCanceledEmails, sendBookingConfirmedEmails } from "@/lib/email/booking-notifications";
import {
  sendTeacherApplicationApprovedEmail,
  sendTeacherApplicationRejectedEmail,
  sendTeacherApplicationSubmittedEmails
} from "@/lib/email/teacher-application-notifications";
import {
  canCancelBooking,
  addMinutesIso,
  formatTokyoDateKey,
  formatTokyoTimeKey
} from "@/lib/time";
import { protectedBookingViolations } from "@/lib/availability-bookings";
import { validateAvailabilitySlots } from "@/lib/availability-validation";
import type { AvailabilityInput } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole, requireUser } from "@/lib/supabase/auth";
import { isAdminEmail } from "@/lib/admin";
import { AVATAR_BUCKET, avatarFileExtension, validateAccountProfileForm } from "@/lib/account-profile-validation";
import { validateTeacherApplicationForm } from "@/lib/teacher-application-validation";

function ensureTime(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value : "";
}

export async function createBooking(teacherId: string, startsAt: string) {
  const { user } = await requireRole("student");
  const adminSupabase = createAdminClient();
  const endsAt = addMinutesIso(startsAt, LESSON_DURATION_MINUTES);
  const { data: studentConflict } = await adminSupabase
    .from("bookings")
    .select("id")
    .eq("student_id", user.id)
    .eq("starts_at", startsAt)
    .eq("status", "confirmed")
    .maybeSingle();

  if (studentConflict) {
    redirect(`/teachers/${teacherId}?error=slot-unavailable`);
  }

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
    redirect(`/teachers/${teacherId}?error=slot-unavailable`);
  }

  await sendBookingConfirmedEmails(adminSupabase, createdBooking.id);

  revalidatePath(`/teachers/${teacherId}`);
  revalidatePath("/student/bookings");
  revalidatePath(`/student/bookings/${createdBooking.id}`);
  redirect(`/student/bookings/${createdBooking.id}?booked=1`);
}

export async function cancelBooking(bookingId: string) {
  const { supabase, user } = await requireUser();
  const adminSupabase = createAdminClient();
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

  await sendBookingCanceledEmails(adminSupabase, bookingId);

  revalidatePath("/student/bookings");
  revalidatePath("/teacher/bookings");
  redirect("/student/bookings?canceled=1");
}

export async function cancelTeacherBooking(bookingId: string) {
  const { user } = await requireRole("teacher");
  const adminSupabase = createAdminClient();
  const { data: booking, error } = await adminSupabase
    .from("bookings")
    .select("id, starts_at, teacher_id, status")
    .eq("id", bookingId)
    .maybeSingle();

  if (error || !booking) {
    redirect("/teacher/bookings?error=not-found");
  }

  if (booking.teacher_id !== user.id) {
    redirect("/teacher/bookings?error=forbidden");
  }

  if (booking.status !== "confirmed") {
    redirect("/teacher/bookings?error=cancel");
  }

  if (!canCancelBooking(booking.starts_at)) {
    redirect(`/teacher/bookings?error=cutoff&hours=${CANCEL_CUTOFF_HOURS}`);
  }

  const { error: cancelError } = await adminSupabase
    .from("bookings")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("status", "confirmed");

  if (cancelError) {
    redirect("/teacher/bookings?error=cancel");
  }

  await sendBookingCanceledEmails(adminSupabase, bookingId);

  revalidatePath("/teacher/bookings");
  revalidatePath("/student/bookings");
  revalidatePath(`/teachers/${user.id}`);
  redirect("/teacher/bookings?canceled=1");
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

  const adminSupabase = createAdminClient();
  const { data: bookedLessons, error: bookingError } = await adminSupabase
    .from("bookings")
    .select("starts_at, ends_at")
    .eq("teacher_id", user.id)
    .eq("status", "confirmed")
    .gte("starts_at", now.toISOString())
    .lte("starts_at", new Date(`${endDate}T23:59:59+09:00`).toISOString());

  if (bookingError) {
    redirect("/teacher/availability?error=save");
  }

  if (protectedBookingViolations(slots, bookedLessons ?? []).length > 0) {
    redirect("/teacher/availability?error=booked");
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

export async function updateAccountProfile(formData: FormData) {
  const { supabase, user } = await requireUser();
  const validation = validateAccountProfileForm(formData);

  if (!validation.ok) {
    redirect(`/account?error=${encodeURIComponent(validation.message)}`);
  }

  const payload: {
    avatar_url?: string;
    full_name: string | null;
    updated_at: string;
  } = {
    full_name: validation.value.fullName || null,
    updated_at: new Date().toISOString()
  };

  if (validation.value.avatarFile) {
    const extension = avatarFileExtension(validation.value.avatarFile);
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, validation.value.avatarFile, {
        cacheControl: "3600",
        contentType: validation.value.avatarFile.type,
        upsert: false
      });

    if (uploadError) {
      redirect("/account?error=avatar");
    }

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    payload.avatar_url = data.publicUrl;
  }

  const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);

  if (error) {
    redirect("/account?error=save");
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (profile?.role === "teacher") {
    const { error: teacherError } = await supabase
      .from("teachers")
      .update({ display_name: validation.value.fullName || user.email || "講師" })
      .eq("user_id", user.id);

    if (teacherError) {
      redirect("/account?error=save");
    }
  }

  revalidatePath("/", "layout");
  revalidatePath("/account");
  revalidatePath("/student/bookings");
  revalidatePath("/teacher/bookings");
  revalidatePath("/teacher/settings");
  revalidatePath("/teachers");
  revalidatePath(`/teachers/${user.id}`);
  redirect("/account?saved=1");
}

export async function submitTeacherApplication(formData: FormData) {
  const { supabase, user } = await requireUser();
  const validation = validateTeacherApplicationForm(formData);

  if (!validation.ok) {
    redirect(`/teacher-application?error=${encodeURIComponent(validation.message)}`);
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();

  if (profile?.role === "teacher") {
    redirect("/teacher/settings");
  }

  const { data: existingApplication } = await supabase
    .from("teacher_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingApplication?.status === "pending") {
    redirect("/teacher-application?submitted=1");
  }

  if (existingApplication?.status === "approved") {
    redirect("/teacher/settings");
  }

  const payload = {
    display_name: validation.value.displayName,
    bio: validation.value.bio || null,
    meeting_url: validation.value.meetingUrl || null,
    contact_email: validation.value.contactEmail,
    message: validation.value.message || null,
    status: "pending",
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: null,
    updated_at: new Date().toISOString()
  };

  const applicationResult = existingApplication
    ? await supabase
        .from("teacher_applications")
        .update(payload)
        .eq("id", existingApplication.id)
        .select("id, contact_email, display_name")
        .single()
    : await supabase
        .from("teacher_applications")
        .insert({
          ...payload,
          user_id: user.id
        })
        .select("id, contact_email, display_name")
        .single();

  const { data: application, error } = applicationResult;

  if (error || !application) {
    redirect("/teacher-application?error=save");
  }

  await sendTeacherApplicationSubmittedEmails({
    applicationId: application.id,
    applicantEmail: user.email ?? validation.value.contactEmail,
    contactEmail: application.contact_email,
    displayName: application.display_name
  });

  revalidatePath("/teacher-application");
  revalidatePath("/admin/teacher-applications");
  redirect("/teacher-application?submitted=1");
}

export async function approveTeacherApplication(applicationId: string) {
  const { user } = await requireUser();

  if (!isAdminEmail(user.email)) {
    redirect("/teachers");
  }

  const adminSupabase = createAdminClient();
  const { data: application } = await adminSupabase
    .from("teacher_applications")
    .select("id, user_id, display_name, contact_email, profiles!teacher_applications_user_id_fkey(email)")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) {
    redirect("/admin/teacher-applications?error=not-found");
  }

  const { error } = await adminSupabase.rpc("approve_teacher_application", {
    application_id: applicationId,
    reviewer_id: user.id
  });

  if (error) {
    redirect("/admin/teacher-applications?error=approve");
  }

  const profile = Array.isArray(application.profiles) ? application.profiles[0] : application.profiles;

  await sendTeacherApplicationApprovedEmail({
    applicationId: application.id,
    applicantEmail: profile?.email ?? application.contact_email,
    contactEmail: application.contact_email,
    displayName: application.display_name
  });

  revalidatePath("/admin/teacher-applications");
  revalidatePath("/teachers");
  revalidatePath(`/teachers/${application.user_id}`);
  redirect("/admin/teacher-applications?approved=1");
}

export async function rejectTeacherApplication(formData: FormData) {
  const { user } = await requireUser();

  if (!isAdminEmail(user.email)) {
    redirect("/teachers");
  }

  const applicationId = ensureTime(formData.get("applicationId"));
  const rejectionReason = ensureTime(formData.get("rejectionReason")).trim();

  if (!applicationId) {
    redirect("/admin/teacher-applications?error=not-found");
  }

  const adminSupabase = createAdminClient();
  const { data: application } = await adminSupabase
    .from("teacher_applications")
    .select("id, display_name, contact_email, profiles!teacher_applications_user_id_fkey(email)")
    .eq("id", applicationId)
    .maybeSingle();

  if (!application) {
    redirect("/admin/teacher-applications?error=not-found");
  }

  const { error } = await adminSupabase
    .from("teacher_applications")
    .update({
      status: "rejected",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      rejection_reason: rejectionReason || null,
      updated_at: new Date().toISOString()
    })
    .eq("id", applicationId)
    .eq("status", "pending");

  if (error) {
    redirect("/admin/teacher-applications?error=reject");
  }

  const profile = Array.isArray(application.profiles) ? application.profiles[0] : application.profiles;

  await sendTeacherApplicationRejectedEmail({
    applicationId: application.id,
    applicantEmail: profile?.email ?? application.contact_email,
    contactEmail: application.contact_email,
    displayName: application.display_name,
    rejectionReason
  });

  revalidatePath("/admin/teacher-applications");
  revalidatePath("/teacher-application");
  redirect("/admin/teacher-applications?rejected=1");
}
