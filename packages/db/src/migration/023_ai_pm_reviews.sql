-- AI PM first review and founder feedback.
-- Apply in the existing Supabase project after 022_analytics_events.sql.
-- Not applied yet: the configured project host has no public DNS record.
-- Do not store production founder text until this migration is applied.
-- Rollback: DROP TABLE public.ai_pm_feedback; DROP TABLE public.ai_pm_reviews;

create table if not exists public.ai_pm_reviews (
  user_id text not null,
  review_id text not null,
  input_sha text not null,
  version integer not null check (version >= 1),
  parent_review_id text,
  source_feedback_id text,
  supplement_sha text,
  status text not null check (status in ('succeeded', 'failed', 'not_run')),
  record_json jsonb not null,
  finished_at timestamptz not null,
  primary key (user_id, review_id)
);

create index if not exists ai_pm_reviews_input_idx
  on public.ai_pm_reviews (user_id, input_sha, version desc);

create index if not exists ai_pm_reviews_parent_idx
  on public.ai_pm_reviews (parent_review_id, source_feedback_id, supplement_sha);

create table if not exists public.ai_pm_feedback (
  user_id text not null,
  feedback_id text not null,
  review_id text not null,
  record_json jsonb not null,
  submitted_at timestamptz not null,
  primary key (user_id, feedback_id)
);

create index if not exists ai_pm_feedback_review_idx
  on public.ai_pm_feedback (user_id, review_id, submitted_at);

alter table public.ai_pm_reviews enable row level security;
alter table public.ai_pm_feedback enable row level security;

-- Service role bypasses RLS. No anon or authenticated policies.
