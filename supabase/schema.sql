create extension if not exists pgcrypto;

create type public.user_role as enum ('teacher', 'student');
create type public.booking_status as enum ('confirmed', 'canceled');
create type public.teacher_application_status as enum ('pending', 'approved', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role public.user_role not null default 'student',
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.teachers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  display_name text not null,
  bio text,
  meeting_url text,
  created_at timestamptz not null default now()
);

create table public.teacher_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  display_name text not null,
  bio text,
  meeting_url text,
  contact_email text not null,
  message text,
  status public.teacher_application_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(display_name) between 1 and 80),
  check (char_length(coalesce(bio, '')) <= 1000),
  check (char_length(coalesce(message, '')) <= 1000),
  check (contact_email like '%@%'),
  check (meeting_url is null or meeting_url ~ '^https?://')
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

create index bookings_confirmed_reminder_idx
  on public.bookings (starts_at)
  where status = 'confirmed' and reminder_sent_at is null;

alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.teacher_applications enable row level security;
alter table public.date_availability enable row level security;
alter table public.bookings enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant all on public.profiles to service_role;
grant all on public.teachers to service_role;
grant all on public.teacher_applications to service_role;
grant all on public.date_availability to service_role;
grant all on public.bookings to service_role;
grant select, insert on public.profiles to authenticated;
grant update (email, full_name, avatar_url, updated_at) on public.profiles to authenticated;
grant select on public.teachers to anon, authenticated;
grant insert, update on public.teachers to authenticated;
grant select, insert on public.teacher_applications to authenticated;
grant update (display_name, bio, meeting_url, contact_email, message, status, reviewed_by, reviewed_at, rejection_reason, updated_at)
  on public.teacher_applications to authenticated;
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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = true,
    file_size_limit = 2097152,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create or replace function public.prevent_authenticated_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
    and auth.uid() is not null
    and auth.role() <> 'service_role'
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
  if auth.role() = 'service_role'
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

create or replace function public.approve_teacher_application(application_id uuid, reviewer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_application public.teacher_applications%rowtype;
begin
  if auth.role() <> 'service_role' then
    raise exception 'only service_role can approve teacher applications'
      using errcode = '42501';
  end if;

  select *
  into target_application
  from public.teacher_applications
  where id = application_id
  for update;

  if target_application.id is null then
    raise exception 'teacher application not found'
      using errcode = '02000';
  end if;

  if target_application.status <> 'pending' then
    raise exception 'teacher application is not pending'
      using errcode = '23514';
  end if;

  update public.profiles
  set role = 'teacher'
  where id = target_application.user_id;

  insert into public.teachers (user_id, display_name, bio, meeting_url)
  values (
    target_application.user_id,
    target_application.display_name,
    target_application.bio,
    target_application.meeting_url
  )
  on conflict (user_id) do update
  set display_name = excluded.display_name,
      bio = excluded.bio,
      meeting_url = excluded.meeting_url;

  update public.teacher_applications
  set status = 'approved',
      reviewed_by = reviewer_id,
      reviewed_at = now(),
      rejection_reason = null,
      updated_at = now()
  where id = application_id;
end;
$$;

revoke all on function public.approve_teacher_application(uuid, uuid) from public, anon, authenticated;
grant execute on function public.approve_teacher_application(uuid, uuid) to service_role;

create policy "avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "users can upload own avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

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

create policy "teacher applications are readable by owner"
  on public.teacher_applications for select
  using (user_id = auth.uid());

create policy "teacher applications can be inserted by owner"
  on public.teacher_applications for insert
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
  );

create policy "rejected teacher applications can be resubmitted by owner"
  on public.teacher_applications for update
  using (
    user_id = auth.uid()
    and status = 'rejected'
  )
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and reviewed_by is null
    and reviewed_at is null
    and rejection_reason is null
  );

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
