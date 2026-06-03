export type UserRole = "teacher" | "student";
export type BookingStatus = "confirmed" | "canceled";

export type Profile = {
  id: string;
  email: string | null;
  role: UserRole;
  full_name: string | null;
};

export type Teacher = {
  user_id: string;
  display_name: string;
  bio: string | null;
  meeting_url: string | null;
};

export type DateAvailability = {
  id?: string;
  teacher_id: string;
  availability_date: string;
  start_time: string;
  end_time: string;
};

export type Booking = {
  id: string;
  teacher_id: string;
  student_id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  canceled_at: string | null;
  created_at: string;
};

export type Slot = {
  startsAt: string;
  endsAt: string;
  weekday: number;
};

export type AvailabilityInput = {
  availability_date: string;
  start_time: string;
  end_time: string;
};
