# ALABOM Phase 0 — Scope Freeze

**Date:** 2026-08-25  
**Role:** CTO → CPO  
**Predecessor:** [`ALABOM_BRAND_AUDIT.md`](./ALABOM_BRAND_AUDIT.md) (Phase 0 Audit ✅)  
**Status:** Scope Freeze 🟡 — awaiting **CPO PASS** before Phase 1  
**Implementation:** **NOT started.** Zero product / UI / i18n / storage / API code changes in this deliverable.

---

## Gates

```
S17 → CPO Review 준비 🟡
ALABOM Phase 0 Audit ✅ → Scope Freeze 🟡 (this doc) → Phase 1 ⛔
CEO Walkthrough ⛔ HOLD
```

---

## Freeze checklist (findings)

| # | Item | Status | Finding |
|---|------|--------|---------|
| 1 | Brand source of truth 정의 (BrandConfig proposal) | [x] | Propose typed `BrandConfig` + i18n `meta.*` as display hub; path below. Apply-able without storage rename. |
| 2 | Workspace hardcoding 조사 | [x] | Hardcoded `LaunchLens` in `workspace-shell.tsx`, `journey-layout.tsx`, `v2-workspace-home-view.tsx`, demo start; shell/login via `meta.appName`. Audit §1–2. |
| 3 | `businessPlan.generate` 영향도 → RENAME \| KEEP \| DEPRECATE | [x] | **KEEP** internals; optional Phase 1+ **display-label** soften only. See Task 2. |
| 4 | `launchlens.*` namespace 조사 | [x] | Persistence + analytics + domain types. **Brand rename OK; data namespace KEEP.** See Task 3. |
| 5 | Storage migration 필요성 | [x] | **Not required for Phase 1.** Migration = Phase 2+ only if CPO later forces key rename. |
| 6 | Hero 방향 3안 (no implement) | [x] | Value-centered positive lines; final copy CPO-approved later. See Task 4. |
| 7 | Document Flow 보존 확인 | [x] | Flow A locked — S17 Document First / Shared Understanding. ALABOM must not redesign. |
| 8 | New User Flow 보존 확인 | [x] | Flow B locked — Landing → auth/project start path. ALABOM must not redesign. |
| 9 | Phase 1 변경 범위 정의 | [x] | Display brand only (BrandConfig, strings, hero after copy pick, logo/favicon, metadata/OG, shell wordmark). |
| 10 | Phase 1에서 하지 않을 것 정의 | [x] | Storage/API/`businessPlan.generate` engine rewrite, S17 UX rewrite, new features, URL/repo rename. |

---

## Task 1 — BrandConfig proposal

### Shape

```ts
type BrandConfig = {
  name: string;       // EN display: "ALABOM"
  shortName: string;  // compact / PWA short_name; KO may use "알아봄"
  tagline: string;    // e.g. "사업, 시작하기 전에 알아봄." / "Know Before You Build"
  logo: string;       // asset path or component id for mark (replaces Sparkles + L)
  favicon: string;    // e.g. "/icon.svg"
};
```

### Suggested path

| Layer | Path | Role |
|-------|------|------|
| **Preferred hub** | `apps/web/lib/brand/brand-config.ts` (or `apps/web/lib/site/brand-config.ts`) | Single TS constant / env-aware defaults for logo/favicon paths + EN fallbacks |
| **Copy / locales** | `packages/i18n` → `meta.appName`, `meta.titleSuffix`, `meta.appTagline`, `landing.nav.brand`, `landing.meta.*` | Localized name/tagline; BrandConfig fields map 1:1 to these keys |
| **Optional shared type** | `packages/types/src/brand.ts` | Only if multiple packages need the type; not required for Phase 1 |

Do **not** put BrandConfig in `packages/core` unless multiple apps need it (today: web-only).

### What currently hardcodes (from Audit)

- UI wordmark: `workspace-shell.tsx`, `journey-layout.tsx`, `v2-workspace-home-view.tsx`, demo surfaces
- Assets: `apps/web/public/icon.svg`, `manifest.ts`, `opengraph-image.tsx`
- Titles: many `| LaunchLens` page titles; `meta.*` still LaunchLens
- Anchor: `#why-launchlens` (cosmetic id; Phase 1 optional)

### Apply-ability without renaming storage

**Yes.** BrandConfig + i18n swap only touch **display** surfaces. `launchlens.*` / `ll_*` keys, `@repo/types/domain/launchlens-domain`, analytics event slugs, and DB tables stay unchanged. Returning-user caches remain valid.

---

## Task 2 — `businessPlan.generate` impact

| 위치 | 용도 | 사용자 노출 | 변경 필요 (Phase 1) |
|------|------|-------------|---------------------|
| **UI** | i18n key `businessPlan.generate` = 「사업계획서 생성」; used by `business-plan-list.tsx` empty CTA / generate affordance | **Yes** — primary empty-state label | Optional **label soften** only if CPO wants demotion of “writer” framing; not required for brand rename |
| **API / Actions** | `generateBusinessPlan` in `business-plan-actions.ts`; routes under `/projects/.../business-plan` | Indirect (URLs, nav) | **No** rename |
| **Engine** | `packages/ai` `business-plan-generator`, prompts `BUSINESS_PLAN_PROMPT_ID`, schemas | No (internal) | **No** rewrite |
| **Storage / DB** | `BusinessPlanRepository` / sections via `@repo/db` | No | **No** migration |
| **Analytics** | `business_plan_generate` in `apps/web/lib/analytics/types.ts` | No (ops) | **KEEP** event name (continuity) |
| **Test** | Feature/generator coverage under business-plan / AI validation | No | Update only if labels change |

### Classification: **KEEP**

- CPO rule: **user-facing name ≠ force internal rename.**
- Internal module names, routes, DB, prompt IDs, and analytics slugs stay `businessPlan` / `business-plan` / `business_plan_*`.
- Product may later **demote** or re-label the feature in nav/i18n (display), but Phase 1 brand freeze does **not** require RENAME or DEPRECATE of the engine.
- **Not DEPRECATE:** artifact generation remains a valid secondary output; intake may still say “사업계획서” as **input document type** (Audit §3).

---

## Task 3 — `launchlens.*` audit summary

| Surface | Examples | Phase 1 |
|---------|----------|---------|
| **localStorage / sessionStorage** | `launchlens.aiPmLoop`, `launchlens.conversationMemory`, `launchlens.workspace.*`, `launchlens.document.*`, `launchlens.s14.analysisResult.*`, plus legacy `ll_*` | **KEEP** keys |
| **Consent / cookies** | `launchlens_analytics_consent` | **KEEP** |
| **Analytics / funnel** | Event names & docs referencing LaunchLens namespace | **KEEP** (no time-series break) |
| **Domain types** | `LaunchLensDomainContext`, `@repo/types/domain/launchlens-domain` | **KEEP** |
| **Contact / ops** | `hello@launchlens.ai`, CSV prefix `launchlens-ops-` | Out of Phase 1 (ops decision) |

### Recommendation

| Concern | Decision |
|---------|----------|
| **Brand Rename** | OK — visible strings, logo, favicon, OG, metadata |
| **Data Namespace** | **KEEP** `launchlens.*` / `ll_*` |
| **Storage migration** | **Not needed** for Phase 1 |

**Phase 1:** display brand only; keep `launchlens.*` keys.

---

## Task 4 — Hero 3 options (proposal only)

Value-centered · short · no negation · no plan-writer emphasis.  
Final copy: **CPO-approved later.** No implementation in Phase 0.

| # | Direction | One-liner (KO draft) |
|---|-----------|----------------------|
| **H1** | Know-before-build | 「사업하기 전에, 알아봄.」 |
| **H2** | Validation workspace | 「시작하기 전에, 먼저 검증합니다.」 |
| **H3** | Thinking with AI | 「아이디어를 올리기 전에, AI와 함께 알아봄.」 |

EN companions (draft, not locked): “Know before you build.” / “Validate before you launch.” / “Understand with AI before you build.”

---

## Task 5 — Strategy vs brand separation (Flow lock)

ALABOM Phase 0/1 is a **brand surface** track. Product UX remains on **S17** ([`S17_SHARED_UNDERSTANDING_LOOP.md`](./S17_SHARED_UNDERSTANDING_LOOP.md)).

| Flow | Meaning (CPO) | Lock |
|------|---------------|------|
| **Flow A — Document Flow** | Document-first: upload/paste → AI draft understanding → confirm/correct → Shared Understanding loop (S17 P0) | **Must NOT redesign** in ALABOM Phase 0/1 |
| **Flow B — New User Flow** | First-time path: Landing → start/auth → project → into workspace | **Must NOT redesign** in ALABOM Phase 0/1 |

Shell wordmark / favicon / metadata may change under Phase 1 **brand-only** rules; loop behavior, Document First primacy, Thinking stages, and new-user journey structure stay on the S17 product track.

*(Note: `E2E_VERIFICATION_GATE.md` uses “Flow A/B” for Start Free / Open Demo recordings — different naming. This freeze uses CPO’s Document / New User meanings.)*

---

## Phase 1 scope (proposal for CPO freeze)

### IN

- BrandConfig wiring (TS hub + consume from headers/shell)
- Visible brand strings (`meta.*`, `landing.nav.brand`, kill hardcoded LaunchLens wordmarks in workspace/demo shell)
- Landing hero **after** CPO picks H1/H2/H3 (or approved variant)
- Logo / favicon asset swap
- Metadata / OG / PWA manifest display names
- Header / workspace shell **brand mark + wordmark only**

### OUT

- `launchlens.*` / `ll_*` storage rename or migration
- API / route / DB rename (`business-plan`, repositories)
- `businessPlan.generate` engine / prompt rewrite
- S17 UX rewrite (Document First, loop, Thinking, Final Review)
- New features, landing redesign beyond hero/brand, Workspace IA redesign
- Production hostname / OAuth redirect / repo slug rename
- CEO Walkthrough (remains HOLD)

---

## Explicit status

| Item | Status |
|------|--------|
| Phase 0 Brand Audit | ✅ [`ALABOM_BRAND_AUDIT.md`](./ALABOM_BRAND_AUDIT.md) |
| Phase 0 Scope Freeze | 🟡 **this doc — await CPO PASS** |
| Phase 1 brand implementation | ⛔ blocked until freeze PASS |
| Product / UI / storage / API code | **Zero changes** |
| Implementation | **NOT started** |

---

*Next Autonomous Target (record only): CPO PASS/FAIL on this Scope Freeze; on PASS → Phase 1 display-brand only per IN/OUT above.*
