create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx
  on public.audit_logs (created_at desc);

create index if not exists audit_logs_target_idx
  on public.audit_logs (target_type, target_id);

alter table public.audit_logs enable row level security;

grant all on public.audit_logs to service_role;
revoke all on public.audit_logs from anon, authenticated;
