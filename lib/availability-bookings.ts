import { formatTokyoDateKey, formatTokyoTimeKey } from "@/lib/time";
import type { AvailabilityInput } from "@/lib/types";

export type AvailabilityBooking = {
  ends_at: string;
  starts_at: string;
};

export function bookingTimeKey(booking: AvailabilityBooking) {
  const startsAt = new Date(booking.starts_at);
  const endsAt = new Date(booking.ends_at);

  return {
    availability_date: formatTokyoDateKey(startsAt),
    end_time: formatTokyoTimeKey(endsAt),
    start_time: formatTokyoTimeKey(startsAt)
  };
}

export function slotContainsBooking(slot: AvailabilityInput, booking: AvailabilityBooking) {
  const bookingTime = bookingTimeKey(booking);

  return (
    slot.availability_date === bookingTime.availability_date
    && slot.start_time <= bookingTime.start_time
    && slot.end_time >= bookingTime.end_time
  );
}

export function protectedBookingViolations(slots: AvailabilityInput[], bookings: AvailabilityBooking[]) {
  return bookings.filter((booking) => !slots.some((slot) => slotContainsBooking(slot, booking)));
}
