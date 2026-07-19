-- Sprint 10: Business Plan Generator
-- Run after 010_ai_report_generations.sql in Supabase SQL Editor

create table if not exists public.business_plans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  title text not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'GENERATING', 'COMPLETED')),
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists business_plans_project_id_idx
  on public.business_plans (project_id);

create index if not exists business_plans_created_at_idx
  on public.business_plans (created_at desc);

create table if not exists public.business_plan_sections (
  id uuid primary key default gen_random_uuid(),
  business_plan_id uuid not null references public.business_plans(id) on delete cascade,
  section_type text not null
    check (section_type in (
      'OVERVIEW',
      'BACKGROUND',
      'PROBLEM',
      'MARKET',
      'CUSTOMER',
      'SOLUTION',
      'PRODUCT',
      'COMPETITION',
      'BUSINESS_MODEL',
      'GROWTH',
      'MARKETING',
      'OPERATION',
      'TECHNOLOGY',
      'GOVERNMENT',
      'RISK',
      'ROADMAP'
    )),
  title text not null,
  content text not null default '',
  section_order integer not null check (section_order >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_plan_id, section_order)
);

create index if not exists business_plan_sections_plan_id_idx
  on public.business_plan_sections (business_plan_id);

create index if not exists business_plan_sections_order_idx
  on public.business_plan_sections (business_plan_id, section_order);

alter table public.business_plans enable row level security;
alter table public.business_plan_sections enable row level security;

create policy "business_plans_select_all"
  on public.business_plans for select using (true);

create policy "business_plans_insert_all"
  on public.business_plans for insert with check (true);

create policy "business_plans_update_all"
  on public.business_plans for update using (true);

create policy "business_plans_delete_all"
  on public.business_plans for delete using (true);

create policy "business_plan_sections_select_all"
  on public.business_plan_sections for select using (true);

create policy "business_plan_sections_insert_all"
  on public.business_plan_sections for insert with check (true);

create policy "business_plan_sections_update_all"
  on public.business_plan_sections for update using (true);

create policy "business_plan_sections_delete_all"
  on public.business_plan_sections for delete using (true);

-- Seed business plan for 실버 세대 매칭 서비스
insert into public.business_plans (project_id, title, status, summary)
select
  p.id,
  '실버 세대 매칭 서비스 사업계획서',
  'DRAFT',
  '고령층 사회적 관계 문제를 AI 기반 매칭으로 해결하는 B2C 플랫폼 사업계획서'
from public.startup_projects p
where p.title = '실버 세대 매칭 서비스'
  and not exists (
    select 1 from public.business_plans bp
    where bp.project_id = p.id
      and bp.title = '실버 세대 매칭 서비스 사업계획서'
  );

insert into public.business_plan_sections (
  business_plan_id,
  section_type,
  title,
  content,
  section_order
)
select
  bp.id,
  s.section_type,
  s.title,
  s.content,
  s.section_order
from public.business_plans bp
join public.startup_projects p on p.id = bp.project_id
cross join (
  values
    (
      'OVERVIEW',
      '사업 개요',
      '## 사업 개요

실버 세대 매칭 서비스는 AI 기반 관심사·성향 매칭으로 고령층의 사회적 관계를 지원하는 B2C 플랫폼입니다.',
      1
    ),
    (
      'PROBLEM',
      '문제 정의',
      '## 문제 정의

고령층은 사회적 고립, 활동 제한, 디지털 격차로 인해 새로운 관계 형성에 어려움을 겪습니다.',
      2
    ),
    (
      'MARKET',
      '시장 분석',
      '## 시장 분석

- TAM: 국내 65세 이상 약 900만 명
- 실버 경제·웰니스 시장 지속 성장',
      3
    ),
    (
      'SOLUTION',
      '해결 방안',
      '## 해결 방안

AI 기반 매칭 알고리즘과 고령층 친화 UX로 안전한 오프라인·온라인 연결을 제공합니다.',
      4
    ),
    (
      'BUSINESS_MODEL',
      '비즈니스 모델',
      '## 비즈니스 모델

- 프리미엄 매칭 구독
- 지역 커뮤니티 파트너 수수료',
      5
    ),
    (
      'GOVERNMENT',
      '정부지원 활용 계획',
      '## 정부지원 활용

예비창업패키지, 초격차 스타트업 1000+ 등 AI·사회적 가치 부합 프로그램 활용',
      6
    ),
    (
      'ROADMAP',
      '향후 실행 계획',
      '## 실행 로드맵

1. MVP 개발 (3개월)
2. 파일럿 지역 운영 (6개월)
3. 전국 확장 (12개월)',
      7
    ),
    ('BACKGROUND', '창업 배경', '', 8),
    ('CUSTOMER', '고객 분석', '', 9),
    ('PRODUCT', '제품/서비스 설명', '', 10),
    ('COMPETITION', '경쟁 우위', '', 11),
    ('GROWTH', '성장 전략', '', 12),
    ('MARKETING', '마케팅 전략', '', 13),
    ('OPERATION', '운영 계획', '', 14),
    ('TECHNOLOGY', '기술 개발 계획', '', 15),
    ('RISK', '예상 리스크', '', 16)
) as s(section_type, title, content, section_order)
where p.title = '실버 세대 매칭 서비스'
  and bp.title = '실버 세대 매칭 서비스 사업계획서'
  and not exists (
    select 1 from public.business_plan_sections bps
    where bps.business_plan_id = bp.id
  );
