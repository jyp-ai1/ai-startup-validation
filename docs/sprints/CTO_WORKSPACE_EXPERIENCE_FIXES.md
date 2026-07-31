# CTO Workspace Experience Fixes

> **North star:** First 3 minutes — user feels *"AI is reading my business"*, never *"I must fill a form"*.

---

## 🔴 P0 — This sprint only (6 items)

| # | Item | Pass criteria |
|---|------|----------------|
| **P0-1** | Hero metrics `today` / `total` | **Always** `오늘 ≤ 지금까지`. Same event family; server + client clamp. |
| **P0-2** | Landing width | Hero → FAQ use `LANDING_CONTAINER` (`max-w-7xl px-6`). No per-section width drift. |
| **P0-3** | Workspace never “frozen” | At least one of: CTA / progress / “대표님 확인 필요” — never blank stall. |
| **P0-4** | Demo flow alive | Demo → read → discover → align → review (not sample → stop). |
| **P0-5** | Start Free ≠ Demo | Start Free → login → new project. Demo → `/demo/enter` → sample workspace. |
| **P0-6** | Project picker after login | `/workspace` without `?project=` → **My Projects** list, not auto-first-project. |

**Rule:** No new features until all six pass on **Production**.

---

## P0-1 — Metrics bug

**Symptom:** 오늘 54 / 지금까지 5 (impossible).

**Cause:** `today` counted broad events (workspace enter, demo enter…); `total` used narrow `funnel.reviewCompleted` only.

**Fix:** `countAllTimeReviewStarts()` + `Math.max(total, today)` in `ops-store.ts` and client guard in `landing-live-metrics.tsx`.

---

## P0-2 — Width

**Files:** `apps/web/features/landing/lib/landing-layout.ts`, all GTM section components.

```ts
LANDING_CONTAINER = 'mx-auto w-full max-w-7xl px-6'
LANDING_CONTENT   = 'mx-auto w-full max-w-3xl' // inner copy column — same everywhere
```

---

## P0-3 — Workspace stall

**Symptom:** Sidebar shows 🟡 고객 확인 중; main area empty; no button.

**Fix:** `WorkspaceNextStepPanel` — loading / 확인하기 / 고객 확인하기 / 검토 시작.  
Migrate legacy phase `accepted` → `aligning`. Force `mainView='ai-pm'` when `reviewCount === 0`.

---

## P0-4 — Demo

**Was:** Legacy `V2DemoExperience` or sample → stop.

**Now:** `demo-guided` → `ProjectWorkspaceShell` + `TASTE_COMPANY_FULL_SAMPLE` + understanding card.

**Still TODO:** Login gate after review + insight; full Review→Insight path in guest mode.

---

## P0-5 — Journeys

| CTA | Path |
|-----|------|
| Start Free | `/auth/login?next=/workspace?intent=new` → bootstrap new project |
| Open Demo | `/demo/enter` → guest workspace + sample doc |

---

## P0-6 — Project list

**Was:** Auto-redirect to first project on login.

**Now:** Only `?project=` opens canvas; else `MyProjectsHome`.

---

## Pre-test delivery checklist (mandatory before “반영했습니다”)

Before asking PM/CEO to test, CTO must provide:

1. **Commit** SHA  
2. **Push** to `origin/main`  
3. **Production deploy** complete (Vercel green)  
4. **Production URL** + `/api/build-info` SHA match  
5. **Preview URL** (if applicable)  
6. **Test scenario** (step-by-step)  
7. **Known issues** (honest list)

No test request without items 1–4.

See also: `docs/DEPLOYMENT_RULE.md`

---

## P1+ (not this sprint)

- Real PDF extraction  
- Demo login at review boundary + phase restore  
- Full Insight workshop in demo guest path  
- Score from pipeline (not placeholder 74)
