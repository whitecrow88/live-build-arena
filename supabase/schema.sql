-- ============================================================
-- Live Build Arena — Supabase Schema
-- Run this in Supabase SQL editor or via supabase db push
-- ============================================================

-- Extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

create type user_role as enum ('admin', 'streamer', 'buyer');

create type session_status as enum ('live', 'ended');

create type request_status as enum (
  'queued',
  'approved',
  'rejected',
  'building',
  'delivered',
  'failed',
  'refunded',
  'disputed',
  'partial_refund',
  'revised',
  'dispute_open',
  'needs_clarification'
);

create type request_source as enum ('kick', 'twitch', 'manual');

create type build_status as enum ('pending', 'running', 'success', 'failed');

-- ============================================================
-- TABLES
-- ============================================================

-- users (extends Supabase auth.users)
create table public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null unique,
  role        user_role not null default 'buyer',
  display_name text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- stream_sessions
create table public.stream_sessions (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  status      session_status not null default 'live',
  started_at  timestamptz not null default now(),
  ended_at    timestamptz,
  intake_paused boolean not null default false,
  created_by  uuid references public.users(id),
  created_at  timestamptz not null default now()
);

-- requests
create table public.requests (
  id                  uuid primary key default gen_random_uuid(),
  -- opaque public delivery token (shown in URL instead of id)
  public_token        uuid not null default gen_random_uuid() unique,
  source              request_source not null default 'kick',
  -- provider dedup key (Kick event_id etc.)
  provider_event_id   text unique,
  donor_name          text not null,
  donor_message       text not null,
  amount              numeric(10,2) not null default 0,
  currency            text not null default 'USD',
  status              request_status not null default 'queued',
  stream_session_id   uuid references public.stream_sessions(id),
  -- buyer contact (email or social) — keep private, never expose on overlay
  buyer_contact       text,
  requested_scope     text,
  rejection_reason    text,
  moderation_flags    jsonb not null default '[]'::jsonb,
  pinned              boolean not null default false,
  -- raw webhook payload for audit
  raw_payload         jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- build_jobs
create table public.build_jobs (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.requests(id) on delete cascade,
  prompt_final  text,
  build_status  build_status not null default 'pending',
  started_at    timestamptz,
  finished_at   timestamptz,
  time_cap_minutes int not null default 15,
  repo_url      text,
  preview_url   text,
  -- jsonb array of { step, message, timestamp }
  logs          jsonb not null default '[]'::jsonb,
  error_message text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- revisions
create table public.revisions (
  id              uuid primary key default gen_random_uuid(),
  request_id      uuid not null references public.requests(id) on delete cascade,
  revision_count  int not null default 1,
  notes           text,
  requested_at    timestamptz not null default now(),
  completed_at    timestamptz
);

-- policies (single-row config table)
create table public.policies (
  id                    int primary key default 1 check (id = 1),  -- singleton
  max_build_minutes     int not null default 15,
  refund_policy_text    text not null default 'Donations are non-refundable unless the build cannot be started. Delivered prototypes are not guaranteed to be production-ready.',
  allowed_categories    text[] not null default array['web app', 'cli tool', 'landing page', 'api', 'script', 'game', 'chrome extension'],
  blocked_categories    text[] not null default array['adult content', 'illegal activity', 'malware', 'phishing', 'copyright infringement'],
  one_revision_enabled  boolean not null default true,
  auto_start_on_approve boolean not null default false,
  updated_at            timestamptz not null default now()
);

-- audit_log — immutable append-only event log
create table public.audit_log (
  id          bigserial primary key,
  entity_type text not null,   -- 'request', 'build_job', 'session', etc.
  entity_id   uuid not null,
  action      text not null,   -- 'approved', 'rejected', 'build_started', etc.
  actor_id    uuid references public.users(id),
  metadata    jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- webhook_events — raw ingestion store for dedup + audit
create table public.webhook_events (
  id              bigserial primary key,
  provider        text not null,   -- 'kick', 'twitch', etc.
  event_id        text not null,
  event_type      text not null,
  payload         jsonb not null,
  processed       boolean not null default false,
  request_id      uuid references public.requests(id),
  received_at     timestamptz not null default now(),
  unique (provider, event_id)
);

-- ============================================================
-- INDEXES
-- ============================================================

create index idx_requests_status on public.requests(status);
create index idx_requests_session on public.requests(stream_session_id);
create index idx_requests_amount_time on public.requests(amount desc, created_at asc);
create index idx_requests_public_token on public.requests(public_token);
create index idx_build_jobs_request on public.build_jobs(request_id);
create index idx_audit_log_entity on public.audit_log(entity_type, entity_id);
create index idx_webhook_events_provider_event on public.webhook_events(provider, event_id);

-- ============================================================
-- TRIGGERS — updated_at auto-update
-- ============================================================

create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_requests_updated_at
  before update on public.requests
  for each row execute function update_updated_at();

create trigger trg_build_jobs_updated_at
  before update on public.build_jobs
  for each row execute function update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.users enable row level security;
alter table public.stream_sessions enable row level security;
alter table public.requests enable row level security;
alter table public.build_jobs enable row level security;
alter table public.revisions enable row level security;
alter table public.policies enable row level security;
alter table public.audit_log enable row level security;
alter table public.webhook_events enable row level security;

-- Service role bypasses RLS — all API routes use service role key
-- Public read policies for overlay/delivery endpoints (scoped to safe columns only)

-- requests: public can read safe fields for overlay
create policy "overlay_read_requests" on public.requests
  for select using (
    status in ('queued', 'building', 'delivered')
    and (current_setting('request.jwt.claims', true)::jsonb->>'role' = 'service_role'
         or current_setting('request.jwt.claims', true)::jsonb->>'role' = 'anon')
  );

-- policies: public read
create policy "public_read_policies" on public.policies
  for select using (true);

-- ============================================================
-- SEED DEFAULT POLICY ROW
-- ============================================================

insert into public.policies (id) values (1) on conflict do nothing;
