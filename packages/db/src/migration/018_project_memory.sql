-- Sprint L2.3: Project AI Memory entries
-- Run after 017_onboarding_context.sql in Supabase SQL Editor

create table if not exists public.project_memory_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  memory_type text not null check (
    memory_type in (
      'CONVERSATION',
      'RESEARCH',
      'DECISION',
      'REPORT',
      'EVIDENCE',
      'GOVERNMENT',
      'MARKET',
      'COMPETITOR'
    )
  ),
  title text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists project_memory_entries_project_id_idx
  on public.project_memory_entries (project_id);

create index if not exists project_memory_entries_occurred_at_idx
  on public.project_memory_entries (occurred_at desc);

alter table public.project_memory_entries enable row level security;

create policy "project_memory_entries_select_all"
  on public.project_memory_entries for select using (true);

create policy "project_memory_entries_insert_all"
  on public.project_memory_entries for insert with check (true);

create policy "project_memory_entries_update_all"
  on public.project_memory_entries for update using (true);

create policy "project_memory_entries_delete_all"
  on public.project_memory_entries for delete using (true);
