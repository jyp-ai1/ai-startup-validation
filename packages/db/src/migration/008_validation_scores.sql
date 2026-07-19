-- Sprint 7: Validation Score Engine
-- Run after 007_government_grants.sql in Supabase SQL Editor

create table if not exists public.validation_scores (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  market_score integer not null
    check (market_score >= 0 and market_score <= 20),
  problem_score integer not null
    check (problem_score >= 0 and problem_score <= 20),
  competition_score integer not null
    check (competition_score >= 0 and competition_score <= 15),
  business_model_score integer not null
    check (business_model_score >= 0 and business_model_score <= 15),
  execution_score integer not null
    check (execution_score >= 0 and execution_score <= 15),
  founder_fit_score integer not null
    check (founder_fit_score >= 0 and founder_fit_score <= 15),
  total_score integer not null
    check (total_score >= 0 and total_score <= 100),
  decision text not null default 'DRAFT'
    check (decision in ('DRAFT', 'GO', 'CONDITIONAL_GO', 'NO_GO')),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists validation_scores_project_id_idx
  on public.validation_scores (project_id);

create index if not exists validation_scores_created_at_idx
  on public.validation_scores (created_at desc);

alter table public.validation_scores enable row level security;

create policy "validation_scores_select_all"
  on public.validation_scores for select using (true);

create policy "validation_scores_insert_all"
  on public.validation_scores for insert with check (true);

create policy "validation_scores_update_all"
  on public.validation_scores for update using (true);

create policy "validation_scores_delete_all"
  on public.validation_scores for delete using (true);

-- Seed validation score for 실버 세대 매칭 서비스
insert into public.validation_scores (
  project_id,
  market_score,
  problem_score,
  competition_score,
  business_model_score,
  execution_score,
  founder_fit_score,
  total_score,
  decision,
  comment
)
select
  p.id,
  18,
  19,
  12,
  13,
  14,
  15,
  91,
  'GO',
  '고령층 사회적 관계 문제는 명확하며 AI 기반 매칭 서비스로 차별화 가능'
from public.startup_projects p
where p.title = '실버 세대 매칭 서비스'
  and not exists (
    select 1 from public.validation_scores vs
    where vs.project_id = p.id
  );
