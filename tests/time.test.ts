import { describe, expect, it } from "vitest";
import {
  canCancelBooking,
  generateSlotsFromDateAvailability,
  isFutureAvailabilitySlot,
  tokyoDateTimeToUtcIso
} from "@/lib/time";
import { validateAvailabilitySlots } from "@/lib/availability-validation";
import { isJapanHoliday } from "@/lib/japan-holidays";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Booking, DateAvailability } from "@/lib/types";

describe("booking cancellation", () => {
  it("allows cancellation more than 12 hours before the lesson", () => {
    const now = new Date("2026-05-04T00:00:00+09:00");
    const startsAt = tokyoDateTimeToUtcIso("2026-05-04", "18:00");

    expect(canCancelBooking(startsAt, now)).toBe(true);
  });

  it("rejects cancellation inside the 12 hour cutoff", () => {
    const now = new Date("2026-05-04T07:00:00+09:00");
    const startsAt = tokyoDateTimeToUtcIso("2026-05-04", "18:00");

    expect(canCancelBooking(startsAt, now)).toBe(false);
  });
});

describe("generateSlotsFromDateAvailability", () => {
  it("does not generate slots for past dates", () => {
    const now = new Date("2026-05-04T12:00:00+09:00");
    const availability: DateAvailability[] = [
      {
        teacher_id: "teacher-1",
        availability_date: "2026-05-03",
        start_time: "18:00",
        end_time: "19:00"
      }
    ];

    expect(generateSlotsFromDateAvailability(availability, [], now)).toEqual([]);
  });

  it("does not generate slots earlier than the current time today", () => {
    const now = new Date("2026-05-04T18:15:00+09:00");
    const availability: DateAvailability[] = [
      {
        teacher_id: "teacher-1",
        availability_date: "2026-05-04",
        start_time: "17:30",
        end_time: "19:00"
      }
    ];

    expect(generateSlotsFromDateAvailability(availability, [], now).map((slot) => slot.startsAt)).toEqual([
      "2026-05-04T09:30:00.000Z"
    ]);
  });

  it("detects future availability starts for server-side validation", () => {
    const now = new Date("2026-05-04T18:15:00+09:00");

    expect(isFutureAvailabilitySlot("2026-05-04", "18:00", now)).toBe(false);
    expect(isFutureAvailabilitySlot("2026-05-04", "18:30", now)).toBe(true);
  });

  it("expands non-contiguous date-specific windows into slots", () => {
    const now = new Date("2026-05-04T00:00:00+09:00");
    const availability: DateAvailability[] = [
      {
        teacher_id: "teacher-1",
        availability_date: "2026-05-04",
        start_time: "10:00",
        end_time: "11:00"
      },
      {
        teacher_id: "teacher-1",
        availability_date: "2026-05-04",
        start_time: "18:00",
        end_time: "18:30"
      }
    ];
    const slots = generateSlotsFromDateAvailability(availability, [], now);

    expect(slots.map((slot) => [slot.startsAt, slot.endsAt])).toEqual([
      ["2026-05-04T01:00:00.000Z", "2026-05-04T01:25:00.000Z"],
      ["2026-05-04T01:30:00.000Z", "2026-05-04T01:55:00.000Z"],
      ["2026-05-04T09:00:00.000Z", "2026-05-04T09:25:00.000Z"]
    ]);
  });

  it("excludes already booked confirmed slots", () => {
    const now = new Date("2026-05-04T00:00:00+09:00");
    const availability: DateAvailability[] = [
      {
        teacher_id: "teacher-1",
        availability_date: "2026-05-04",
        start_time: "18:00",
        end_time: "19:00"
      }
    ];
    const bookings = [
      {
        starts_at: "2026-05-04T09:00:00.000Z",
        status: "confirmed"
      }
    ] as Pick<Booking, "starts_at" | "status">[];
    const slots = generateSlotsFromDateAvailability(availability, bookings, now);

    expect(slots.map((slot) => [slot.startsAt, slot.endsAt])).toEqual([
      ["2026-05-04T09:30:00.000Z", "2026-05-04T09:55:00.000Z"]
    ]);
  });

  it("excludes booked slots when database timestamps use timezone offsets", () => {
    const now = new Date("2026-05-04T00:00:00+09:00");
    const availability: DateAvailability[] = [
      {
        teacher_id: "teacher-1",
        availability_date: "2026-05-04",
        start_time: "18:00",
        end_time: "19:00"
      }
    ];
    const bookings = [
      {
        starts_at: "2026-05-04T09:00:00+00:00",
        status: "confirmed"
      }
    ] as Pick<Booking, "starts_at" | "status">[];
    const slots = generateSlotsFromDateAvailability(availability, bookings, now);

    expect(slots.map((slot) => [slot.startsAt, slot.endsAt])).toEqual([
      ["2026-05-04T09:30:00.000Z", "2026-05-04T09:55:00.000Z"]
    ]);
  });

  it("does not generate slots from non-30-minute start interval boundaries", () => {
    const now = new Date("2026-05-04T00:00:00+09:00");
    const availability: DateAvailability[] = [
      {
        teacher_id: "teacher-1",
        availability_date: "2026-05-04",
        start_time: "18:10",
        end_time: "18:50"
      }
    ];
    const slots = generateSlotsFromDateAvailability(availability, [], now);

    expect(slots).toHaveLength(0);
  });
});

describe("availability validation", () => {
  const options = {
    startDate: "2026-06-01",
    endDate: "2026-06-30",
    now: new Date("2026-06-01T00:00:00+09:00")
  };

  it("rejects overlapping slots on the same day", () => {
    const issues = validateAvailabilitySlots(
      [
        { availability_date: "2026-06-22", start_time: "09:00", end_time: "20:00" },
        { availability_date: "2026-06-22", start_time: "18:00", end_time: "19:00" }
      ],
      options
    );

    expect(issues.some((issue) => issue.code === "overlap")).toBe(true);
  });

  it("rejects duplicate slots on the same day", () => {
    const issues = validateAvailabilitySlots(
      [
        { availability_date: "2026-06-22", start_time: "18:00", end_time: "19:00" },
        { availability_date: "2026-06-22", start_time: "18:00", end_time: "19:00" }
      ],
      options
    );

    expect(issues.some((issue) => issue.code === "duplicate")).toBe(true);
  });

  it("rejects invalid boundaries and past starts", () => {
    expect(
      validateAvailabilitySlots([{ availability_date: "2026-06-22", start_time: "18:10", end_time: "19:00" }], options)
    ).toContainEqual(expect.objectContaining({ code: "invalid-time" }));
    expect(
      validateAvailabilitySlots([{ availability_date: "2026-06-22", start_time: "18:00", end_time: "18:00" }], options)
    ).toContainEqual(expect.objectContaining({ code: "time-order" }));
    expect(
      validateAvailabilitySlots(
        [{ availability_date: "2026-06-01", start_time: "00:00", end_time: "00:30" }],
        options
      )
    ).toContainEqual(expect.objectContaining({ code: "past-start" }));
  });

  it("allows non-contiguous slots on the same day", () => {
    const issues = validateAvailabilitySlots(
      [
        { availability_date: "2026-06-22", start_time: "09:00", end_time: "10:00" },
        { availability_date: "2026-06-22", start_time: "18:00", end_time: "19:00" }
      ],
      options
    );

    expect(issues).toEqual([]);
  });
});

describe("japan holidays", () => {
  it("detects official 2026 and 2027 holidays", () => {
    expect(isJapanHoliday("2026-09-22")).toBe(true);
    expect(isJapanHoliday("2027-03-22")).toBe(true);
    expect(isJapanHoliday("2026-06-22")).toBe(false);
  });
});

describe("rate limiting", () => {
  it("rejects requests over the fixed window limit", () => {
    const key = `test-limit-${Date.now()}`;
    const now = Date.UTC(2026, 5, 9, 12, 0, 0);

    expect(checkRateLimit(key, 2, 60_000, now).allowed).toBe(true);
    expect(checkRateLimit(key, 2, 60_000, now + 1_000).allowed).toBe(true);

    const blocked = checkRateLimit(key, 2, 60_000, now + 2_000);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(58);
  });

  it("allows requests after the fixed window resets", () => {
    const key = `test-reset-${Date.now()}`;
    const now = Date.UTC(2026, 5, 9, 12, 0, 0);

    expect(checkRateLimit(key, 1, 60_000, now).allowed).toBe(true);
    expect(checkRateLimit(key, 1, 60_000, now + 1_000).allowed).toBe(false);
    expect(checkRateLimit(key, 1, 60_000, now + 61_000).allowed).toBe(true);
  });
});
