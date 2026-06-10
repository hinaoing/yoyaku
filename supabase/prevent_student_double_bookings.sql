create unique index if not exists bookings_one_confirmed_student_slot
  on public.bookings (student_id, starts_at)
  where status = 'confirmed';

create or replace function public.validate_booking_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  starts_local timestamp;
  ends_local timestamp;
  availability_date_key date;
  availability_start_time time;
  availability_end_time time;
begin
  if new.status <> 'confirmed' then
    raise exception 'new bookings must be confirmed'
      using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.profiles
    where profiles.id = new.student_id
      and profiles.role = 'student'
  ) then
    raise exception 'booking student must have the student role'
      using errcode = '23514';
  end if;

  if not exists (
    select 1 from public.teachers
    where teachers.user_id = new.teacher_id
  ) then
    raise exception 'booking teacher does not exist'
      using errcode = '23514';
  end if;

  if exists (
    select 1 from public.bookings
    where bookings.student_id = new.student_id
      and bookings.starts_at = new.starts_at
      and bookings.status = 'confirmed'
  ) then
    raise exception 'student already has a booking at this time'
      using errcode = '23505';
  end if;

  if new.starts_at <= now() then
    raise exception 'booking must start in the future'
      using errcode = '23514';
  end if;

  if new.ends_at <> new.starts_at + interval '25 minutes' then
    raise exception 'booking duration must be 25 minutes'
      using errcode = '23514';
  end if;

  starts_local := new.starts_at at time zone 'Asia/Tokyo';
  ends_local := new.ends_at at time zone 'Asia/Tokyo';

  if date_trunc('minute', starts_local) <> starts_local
    or extract(minute from starts_local)::int not in (0, 30)
  then
    raise exception 'booking start must be on a 30 minute boundary'
      using errcode = '23514';
  end if;

  if starts_local::date <> ends_local::date then
    raise exception 'booking must not cross a Tokyo calendar day'
      using errcode = '23514';
  end if;

  availability_date_key := starts_local::date;
  availability_start_time := starts_local::time;
  availability_end_time := ends_local::time;

  if not exists (
    select 1 from public.date_availability
    where date_availability.teacher_id = new.teacher_id
      and date_availability.availability_date = availability_date_key
      and date_availability.start_time <= availability_start_time
      and date_availability.end_time >= availability_end_time
  ) then
    raise exception 'booking must be inside teacher availability'
      using errcode = '23514';
  end if;

  return new;
end;
$$;
