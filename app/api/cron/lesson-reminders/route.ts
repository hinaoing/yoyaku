import { NextResponse } from "next/server";
import { sendBookingReminderEmails } from "@/lib/email/booking-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();
  const windowStart = addMinutes(now, 9);
  const windowEnd = addMinutes(now, 11);
  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id")
    .eq("status", "confirmed")
    .is("reminder_sent_at", null)
    .gte("starts_at", windowStart.toISOString())
    .lt("starts_at", windowEnd.toISOString())
    .order("starts_at", { ascending: true })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let reminded = 0;
  let failed = 0;

  for (const booking of bookings ?? []) {
    const sent = await sendBookingReminderEmails(supabase, booking.id);

    if (!sent) {
      failed += 1;
      continue;
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", booking.id)
      .is("reminder_sent_at", null);

    if (updateError) {
      failed += 1;
      console.error("Failed to mark lesson reminder as sent:", updateError.message);
      continue;
    }

    reminded += 1;
  }

  return NextResponse.json({ checked: bookings?.length ?? 0, failed, reminded });
}
