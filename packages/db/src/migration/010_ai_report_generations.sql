-- Sprint 9: AI Report Generation tracking
-- Run after 009_validation_reports.sql in Supabase SQL Editor

create table if not exists public.ai_report_generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  report_id uuid not null references public.validation_reports(id) on delete cascade,
  provider text not null,
  model text not null,
  status text not null default 'PROCESSING'
    check (status in ('PROCESSING', 'COMPLETED', 'FAILED')),
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists ai_report_generations_project_id_idx
  on public.ai_report_generations (project_id);

create index if not exists ai_report_generations_report_id_idx
  on public.ai_report_generations (report_id);

create index if not exists ai_report_generations_created_at_idx
  on public.ai_report_generations (created_at desc);

alter table public.ai_report_generations enable row level security;

create policy "ai_report_generations_select_all"
  on public.ai_report_generations for select using (true);

create policy "ai_report_generations_insert_all"
  on public.ai_report_generations for insert with check (true);

create policy "ai_report_generations_update_all"
  on public.ai_report_generations for update using (true);

create policy "ai_report_generations_delete_all"
  on public.ai_report_generations for delete using (true);
