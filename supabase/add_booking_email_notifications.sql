alter table public.bookings
  add column if not exists reminder_sent_at timestamptz;

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
