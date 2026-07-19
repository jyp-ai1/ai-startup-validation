-- Sprint 11: AI PRD Generator
-- Run after 011_business_plans.sql in Supabase SQL Editor

create table if not exists public.prd_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  title text not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'GENERATING', 'COMPLETED')),
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prd_documents_project_id_idx
  on public.prd_documents (project_id);

create index if not exists prd_documents_created_at_idx
  on public.prd_documents (created_at desc);

create table if not exists public.prd_sections (
  id uuid primary key default gen_random_uuid(),
  prd_id uuid not null references public.prd_documents(id) on delete cascade,
  section_type text not null
    check (section_type in (
      'PRODUCT_OVERVIEW',
      'PROBLEM_DEFINITION',
      'TARGET_USER',
      'USER_PERSONA',
      'USER_FLOW',
      'FEATURE_REQUIREMENTS',
      'FUNCTIONAL_REQUIREMENTS',
      'NON_FUNCTIONAL_REQUIREMENTS',
      'MVP_SCOPE',
      'TECH_REQUIREMENTS',
      'DATABASE_DESIGN',
      'API_SPECIFICATION',
      'EDGE_CASE',
      'ROADMAP'
    )),
  title text not null,
  content text not null default '',
  section_order integer not null check (section_order >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prd_id, section_order)
);

create index if not exists prd_sections_prd_id_idx
  on public.prd_sections (prd_id);

create index if not exists prd_sections_order_idx
  on public.prd_sections (prd_id, section_order);

alter table public.prd_documents enable row level security;
alter table public.prd_sections enable row level security;

create policy "prd_documents_select_all"
  on public.prd_documents for select using (true);

create policy "prd_documents_insert_all"
  on public.prd_documents for insert with check (true);

create policy "prd_documents_update_all"
  on public.prd_documents for update using (true);

create policy "prd_documents_delete_all"
  on public.prd_documents for delete using (true);

create policy "prd_sections_select_all"
  on public.prd_sections for select using (true);

create policy "prd_sections_insert_all"
  on public.prd_sections for insert with check (true);

create policy "prd_sections_update_all"
  on public.prd_sections for update using (true);

create policy "prd_sections_delete_all"
  on public.prd_sections for delete using (true);

-- Seed PRD for 실버 세대 매칭 서비스
insert into public.prd_documents (project_id, title, status, summary)
select
  p.id,
  '실버 세대 매칭 서비스 PRD',
  'DRAFT',
  '고령층 AI 기반 매칭 플랫폼 제품 요구사항 문서'
from public.startup_projects p
where p.title = '실버 세대 매칭 서비스'
  and not exists (
    select 1 from public.prd_documents pd
    where pd.project_id = p.id
      and pd.title = '실버 세대 매칭 서비스 PRD'
  );

insert into public.prd_sections (
  prd_id,
  section_type,
  title,
  content,
  section_order
)
select
  pd.id,
  s.section_type,
  s.title,
  s.content,
  s.section_order
from public.prd_documents pd
join public.startup_projects p on p.id = pd.project_id
cross join (
  values
    (
      'PRODUCT_OVERVIEW',
      'Product Overview',
      '## Product Overview

실버 세대 매칭 서비스는 AI 기반 관심사·성향 매칭으로 고령층의 사회적 관계를 지원하는 B2C 플랫폼입니다.

**목적:** 고령층의 사회적 고립 해소 및 안전한 관계 형성 지원',
      1
    ),
    (
      'PROBLEM_DEFINITION',
      'Problem Definition',
      '## Problem Definition

- 고령층 사회적 고립 및 외로움
- 새로운 관계 형성의 어려움
- 기존 소셜 앱의 UX 장벽',
      2
    ),
    (
      'TARGET_USER',
      'Target User',
      '## Target User

- **Primary:** 65세 이상 독거/활동 제한 고령층
- **Secondary:** 고령 부모를 돌보는 성인 자녀',
      3
    ),
    (
      'MVP_SCOPE',
      'MVP Scope',
      '## MVP Scope

1. 프로필 등록 (관심사, 지역)
2. AI 매칭 추천
3. 1:1 채팅
4. 오프라인 모임 제안',
      4
    ),
    (
      'FEATURE_REQUIREMENTS',
      'Feature Requirements',
      '## Feature Requirements

| Feature | Priority | Description |
|---------|----------|-------------|
| 회원가입/프로필 | P0 | 고령층 친화 온보딩 |
| AI 매칭 | P0 | 관심사 기반 추천 |
| 채팅 | P1 | 안전한 1:1 대화 |
| 모임 | P2 | 지역 기반 오프라인 연결 |',
      5
    ),
    (
      'ROADMAP',
      'Roadmap',
      '## Roadmap

- **Phase 1 (MVP):** 매칭 + 채팅
- **Phase 2:** 커뮤니티 모임
- **Phase 3:** B2B 지역센터 연동',
      6
    ),
    ('USER_PERSONA', 'User Persona', '', 7),
    ('USER_FLOW', 'User Flow', '', 8),
    ('FUNCTIONAL_REQUIREMENTS', 'Functional Requirements', '', 9),
    ('NON_FUNCTIONAL_REQUIREMENTS', 'Non-Functional Requirements', '', 10),
    ('TECH_REQUIREMENTS', 'Technical Requirements', '', 11),
    ('DATABASE_DESIGN', 'Database Design', '', 12),
    ('API_SPECIFICATION', 'API Specification', '', 13),
    ('EDGE_CASE', 'Edge Case', '', 14)
) as s(section_type, title, content, section_order)
where p.title = '실버 세대 매칭 서비스'
  and pd.title = '실버 세대 매칭 서비스 PRD'
  and not exists (
    select 1 from public.prd_sections ps
    where ps.prd_id = pd.id
  );
