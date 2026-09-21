-- SkulGo MVP additive PostgreSQL migration.
-- Existing Prisma models already own User, School and SchoolModule.
-- This migration adds the server-side queue for offline mutation acknowledgement.

create table if not exists public.local_sync_queue (
  operation_id uuid primary key,
  school_id uuid not null references public."School"(id) on delete restrict,
  actor_user_id uuid references public."User"(id) on delete set null,
  entity_type text not null,
  entity_id uuid not null,
  operation_type text not null check (operation_type in ('CREATE','UPDATE','DELETE')),
  payload jsonb not null,
  status text not null default 'PENDING'
    check (status in ('PENDING','PROCESSING','ACKNOWLEDGED','FAILED','CONFLICT')),
  attempt_count integer not null default 0,
  idempotency_key text not null unique,
  last_error text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists local_sync_queue_school_status_idx
  on public.local_sync_queue (school_id, status, created_at);

create index if not exists local_sync_queue_entity_idx
  on public.local_sync_queue (school_id, entity_type, entity_id);

comment on table public.local_sync_queue is
  'Durable server-side acknowledgement/outbox record for SkulGo offline mutations.';

-- Existing tables used by this MVP:
-- public."User"         -> authenticated platform user
-- public."School"       -> tenant
-- public."SchoolModule" -> school-scoped enabled/disabled module state
