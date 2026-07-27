# Sprint 1.1 — Project Foundation QA

**Sprint:** 1.1 — Project Foundation  
**Gate:** PASS → Sprint 1.2 (Interview Engine)  
**Process:** ADR-021 — deploy → PM test → ≥9.5 or fix same sprint

---

## User Story (PASS criteria)

```text
Google 로그인
  ↓
내 프로젝트
  ↓
새 프로젝트 생성
  ↓
프로젝트 진입
  ↓
빈 Workspace
  ↓
새로고침
  ↓
로그인 유지
  ↓
프로젝트 유지
```

---

## Definition of Done

- [ ] Google OAuth 로그인 정상
- [ ] Session persistence (새로고침 후 로그인 유지)
- [ ] userId-scoped projects (다른 사용자 프로젝트 접근 불가)
- [ ] `/my-projects` — 내 프로젝트 화면
- [ ] 프로젝트 생성 / 목록 / 진입
- [ ] Protected route (비로그인 → `/auth/login`)
- [ ] Migration `021_sprint1_project_foundation.sql` applied
- [ ] `pnpm build` PASS
- [ ] Production deploy

---

## PM QA (Q0 / Q1 / Q2)

| # | Question | PASS? | Notes |
|---|----------|-------|-------|
| Q0 | 왜 로그인해야 하는가? (프로젝트 저장) | ☐ | |
| Q1 | 내 프로젝트 화면이 무엇인지 5초 이해 | ☐ | |
| Q2 | 새 프로젝트 → 진입 → 새로고침 흐름 명확 | ☐ | |

**Score:** ___ / 10 · **Friction:** ☐ 🙂 ☐ 😐 ☐ 😫

**Production URL:**  
**Commit SHA:**  
**PM sign-off:**

---

## Out of scope (must NOT appear)

Dashboard stats · AI chat · Workflow changes · Export · Payment · Team
