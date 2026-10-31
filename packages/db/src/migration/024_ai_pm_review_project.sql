-- Bind an AI PM review to the workspace that asked for it.
-- Apply after 023_ai_pm_reviews.sql.
-- project_id is nullable and has no default, so an INSERT that still lists
-- only the 023 columns continues to succeed.
-- A hard delete of startup_projects removes that workspace's reviews.
-- Feedback then follows the existing review foreign key.
-- The app's project delete sets deleted_at and does not remove the row,
-- so those reviews stay on that project and are not shown in another workspace.
-- Rows with a null project_id stay unattached. Do not guess a project for them.

alter table public.ai_pm_reviews
  add column if not exists project_id uuid references public.startup_projects (id) on delete cascade;

create index if not exists ai_pm_reviews_project_idx
  on public.ai_pm_reviews (user_id, project_id, input_sha, version desc);
