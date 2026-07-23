-- Sprint L2.5: AI Notification & Watch Center
-- Run after 018_project_memory.sql in Supabase SQL Editor

create table if not exists public.user_watchlist (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid references public.startup_projects(id) on delete cascade,
  watch_type text not null check (watch_type in ('MARKET', 'COMPETITOR', 'GOVERNMENT')),
  label text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_watchlist_user_id_idx on public.user_watchlist (user_id);
create index if not exists user_watchlist_project_id_idx on public.user_watchlist (project_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid references public.startup_projects(id) on delete cascade,
  category text not null check (
    category in (
      'MARKET',
      'COMPETITOR',
      'GOVERNMENT',
      'REMINDER',
      'AI_RECOMMENDATION',
      'DECISION',
      'REPORT'
    )
  ),
  priority text not null check (priority in ('CRITICAL', 'WARNING', 'INFO', 'SUCCESS')),
  title text not null,
  summary text,
  href text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists notifications_project_id_idx on public.notifications (project_id);
create index if not exists notifications_occurred_at_idx on public.notifications (occurred_at desc);
create index if not exists notifications_read_at_idx on public.notifications (read_at);

create table if not exists public.notification_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  project_id uuid references public.startup_projects(id) on delete cascade,
  market_enabled boolean not null default true,
  competitor_enabled boolean not null default true,
  government_enabled boolean not null default true,
  reminder_enabled boolean not null default true,
  ai_recommendation_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, project_id)
);

alter table public.user_watchlist enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_settings enable row level security;

create policy "user_watchlist_select_all" on public.user_watchlist for select using (true);
create policy "user_watchlist_insert_all" on public.user_watchlist for insert with check (true);
create policy "user_watchlist_update_all" on public.user_watchlist for update using (true);
create policy "user_watchlist_delete_all" on public.user_watchlist for delete using (true);

create policy "notifications_select_all" on public.notifications for select using (true);
create policy "notifications_insert_all" on public.notifications for insert with check (true);
create policy "notifications_update_all" on public.notifications for update using (true);
create policy "notifications_delete_all" on public.notifications for delete using (true);

create policy "notification_settings_select_all" on public.notification_settings for select using (true);
create policy "notification_settings_insert_all" on public.notification_settings for insert with check (true);
create policy "notification_settings_update_all" on public.notification_settings for update using (true);
