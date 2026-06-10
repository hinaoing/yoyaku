import {
  APP_TIME_ZONE,
  BOOKING_START_INTERVAL_MINUTES,
  CANCEL_CUTOFF_HOURS,
  LESSON_DURATION_MINUTES,
  WEEKDAYS_JA
} from "@/lib/constants";
import type { Booking, DateAvailability, Slot } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  timeZone: APP_TIME_ZONE,
  month: "short",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit"
});

export function parseTimeToMinutes(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return Number(hour) * 60 + Number(minute);
}

export function toTimeValue(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60)
    .toString()
    .padStart(2, "0");
  const minute = (totalMinutes % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

export function formatTokyoDateKey(date: Date) {
  const parts = dateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function formatTokyoTimeKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour}:${minute}`;
}

export function tokyoDateTimeToUtcIso(dateKey: string, timeValue: string) {
  return new Date(`${dateKey}T${timeValue}:00+09:00`).toISOString();
}

export function addMinutesIso(iso: string, minutes: number) {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString();
}

export function formatDateTimeJa(iso: string) {
  return dateTimeFormatter.format(new Date(iso));
}

export function formatDateJa(dateKey: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: APP_TIME_ZONE,
    month: "short",
    day: "numeric",
    weekday: "short"
  }).format(new Date(`${dateKey}T00:00:00+09:00`));
}

export function formatTimeJa(iso: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

export function formatWeekdayJa(weekday: number) {
  return WEEKDAYS_JA[weekday] ?? "";
}

export function getWeekdayFromDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function canCancelBooking(startsAt: string, now = new Date()) {
  const cutoffMs = CANCEL_CUTOFF_HOURS * 60 * 60 * 1000;
  return new Date(startsAt).getTime() - now.getTime() >= cutoffMs;
}

export function isPastDate(dateKey: string, now = new Date()) {
  return dateKey < formatTokyoDateKey(now);
}

export function isFutureAvailabilitySlot(dateKey: string, startTime: string, now = new Date()) {
  return new Date(tokyoDateTimeToUtcIso(dateKey, startTime)).getTime() > now.getTime();
}

export function roundUpToNextLessonTime(now = new Date()) {
  const [hourPart, minutePart] = formatTokyoTimeKey(now).split(":");
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  const total = hour * 60 + minute;
  const rounded = Math.ceil((total + 1) / BOOKING_START_INTERVAL_MINUTES) * BOOKING_START_INTERVAL_MINUTES;

  if (rounded >= 24 * 60) {
    return "23:30";
  }

  return toTimeValue(rounded);
}

export function getCurrentAndNextMonthRange(now = new Date()) {
  const todayKey = formatTokyoDateKey(now);
  const [year, month] = todayKey.split("-").map(Number);
  const currentMonthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonthStartDate = new Date(Date.UTC(year, month, 1));
  const nextMonthStart = `${nextMonthStartDate.getUTCFullYear()}-${String(
    nextMonthStartDate.getUTCMonth() + 1
  ).padStart(2, "0")}-01`;
  const afterNextMonthStartDate = new Date(Date.UTC(year, month + 1, 1));
  const nextMonthEndDate = new Date(afterNextMonthStartDate.getTime() - 24 * 60 * 60 * 1000);
  const nextMonthEnd = `${nextMonthEndDate.getUTCFullYear()}-${String(
    nextMonthEndDate.getUTCMonth() + 1
  ).padStart(2, "0")}-${String(nextMonthEndDate.getUTCDate()).padStart(2, "0")}`;

  return { currentMonthStart, nextMonthStart, nextMonthEnd };
}

export function listDatesBetween(startDateKey: string, endDateKey: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDateKey}T00:00:00+09:00`);
  const end = new Date(`${endDateKey}T00:00:00+09:00`);

  while (cursor <= end) {
    dates.push(formatTokyoDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

export function generateSlotsFromDateAvailability(
  dateAvailability: DateAvailability[],
  bookings: Pick<Booking, "starts_at" | "status">[],
  now = new Date()
): Slot[] {
  const bookedStarts = new Set(
    bookings.filter((booking) => booking.status === "confirmed").map((booking) => new Date(booking.starts_at).toISOString())
  );
  const slots: Slot[] = [];

  for (const rule of dateAvailability) {
    const startMinutes = parseTimeToMinutes(rule.start_time);
    const endMinutes = parseTimeToMinutes(rule.end_time);
    const weekday = getWeekdayFromDateKey(rule.availability_date);

    if (startMinutes % BOOKING_START_INTERVAL_MINUTES !== 0 || endMinutes <= startMinutes) {
      continue;
    }

    for (
      let minutes = startMinutes;
      minutes + LESSON_DURATION_MINUTES <= endMinutes;
      minutes += BOOKING_START_INTERVAL_MINUTES
    ) {
      const startsAt = tokyoDateTimeToUtcIso(rule.availability_date, toTimeValue(minutes));
      const endsAt = addMinutesIso(startsAt, LESSON_DURATION_MINUTES);

      if (new Date(startsAt) <= now || bookedStarts.has(startsAt)) {
        continue;
      }

      slots.push({ startsAt, endsAt, weekday });
    }
  }

  return slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export function buildMonthCalendarDates(dates: string[]) {
  if (dates.length === 0) {
    return [];
  }

  const firstDate = dates[0];
  const firstWeekday = getWeekdayFromDateKey(firstDate);
  const cells: Array<string | null> = Array.from({ length: firstWeekday }, () => null);

  for (const date of dates) {
    cells.push(date);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}
