-- Sprint 5: VOC Analysis System
-- Run after 005_competitors.sql in Supabase SQL Editor

create table if not exists public.voc_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  title text not null,
  content text not null,
  source_type text
    check (source_type is null or source_type in (
      'INTERVIEW', 'SURVEY', 'COMMUNITY', 'REVIEW', 'ARTICLE', 'SOCIAL', 'OTHER'
    )),
  customer_segment text
    check (customer_segment is null or customer_segment in ('B2C', 'B2B', 'B2G')),
  pain_point text not null,
  emotion text
    check (emotion is null or emotion in ('NEGATIVE', 'NEUTRAL', 'POSITIVE')),
  frequency text
    check (frequency is null or frequency in ('LOW', 'MEDIUM', 'HIGH')),
  severity text
    check (severity is null or severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  willingness_to_pay text not null default 'UNKNOWN'
    check (willingness_to_pay in ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voc_entries_project_id_idx
  on public.voc_entries (project_id);

create index if not exists voc_entries_source_type_idx
  on public.voc_entries (source_type);

create index if not exists voc_entries_customer_segment_idx
  on public.voc_entries (customer_segment);

create index if not exists voc_entries_severity_idx
  on public.voc_entries (severity);

create index if not exists voc_entries_frequency_idx
  on public.voc_entries (frequency);

alter table public.voc_entries enable row level security;

create policy "voc_entries_select_all"
  on public.voc_entries for select using (true);

create policy "voc_entries_insert_all"
  on public.voc_entries for insert with check (true);

create policy "voc_entries_update_all"
  on public.voc_entries for update using (true);

create policy "voc_entries_delete_all"
  on public.voc_entries for delete using (true);

-- Seed VOC for 실버 세대 매칭 서비스
insert into public.voc_entries (
  project_id,
  title,
  content,
  source_type,
  customer_segment,
  pain_point,
  emotion,
  frequency,
  severity,
  willingness_to_pay
)
select
  p.id,
  v.title,
  v.content,
  v.source_type,
  v.customer_segment,
  v.pain_point,
  v.emotion,
  v.frequency,
  v.severity,
  v.willingness_to_pay
from public.startup_projects p
cross join (
  values
    (
      '새로운 사람을 만날 기회 부족'::text,
      '은퇴 후 인간관계가 줄어 새로운 모임을 찾기 어렵다.'::text,
      'INTERVIEW'::text,
      'B2C'::text,
      '사회적 관계 감소'::text,
      'NEGATIVE'::text,
      'HIGH'::text,
      'HIGH'::text,
      'MEDIUM'::text
    ),
    (
      '기존 커뮤니티 접근 어려움',
      '온라인 서비스 사용법이 어렵고 진입 장벽이 높다.',
      'SURVEY',
      null,
      '디지털 접근성 부족',
      null,
      'MEDIUM',
      'MEDIUM',
      'UNKNOWN'
    ),
    (
      '안전한 관계 형성 필요',
      '새로운 사람을 만나는 것에 대한 신뢰 문제가 있다.',
      null,
      null,
      '신뢰 부족',
      null,
      null,
      'CRITICAL',
      'HIGH'
    )
) as v(
  title,
  content,
  source_type,
  customer_segment,
  pain_point,
  emotion,
  frequency,
  severity,
  willingness_to_pay
)
where p.title = '실버 세대 매칭 서비스'
  and not exists (
    select 1 from public.voc_entries v2
    where v2.project_id = p.id and v2.title = v.title
  );
