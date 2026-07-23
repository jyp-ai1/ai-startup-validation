-- Sprint L2: User-owned projects + demo workspace
-- Run after 015_project_type.sql in Supabase SQL Editor

alter table public.startup_projects
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists country text,
  add column if not exists project_goal text
    check (project_goal is null or project_goal in (
      'MARKET_VALIDATION',
      'BUSINESS_STRATEGY',
      'GOVERNMENT_GRANT',
      'FUNDRAISING',
      'NEW_BUSINESS',
      'AI_BUILD'
    )),
  add column if not exists is_demo boolean not null default false;

create index if not exists startup_projects_user_id_idx
  on public.startup_projects (user_id);

create index if not exists startup_projects_is_demo_idx
  on public.startup_projects (is_demo)
  where is_demo = true;

-- Mark seed project as demo workspace
update public.startup_projects
set is_demo = true
where title = '실버 세대 매칭 서비스'
  and is_demo = false;

-- RLS: users see own projects + demo projects
drop policy if exists "startup_projects_select_all" on public.startup_projects;

create policy "startup_projects_select_own_or_demo"
  on public.startup_projects for select
  using (
    is_demo = true
    or user_id is null
    or user_id = auth.uid()
  );

drop policy if exists "startup_projects_insert_all" on public.startup_projects;

create policy "startup_projects_insert_authenticated"
  on public.startup_projects for insert
  with check (
    auth.uid() is not null
    and (user_id is null or user_id = auth.uid())
    and is_demo = false
  );

drop policy if exists "startup_projects_update_all" on public.startup_projects;

create policy "startup_projects_update_own"
  on public.startup_projects for update
  using (
    is_demo = false
    and user_id = auth.uid()
  );

drop policy if exists "startup_projects_delete_all" on public.startup_projects;

create policy "startup_projects_delete_own"
  on public.startup_projects for delete
  using (
    is_demo = false
    and user_id = auth.uid()
  );
