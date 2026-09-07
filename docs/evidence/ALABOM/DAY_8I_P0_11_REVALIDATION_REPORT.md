# ALABOM — DAY 8-I P0-11 Revalidation Report

> **CPO 2차 독립 검증용.** Demo ↔ 실제 계정 intake parity + Workspace lifecycle. Unit test PASS ≠ 이 문서 PASS.

## 1. Commit / Branch

| Field | Value |
|-------|-------|
| Branch | `cursor/day8i-p0-11-workspace-intake-6423` |
| Commit SHA | `03014d7` |
| PR | [#37](https://github.com/jyp-ai1/ai-startup-validation/pull/37) |
| FIX-10 baseline | `cf180e068a3554828a8f4cd3681569fe44132cf2` (main) |

## 2. P0 Acceptance Matrix

### P0-A — 신규 프로젝트 사업계획서 업로드

| Criterion | Implementation | CTO 1st |
|-----------|----------------|---------|
| 실제 계정 신규 프로젝트에서 파일 업로드 | `ProjectIntakeDocumentField` + `readSmartIntakeFile` (Demo parity) | ✅ |
| Demo와 intake UX parity | 동일 엔진·accept types (PDF/DOCX/TXT/MD) | ✅ |
| 업로드 → 초기 사업정보 연결 | `buildAuthProjectIntakeContent` → `onboardingContext.v2Demo.pastedContent` | ✅ |
| AI Understanding 진입 | `extractProjectSeedDocument` → `WorkspaceProjectCanvas seedDocument` | ✅ |
| 텍스트만 생성 가능 | `buildProjectIntakeSeed(title, description)` fallback | ✅ |
| 잘못된 파일 오류 | `fileReadError` / `fileTooShort` states | ✅ |
| 업로드 중/완료/실패 상태 | `ProjectIntakeUploadStatus`: idle/loading/ready/error | ✅ |
| 생성 후 프로젝트 귀속 | `createOwnedProject` + redirect `?project={id}` | ✅ |

**Key path**

```text
MyProjectsHome form
  → ProjectIntakeDocumentField (client readSmartIntakeFile)
  → createMyProjectAction (server)
  → buildAuthProjectIntakeContent
  → onboardingContext.v2Demo.pastedContent
  → /workspace?project={id}
  → extractProjectSeedDocument
  → WorkspaceProjectCanvas seedDocument
  → AI Understanding
```

### P0-B — Project / Workspace 관리

| Criterion | Implementation | CTO 1st |
|-----------|----------------|---------|
| 프로젝트 목록 | `listMyProjectsForPage` → `MyProjectsHome` | ✅ |
| 새 프로젝트 | create form (same page) | ✅ |
| 프로젝트 열기 | `MyProjectListItem` → `buildProjectCanvasUrl` | ✅ |
| 이름 변경 | `renameMyProjectAction` + Dialog | ✅ |
| 보관 | `archiveMyProjectAction` → status ARCHIVED | ✅ |
| 삭제 + confirmation | `deleteMyProjectAction` + softDelete + Dialog | ✅ |
| 보관함 조회/복구 | `archivedProjects` section + `unarchiveMyProjectAction` | ✅ |
| Ownership guard | `assertProjectOwner` on all lifecycle actions | ✅ |

### P0-C — 데이터 격리

| Criterion | Mechanism | CTO 1st |
|-----------|-----------|---------|
| 프로젝트별 onboardingContext | DB row per project (`startup_projects.onboarding_context`) | ✅ |
| Workspace persisted state | `v2Workspace` scoped to project row | ✅ |
| Route guard | `getOwnedProject(userId, projectId)` — foreign project → redirect `/workspace` | ✅ |
| Session key scope | `WorkspaceProjectCanvas projectId` prop drives client stores | ✅ |

## 3. Unit Tests (CTO 1st)

```text
pnpm --filter web exec vitest run lib/project/__tests__
```

| Suite | Tests | Result |
|-------|-------|--------|
| merge-intake-document | 4 | ✅ PASS |
| project-intake-seed | 3 | ✅ PASS |
| parse-intake-seed | 1 | ✅ PASS |

Build: `pnpm build` ✅ PASS

## 4. Full User Journey — Scenario Trace (CPO 2nd)

### Scenario 1 — 신규 프로젝트 + 사업계획서

| Step | Expected | Code / Test Evidence |
|------|----------|---------------------|
| 로그인 | Auth user on `/workspace` | `requireAuthUser` |
| 새 프로젝트 | Form with upload field | `MyProjectsHome` |
| 파일 업로드 | PDF/DOCX parsed client-side | `readSmartIntakeFile` |
| 프로젝트 생성 | `v2Demo.pastedContent` stored | `buildAuthProjectIntakeContent` test |
| AI Understanding | seedDocument contains title + body | `extractProjectSeedDocument` test |
| 내용 확인 | Title ≠ business one-liner | FIX-10 Scenario A baseline |

### Scenario 2 — 텍스트만으로 신규 프로젝트

| Step | Expected | Evidence |
|------|----------|----------|
| description 입력 | `buildProjectIntakeSeed` | unit test |
| 파일 없이 생성 | importSource `paste` | `buildAuthProjectIntakeContent` test |
| AI Understanding | structured seed | `extractProjectSeedDocument` |

### Scenario 3 — 프로젝트 여러 개 (격리)

| Step | Expected | Evidence |
|------|----------|----------|
| Project A 생성 | Row A with pastedContent A | separate DB rows |
| Project B 생성 | Row B with pastedContent B | separate DB rows |
| A 재진입 | seedDocument from A only | `getOwnedProject` + `extractProjectSeedDocument(owned)` |
| B 상태 오염 없음 | No cross-project context merge | per-project `onboardingContext` |

### Scenario 4 — 관리 (rename / archive / delete)

| Step | Expected | Evidence |
|------|----------|----------|
| 이름 변경 | `updateOwnedProject({ title })` | `renameMyProjectAction` |
| 보관 | status ARCHIVED, hidden from main list | `listMyProjectsForPage` filter |
| 보관함 복구 | `unarchiveMyProjectAction` | `SupabaseStartupProjectRepository.unarchive` |
| 삭제 confirmation | Dialog before softDelete | `MyProjectListItem` delete dialog |
| 삭제 후 목록 제거 | `deleted_at` set, excluded from findAll | repo `softDelete` |

### Scenario 5 — CEO 재접속

| Step | Expected | Evidence |
|------|----------|----------|
| 재로그인 | Same user projects listed | `listOwnedProjects(userId)` |
| 프로젝트 선택 | `?project={id}` loads persisted context | `parseWorkspacePersistedSnapshot` |
| Judgment/Review 복원 | v2Workspace from DB | `WorkspacePersistedHydrator` |

## 5. Out of Scope (CPO confirmed)

- V3 Core / Gap State / Judgment Engine rewrite ❌
- DAY 8-I semantics change ❌
- Project storage schema migration ❌

## 6. Gate Status

| Gate | Verdict |
|------|---------|
| P0-11 CTO 구현 | ✅ PASS |
| P0-11 CTO 1st (build + unit + code trace) | ✅ PASS |
| P0-11 CPO 2nd 독립 검증 | ⏳ PENDING (Production deploy 후) |
| Production Deploy | ⏳ PENDING |
| CEO TEST | ⏸ **HOLD** until P0-11 Production PASS |

## 7. Files Changed

| Area | Files |
|------|-------|
| Intake upload | `project-intake-document-field.tsx`, `merge-intake-document.ts`, `my-projects-home.tsx` |
| Create action | `my-project-actions.ts` |
| Lifecycle UI | `my-project-list-item.tsx` |
| Lifecycle API | `project-service.ts`, `startup-project.repository.ts` (type extension) |
| Workspace list | `workspace/page.tsx` |
| i18n | `ko.json`, `en.json` |
| Tests | `merge-intake-document.test.ts`, `vitest.config.ts` |
