# Sprint 1 — Foundation (LaunchLens V2 Pivot)

**Status:** 📋 ACTIVE  
**Date:** 2026-07-27  
**Authority:** ADR-022 · [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md) v2.1  
**Supersedes for product priority:** Sprint 0-4 V2 UX QA (paused at STEP 3 — resume after foundation)

---

## Pivot declaration

LaunchLens is **not** ChatGPT-style session AI.

```text
생각 → 결정 → 기억 → 다음날 → 계속
```

**Memory requires login.** Sprint 1 ships foundation before AI polish, payment, teams, or export.

---

## New architecture

```text
User
  ↓
Google Login (Supabase Auth — Google only)
  ↓
Workspace — "내 프로젝트"
  ↓
Project (one project = one strategic thought)
  ↓
Thinking · Decision · Memory · Journey
```

**Project model:**

```text
Workspace
└── Project
     ├── Context      → 프로젝트 이해
     ├── Decision     → 오늘의 결정
     ├── Memory
     └── Journey      → 전략 여정
```

---

## Sprint 1 scope (CPO)

### Epic 1 — Foundation ★★★★★

| Item | Status |
|------|--------|
| Google Login | ⬜ harden (AuthPort + QA) |
| Workspace — "내 프로젝트" | ⬜ |
| Project CRUD (auth-scoped) | ⬜ partial exists |
| Interview (전략 인터뷰) | ⬜ connect to project |
| Decision (오늘의 결정) | ⬜ stub |

### Epic 2 — Memory (after Epic 1 PASS)

Context Memory · Journey · Decision Log

### Epic 3 — Later (NOT Sprint 1)

Artifact · Export · AI Engine · Payment · Teams

---

## Login

**Google only.** No Apple, GitHub, Microsoft.

```text
Google 계속하기
```

Existing UI: `apps/web/features/auth/components/login-panel.tsx`  
Harden: AuthPort OAuth · protected routes · OAUTH_QA_CHECKLIST

---

## Post-login home ("내 프로젝트")

```text
안녕하세요.
오늘도 전략을 이어가볼까요?

────────────
새 프로젝트 +
────────────
최근 프로젝트
AI SaaS · 2일 전
정부지원 · 오늘
```

Notion-like list. **Never "Dashboard".**

---

## Language (MVP)

| Rule | Value |
|------|-------|
| UI language | **한국어만** |
| Language switch | **없음** |
| i18n in code | **유지** — `t('workspace.startInterview')` |
| Translation files | **`ko.json` only maintained** — `en.json` freeze, no new EN copy |
| Default locale | `ko` |

---

## Korean terminology (mandatory)

| ❌ Never | ✅ Use |
|----------|--------|
| Dashboard | 내 프로젝트 |
| Workspace (EN label) | 내 프로젝트 |
| Workflow | 전략 여정 |
| Decision | 오늘의 결정 |
| Context | 프로젝트 이해 |
| Interview | 전략 인터뷰 |
| Thinking | 생각 정리 |
| Artifact | (Epic 3 — later) |

Code keys may stay English; **user-visible strings = Korean.**

---

## Product principle (Constitution v2.1)

> **LaunchLens는 세션(Session) 기반 AI가 아니라 프로젝트(Project) 기반 AI다.**

ChatGPT = conversation center. LaunchLens = **project center** — users evolve strategy projects, not save chats.

---

## Sprint 1.1 implementation order (CTO)

One item → build → commit → push → deploy → PM PASS (≥9.5) → next.

| # | Deliverable | Notes |
|---|-------------|-------|
| 1 | **Google Login** | AuthPort OAuth · callback · QA checklist |
| 2 | **Project structure** | `startup_projects` + userId · service layer |
| 3 | **Project list / create / enter** | "내 프로젝트" home |
| 4 | **전략 인터뷰 ↔ Project** | Interview opens inside project |
| 5 | **한국어 UI 통일** | Terminology table above |
| 6 | **i18n structure only** | ko default · no EN translation work |

---

## Technical baseline (already in repo)

| Area | Path | Gap |
|------|------|-----|
| Google OAuth UI | `features/auth/components/google-sign-in-button.tsx` | Bypasses AuthPort |
| Callback | `app/auth/callback/route.ts` | OK |
| Projects table | `migration/002` + `016_user_workspace` | RLS bypass via service role |
| Project CRUD | `project-actions.ts` | No auth on all mutations |
| Project service | `project-service.ts` | Read-only |
| Middleware | `middleware.ts` | No session gate |

**Do not rebuild:** login UI, base schema. **Harden:** port → service → auth scope → "내 프로젝트" shell.

---

## Paused work

- Sprint 0-4 V2 UX QA: STEP 1–2 ✅ · STEP 3 deployed · STEP 4–7 **frozen**
- Legacy removal (0-5): gated on full product validation — **after** Sprint 1 foundation
- V2 localStorage journey: **replace** with authenticated project persistence

---

## Related

- [ADR-022](../DECISIONS.md) · [TASKS.md](../TASKS.md) · [OAUTH_QA_CHECKLIST](../templates/OAUTH_QA_CHECKLIST.md)
- [QA_REPORT_V2.md](../QA_REPORT_V2.md) — V2 flow QA paused
