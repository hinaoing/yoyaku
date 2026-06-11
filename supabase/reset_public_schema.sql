drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();
drop policy if exists "avatars are publicly readable" on storage.objects;
drop policy if exists "users can upload own avatars" on storage.objects;

delete from storage.objects where bucket_id = 'avatars';
delete from storage.buckets where id = 'avatars';

drop table if exists public.bookings cascade;
drop table if exists public.date_availability cascade;
drop table if exists public.weekly_availability cascade;
drop table if exists public.teacher_applications cascade;
drop table if exists public.teachers cascade;
drop table if exists public.profiles cascade;

drop type if exists public.teacher_application_status cascade;
drop type if exists public.booking_status cascade;
drop type if exists public.user_role cascade;
