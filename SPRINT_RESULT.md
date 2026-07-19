# Sprint 1 — Startup Project Workspace Result

**Date:** 2026-07-19  
**Status:** Complete  
**Goal:** 창업 아이디어를 Project 단위로 생성·관리 (입력 → 저장 → 목록 → 상세)

---

## 1. 구현 기능

| 기능 | Route | 상태 |
|------|-------|------|
| 프로젝트 목록 | `/projects` | ✅ Card 리스트 + Empty State |
| 프로젝트 생성 | `/projects/new` | ✅ Form + Validation |
| 프로젝트 상세 | `/projects/[id]` | ✅ 섹션별 표시 |
| 프로젝트 수정 | `/projects/[id]` (Edit) | ✅ 인라인 Edit 모드 |
| 프로젝트 삭제 | `/projects/[id]` | ✅ Confirm Dialog |
| Server Actions | `create/update/delete/get` | ✅ |
| DB Schema | `startup_projects` | ✅ |
| Seed 데이터 | 실버 세대 매칭 서비스 | ✅ (migration SQL) |

### StartupProject 필드

`id`, `title`, `summary`, `problem`, `solution`, `targetCustomer`, `industry`, `businessModel`, `status`, `createdAt`, `updatedAt`

### Status 값

`DRAFT` | `RESEARCHING` | `ANALYZING` | `COMPLETED` | `ARCHIVED` (초기값: `DRAFT`)

---

## 2. 변경 파일 목록

### Database (`@repo/db`)
- `packages/db/src/migration/002_startup_projects.sql` — 테이블 + RLS + seed
- `packages/db/src/repositories/startup-project.repository.ts` — Supabase adapter
- `packages/db/src/di/container.ts` — `StartupProjectRepository` DI 등록
- `packages/db/src/index.ts` — export 추가

### Types (`@repo/types`)
- `packages/types/src/validation/index.ts` — StartupProject 스키마 확장

### Feature (`apps/web/features/projects/`)
- `actions/project-actions.ts` — Server Actions
- `schemas/project-schema.ts` — Zod validation
- `services/project-service.ts` — DB access helper
- `components/project-list.tsx`
- `components/project-card.tsx`
- `components/project-form.tsx`
- `components/project-detail.tsx`
- `components/project-status-badge.tsx`
- `components/db-setup-banner.tsx`
- `index.ts`

### Pages
- `apps/web/app/projects/page.tsx`
- `apps/web/app/projects/new/page.tsx`
- `apps/web/app/projects/[id]/page.tsx`
- `apps/web/app/projects/[id]/not-found.tsx`

### Platform
- `apps/web/lib/db/platform.ts` — `getStartupProjectRepository()`

---

## 3. DB 변경사항

### Migration 실행 (Supabase SQL Editor)

`packages/db/src/migration/002_startup_projects.sql` 실행:

- `startup_projects` 테이블 생성
- RLS policies (MVP: open access)
- Seed: **실버 세대 매칭 서비스**

### Vercel Environment Variables (필수)

Supabase Dashboard → Settings → API (또는 API Keys):

| Vercel Variable | Supabase 값 |
|-----------------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key (`sb_publishable_...`) |
| `SUPABASE_URL` | Project URL (동일) |
| `SUPABASE_ANON_KEY` | Publishable key (동일) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key (`sb_secret_...`) |

현재 프로젝트 URL: `https://zeccoskqmzedbmmrpmks.supabase.co`

Migration + env 설정 후 **Redeploy** 필요.

---

## 4. 테스트 결과

```bash
pnpm build   ✅ (18 static + 3 dynamic routes)
pnpm lint    ✅ No ESLint warnings or errors
```

### 수동 테스트 체크리스트

| 항목 | 확인 |
|------|------|
| 프로젝트 생성 | `/projects/new` |
| 목록 출력 | `/projects` |
| 상세 확인 | `/projects/[id]` |
| 수정 | Detail → Edit → Save |
| 삭제 | Detail → Delete → Confirm |
| 새로고침 후 데이터 유지 | Supabase 연결 후 |

---

## 5. 다음 Sprint 제안 (Sprint 2 — Research Master Plan)

```
Project
   └── Research Plan
          ├── 시장조사
          ├── 트렌드 분석
          ├── 고객 분석
          └── 검증 항목 정의
```

- `/research` 페이지를 선택된 Project 컨텍스트와 연결
- `@repo/research` 패키지에 Research CRUD
- Project Detail에서 "Start Research" CTA

---

## Architecture Notes

- **Server Actions** → `@repo/db` repository (Supabase service role)
- **UI** → `@repo/ui` (Card, Badge, Button, Dialog, Input, Textarea)
- **Feature module** → `apps/web/features/projects/`
- **Auth 없음** — Single User MVP 유지 (Sprint 13에서 추가)
