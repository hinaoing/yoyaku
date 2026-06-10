import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDateTimeJa, formatTimeJa } from "@/lib/time";
import { sendEmail } from "@/lib/email/resend";

type BookingRow = {
  id: string;
  teacher_id: string;
  student_id: string;
  starts_at: string;
  ends_at: string;
};

type ProfileRow = {
  email: string | null;
  full_name: string | null;
};

type TeacherRow = {
  display_name: string;
  meeting_url: string | null;
};

type BookingEmailContext = {
  booking: BookingRow;
  lessonDateTime: string;
  lessonEndTime: string;
  studentEmail: string | null;
  studentName: string;
  teacherEmail: string | null;
  teacherName: string;
  meetingUrl: string | null;
};

type EmailMessage = {
  html: string;
  subject: string;
  text: string;
  to: string | null;
};

function appUrl() {
  return process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function link(url: string, label: string) {
  return `<a href="${escapeHtml(url)}" style="color:#5f7f52">${escapeHtml(label)}</a>`;
}

function plainLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

function htmlBody(title: string, lines: string[]) {
  return [
    `<h1 style="font-size:20px;color:#17201b">${escapeHtml(title)}</h1>`,
    ...lines.map((line) => `<p style="line-height:1.7;color:#2f3a35">${line}</p>`),
    `<p style="margin-top:24px;color:#6b7280;font-size:13px">Yoyaku</p>`
  ].join("");
}

async function getProfile(supabase: SupabaseClient, id: string) {
  const { data } = await supabase.from("profiles").select("email, full_name").eq("id", id).maybeSingle<ProfileRow>();
  return data ?? null;
}

async function getBookingEmailContext(supabase: SupabaseClient, bookingId: string): Promise<BookingEmailContext | null> {
  const { data: booking } = await supabase
    .from("bookings")
    .select("id, teacher_id, student_id, starts_at, ends_at")
    .eq("id", bookingId)
    .maybeSingle<BookingRow>();

  if (!booking) {
    return null;
  }

  const [{ data: teacher }, teacherProfile, studentProfile] = await Promise.all([
    supabase.from("teachers").select("display_name, meeting_url").eq("user_id", booking.teacher_id).maybeSingle<TeacherRow>(),
    getProfile(supabase, booking.teacher_id),
    getProfile(supabase, booking.student_id)
  ]);

  return {
    booking,
    lessonDateTime: formatDateTimeJa(booking.starts_at),
    lessonEndTime: formatTimeJa(booking.ends_at),
    meetingUrl: teacher?.meeting_url ?? null,
    studentEmail: studentProfile?.email ?? null,
    studentName: studentProfile?.full_name || studentProfile?.email || "生徒",
    teacherEmail: teacherProfile?.email ?? null,
    teacherName: teacher?.display_name || teacherProfile?.full_name || teacherProfile?.email || "講師"
  };
}

async function sendMessages(messages: EmailMessage[]) {
  const deliverable = messages.filter((message) => message.to);

  if (deliverable.length === 0) {
    return true;
  }

  const results = await Promise.allSettled(
    deliverable.map((message) =>
      sendEmail({
        html: message.html,
        subject: message.subject,
        text: message.text,
        to: message.to as string
      })
    )
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("Failed to send booking email:", result.reason);
    }
  }

  return results.every((result) => result.status === "fulfilled");
}

function bookingUrl(path: string) {
  return `${appUrl()}${path}`;
}

export async function sendBookingConfirmedEmails(supabase: SupabaseClient, bookingId: string) {
  const context = await getBookingEmailContext(supabase, bookingId);

  if (!context) {
    return false;
  }

  const studentText = plainLines([
    `${context.teacherName}とのレッスン予約が確定しました。`,
    `日時: ${context.lessonDateTime} - ${context.lessonEndTime}`,
    context.meetingUrl ? `レッスンURL: ${context.meetingUrl}` : null,
    `予約一覧: ${bookingUrl("/student/bookings")}`
  ]);
  const teacherText = plainLines([
    `${context.studentName}さんの予約が入りました。`,
    `日時: ${context.lessonDateTime} - ${context.lessonEndTime}`,
    `予約一覧: ${bookingUrl("/teacher/bookings")}`
  ]);

  return sendMessages([
    {
      to: context.studentEmail,
      subject: "【Yoyaku】予約が確定しました",
      text: studentText,
      html: htmlBody("予約が確定しました", [
        `${escapeHtml(context.teacherName)}とのレッスン予約が確定しました。`,
        `<strong>日時:</strong> ${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`,
        context.meetingUrl ? `<strong>レッスンURL:</strong> ${link(context.meetingUrl, context.meetingUrl)}` : "",
        link(bookingUrl("/student/bookings"), "予約一覧を確認する")
      ])
    },
    {
      to: context.teacherEmail,
      subject: "【Yoyaku】新しい予約が入りました",
      text: teacherText,
      html: htmlBody("新しい予約が入りました", [
        `${escapeHtml(context.studentName)}さんの予約が入りました。`,
        `<strong>日時:</strong> ${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`,
        link(bookingUrl("/teacher/bookings"), "予約一覧を確認する")
      ])
    }
  ]);
}

export async function sendBookingCanceledEmails(supabase: SupabaseClient, bookingId: string) {
  const context = await getBookingEmailContext(supabase, bookingId);

  if (!context) {
    return false;
  }

  const studentText = plainLines([
    "レッスン予約をキャンセルしました。",
    `講師: ${context.teacherName}`,
    `日時: ${context.lessonDateTime} - ${context.lessonEndTime}`
  ]);
  const teacherText = plainLines([
    `${context.studentName}さんの予約がキャンセルされました。`,
    `日時: ${context.lessonDateTime} - ${context.lessonEndTime}`
  ]);

  return sendMessages([
    {
      to: context.studentEmail,
      subject: "【Yoyaku】予約をキャンセルしました",
      text: studentText,
      html: htmlBody("予約をキャンセルしました", [
        "レッスン予約をキャンセルしました。",
        `<strong>講師:</strong> ${escapeHtml(context.teacherName)}`,
        `<strong>日時:</strong> ${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`
      ])
    },
    {
      to: context.teacherEmail,
      subject: "【Yoyaku】予約がキャンセルされました",
      text: teacherText,
      html: htmlBody("予約がキャンセルされました", [
        `${escapeHtml(context.studentName)}さんの予約がキャンセルされました。`,
        `<strong>日時:</strong> ${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`
      ])
    }
  ]);
}

export async function sendBookingReminderEmails(supabase: SupabaseClient, bookingId: string) {
  const context = await getBookingEmailContext(supabase, bookingId);

  if (!context) {
    return false;
  }

  const studentText = plainLines([
    "レッスン開始まで約10分です。",
    `講師: ${context.teacherName}`,
    `日時: ${context.lessonDateTime} - ${context.lessonEndTime}`,
    context.meetingUrl ? `レッスンURL: ${context.meetingUrl}` : null
  ]);
  const teacherText = plainLines([
    "レッスン開始まで約10分です。",
    `生徒: ${context.studentName}`,
    `日時: ${context.lessonDateTime} - ${context.lessonEndTime}`
  ]);

  return sendMessages([
    {
      to: context.studentEmail,
      subject: "【Yoyaku】まもなくレッスンが始まります",
      text: studentText,
      html: htmlBody("まもなくレッスンが始まります", [
        "レッスン開始まで約10分です。",
        `<strong>講師:</strong> ${escapeHtml(context.teacherName)}`,
        `<strong>日時:</strong> ${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`,
        context.meetingUrl ? `<strong>レッスンURL:</strong> ${link(context.meetingUrl, context.meetingUrl)}` : ""
      ])
    },
    {
      to: context.teacherEmail,
      subject: "【Yoyaku】まもなくレッスンが始まります",
      text: teacherText,
      html: htmlBody("まもなくレッスンが始まります", [
        "レッスン開始まで約10分です。",
        `<strong>生徒:</strong> ${escapeHtml(context.studentName)}`,
        `<strong>日時:</strong> ${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`
      ])
    }
  ]);
}
