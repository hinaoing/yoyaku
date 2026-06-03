drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

drop table if exists public.bookings cascade;
drop table if exists public.date_availability cascade;
drop table if exists public.weekly_availability cascade;
drop table if exists public.teachers cascade;
drop table if exists public.profiles cascade;

drop type if exists public.booking_status cascade;
drop type if exists public.user_role cascade;
