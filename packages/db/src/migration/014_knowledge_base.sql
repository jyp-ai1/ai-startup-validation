-- Sprint 13: AI Knowledge Base & Evidence Intelligence
-- Run after 013_development_specs.sql in Supabase SQL Editor

create table if not exists public.knowledge_documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  source_type text not null
    check (source_type in ('EVIDENCE')),
  source_id uuid not null,
  title text not null,
  content text not null default '',
  status text not null default 'PENDING'
    check (status in ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_type, source_id)
);

create index if not exists knowledge_documents_project_id_idx
  on public.knowledge_documents (project_id);

create index if not exists knowledge_documents_status_idx
  on public.knowledge_documents (status);

create index if not exists knowledge_documents_created_at_idx
  on public.knowledge_documents (created_at desc);

create table if not exists public.knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.knowledge_documents(id) on delete cascade,
  content text not null,
  chunk_index integer not null check (chunk_index >= 0),
  embedding jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists knowledge_chunks_document_id_idx
  on public.knowledge_chunks (document_id);

create index if not exists knowledge_chunks_chunk_index_idx
  on public.knowledge_chunks (document_id, chunk_index);

alter table public.knowledge_documents enable row level security;
alter table public.knowledge_chunks enable row level security;

create policy "knowledge_documents_select_all"
  on public.knowledge_documents for select using (true);

create policy "knowledge_documents_insert_all"
  on public.knowledge_documents for insert with check (true);

create policy "knowledge_documents_update_all"
  on public.knowledge_documents for update using (true);

create policy "knowledge_documents_delete_all"
  on public.knowledge_documents for delete using (true);

create policy "knowledge_chunks_select_all"
  on public.knowledge_chunks for select using (true);

create policy "knowledge_chunks_insert_all"
  on public.knowledge_chunks for insert with check (true);

create policy "knowledge_chunks_update_all"
  on public.knowledge_chunks for update using (true);

create policy "knowledge_chunks_delete_all"
  on public.knowledge_chunks for delete using (true);

-- Seed knowledge documents from evidence for 실버 세대 매칭 서비스
insert into public.knowledge_documents (
  project_id,
  source_type,
  source_id,
  title,
  content,
  status
)
select
  e.project_id,
  'EVIDENCE',
  e.id,
  e.title,
  coalesce(
    nullif(trim(e.content), ''),
    e.summary || coalesce(E'\n\n' || nullif(trim(e.source_name), ''), '')
  ),
  'COMPLETED'
from public.evidence e
join public.startup_projects p on p.id = e.project_id
where p.title = '실버 세대 매칭 서비스'
  and not exists (
    select 1 from public.knowledge_documents kd
    where kd.source_type = 'EVIDENCE' and kd.source_id = e.id
  );

insert into public.knowledge_chunks (
  document_id,
  content,
  chunk_index,
  embedding,
  metadata
)
select
  kd.id,
  s.content,
  s.chunk_index,
  '[]'::jsonb,
  jsonb_build_object(
    'evidenceId', kd.source_id,
    'documentTitle', kd.title,
    'sourceType', 'EVIDENCE'
  )
from public.knowledge_documents kd
join public.startup_projects p on p.id = kd.project_id
cross join lateral (
  values
    (
      0,
      '## 고령 인구 증가율

65세 이상 인구 비중이 지속적으로 증가하고 있습니다. 통계청 자료에 따르면 고령화 속도는 OECD 평균을 상회합니다.'
    ),
    (
      1,
      '## 시장 규모

고령친화 서비스 시장은 연평균 두 자릿수 성장세를 보이며, 디지털 헬스케어 및 커뮤니티 플랫폼 수요가 확대되고 있습니다.'
    ),
    (
      2,
      '## 향후 전망

2040년까지 실버 세대 인구는 현재 대비 40% 이상 증가할 것으로 예상되며, 사회적 연결 서비스의 TAM은 지속 확대됩니다.'
    )
) as s(chunk_index, content)
where p.title = '실버 세대 매칭 서비스'
  and kd.title = '국내 고령 인구 증가 추세'
  and not exists (
    select 1 from public.knowledge_chunks kc where kc.document_id = kd.id
  );

insert into public.knowledge_chunks (
  document_id,
  content,
  chunk_index,
  embedding,
  metadata
)
select
  kd.id,
  kd.content,
  0,
  '[]'::jsonb,
  jsonb_build_object(
    'evidenceId', kd.source_id,
    'documentTitle', kd.title,
    'sourceType', 'EVIDENCE',
    'category', 'CUSTOMER'
  )
from public.knowledge_documents kd
join public.startup_projects p on p.id = kd.project_id
where p.title = '실버 세대 매칭 서비스'
  and kd.title in ('시니어 고독 문제 증가', '시니어 플랫폼 시장 성장')
  and not exists (
    select 1 from public.knowledge_chunks kc where kc.document_id = kd.id
  );
