# Sprint 5 — Closed Alpha Launch

**Status:** 📋 ACTIVE (2–3 weeks)  
**Codename:** *AI PM가 실제 대표 대신 일하는 제품*

> **UI는 최소 수정.** 로그인 / Workspace / AI PM / Admin / Analytics / 안정화만 한다.  
> **가장 큰 위험은 기능 부족이 아니라 제품 신뢰성.**

**Audience:** Cursor autonomous agent — PM absent 2–3 weeks.  
**Read first:** this file → `docs/EVENT_TAXONOMY.md` → `.cursor/rules/sprint-5-closed-alpha.mdc`

---

## CPO 7 Principles (every task must pass)

1. **Google Login = Release Blocker** — fix first, always.
2. **Workspace never leaves user wondering "what next?"** — always show Next Action.
3. **Admin = product ops center** — behavior data & drop reasons before feature lists.
4. **AI PM = coworker who works & reports daily** — not a chatbot that "answers well."
5. **No silent mock** — replace with real Evidence Pipeline; if impossible, label `[Sample]` visibly.
6. **Unmeasured = unfinished** — every new behavior emits `recordFunnelEvent()`.
5. **Exit = Release Checklist PASS** — see `docs/RELEASE_CHECKLIST.md`, not build green.

**Gate question for every PR-sized change:**

> *"30명의 실제 사용자가 오늘부터 써도 운영할 수 있는가?"*

---

## Mission

**Closed Alpha 30명**에게 오픈 가능한 수준.

### End-to-end flow (Sprint 5 exit)

```
Landing → Demo → Project → Google Login → Workspace
  → AI PM Morning Report → Daily Investigation → Artifact → 재방문
  → Admin에서 모든 행동 분석 가능
```

---

## Baseline (Sprint 4.7 / 4.8 — do NOT rebuild)

| Shipped | Location |
|---------|----------|
| OAuth session cookie on middleware response | `apps/web/lib/auth/update-session.ts` |
| V2 authenticated workspace shell | `v2-authenticated-workspace.tsx` |
| Draft promote flag | `workspace/page.tsx` → `bootstrapFirstProject(promoteDemo)` |
| 16-step funnel definition | `closed-alpha-funnel.ts` |
| Admin funnel / heatmap / replay / blind spot panels | `apps/web/features/operations/components/admin-*` |
| Analytics persistence code | `022_analytics_events.sql`, `analytics-persistence.ts` |
| Landing live metrics + testimonials | `landing-live-metrics.tsx` |
| Feedback widget | `alpha-feedback-widget.tsx` |
| Demo investigation UX (reference only) | `v2-investigation-engine.ts`, `v2-demo-experience.tsx` |

| **NOT done — Sprint 5 work** | |
|------------------------------|--|
| OAuth cross-browser QA sign-off | Epic A |
| Morning Report uses `buildSampleInvestigationContext()` mock | Epic B |
| Artifacts mock | Epic B-5 / C |
| Migration 022 applied in Supabase prod | ✅ (2026-07-28) — verify events survive restart |
| Morning cron | Epic B-1 / E |
| Impact KPI on Landing + Workspace | Epic D |
| Product stabilization pass | Epic F |

---

## Priority & schedule (3-week autonomous)

**Execution order (CPO Sprint 5 revision):**

```
Epic A (Login + Validation)
  → Release Checklist (docs/RELEASE_CHECKLIST.md)
  → Epic B (AI PM)
  → Epic D (Admin)
  → Closed Alpha open
```

| Phase | Days | Epics | Stop condition |
|-------|------|-------|----------------|
| **1 — Trust** | 1–5 | **A** (incl. P0-6~9 validation) + **E** verify | Release Readiness panel ≥5 PASS |
| **2 — Release gate** | 5–6 | **RELEASE_CHECKLIST.md** sign-off | Epic A exit chain all PASS |
| **3 — AI PM Real** | 7–12 | **B** + **C** | Morning Investigation not mock |
| **4 — Ops & Alpha** | 13–18 | **D** + **F** + **G** | Full RELEASE_CHECKLIST |
| **Buffer** | 19–21 | Fixes | CPO sign-off |

---

## Epic A additions (P0-6 ~ P0-9) — CPO mandatory

| ID | Item | Implementation |
|----|------|----------------|
| **P0-6** | OAuth Smoke Test Automation | Admin OAuth panel — 오늘 성공/실패/성공률/평균시간/최근 오류 |
| **P0-7** | Workspace Restore Validation | `workspace-restore-tracker.tsx` + 마지막 작업 UI |
| **P0-8** | Project Recovery | `project_recovery_validated` on returning visit |
| **P0-9** | Demo Recovery | Login draft banner + `demo_recovery_validated` on promote |

### Epic A true exit (not OAuth alone)

```
OAuth PASS → Workspace Restore PASS → Project Restore PASS
  → Morning Report PASS → Admin Analytics PASS → Returning User PASS
```

See `docs/RELEASE_CHECKLIST.md` + Admin **Release Readiness** panel.

---

# Epic A — Authentication & User Lifecycle (P0) ★★★★★

**Exit:** Google Login 관련 버그 **0건**

### A-1 Google OAuth — complete fix

**Browsers (all must PASS):**

- Chrome · Safari · Edge · **Firefox** · Mobile Safari · Android Chrome

**Checks:**

| # | Scenario | Pass |
|---|----------|------|
| 1 | Login → workspace or latest project | Session established |
| 2 | Logout → protected routes redirect | No stale session |
| 3 | Refresh (F5) | **Never logs out** |
| 4 | New tab / restore | Still authenticated |
| 5 | Re-login same user | Same projects, no duplicate bootstrap |
| 6 | OAuth cancel | Cancelled message, no crash |
| 7 | Invalid callback | Session error message |
| 8 | Locale `/ko/` preserved through redirect | |
| 9 | Cookies on response (intl middleware) | `update-session.ts` |

**Files:**

```
apps/web/lib/auth/update-session.ts
apps/web/lib/auth/server-auth.ts
apps/web/features/auth/components/google-sign-in-button.tsx
apps/web/app/[locale]/auth/**
docs/templates/OAUTH_QA_CHECKLIST.md  ← update + fill results
```

**Events:** `login_started`, `google_login_success`, `login_failed`

**DoD:** Checklist signed in doc; zero open P0 auth bugs.

---

### A-2 Draft → Workspace auto promotion

```
Demo draft (cookie/localStorage)
  → Google Login
  → bootstrapFirstProject(userId, promoteDemo=true)
  → Workspace / promoted project
  → Content identical — ZERO data loss
```

**Files:**

```
apps/web/app/[locale]/(shell)/workspace/page.tsx
apps/web/features/my-projects/actions/my-project-actions.ts
apps/web/features/workflow-journey/components/v2/v2-demo-experience.tsx
```

**Verify:** Funnel `demo_started` → `google_login_success` → `workspace_entered` with same `project_id`.

---

### A-3 Refresh must never logout

Regression test after every auth touch. If refresh loses session:

1. Inspect `update-session.ts` cookie attach order
2. Inspect Supabase cookie names + `sameSite` + path
3. Inspect intl middleware response cloning

**DoD:** 10 consecutive refreshes on Chrome + Safari — still logged in.

---

### A-4 Returning User continuity

Copy target (authenticated workspace welcome):

```
대표님, 어제 조사 이후 새로운 경쟁사 2개가 발견되었습니다.
이어서 검토하시겠습니까?
```

**Must restore from DB:**

- Last investigation summary
- Morning Report state
- Next Action queue
- Decision Memory

**Files:**

```
v2-authenticated-workspace.tsx
packages/db — project / investigation / decision repositories
```

**Events:** `workspace_returned`, `morning_report_view`, `next_action_clicked`

---

### A-5 Workspace Routing

| Condition | Route |
|-----------|-------|
| 1 project | Auto-enter `/my-projects/[id]` |
| N projects | Project list at `/workspace` or `/my-projects` |
| Post-login | `returnUrl` → else latest project |
| Logged-out demo | No forced login until CTA |

**Files:**

```
apps/web/app/[locale]/(shell)/workspace/page.tsx
apps/web/app/[locale]/(shell)/my-projects/[id]/page.tsx
```

**DoD:** No routing loops; no dead-end after login.

---

# Epic B — AI PM Working Experience (P0)

**Core:** Morning Report **mock 제거** — Evidence → Reason → Decision → Report 연결.

### B-1 Morning Investigation — real workflow

Daily pipeline (weekdays; timezone from profile, default **KST**):

```
08:00  Google Trends
08:02  Search Volume
08:04  Reddit
08:06  Github
08:08  Crunchbase
08:10  정부지원사업
08:12  Competitor
08:14  AI Summary → Morning Report ready
```

**Implementation path:**

1. DB table or extend project state: `investigation_runs`, `investigation_log_entries`
2. Cron: Vercel cron or `POST /api/cron/morning-investigation` (secured)
3. Runner service in `packages/` — calls `@repo/ai` adapters (no OpenAI in apps)
4. Replace `buildSampleInvestigationContext()` in `v2-authenticated-workspace.tsx`

**If real API unavailable for alpha:** run pipeline with structured stubs + **persist timestamps** — label source rows `[Live]` vs `[Sample]` in UI.

**Events:** `investigation_started`, `investigation_finished`, `morning_report_view`

---

### B-2 Investigation Log — 3× richer

Each entry MUST include: timestamp · source · query/scope · metric · delta · duration · confidence · **why investigated**

Example UI blocks:

```
08:01  Google Trends · AI Startup · 최근 3개월 · +18%
08:03  Search Volume · "AI PM" · 4,800 → 5,670
08:05  Reddit · 412 posts analyzed
08:07  Crunchbase · Funding 3건
08:09  Competitor · Cursor · Pricing 변경
08:11  정부지원 · TIPS · 신규 공고
```

**Reuse:** Sprint 4.6 demo log components — wire to persisted entries.

**User feeling:** *"진짜 조사했네"*

---

### B-3 AI PM Report — replace empty praise

**Delete** generic `"좋습니다"` openings.

**Required structure:**

```
오늘 조사 결과입니다.

총 조사시간     12분
확인한 데이터   134건
신규 경쟁사     2개
시장 변화       1건

대표 확인 필요
  · 가격 전략
```

**Files:** `v2-morning-investigation-brief.tsx`, authenticated inbox section

---

### B-4 Founder Decision → Memory → Next Morning

Flow:

```
Founder selects decision
  → meeting note / decision record saved
  → Decision Memory (project-scoped)
  → next Morning Report references prior decisions
```

**Reuse:** Sprint 1.6 Decision Memory + `decision_changed` events.

**Events:** `decision_changed`, `price_changed`, `target_changed`, `usp_changed`, `market_changed`, `bm_changed`

---

### B-5 Artifact — real generation (mock removed)

Generate & persist with history:

- Lean Canvas
- Business Model (BM)
- Interview guide
- ICP
- Pricing doc
- SWOT

**Architecture:** Service → Repository → `@repo/db` — **no SDK in apps**.

**Events:** `artifact_generated` (+ `artifact_type` in payload)

---

# Epic C — Workspace (P0)

**Goal:** 대표 업무공간 — not demo shell.

### C-1 Overview panel

```
오늘 조사      8건
새 Evidence   27건
결정 변경      3건
Artifact      2개
```

Plus: AI PM status · Morning Report link · Next Action · last accessed.

### C-2 History timeline

```
7월 → 8월 → 오늘
```

Unified: investigations · decisions · meetings · artifacts (chronological).

### C-3 Artifact Center

Single place to view / regenerate / download all project artifacts.

### C-4 Project Health

```
★★★★★  82%
```

Computed from: document completeness · blind spots resolved · decisions recorded · investigation cadence.

**Files:**

```
v2-authenticated-workspace.tsx
apps/web/features/my-projects/components/* (new overview/history/artifact panels)
```

---

# Epic D — Admin Dashboard (P0)

**Goal:** 운영은 숫자로 — **제품 운영센터**

Real-time (hydrate from Supabase, not cold empty store).

| Panel | Requirement | Status |
|-------|-------------|--------|
| **Funnel** | 16 steps + conversion % | 🔄 extend charts |
| **Heatmap** | Landing→Demo→Project→Login→Workspace→Artifact→Return | 🔄 |
| **Retention** | D1 · D3 · D7 · D14 | 🔄 |
| **User Journey** | Session replay timeline | ✅ base |
| **Drop Top 10** | Step + count + % | ⬜ |
| **Question** | Where users stall most | 🔄 |
| **Blind Spot** | Price · USP · Market · BM · Target breakdown | 🔄 |
| **AI PM KPI** | Today investigations · new competitors · strategy changes · founder decisions · artifacts | 🔄 |
| **Product KPI** | New users · projects · first review · artifacts · returns | 🔄 |
| **Impact KPI** | Strategy changes · competitors found · evidence · hours saved — **also on Landing** | ⬜ |
| **Feedback** | 👍/👎 · bug · suggestion · NPS admin | 🔄 |
| **User Detail** | Last visit · progress · drop step · admin memo | ⬜ |

**Impact KPI copy (ko):**

```
AI PM이 127번 대표의 전략을 바꾸었습니다.
경쟁사 412건 발견 · 새 Evidence 2,381건 · 대표 조사시간 683시간 절약
```

**Files:**

```
apps/web/features/operations/components/operations-dashboard.tsx
admin-*-panel.tsx
apps/web/app/api/analytics/**
apps/web/features/landing/components/landing-live-metrics.tsx
```

---

# Epic E — Analytics (P0)

| Task | Action |
|------|--------|
| Supabase connect | ✅ Migration `022_analytics_events.sql` applied (2026-07-28) |
| `analytics_events` | Verify all `recordFunnelEvent()` writes persist (smoke test) |
| Daily summary cron | Aggregate → `analytics_daily_summary` |
| Session replay | `session_id` on all client events |
| Event taxonomy | 100% — see `docs/EVENT_TAXONOMY.md` |
| Cold start | `ensureAnalyticsHydrated()` — admin never shows zeros after deploy |

**Verify:** Record event → redeploy/restart → event still in admin.

---

# Epic F — Product Stabilization (P0)

| Area | Target |
|------|--------|
| Skeleton loading | All workspace + admin async routes |
| Errors | User-facing error boundaries; no white stack traces |
| Empty states | Every list has EmptyState + CTA |
| Dead ends | Zero — always "다음 단계" |
| 404 | Custom not-found with navigation home |
| Memory sync | Decision Memory matches DB after refresh |
| Workspace perf | No blocking render >3s on project load |

**DoD:** Manual walkthrough of full exit flow — no blank screens.

---

# Epic G — AI PM Intelligence (P1 — last)

Do **after** B/C/D stable.

### G-1 Smart questions — max 2, choice-first

Analyze Document × Evidence × Blind Spot → ask **only gaps**.

Examples:

- Pricing missing → model buttons (Free / Subscription / Usage / Enterprise) → price tier → optional text
- Service users unclear → select segment → optional detail
- USP weak → select from suggestions → optional refine

**Never** re-ask filled sections.

**Events:** `blind_spot_detected`, `clarity_question_raised`, `clarity_question_answered`, `clarity_question_skipped`

---

# QA — Sprint 5 exit (all PASS)

| # | Check | Pass criteria |
|---|-------|---------------|
| 1 | Google Login | 100% — 6 browsers |
| 2 | Workspace dead ends | 0 |
| 3 | Morning Report | Auto on schedule / on return |
| 4 | Artifact | Real generation + history |
| 5 | Admin events | All events queryable |
| 6 | Analytics persistence | Survives restart |
| 7 | Heatmap | Renders with real data |
| 8 | Retention | D1/D3/D7/D14 computes |
| 9 | User Replay | Session timeline works |

Run: `pnpm lint && pnpm build` before marking sprint complete.

---

# Deliverables checklist

- [ ] Google OAuth Release Ready
- [ ] Workspace Production Ready
- [ ] AI PM Morning Investigation (Real Pipeline)
- [ ] Artifact Center
- [ ] Admin Dashboard v1 (all panels above)
- [ ] Analytics Persistence (Supabase)
- [ ] Heatmap · Funnel 16 · User Journey Replay
- [ ] Product KPI · AI PM KPI · Impact KPI
- [ ] Closed Alpha Ready (30 users)

---

# Implementation map

| Epic | Primary files |
|------|---------------|
| A | `lib/auth/*`, `workspace/page.tsx`, `my-project-actions.ts`, `google-sign-in-button.tsx` |
| B | `v2-authenticated-workspace.tsx`, `v2-investigation-engine.ts`, `v2-morning-investigation-brief.tsx`, `@repo/ai` |
| C | `my-projects/components/*`, decision memory modules |
| D | `operations-dashboard.tsx`, `admin-*`, `landing-live-metrics.tsx` |
| E | `analytics-persistence.ts`, `ops-store.ts`, `022_analytics_events.sql`, `analytics-event.repository.ts` |
| F | loading.tsx, error.tsx, not-found.tsx under workspace routes |
| G | smart question components in workflow-journey |

---

# Out of scope

- Landing redesign · new marketing pages
- Billing · team seats · RBAC beyond `ADMIN_EMAIL`
- Sprint 1.2 interview revival
- Full live web scraping (browser platform) — structured pipeline OK for alpha
- Features without analytics events

---

# Agent daily loop (when PM absent)

1. Read this file's **Phase** table — stay in current phase until stop condition met.
2. Pick highest-priority unchecked item in current Epic.
3. Implement → emit events → update checklist in this file (optional `[x]`).
4. Run `pnpm lint && pnpm build`.
5. Never start Epic G before Epic A + E pass.
6. **Do not git commit** unless user explicitly asks.

---

# Doc updates on sprint complete

- [ ] `docs/TASKS.md` — mark Sprint 5 ✅
- [ ] `docs/RELEASES.md` + `CHANGELOG.md`
- [ ] `docs/EVENT_TAXONOMY.md` — final event list
- [ ] Remove or disable `.cursor/rules/sprint-5-closed-alpha.mdc`
