-- Sprint 1.1: Project Foundation — activity tracking + context schema for Memory
-- Run after 020_project_crud_extras.sql in Supabase SQL Editor

alter table public.startup_projects
  add column if not exists last_activity_at timestamptz not null default now();

create index if not exists startup_projects_last_activity_at_idx
  on public.startup_projects (last_activity_at desc);

-- Project-owned context (Memory foundation — AI attaches later)
create table if not exists public.project_context (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects (id) on delete cascade,
  key text not null,
  value text not null default '',
  confidence numeric(5, 2) check (confidence is null or (confidence >= 0 and confidence <= 100)),
  updated_at timestamptz not null default now(),
  unique (project_id, key)
);

create index if not exists project_context_project_id_idx
  on public.project_context (project_id);

alter table public.project_context enable row level security;

-- Users access context for projects they own (via startup_projects.user_id)
create policy "project_context_select_own"
  on public.project_context for select
  using (
    exists (
      select 1 from public.startup_projects p
      where p.id = project_context.project_id
        and p.user_id = auth.uid()
        and p.is_demo = false
    )
  );

create policy "project_context_insert_own"
  on public.project_context for insert
  with check (
    exists (
      select 1 from public.startup_projects p
      where p.id = project_context.project_id
        and p.user_id = auth.uid()
        and p.is_demo = false
    )
  );

create policy "project_context_update_own"
  on public.project_context for update
  using (
    exists (
      select 1 from public.startup_projects p
      where p.id = project_context.project_id
        and p.user_id = auth.uid()
        and p.is_demo = false
    )
  );

create policy "project_context_delete_own"
  on public.project_context for delete
  using (
    exists (
      select 1 from public.startup_projects p
      where p.id = project_context.project_id
        and p.user_id = auth.uid()
        and p.is_demo = false
    )
  );
