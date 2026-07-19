-- Sprint 4: Competitor Intelligence
-- Run after 004_evidence.sql in Supabase SQL Editor

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  name text not null,
  description text,
  website text,
  category text not null
    check (category in ('DIRECT', 'INDIRECT', 'SUBSTITUTE')),
  target_customer text,
  business_model text,
  pricing text,
  strengths text,
  weaknesses text,
  differentiation text,
  market_position text
    check (market_position is null or market_position in (
      'LEADER', 'CHALLENGER', 'FOLLOWER', 'NEWCOMER'
    )),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists competitors_project_id_idx
  on public.competitors (project_id);

create index if not exists competitors_category_idx
  on public.competitors (category);

create index if not exists competitors_market_position_idx
  on public.competitors (market_position);

alter table public.competitors enable row level security;

create policy "competitors_select_all"
  on public.competitors for select using (true);

create policy "competitors_insert_all"
  on public.competitors for insert with check (true);

create policy "competitors_update_all"
  on public.competitors for update using (true);

create policy "competitors_delete_all"
  on public.competitors for delete using (true);

-- Seed competitors for 실버 세대 매칭 서비스
insert into public.competitors (
  project_id,
  name,
  description,
  website,
  category,
  target_customer,
  business_model,
  pricing,
  strengths,
  weaknesses,
  differentiation,
  market_position
)
select
  p.id,
  v.name,
  v.description,
  v.website,
  v.category,
  v.target_customer,
  v.business_model,
  v.pricing,
  v.strengths,
  v.weaknesses,
  v.differentiation,
  v.market_position
from public.startup_projects p
cross join (
  values
    (
      '오늘의집 시니어 커뮤니티 사례'::text,
      '시니어 대상 커뮤니티 및 커머스 연계 서비스'::text,
      null::text,
      'INDIRECT'::text,
      '50~70대 사용자'::text,
      'Commerce + Community'::text,
      null::text,
      '대규모 사용자 기반'::text,
      '시니어 특화 부족'::text,
      null::text,
      'LEADER'::text
    ),
    (
      '시니어 소개 플랫폼',
      '60대 이상 대상 관계 매칭 서비스',
      null,
      'DIRECT',
      '60대 이상',
      'Subscription',
      null,
      '명확한 타겟',
      '낮은 확장성',
      null,
      'CHALLENGER'
    ),
    (
      '오프라인 모임 서비스',
      '중장년층 오프라인 모임 중개',
      null,
      'SUBSTITUTE',
      '중장년층',
      'Membership',
      null,
      '신뢰 기반 관계',
      '확장 어려움',
      null,
      'FOLLOWER'
    )
) as v(
  name,
  description,
  website,
  category,
  target_customer,
  business_model,
  pricing,
  strengths,
  weaknesses,
  differentiation,
  market_position
)
where p.title = '실버 세대 매칭 서비스'
  and not exists (
    select 1 from public.competitors c
    where c.project_id = p.id and c.name = v.name
  );
