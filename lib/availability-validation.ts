import { isFutureAvailabilitySlot, parseTimeToMinutes } from "@/lib/time";
import type { AvailabilityInput } from "@/lib/types";

export type AvailabilityValidationSlot = AvailabilityInput & {
  key?: string;
};

export type AvailabilityValidationIssue = {
  code: "invalid-date" | "invalid-time" | "out-of-range" | "time-order" | "past-start" | "duplicate" | "overlap";
  key?: string;
  message: string;
};

type AvailabilityValidationOptions = {
  endDate: string;
  now?: Date;
  startDate: string;
};

const TIME_PATTERN = /^([01]\d|2[0-3]):(00|30)$/;

export function isHalfHourTimeValue(value: string) {
  return TIME_PATTERN.test(value);
}

export function validateAvailabilitySlots(
  slots: AvailabilityValidationSlot[],
  { endDate, now = new Date(), startDate }: AvailabilityValidationOptions
) {
  const issues: AvailabilityValidationIssue[] = [];
  const validByDate = new Map<string, AvailabilityValidationSlot[]>();

  for (const slot of slots) {
    const dateIsValid = /^\d{4}-\d{2}-\d{2}$/.test(slot.availability_date);
    const timeIsValid = isHalfHourTimeValue(slot.start_time) && isHalfHourTimeValue(slot.end_time);

    if (!dateIsValid) {
      issues.push({ code: "invalid-date", key: slot.key, message: "日付が正しくありません。" });
      continue;
    }

    if (slot.availability_date < startDate || slot.availability_date > endDate) {
      issues.push({ code: "out-of-range", key: slot.key, message: "設定範囲外の日付です。" });
      continue;
    }

    if (!timeIsValid) {
      issues.push({ code: "invalid-time", key: slot.key, message: "時間は30分単位で設定してください。" });
      continue;
    }

    if (slot.start_time >= slot.end_time) {
      issues.push({ code: "time-order", key: slot.key, message: "終了時間は開始時間より後にしてください。" });
      continue;
    }

    if (!isFutureAvailabilitySlot(slot.availability_date, slot.start_time, now)) {
      issues.push({ code: "past-start", key: slot.key, message: "過去の時間は設定できません。" });
      continue;
    }

    validByDate.set(slot.availability_date, [...(validByDate.get(slot.availability_date) ?? []), slot]);
  }

  for (const daySlots of validByDate.values()) {
    const seen = new Map<string, AvailabilityValidationSlot>();
    const sorted = [...daySlots].sort((a, b) => a.start_time.localeCompare(b.start_time));

    for (const slot of sorted) {
      const key = `${slot.availability_date}-${slot.start_time}-${slot.end_time}`;
      const existing = seen.get(key);

      if (existing) {
        issues.push({ code: "duplicate", key: existing.key, message: "同じ時間帯が重複しています。" });
        issues.push({ code: "duplicate", key: slot.key, message: "同じ時間帯が重複しています。" });
      }

      seen.set(key, slot);
    }

    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];

      if (parseTimeToMinutes(current.start_time) < parseTimeToMinutes(previous.end_time)) {
        issues.push({ code: "overlap", key: previous.key, message: "同じ日の時間帯が重なっています。" });
        issues.push({ code: "overlap", key: current.key, message: "同じ日の時間帯が重なっています。" });
      }
    }
  }

  return issues;
}

export function availabilityIssueMessages(issues: AvailabilityValidationIssue[]) {
  return Array.from(new Set(issues.map((issue) => issue.message)));
}
