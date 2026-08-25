# ALABOM Phase 0 — CPO Review Package

**Date:** 2026-08-25  
**Role:** CTO → CPO  
**Sources:** [`ALABOM_BRAND_AUDIT.md`](./ALABOM_BRAND_AUDIT.md) · [`ALABOM_PHASE0_SCOPE_FREEZE.md`](./ALABOM_PHASE0_SCOPE_FREEZE.md) (commit ~`4843d3e`)  
**Status:** Phase 0 CPO Review 🟡 — waiting **CPO PASS**  
**Implementation:** **NOT started.** Docs only. Zero product / UI / i18n / storage / API code changes.

---

## Gates

```
Phase 0 Audit ✅ → Scope Freeze 🟡 → CPO Review 🟡 (this doc) → Phase 1 ⛔
S17          — separate product track (not ALABOM Phase 1)
CEO Walkthrough — HOLD
CartPilot    — out of this project
```

| Gate | Status |
|------|--------|
| Phase 0 Brand Audit | ✅ |
| Phase 0 Scope Freeze | 🟡 await CPO PASS |
| Phase 0 CPO Review (4 locked decisions) | 🟡 **waiting PASS** |
| Phase 1 brand implementation | ⛔ blocked until this Review PASSes |
| S17 Shared Understanding loop | Separate — not gated by ALABOM brand |
| CEO Walkthrough | HOLD |
| CartPilot | Out of this project |

---

## Locked decisions (implementers must not invent)

### 1. Hero message

| | |
|--|--|
| **Current** | Negation-style hero: KO「LaunchLens는 사업계획서를 만드는 AI가 아닙니다」/ EN「LaunchLens is not an AI that writes business plans」(Audit §3; Scope Freeze Task 4). Anchors category to plan-writer AI. |
| **Decision** | **Remove negation.** Value-centered hero only. **Primary recommendation for CPO: H1** — KO「사업하기 전에, 알아봄.」 / EN draft「Know before you build.」(Scope Freeze Task 4 options H1–H3). CPO may override with H2, H3, or an approved variant **before** Phase 1 starts. |
| **Phase 1 impact** | **Changes:** `landing.hero.title` (and related hero/i18n copy) **only after CPO confirms the final string.** **Does NOT:** redesign landing layout, add feature grids, or touch S17 Document / New User flows. |

### 2. Workspace hardcoding

| | |
|--|--|
| **Current** | Hardcoded `LaunchLens` in `workspace-shell.tsx`, `journey-layout.tsx`, `v2-workspace-home-view.tsx`, demo surfaces; shell/login via `meta.appName` (Audit §1–2; Scope Freeze freeze checklist #2, Task 1). |
| **Decision** | Introduce **BrandConfig** (or equivalent) as **single source of truth** for `displayName` / `name`, `shortName`, `tagline`, `logo`, `favicon`. Preferred hub: `apps/web/lib/brand/brand-config.ts` (or `apps/web/lib/site/brand-config.ts`) + i18n `meta.*` / `landing.nav.brand` for localized copy (Scope Freeze Task 1). |
| **Phase 1 impact** | **Changes:** Wire UI wordmarks / logo / favicon / metadata consumers to BrandConfig + i18n. Kill hardcoded LaunchLens strings in workspace/demo shell. **Does NOT:** rename storage keys, APIs, routes, DB, or `@repo/types/domain/launchlens-domain`. |

### 3. `businessPlan.generate`

| | |
|--|--|
| **Current** | User-facing i18n `businessPlan.generate` =「사업계획서 생성」; API/actions `generateBusinessPlan`; engine `business-plan-generator`; analytics `business_plan_generate` (Scope Freeze Task 2). |
| **Decision** | **KEEP** internals. User-facing label ≠ force internal rename. Routes, DB, prompt IDs, repositories, and analytics slugs stay `businessPlan` / `business-plan` / `business_plan_*`. Artifact generation remains a valid secondary output; “사업계획서” as **input document type** stays OK (Audit §3). |
| **Phase 1 impact** | **Default: no change to generate pipeline.** Do **not** rename API / engine / events. Optional display soften of empty-state / nav labels **only if CPO later asks** — not required for brand rename. |

### 4. `launchlens.*` keys

| | |
|--|--|
| **Current** | Persistence (`launchlens.*`, `ll_*`), consent (`launchlens_analytics_consent`), analytics/funnel names, domain types `launchlens-domain` (Audit §6; Scope Freeze Task 3). Blind rename breaks returning-user cache and time-series. |
| **Decision** | **Data Namespace KEEP.** Brand **display** rename OK (visible strings, logo, favicon, OG, metadata). Storage migration **not required** for Phase 1 (Scope Freeze checklist #5). |
| **Phase 1 impact** | **Zero migration** of localStorage / sessionStorage / analytics keys / domain type paths. Display brand only. |

---

## Phase 1 — expected file / area list (estimate from Audit only)

No new codebase exploration. Paths cited from Audit §2 / Scope Freeze Task 1:

| Area | Paths (estimate) |
|------|------------------|
| BrandConfig hub | `apps/web/lib/brand/brand-config.ts` or `apps/web/lib/site/brand-config.ts` (new) |
| Logo / favicon / PWA / OG | `apps/web/public/icon.svg`, `apps/web/app/layout.tsx`, `apps/web/app/manifest.ts`, `apps/web/app/opengraph-image.tsx`, `apps/web/features/landing/lib/landing-metadata.ts`, `apps/web/lib/site/page-metadata.ts` |
| Wordmark / header / workspace UI | `landing-header.tsx`, `app-shell.tsx`, `app-footer-links.tsx`, `workspace-shell.tsx`, `journey-layout.tsx`, `v2-workspace-home-view.tsx`, `login-panel.tsx`, `intelligence-hero.tsx` (+ demo start surfaces) |
| i18n brand / hero | `packages/i18n/src/messages/ko.json`, `en.json`, and other locale `meta.*` / `landing.nav.brand` / `landing.hero.*` / `landing.meta.*` |
| Hardcoded page titles | Sample project pages under `apps/web/app/[locale]/(shell)/projects/**`, `apps/web/app/demo/start/page.tsx`, version routes (Audit §2) |
| Optional cosmetic | `#why-launchlens` anchor in `landing-header.tsx` |

---

## Phase 1 — OUT of scope (explicit)

- `launchlens.*` / `ll_*` storage rename or migration
- API / route / DB rename (`business-plan`, repositories, prompt IDs)
- `businessPlan.generate` engine / prompt rewrite; analytics event rename
- Default Phase 1 change to generate pipeline (display soften only if CPO later asks)
- S17 UX rewrite (Document First, Shared Understanding loop, Thinking, Final Review)
- Flow A (Document Flow) / Flow B (New User Flow) redesign
- New features; landing redesign beyond hero/brand; Workspace IA redesign
- Production hostname / OAuth redirect / repo slug rename
- CEO Walkthrough (remains HOLD)
- CartPilot (out of this project)
- Brand apply / Production / Evidence / new tests (this Review package)

---

## Implementer lock checklist

| # | Decision | Locked for implementers |
|---|----------|-------------------------|
| 1 | Hero: drop negation; **primary rec H1**; CPO may override before Phase 1; copy/i18n only after final string | [x] |
| 2 | BrandConfig = single source of truth; Phase 1 wires display only; no storage/API rename | [x] |
| 3 | `businessPlan.generate` **KEEP** internals; Phase 1 default **no pipeline change** | [x] |
| 4 | Data namespace `launchlens.*` **KEEP**; display rename OK; Phase 1 **zero** key migration | [x] |

All four decisions above are **locked**. Implementers must not invent alternatives without a new CPO PASS.

---

## Explicit status

| Item | Status |
|------|--------|
| Phase 0 Brand Audit | ✅ |
| Phase 0 Scope Freeze | 🟡 |
| Phase 0 CPO Review (this doc) | 🟡 **waiting PASS** |
| Phase 1 | ⛔ until CPO Review PASS |
| Product / UI / i18n / storage / API code | **Zero changes** |
| **Implementation** | **NOT started** |

---

*Next Autonomous Target (record only): CPO PASS/FAIL on this Review; on PASS → Phase 1 display-brand only per locked decisions and IN/OUT above.*
