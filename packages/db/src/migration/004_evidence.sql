-- Sprint 3: Evidence Database
-- Run after 003_research_plans.sql in Supabase SQL Editor

create table if not exists public.evidence (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  research_id uuid references public.research_plans(id) on delete set null,
  title text not null,
  source_type text
    check (source_type is null or source_type in (
      'REPORT', 'ARTICLE', 'NEWS', 'PAPER', 'SURVEY', 'STATISTICS', 'WEBSITE', 'OTHER'
    )),
  source_name text,
  source_url text,
  summary text not null,
  content text,
  category text not null
    check (category in (
      'MARKET', 'CUSTOMER', 'COMPETITOR', 'TREND',
      'TECHNOLOGY', 'REGULATION', 'BUSINESS'
    )),
  confidence text not null default 'MEDIUM'
    check (confidence in ('HIGH', 'MEDIUM', 'LOW')),
  published_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists evidence_project_id_idx
  on public.evidence (project_id);

create index if not exists evidence_research_id_idx
  on public.evidence (research_id);

create index if not exists evidence_category_idx
  on public.evidence (category);

create index if not exists evidence_source_type_idx
  on public.evidence (source_type);

create index if not exists evidence_confidence_idx
  on public.evidence (confidence);

alter table public.evidence enable row level security;

create policy "evidence_select_all"
  on public.evidence for select using (true);

create policy "evidence_insert_all"
  on public.evidence for insert with check (true);

create policy "evidence_update_all"
  on public.evidence for update using (true);

create policy "evidence_delete_all"
  on public.evidence for delete using (true);

-- Seed evidence for 실버 세대 매칭 서비스
insert into public.evidence (
  project_id,
  research_id,
  title,
  source_type,
  source_name,
  source_url,
  summary,
  content,
  category,
  confidence,
  published_date
)
select
  p.id,
  rp.id,
  v.title,
  v.source_type,
  v.source_name,
  v.source_url,
  v.summary,
  v.content,
  v.category,
  v.confidence,
  v.published_date
from public.startup_projects p
cross join (
  values
    (
      '국내 고령 인구 증가 추세'::text,
      '고령층 시장 규모 분석'::text,
      'STATISTICS'::text,
      '통계청'::text,
      null::text,
      '65세 이상 인구 비중 지속 증가'::text,
      null::text,
      'MARKET'::text,
      'HIGH'::text,
      null::date
    ),
    (
      '시니어 고독 문제 증가',
      '실버 세대 사용자 Pain Point 조사',
      'REPORT',
      null,
      null,
      '고령층 사회적 관계 감소 문제',
      null,
      'CUSTOMER',
      'MEDIUM',
      null
    ),
    (
      '시니어 플랫폼 시장 성장',
      null,
      'ARTICLE',
      null,
      null,
      '고령친화 서비스 시장 확대',
      null,
      'TREND',
      'MEDIUM',
      null
    )
) as v(title, research_title, source_type, source_name, source_url, summary, content, category, confidence, published_date)
left join public.research_plans rp
  on rp.project_id = p.id and rp.title = v.research_title
where p.title = '실버 세대 매칭 서비스'
  and not exists (
    select 1 from public.evidence e
    where e.project_id = p.id and e.title = v.title
  );
