-- Sprint 6.0: Product pivot — strategy project types
-- Run after 014_knowledge_base.sql in Supabase SQL Editor

alter table public.startup_projects
  add column if not exists project_type text not null default 'STARTUP'
    check (project_type in (
      'STARTUP',
      'BUSINESS_STRATEGY',
      'NEW_BUSINESS',
      'AI_INITIATIVE',
      'DIGITAL_TRANSFORMATION',
      'MARKET_EXPANSION',
      'CUSTOM'
    ));

create index if not exists startup_projects_project_type_idx
  on public.startup_projects (project_type);

-- Existing rows default to STARTUP via column default
