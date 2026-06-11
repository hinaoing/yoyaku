do $$
begin
  if not exists (select 1 from pg_type where typname = 'teacher_application_status') then
    create type public.teacher_application_status as enum ('pending', 'approved', 'rejected');
  end if;
end $$;

create table if not exists public.teacher_applications (
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

alter table public.teacher_applications enable row level security;

grant all on public.teacher_applications to service_role;
grant select, insert on public.teacher_applications to authenticated;
grant update (display_name, bio, meeting_url, contact_email, message, status, reviewed_by, reviewed_at, rejection_reason, updated_at)
  on public.teacher_applications to authenticated;

create or replace function public.approve_teacher_application(application_id uuid, reviewer_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_application public.teacher_applications%rowtype;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
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

drop policy if exists "teacher applications are readable by owner" on public.teacher_applications;
drop policy if exists "teacher applications can be inserted by owner" on public.teacher_applications;
drop policy if exists "rejected teacher applications can be resubmitted by owner" on public.teacher_applications;

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
