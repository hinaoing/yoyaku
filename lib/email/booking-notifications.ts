import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { formatDateTimeJa, formatTimeJa } from "@/lib/time";
import { CANCEL_CUTOFF_HOURS } from "@/lib/constants";
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

function button(url: string, label: string) {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;background:#5f7f52;color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">${escapeHtml(label)}</a>`;
}

function plainLines(lines: Array<string | null | undefined>) {
  return lines.filter(Boolean).join("\n");
}

function htmlBody(title: string, intro: string, rows: Array<[string, string | null | undefined]>, action?: { label: string; url: string }, notes: string[] = []) {
  const detailRows = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><th style="width:120px;padding:10px 0;color:#6b7280;font-size:13px;text-align:left;vertical-align:top">${escapeHtml(label)}</th><td style="padding:10px 0;color:#17201b;font-weight:600">${value}</td></tr>`
    )
    .join("");
  const noteHtml = notes.length
    ? `<div style="margin-top:18px;padding:12px 14px;border-radius:8px;background:#f6f7f2;color:#4b5563;font-size:13px;line-height:1.7">${notes.map(escapeHtml).join("<br>")}</div>`
    : "";

  return [
    `<div style="font-family:Arial,'Hiragino Sans','Yu Gothic',sans-serif;line-height:1.7;color:#17201b;background:#fbfbf7;padding:24px">`,
    `<div style="max-width:560px;margin:0 auto;border:1px solid #e5e7df;border-radius:14px;background:#ffffff;padding:24px">`,
    `<p style="margin:0 0 8px;color:#5f7f52;font-size:13px;font-weight:700">Yoyaku</p>`,
    `<h1 style="margin:0;font-size:22px;color:#17201b">${escapeHtml(title)}</h1>`,
    `<p style="margin:16px 0 18px;color:#2f3a35">${escapeHtml(intro)}</p>`,
    `<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #eceee7;border-bottom:1px solid #eceee7">${detailRows}</table>`,
    action ? `<p style="margin:22px 0 0">${button(action.url, action.label)}</p>` : "",
    noteHtml,
    `<p style="margin:24px 0 0;color:#6b7280;font-size:12px">このメールは Yoyaku から自動送信されています。</p>`,
    `</div>`,
    `</div>`
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

function studentBookingUrl(bookingId: string) {
  return bookingUrl(`/student/bookings/${bookingId}`);
}

function teacherBookingUrl(bookingId: string) {
  return bookingUrl(`/teacher/bookings/${bookingId}`);
}

export async function sendBookingConfirmedEmails(supabase: SupabaseClient, bookingId: string) {
  const context = await getBookingEmailContext(supabase, bookingId);

  if (!context) {
    return false;
  }

  const studentText = plainLines([
    "レッスン予約が確定しました。",
    `講師: ${context.teacherName}`,
    `生徒: ${context.studentName}`,
    `レッスン日時: ${context.lessonDateTime} - ${context.lessonEndTime}`,
    context.meetingUrl ? `レッスンURL: ${context.meetingUrl}` : null,
    `予約詳細: ${studentBookingUrl(context.booking.id)}`,
    `キャンセルはレッスン開始${CANCEL_CUTOFF_HOURS}時間前まで可能です。`
  ]);
  const teacherText = plainLines([
    "新しい予約が入りました。",
    `講師: ${context.teacherName}`,
    `生徒: ${context.studentName}`,
    `レッスン日時: ${context.lessonDateTime} - ${context.lessonEndTime}`,
    context.meetingUrl ? `レッスンURL: ${context.meetingUrl}` : null,
    `予約詳細: ${teacherBookingUrl(context.booking.id)}`,
    `キャンセルはレッスン開始${CANCEL_CUTOFF_HOURS}時間前まで可能です。`
  ]);

  return sendMessages([
    {
      to: context.studentEmail,
      subject: "【Yoyaku】予約が確定しました",
      text: studentText,
      html: htmlBody(
        "予約が確定しました",
        "以下の内容でレッスン予約が確定しました。",
        [
          ["講師", escapeHtml(context.teacherName)],
          ["生徒", escapeHtml(context.studentName)],
          ["レッスン日時", `${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`],
          ["レッスンURL", context.meetingUrl ? link(context.meetingUrl, context.meetingUrl) : null]
        ],
        { label: "予約詳細を開く", url: studentBookingUrl(context.booking.id) },
        [`キャンセルはレッスン開始${CANCEL_CUTOFF_HOURS}時間前まで可能です。`]
      )
    },
    {
      to: context.teacherEmail,
      subject: "【Yoyaku】新しい予約が入りました",
      text: teacherText,
      html: htmlBody(
        "新しい予約が入りました",
        "生徒から新しいレッスン予約が入りました。",
        [
          ["講師", escapeHtml(context.teacherName)],
          ["生徒", escapeHtml(context.studentName)],
          ["レッスン日時", `${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`],
          ["レッスンURL", context.meetingUrl ? link(context.meetingUrl, context.meetingUrl) : null]
        ],
        { label: "予約詳細を開く", url: teacherBookingUrl(context.booking.id) },
        [`キャンセルはレッスン開始${CANCEL_CUTOFF_HOURS}時間前まで可能です。`]
      )
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
    `生徒: ${context.studentName}`,
    `レッスン日時: ${context.lessonDateTime} - ${context.lessonEndTime}`,
    `予約詳細: ${studentBookingUrl(context.booking.id)}`
  ]);
  const teacherText = plainLines([
    "レッスン予約がキャンセルされました。",
    `講師: ${context.teacherName}`,
    `生徒: ${context.studentName}`,
    `レッスン日時: ${context.lessonDateTime} - ${context.lessonEndTime}`,
    `予約詳細: ${teacherBookingUrl(context.booking.id)}`
  ]);

  return sendMessages([
    {
      to: context.studentEmail,
      subject: "【Yoyaku】予約をキャンセルしました",
      text: studentText,
      html: htmlBody(
        "予約をキャンセルしました",
        "以下のレッスン予約をキャンセルしました。",
        [
          ["講師", escapeHtml(context.teacherName)],
          ["生徒", escapeHtml(context.studentName)],
          ["レッスン日時", `${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`]
        ],
        { label: "予約詳細を開く", url: studentBookingUrl(context.booking.id) },
        ["この予約はキャンセル済みです。"]
      )
    },
    {
      to: context.teacherEmail,
      subject: "【Yoyaku】予約がキャンセルされました",
      text: teacherText,
      html: htmlBody(
        "予約がキャンセルされました",
        "以下のレッスン予約がキャンセルされました。",
        [
          ["講師", escapeHtml(context.teacherName)],
          ["生徒", escapeHtml(context.studentName)],
          ["レッスン日時", `${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`]
        ],
        { label: "予約詳細を開く", url: teacherBookingUrl(context.booking.id) },
        ["この予約はキャンセル済みです。"]
      )
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
    `生徒: ${context.studentName}`,
    `レッスン日時: ${context.lessonDateTime} - ${context.lessonEndTime}`,
    context.meetingUrl ? `レッスンURL: ${context.meetingUrl}` : null,
    `予約詳細: ${studentBookingUrl(context.booking.id)}`
  ]);
  const teacherText = plainLines([
    "レッスン開始まで約10分です。",
    `講師: ${context.teacherName}`,
    `生徒: ${context.studentName}`,
    `レッスン日時: ${context.lessonDateTime} - ${context.lessonEndTime}`,
    context.meetingUrl ? `レッスンURL: ${context.meetingUrl}` : null,
    `予約詳細: ${teacherBookingUrl(context.booking.id)}`
  ]);

  return sendMessages([
    {
      to: context.studentEmail,
      subject: "【Yoyaku】まもなくレッスンが始まります",
      text: studentText,
      html: htmlBody(
        "まもなくレッスンが始まります",
        "レッスン開始まで約10分です。準備ができましたらレッスンURLを開いてください。",
        [
          ["講師", escapeHtml(context.teacherName)],
          ["生徒", escapeHtml(context.studentName)],
          ["レッスン日時", `${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`],
          ["レッスンURL", context.meetingUrl ? link(context.meetingUrl, context.meetingUrl) : null]
        ],
        { label: context.meetingUrl ? "レッスンURLを開く" : "予約詳細を開く", url: context.meetingUrl ?? studentBookingUrl(context.booking.id) }
      )
    },
    {
      to: context.teacherEmail,
      subject: "【Yoyaku】まもなくレッスンが始まります",
      text: teacherText,
      html: htmlBody(
        "まもなくレッスンが始まります",
        "レッスン開始まで約10分です。生徒情報とレッスン日時を確認してください。",
        [
          ["講師", escapeHtml(context.teacherName)],
          ["生徒", escapeHtml(context.studentName)],
          ["レッスン日時", `${escapeHtml(context.lessonDateTime)} - ${escapeHtml(context.lessonEndTime)}`],
          ["レッスンURL", context.meetingUrl ? link(context.meetingUrl, context.meetingUrl) : null]
        ],
        { label: "予約詳細を開く", url: teacherBookingUrl(context.booking.id) }
      )
    }
  ]);
}
