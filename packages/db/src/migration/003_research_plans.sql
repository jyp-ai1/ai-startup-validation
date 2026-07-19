-- Sprint 2: Research Master Plan
-- Run after 002_startup_projects.sql in Supabase SQL Editor

create table if not exists public.research_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  title text not null,
  description text,
  research_type text not null
    check (research_type in (
      'MARKET_SIZE', 'CUSTOMER', 'TREND', 'COMPETITOR',
      'BUSINESS_MODEL', 'TECHNOLOGY', 'REGULATION'
    )),
  status text not null default 'TODO'
    check (status in ('TODO', 'IN_PROGRESS', 'COMPLETED')),
  priority text not null default 'MEDIUM'
    check (priority in ('HIGH', 'MEDIUM', 'LOW')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists research_plans_project_id_idx
  on public.research_plans (project_id);

create index if not exists research_plans_status_idx
  on public.research_plans (status);

alter table public.research_plans enable row level security;

create policy "research_plans_select_all"
  on public.research_plans for select using (true);

create policy "research_plans_insert_all"
  on public.research_plans for insert with check (true);

create policy "research_plans_update_all"
  on public.research_plans for update using (true);

create policy "research_plans_delete_all"
  on public.research_plans for delete using (true);

-- Seed research plans for 실버 세대 매칭 서비스
insert into public.research_plans (project_id, title, description, research_type, status, priority)
select p.id, v.title, v.description, v.research_type, 'TODO', v.priority
from public.startup_projects p
cross join (
  values
    (
      '고령층 시장 규모 분석'::text,
      '국내 실버 시장 TAM/SAM/SOM 조사'::text,
      'MARKET_SIZE'::text,
      'HIGH'::text
    ),
    (
      '실버 세대 사용자 Pain Point 조사',
      '타겟 고객 인터뷰 및 VOC 수집 계획',
      'CUSTOMER',
      'HIGH'
    ),
    (
      '국내 시니어 서비스 경쟁 환경 조사',
      '직접·간접 경쟁사 벤치마킹',
      'COMPETITOR',
      'MEDIUM'
    )
) as v(title, description, research_type, priority)
where p.title = '실버 세대 매칭 서비스'
  and not exists (
    select 1 from public.research_plans rp
    where rp.project_id = p.id and rp.title = v.title
  );
