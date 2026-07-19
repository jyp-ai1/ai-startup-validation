-- Sprint 8: Validation Report Framework
-- Run after 008_validation_scores.sql in Supabase SQL Editor

create table if not exists public.validation_reports (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.startup_projects(id) on delete cascade,
  title text not null,
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'IN_PROGRESS', 'COMPLETED')),
  summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists validation_reports_project_id_idx
  on public.validation_reports (project_id);

create index if not exists validation_reports_created_at_idx
  on public.validation_reports (created_at desc);

create table if not exists public.report_sections (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.validation_reports(id) on delete cascade,
  section_type text not null
    check (section_type in (
      'EXECUTIVE_SUMMARY',
      'PROBLEM',
      'MARKET_ANALYSIS',
      'CUSTOMER_ANALYSIS',
      'COMPETITOR_ANALYSIS',
      'BUSINESS_MODEL',
      'GOVERNMENT_SUPPORT',
      'VALIDATION_RESULT',
      'RISK',
      'NEXT_ACTION'
    )),
  title text not null,
  content text not null default '',
  section_order integer not null check (section_order >= 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, section_order)
);

create index if not exists report_sections_report_id_idx
  on public.report_sections (report_id);

create index if not exists report_sections_order_idx
  on public.report_sections (report_id, section_order);

alter table public.validation_reports enable row level security;
alter table public.report_sections enable row level security;

create policy "validation_reports_select_all"
  on public.validation_reports for select using (true);

create policy "validation_reports_insert_all"
  on public.validation_reports for insert with check (true);

create policy "validation_reports_update_all"
  on public.validation_reports for update using (true);

create policy "validation_reports_delete_all"
  on public.validation_reports for delete using (true);

create policy "report_sections_select_all"
  on public.report_sections for select using (true);

create policy "report_sections_insert_all"
  on public.report_sections for insert with check (true);

create policy "report_sections_update_all"
  on public.report_sections for update using (true);

create policy "report_sections_delete_all"
  on public.report_sections for delete using (true);

-- Seed report for 실버 세대 매칭 서비스
insert into public.validation_reports (project_id, title, status, summary)
select
  p.id,
  '실버 세대 매칭 서비스 사업 검증 보고서',
  'IN_PROGRESS',
  '고령층 사회적 관계 문제를 AI 기반 매칭으로 해결하는 사업 아이디어 검증 보고서'
from public.startup_projects p
where p.title = '실버 세대 매칭 서비스'
  and not exists (
    select 1 from public.validation_reports vr
    where vr.project_id = p.id
      and vr.title = '실버 세대 매칭 서비스 사업 검증 보고서'
  );

insert into public.report_sections (
  report_id,
  section_type,
  title,
  content,
  section_order
)
select
  vr.id,
  s.section_type,
  s.title,
  s.content,
  s.section_order
from public.validation_reports vr
join public.startup_projects p on p.id = vr.project_id
cross join (
  values
    (
      'EXECUTIVE_SUMMARY',
      'Executive Summary',
      '## 개요

실버 세대 매칭 서비스는 고령층의 사회적 고립 문제를 AI 기반 매칭으로 해결하는 B2C 플랫폼입니다.

- **검증 점수:** 91점 (GO)
- **핵심 가치:** 고령층의 사회적 관계 형성 지원
- **차별점:** AI 기반 관심사·성향 매칭',
      1
    ),
    (
      'PROBLEM',
      'Problem Definition',
      '## 문제 정의

고령층은 다음과 같은 사회적 관계 문제를 겪고 있습니다.

- **고립감:** 배우자·친구 상실 후 사회적 연결 감소
- **활동 제한:** 이동·건강 문제로 새로운 관계 형성 어려움
- **디지털 격차:** 기존 소셜 앱 사용 장벽',
      2
    ),
    (
      'MARKET_ANALYSIS',
      'Market Analysis',
      '## 시장 분석

- **TAM:** 국내 65세 이상 인구 약 900만 명
- **성장성:** 초고령 사회 진입으로 시장 지속 확대
- **트렌드:** 실버 경제·웰니스·커뮤니티 수요 증가',
      3
    ),
    (
      'CUSTOMER_ANALYSIS',
      'Customer Analysis',
      '## 고객 분석 (VOC)

고객 인터뷰 및 커뮤니티 VOC에서 반복적으로 확인된 Pain Point:

- "혼자 있는 시간이 길어 외로움을 느낀다"
- "같은 관심사를 가진 사람을 만나기 어렵다"
- "앱 사용법이 복잡해서 포기했다"',
      4
    ),
    (
      'COMPETITOR_ANALYSIS',
      'Competitor Analysis',
      '## 경쟁 분석

| 구분 | 강점 | 약점 |
|------|------|------|
| 일반 소셜 앱 | 사용자 기반 | 고령층 UX 미흡 |
| 시니어 커뮤니티 | 타겟 명확 | AI 매칭 부재 |
| 케어 서비스 | 신뢰도 | 사회적 매칭 초점 아님 |

**차별화:** AI 기반 관심사 매칭 + 고령층 친화 UX',
      5
    ),
    (
      'BUSINESS_MODEL',
      'Business Model',
      '',
      6
    ),
    (
      'GOVERNMENT_SUPPORT',
      'Government Support',
      '',
      7
    ),
    (
      'VALIDATION_RESULT',
      'Validation Result',
      '## 검증 결과

| 항목 | 점수 |
|------|------|
| Market | 18/20 |
| Problem | 19/20 |
| Competition | 12/15 |
| Business Model | 13/15 |
| Execution | 14/15 |
| Founder Fit | 15/15 |

**총점: 91점 — GO**

고령층 사회적 관계 문제는 명확하며, AI 기반 매칭으로 차별화 가능합니다.',
      8
    ),
    (
      'RISK',
      'Risk',
      '',
      9
    ),
    (
      'NEXT_ACTION',
      'Next Action',
      '',
      10
    )
) as s(section_type, title, content, section_order)
where p.title = '실버 세대 매칭 서비스'
  and vr.title = '실버 세대 매칭 서비스 사업 검증 보고서'
  and not exists (
    select 1 from public.report_sections rs
    where rs.report_id = vr.id
  );
