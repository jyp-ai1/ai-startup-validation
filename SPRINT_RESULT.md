# Sprint 0 — Project Foundation Result

**Date:** 2026-07-19  
**Status:** Complete  
**Goal:** AI Startup Validation Framework 개발 기반 구축 (기능 개발 없음)

---

## 1. 작업 내용

### 프로젝트 방향 전환
- **AI SaaS Starter Kit** → **AI Startup Validation Framework**로 브랜딩 변경
- MVP: Single User / Local Workspace (Auth 없음)

### Monorepo 기반
- 기존 `apps/web`, `packages/ui`, `packages/config`, `packages/types` 활용
- 신규 placeholder 패키지: `@repo/research`, `@repo/evidence`
- 기존 `@repo/db` → database, `@repo/ai` → ai, `@repo/types`+`@repo/utils` → shared 역할

### UI Foundation
- **Theme:** Light / Dark (next-themes, 기존 ThemeProvider 재사용)
- **Layout:** Sidebar + Header + Main Content (AppShell)
- **Sidebar 메뉴 10개:** Dashboard, Startup Projects, Research, Evidence, Competitors, VOC, Government Grants, Validation Score, Reports, Settings
- **Mobile:** 햄버거 메뉴 + Dialog 네비게이션

### 공통 Component (`@repo/ui`)
| Component | Status |
|-----------|--------|
| Button | ✅ 기존 |
| Card | ✅ 기존 |
| Input | ✅ 기존 |
| Textarea | ✅ 기존 |
| Select | ✅ 신규 |
| Dialog | ✅ 기존 |
| Badge | ✅ 기존 |
| Table | ✅ 신규 |
| Loading | ✅ LoadingSpinner alias |
| EmptyState | ✅ 기존 |
| PageHeader | ✅ 기존 |

### Type 정의 (`@repo/types/validation`)
- `StartupProject`, `Research`, `Evidence`, `Competitor`, `VOC`, `Grant`, `Score`, `Report`

### Route Pages (Empty State)
| Route | Page |
|-------|------|
| `/` | → `/dashboard` redirect |
| `/dashboard` | ✅ |
| `/projects` | ✅ |
| `/research` | ✅ |
| `/evidence` | ✅ |
| `/competitors` | ✅ |
| `/voc` | ✅ |
| `/government-grants` | ✅ |
| `/validation-score` | ✅ |
| `/reports` | ✅ |
| `/settings` | ✅ |

### App Folder Structure
```
apps/web/
├── app/              # Next.js App Router pages
├── components/       # app-shell, feature-empty-page
├── features/         # Sprint 1+ placeholder
├── hooks/            # Sprint 1+ placeholder
├── lib/              # navigation config
└── types/            # re-exports from @repo/types
```

---

## 2. 변경 파일

### 신규
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/projects/page.tsx`
- `apps/web/app/research/page.tsx`
- `apps/web/app/evidence/page.tsx`
- `apps/web/app/competitors/page.tsx`
- `apps/web/app/voc/page.tsx`
- `apps/web/app/government-grants/page.tsx`
- `apps/web/app/validation-score/page.tsx`
- `apps/web/app/reports/page.tsx`
- `apps/web/app/settings/page.tsx`
- `apps/web/components/feature-empty-page.tsx`
- `apps/web/lib/navigation.ts`
- `apps/web/types/index.ts`
- `apps/web/features/index.ts`
- `apps/web/hooks/index.ts`
- `packages/types/src/validation/index.ts`
- `packages/ui/src/components/select.tsx`
- `packages/ui/src/components/table.tsx`
- `packages/research/` (placeholder package)
- `packages/evidence/` (placeholder package)
- `SPRINT_RESULT.md`

### 수정
- `packages/config/constants/index.ts` — APP_NAME, APP_DESCRIPTION
- `packages/types/src/index.ts` — validation type exports
- `packages/types/package.json` — validation export path
- `packages/ui/src/index.ts` — Select, Table, Loading exports
- `packages/ui/package.json` — @radix-ui/react-select
- `apps/web/components/app-shell.tsx` — new sidebar + mobile nav
- `apps/web/app/layout.tsx` — metadata update
- `apps/web/app/page.tsx` — redirect to /dashboard
- `apps/web/package.json` — lucide-react dependency

---

## 3. 테스트 결과

```bash
pnpm install   # ✅ Success
pnpm build     # ✅ Success (19 routes compiled)
pnpm lint      # ✅ No ESLint warnings or errors
```

**확인 가능한 화면:**
- `/dashboard` — Welcome empty state
- `/projects` — No startup projects empty state
- `/research` — No research plans empty state
- `/evidence` — No evidence empty state
- `/settings` — Workspace settings empty state

**Theme:** Header 우측 ThemeToggle로 Light/Dark 전환 가능

---

## 4. 다음 Sprint 준비사항 (Sprint 1 — Startup Project Workspace)

### 구현 예정
1. **프로젝트 생성 폼** — 아이디어, 문제 정의, 타겟 고객, 비즈니스 모델
2. **Local Storage / Zustand** — Single User 데이터 저장 (DB CRUD 없이)
3. **프로젝트 목록 + Dashboard** — `/projects` Empty State → 실제 UI
4. **프로젝트 상세 페이지** — `/projects/[id]`

### 준비된 기반
- `@repo/types/validation` — `StartupProject` 타입 정의 완료
- `@repo/ui` — Form 컴포넌트 (Input, Textarea, Select, Button) 준비
- Sidebar `/projects` 메뉴 연결 완료
- `apps/web/features/` — feature 모듈 배치 위치 확정

### Sprint 1에서 하지 않을 것
- Authentication
- Supabase CRUD
- AI API 연동

---

## Architecture Notes

| Sprint 0 Spec | Implementation |
|---------------|----------------|
| `packages/database/` | `@repo/db` (기존, Sprint 3) |
| `packages/shared/` | `@repo/types` + `@repo/utils` |
| `packages/ai/` | `@repo/ai` (기존) |
| `packages/research/` | `@repo/research` (placeholder) |
| `packages/evidence/` | `@repo/evidence` (placeholder) |
| Auth | Sprint 13 (SaaS Conversion) |
