-- Sprint 6: Government Support Intelligence
-- Run after 006_voc_entries.sql in Supabase SQL Editor

create table if not exists public.government_grants (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  name text not null,
  organization text not null,
  description text,
  category text
    check (category is null or category in (
      'STARTUP', 'TECHNOLOGY', 'AI', 'SOCIAL', 'LOCAL', 'SME', 'CONTENT', 'OTHER'
    )),
  target_stage text
    check (target_stage is null or target_stage in (
      'IDEA', 'PRE_MVP', 'MVP', 'GROWTH', 'SCALE'
    )),
  support_type text
    check (support_type is null or support_type in (
      'FUNDING', 'CONSULTING', 'EDUCATION', 'SPACE', 'MARKETING', 'RND'
    )),
  amount text,
  deadline date,
  eligibility text,
  application_url text,
  fit_score integer
    check (fit_score is null or (fit_score >= 0 and fit_score <= 100)),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'CLOSED', 'PREPARING')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists government_grants_project_id_idx
  on public.government_grants (project_id);

create index if not exists government_grants_category_idx
  on public.government_grants (category);

create index if not exists government_grants_target_stage_idx
  on public.government_grants (target_stage);

create index if not exists government_grants_support_type_idx
  on public.government_grants (support_type);

create index if not exists government_grants_status_idx
  on public.government_grants (status);

create index if not exists government_grants_deadline_idx
  on public.government_grants (deadline);

alter table public.government_grants enable row level security;

create policy "government_grants_select_all"
  on public.government_grants for select using (true);

create policy "government_grants_insert_all"
  on public.government_grants for insert with check (true);

create policy "government_grants_update_all"
  on public.government_grants for update using (true);

create policy "government_grants_delete_all"
  on public.government_grants for delete using (true);

-- Seed grants for 실버 세대 매칭 서비스
insert into public.government_grants (
  project_id,
  name,
  organization,
  description,
  category,
  target_stage,
  support_type,
  amount,
  deadline,
  eligibility,
  application_url,
  fit_score,
  status
)
select
  p.id,
  v.name,
  v.organization,
  v.description,
  v.category,
  v.target_stage,
  v.support_type,
  v.amount,
  v.deadline,
  v.eligibility,
  v.application_url,
  v.fit_score,
  v.status
from public.startup_projects p
cross join (
  values
    (
      '예비창업패키지'::text,
      '중소벤처기업부'::text,
      '창업 아이디어 검증 및 사업화를 지원'::text,
      'STARTUP'::text,
      'IDEA'::text,
      'FUNDING'::text,
      null::text,
      null::date,
      null::text,
      null::text,
      90,
      'OPEN'::text
    ),
    (
      '초격차 스타트업 1000+',
      '중소벤처기업부',
      'AI 기반 혁신 기술 스타트업 지원',
      'AI',
      'MVP',
      'RND',
      null,
      null,
      null,
      null,
      85,
      'OPEN'
    ),
    (
      '사회적경제 성장지원 사업',
      '관련 기관',
      '사회적 가치 창출 기업 지원',
      'SOCIAL',
      'PRE_MVP',
      'CONSULTING',
      null,
      null,
      null,
      null,
      75,
      'PREPARING'
    )
) as v(
  name,
  organization,
  description,
  category,
  target_stage,
  support_type,
  amount,
  deadline,
  eligibility,
  application_url,
  fit_score,
  status
)
where p.title = '실버 세대 매칭 서비스'
  and not exists (
    select 1 from public.government_grants g
    where g.project_id = p.id and g.name = v.name
  );
