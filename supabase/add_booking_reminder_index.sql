create index if not exists bookings_confirmed_reminder_idx
  on public.bookings (starts_at)
  where status = 'confirmed' and reminder_sent_at is null;
