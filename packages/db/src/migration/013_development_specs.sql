-- Sprint 12: AI Development Specification Generator
-- Run after 012_prd_documents.sql in Supabase SQL Editor

create table if not exists public.development_specs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  prd_id uuid not null references public.prd_documents(id) on delete cascade,
  title text not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'GENERATING', 'COMPLETED')),
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists development_specs_project_id_idx
  on public.development_specs (project_id);

create index if not exists development_specs_prd_id_idx
  on public.development_specs (prd_id);

create index if not exists development_specs_created_at_idx
  on public.development_specs (created_at desc);

create table if not exists public.development_spec_sections (
  id uuid primary key default gen_random_uuid(),
  development_spec_id uuid not null references public.development_specs(id) on delete cascade,
  section_type text not null
    check (section_type in (
      'SYSTEM_OVERVIEW',
      'TECH_STACK',
      'ARCHITECTURE',
      'DATABASE_SCHEMA',
      'API_SPECIFICATION',
      'FRONTEND_STRUCTURE',
      'BACKEND_STRUCTURE',
      'AUTH_DESIGN',
      'SECURITY',
      'DEPLOYMENT',
      'TEST_PLAN',
      'SPRINT_PLAN',
      'DEVELOPMENT_GUIDE'
    )),
  title text not null,
  content text not null default '',
  section_order integer not null check (section_order >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (development_spec_id, section_order)
);

create index if not exists development_spec_sections_spec_id_idx
  on public.development_spec_sections (development_spec_id);

create index if not exists development_spec_sections_order_idx
  on public.development_spec_sections (development_spec_id, section_order);

alter table public.development_specs enable row level security;
alter table public.development_spec_sections enable row level security;

create policy "development_specs_select_all"
  on public.development_specs for select using (true);

create policy "development_specs_insert_all"
  on public.development_specs for insert with check (true);

create policy "development_specs_update_all"
  on public.development_specs for update using (true);

create policy "development_specs_delete_all"
  on public.development_specs for delete using (true);

create policy "development_spec_sections_select_all"
  on public.development_spec_sections for select using (true);

create policy "development_spec_sections_insert_all"
  on public.development_spec_sections for insert with check (true);

create policy "development_spec_sections_update_all"
  on public.development_spec_sections for update using (true);

create policy "development_spec_sections_delete_all"
  on public.development_spec_sections for delete using (true);

-- Seed Development Spec for 실버 세대 매칭 서비스
insert into public.development_specs (project_id, prd_id, title, status, summary)
select
  p.id,
  pd.id,
  '실버 세대 매칭 서비스 개발 명세',
  'DRAFT',
  '고령층 AI 매칭 플랫폼 Engineering Specification'
from public.startup_projects p
join public.prd_documents pd on pd.project_id = p.id
where p.title = '실버 세대 매칭 서비스'
  and pd.title = '실버 세대 매칭 서비스 PRD'
  and not exists (
    select 1 from public.development_specs ds
    where ds.project_id = p.id
      and ds.title = '실버 세대 매칭 서비스 개발 명세'
  );

insert into public.development_spec_sections (
  development_spec_id,
  section_type,
  title,
  content,
  section_order
)
select
  ds.id,
  s.section_type,
  s.title,
  s.content,
  s.section_order
from public.development_specs ds
join public.startup_projects p on p.id = ds.project_id
cross join (
  values
    (
      'SYSTEM_OVERVIEW',
      'System Overview',
      '## System Overview

실버 세대 매칭 서비스는 Next.js + Supabase 기반 B2C 웹 플랫폼입니다.

**핵심 구성:** Web App → API Layer → Supabase (Auth, DB, Realtime)',
      1
    ),
    (
      'TECH_STACK',
      'Tech Stack',
      '## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, React, Tailwind, shadcn/ui |
| Backend | Next.js Server Actions, API Routes |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| AI | OpenAI / Anthropic API |',
      2
    ),
    (
      'DATABASE_SCHEMA',
      'Database Schema',
      '## Database Schema

- **users** — auth profile
- **profiles** — interests, region, preferences
- **matches** — user pairs, status, score
- **messages** — chat history
- **meetings** — offline event proposals',
      3
    ),
    (
      'API_SPECIFICATION',
      'API Specification',
      '## API Specification

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/matches | Create match request |
| GET | /api/matches | List user matches |
| POST | /api/messages | Send message |
| GET | /api/messages/:matchId | Get chat history |',
      4
    ),
    (
      'SPRINT_PLAN',
      'Sprint Plan',
      '## Sprint Plan

- **Sprint 1:** Auth + Profile CRUD
- **Sprint 2:** Matching algorithm + UI
- **Sprint 3:** Realtime chat
- **Sprint 4:** Meeting feature + QA',
      5
    ),
    (
      'DEVELOPMENT_GUIDE',
      'Development Guide',
      '## Cursor Development Guide

1. Run migrations in Supabase SQL Editor
2. Implement profile schema + RLS policies
3. Build matching service with repository pattern
4. Add chat via Supabase Realtime
5. Follow layered architecture: App → Service → Repository',
      6
    ),
    ('ARCHITECTURE', 'Architecture', '', 7),
    ('FRONTEND_STRUCTURE', 'Frontend Structure', '', 8),
    ('BACKEND_STRUCTURE', 'Backend Structure', '', 9),
    ('AUTH_DESIGN', 'Auth Design', '', 10),
    ('SECURITY', 'Security', '', 11),
    ('DEPLOYMENT', 'Deployment', '', 12),
    ('TEST_PLAN', 'Test Plan', '', 13)
) as s(section_type, title, content, section_order)
where p.title = '실버 세대 매칭 서비스'
  and ds.title = '실버 세대 매칭 서비스 개발 명세'
  and not exists (
    select 1 from public.development_spec_sections dss
    where dss.development_spec_id = ds.id
  );
