-- Sprint 4.8: Closed Alpha analytics persistence
-- Run after 021_sprint1_project_foundation.sql in Supabase SQL Editor

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.startup_projects (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  session_id text,
  event_name text not null,
  event_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_event_name_idx
  on public.analytics_events (event_name);

create index if not exists analytics_events_created_at_idx
  on public.analytics_events (created_at desc);

create index if not exists analytics_events_user_id_idx
  on public.analytics_events (user_id);

create index if not exists analytics_events_session_id_idx
  on public.analytics_events (session_id);

alter table public.analytics_events enable row level security;

-- Inserts/reads via service role only (API routes). No anon policies.

create table if not exists public.analytics_daily_summary (
  id uuid primary key default gen_random_uuid(),
  summary_date date not null,
  metric_key text not null,
  metric_value numeric not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (summary_date, metric_key)
);

create index if not exists analytics_daily_summary_date_idx
  on public.analytics_daily_summary (summary_date desc);

alter table public.analytics_daily_summary enable row level security;
