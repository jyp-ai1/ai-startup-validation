# Release Checklist — Closed Alpha

**Purpose:** Sprint 5 종료 시 이 문서 하나로 **Closed Alpha 오픈 가능 여부**를 판단합니다.

> **빌드 성공 ≠ 릴리즈 가능.**  
> **Experience Gate PASS + PM Test Ready** = 릴리즈 가능.

**Primary gate (2026-07):** `docs/sprints/RELEASE_PIPELINE.md` — Code → Production → E2E → Experience → PM → CEO

**Admin mirror:** `/admin/operations` → **Release Readiness** 패널 (실시간 이벤트 기반)

**Last updated:** Experience Gate added to release pipeline

---

## Release Checklist (mandatory before PM Test)

```text
□ Commit
□ Push
□ Production
□ SHA

□ E2E Video 1 — Start Free → Insight
□ E2E Video 2 — Demo → Login → Continue

□ CTO Self Review
□ Experience Gate PASS

□ PM Test Ready
```

Details: `docs/sprints/RELEASE_PIPELINE.md`

---

## P0 Hotfix — Demo Reliability & Workspace Separation (Epic A 전제)

| # | Check | How to verify |
|---|-------|---------------|
| P0-1 | **Demo ≠ Morning** | Demo flow — Morning Report / Morning Investigation / Daily Report 없음 |
| P0-2 | **Project isolation** | 신규 프로젝트 → 이전 PDF·Citation·Reason Chain 없음 |
| P0-3 | **activeProjectId** | Workspace 진입 시 해당 projectId만 로드 |
| P0-4 | **Investigation order** | 조사중 → Complete → 결과 → Evidence → Question → Recommendation |
| P0-5 | **Lifecycle states** | UI가 IDLE→INVESTIGATING→… 상태 기반 렌더 |
| P0-6 | **Namespaced cache** | `launchlens.*.{projectId}` — global key bleed 없음 |
| P0-7 | **QA matrix** | 신규/기존/전환/Demo 4 시나리오 PASS |

### P0 QA Checklist

- [ ] **신규 프로젝트** — 이전 PDF·Citation·Reason Chain·Morning Report 없음
- [ ] **기존 프로젝트** — Morning Report + 오늘 조사 결과 + 이전 기록 유지
- [ ] **프로젝트 A→B→A** — 데이터 정확히 분리
- [ ] **Demo** — Landing → Demo → Login, Morning Report 없음

---

## Epic A Exit Chain (모두 PASS 필요)

| # | Check | How to verify | Admin signal |
|---|-------|---------------|--------------|
| 1 | **OAuth** | 6 browsers login → workspace, F5 세션 유지 | OAuth panel ≥95% · QA Report PASS |
| 2 | **Workspace Restore** | 로그인 후 "마지막 작업" · 가격 전략 표시 | `workspace_restore_validated` status=pass |
| 3 | **Project Restore** | 브라우저 종료 → 다음날 → 동일 프로젝트 | `project_recovery_validated` status=pass |
| 4 | **Morning Report** | Workspace Inbox에 Morning Brief | `morning_report_view` > 0 |
| 5 | **Admin Analytics** | Funnel · OAuth · Replay 조회 | events persisted in Supabase |
| 6 | **Returning User** | 재방문 copy + Next Action | `returning_user` > 0 |
| 7 | **Demo Recovery** | 데모 작성 → 다음날 로그인 → 승격 | `demo_recovery_validated` status=pass |

---

## Full Release Checklist

### OAuth

- [ ] Google Login Chrome / Safari / Edge / Firefox / Android / iOS — PASS
- [ ] 새로고침 10회 — 로그아웃 없음
- [ ] Login failure UX — 원인 + 재시도 + 데모 + 문의
- [ ] Admin OAuth panel — 오늘 성공/실패/성공률/최근 오류 표시
- [ ] `022_analytics_events` migration applied

### Workspace

- [ ] 0 project → bootstrap
- [ ] 1 project → auto-enter
- [ ] 2+ projects → list
- [ ] Dead end 0 — always Next Action visible
- [ ] Workspace restore validation 이벤트 기록

### Artifact

- [ ] Artifact 생성 (Epic B — pending real pipeline)
- [ ] 생성 이력 저장

### Analytics

- [ ] 모든 funnel 이벤트 Supabase 영속화
- [ ] Admin cold start — empty dashboard 없음
- [ ] Journey Replay 동작

### Morning Report

- [ ] Morning Brief 표시 (Epic B — remove mock)
- [ ] `morning_report_view` 이벤트

### Returning User

- [ ] "어제 이후 새 경쟁사…" copy
- [ ] 마지막 작업 복원 UI
- [ ] Decision Memory 연결

### Admin

- [ ] Release Readiness panel — 7 checks
- [ ] OAuth smoke summary (오늘)
- [ ] 16-step funnel + heatmap

### Mobile

- [ ] Mobile Safari login + workspace
- [ ] Android Chrome login + workspace
- [ ] Touch targets / no horizontal scroll on workspace

### Performance

- [ ] Workspace load < 3s (prod)
- [ ] No white screen on auth redirect
- [ ] Skeleton on async routes

### Error

- [ ] Custom 404 with navigation
- [ ] Error boundaries — no stack trace to user
- [ ] OAuth errors tracked in Admin

---

## Sprint 5 Execution Order (CPO)

```
Epic A (Login + Validation)
  ↓
Release Checklist (this doc — all PASS?)
  ↓
Epic B (AI PM — real Morning Investigation)
  ↓
Epic D (Admin ops center complete)
  ↓
Closed Alpha open (30 users)
```

---

## Sign-off

| Role | PASS / HOLD | Date | Notes |
|------|-------------|------|-------|
| PM | | | |
| QA | | | |
| CPO | | | |

**HOLD if:** Any Epic A chain item FAIL · OAuth <95% · Workspace restore untested · No real user smoke test
