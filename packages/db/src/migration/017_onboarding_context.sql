-- Sprint L2.1: AI Onboarding Consultant memory
-- Run after 016_user_workspace.sql in Supabase SQL Editor

alter table public.startup_projects
  add column if not exists onboarding_context jsonb;

create index if not exists startup_projects_onboarding_context_idx
  on public.startup_projects ((onboarding_context is not null))
  where onboarding_context is not null;
