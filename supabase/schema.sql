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
  created_at timestamptz not null default now(),
  check (starts_at < ends_at)
);

create unique index bookings_one_confirmed_slot
  on public.bookings (teacher_id, starts_at)
  where status = 'confirmed';

alter table public.profiles enable row level security;
alter table public.teachers enable row level security;
alter table public.date_availability enable row level security;
alter table public.bookings enable row level security;

grant usage on schema public to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.teachers to anon, authenticated;
grant insert, update on public.teachers to authenticated;
grant select on public.date_availability to anon, authenticated;
grant insert, update, delete on public.date_availability to authenticated;
grant select, insert, update on public.bookings to authenticated;

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

create policy "students can create own bookings"
  on public.bookings for insert
  with check (
    student_id = auth.uid()
    and status = 'confirmed'
    and exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role = 'student'
    )
  );

create policy "students can cancel own bookings"
  on public.bookings for update
  using (student_id = auth.uid())
  with check (
    student_id = auth.uid()
    and status = 'canceled'
  );
