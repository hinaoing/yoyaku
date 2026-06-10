create extension if not exists pgcrypto;

create type public.user_role as enum ('teacher', 'student');
create type public.booking_status as enum ('confirmed', 'canceled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.user_role not null default 'student',
  full_name text,
  created_at timestamptz not null default now()
);

create table public.teachers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  bio text,
  meeting_url text,
  created_at timestamptz not null default now()
);

create table public.date_availability (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(user_id) on delete cascade,
  availability_date date not null,
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  check (start_time < end_time),
  unique (teacher_id, availability_date, start_time, end_time)
);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.teachers(user_id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'confirmed',
  canceled_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create unique index bookings_one_confirmed_slot
  on public.bookings (teacher_id, starts_at)
  where status = 'confirmed';

create unique index bookings_one_confirmed_student_slot
  on public.bookings (student_id, starts_at)
  where status = 'confirmed';

alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.date_availability enable row level security;
alter table public.bookings enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on public.profiles to service_role;
grant all on public.teachers to service_role;
grant all on public.date_availability to service_role;
grant all on public.bookings to service_role;
grant select, insert on public.profiles to authenticated;
grant update (email, full_name) on public.profiles to authenticated;
grant select on public.teachers to anon, authenticated;
grant insert, update on public.teachers to authenticated;
grant select on public.date_availability to anon, authenticated;
grant insert, update, delete on public.date_availability to authenticated;
grant select on public.bookings to authenticated;
grant update (status, canceled_at) on public.bookings to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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
  if coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role'
    and new.teacher_id is not distinct from old.teacher_id
    and new.student_id is not distinct from old.student_id
    and new.starts_at is not distinct from old.starts_at
    and new.ends_at is not distinct from old.ends_at
    and new.status is not distinct from old.status
    and new.canceled_at is not distinct from old.canceled_at
    and new.created_at is not distinct from old.created_at
    and new.reminder_sent_at is distinct from old.reminder_sent_at
  then
    return new;
  end if;

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

create trigger validate_booking_before_cancel_update
  before update on public.bookings
  for each row execute function public.validate_booking_cancel_update();

create policy "profiles are readable by owner or booked teacher"
  on public.profiles for select
  using (
    id = auth.uid()
    or exists (
      select 1 from public.bookings
      where bookings.student_id = profiles.id
      and bookings.teacher_id = auth.uid()
    )
  );

create policy "profiles can be inserted by owner"
  on public.profiles for insert
  with check (
    id = auth.uid()
    and role = 'student'
  );

create policy "profiles can be updated by owner"
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "teachers are public"
  on public.teachers for select
  using (true);

create policy "teachers can insert own profile"
  on public.teachers for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'teacher'
    )
  );

create policy "teachers can update own profile"
  on public.teachers for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "date availability is public"
  on public.date_availability for select
  using (true);

create policy "teachers can insert own date availability"
  on public.date_availability for insert
  with check (teacher_id = auth.uid());

create policy "teachers can update own date availability"
  on public.date_availability for update
  using (teacher_id = auth.uid())
  with check (teacher_id = auth.uid());

create policy "teachers can delete own date availability"
  on public.date_availability for delete
  using (teacher_id = auth.uid());

create policy "bookings are visible to participants"
  on public.bookings for select
  using (student_id = auth.uid() or teacher_id = auth.uid());

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
