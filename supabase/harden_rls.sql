grant usage on schema public to anon, authenticated, service_role;
grant all on public.profiles to service_role;
grant all on public.teachers to service_role;
grant all on public.date_availability to service_role;
grant all on public.bookings to service_role;

revoke update on public.profiles from authenticated;
grant select, insert on public.profiles to authenticated;
grant update (email, full_name) on public.profiles to authenticated;

revoke insert on public.bookings from authenticated;
revoke update on public.bookings from authenticated;
grant select on public.bookings to authenticated;
grant update (status, canceled_at) on public.bookings to authenticated;

create or replace function public.prevent_authenticated_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and auth.uid() is not null
    and coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role'
  then
    raise exception 'profiles.role cannot be changed by authenticated users'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_authenticated_profile_role_change on public.profiles;

create trigger prevent_authenticated_profile_role_change
  before update of role on public.profiles
  for each row execute function public.prevent_authenticated_role_change();

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

drop trigger if exists validate_booking_before_insert on public.bookings;

create trigger validate_booking_before_insert
  before insert on public.bookings
  for each row execute function public.validate_booking_insert();

create or replace function public.validate_booking_cancel_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.teacher_id is distinct from old.teacher_id
    or new.student_id is distinct from old.student_id
    or new.starts_at is distinct from old.starts_at
    or new.ends_at is distinct from old.ends_at
    or new.created_at is distinct from old.created_at
  then
    raise exception 'booking cancellation cannot change lesson fields'
      using errcode = '42501';
  end if;

  if old.status <> 'confirmed' or new.status <> 'canceled' then
    raise exception 'bookings can only move from confirmed to canceled'
      using errcode = '23514';
  end if;

  if old.starts_at < now() + interval '12 hours' then
    raise exception 'bookings can only be canceled at least 12 hours before the lesson'
      using errcode = '23514';
  end if;

  if new.canceled_at is null then
    new.canceled_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists validate_booking_before_cancel_update on public.bookings;

create trigger validate_booking_before_cancel_update
  before update on public.bookings
  for each row execute function public.validate_booking_cancel_update();

drop policy if exists "students can create own bookings" on public.bookings;
drop policy if exists "students can cancel own bookings" on public.bookings;

create policy "students can cancel own bookings"
  on public.bookings for update
  using (
    student_id = auth.uid()
    and status = 'confirmed'
    and starts_at >= now() + interval '12 hours'
  )
  with check (
    student_id = auth.uid()
    and status = 'canceled'
    and canceled_at is not null
  );
