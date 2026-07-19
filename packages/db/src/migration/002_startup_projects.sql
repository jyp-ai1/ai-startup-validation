-- Sprint 1: Startup Project Workspace
-- Run after 001_initial_schema.sql in Supabase SQL Editor

create table if not exists public.startup_projects (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text not null,
  problem text,
  solution text,
  target_customer text,
  industry text,
  business_model text,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'RESEARCHING', 'ANALYZING', 'COMPLETED', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists startup_projects_status_idx on public.startup_projects (status);
create index if not exists startup_projects_created_at_idx on public.startup_projects (created_at desc);

alter table public.startup_projects enable row level security;

-- MVP: service role bypasses RLS; policies for authenticated users in Sprint 13
create policy "startup_projects_select_all"
  on public.startup_projects for select
  using (true);

create policy "startup_projects_insert_all"
  on public.startup_projects for insert
  with check (true);

create policy "startup_projects_update_all"
  on public.startup_projects for update
  using (true);

create policy "startup_projects_delete_all"
  on public.startup_projects for delete
  using (true);

-- Seed: 실버 세대 매칭 서비스
insert into public.startup_projects (
  title,
  summary,
  problem,
  solution,
  target_customer,
  industry,
  business_model,
  status
)
select
  '실버 세대 매칭 서비스',
  '60대 이상 사용자를 위한 관계 형성 플랫폼',
  '고령층 사회적 연결 부족',
  'AI 기반 관계 매칭',
  '60대 이상',
  'Senior Tech',
  'Subscription',
  'DRAFT'
where not exists (
  select 1 from public.startup_projects
  where title = '실버 세대 매칭 서비스'
);
