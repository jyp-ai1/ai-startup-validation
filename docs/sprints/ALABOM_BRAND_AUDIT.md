# ALABOM Brand Audit — Phase 0

**Date:** 2026-08-25  
**Role:** CTO → CPO  
**Scope:** Brand surface inventory only  
**Product strategy (framing only):** Future brand **ALABOM / 알아봄** — “사업, 시작하기 전에 알아봄.” / Know Before You Build. Product = AI Thinking/Validation Workspace, not business-plan writer.

---

## Implementation: NOT started

- No ALABOM branding, logo, landing, or copy changes applied.
- Phase 1–5 not started.
- Workspace UX / S17 loop not refactored.
- This document is audit + recommendation only.

---

## 1. CPO Brand Table (current → proposed)

| 영역 | 현재 | 변경 (제안) |
|------|------|-------------|
| Logo | No dedicated logo asset. UI uses Lucide `Sparkles` in a primary rounded square (`landing-header`, `workspace-shell`, `app-shell`, login). Favicon SVG is a gold “L” mark on dark rounded rect. | ALABOM mark (replace Sparkles + `/icon.svg`) |
| Wordmark | **LaunchLens** — i18n `meta.appName` / `landing.nav.brand`; also hardcoded in Workspace header & journey layout | ALABOM / 알아봄 |
| Favicon | `apps/web/public/icon.svg` (gold L + accent circle); wired in root metadata + PWA manifest | ALABOM mark |
| Browser title | Default/template from `meta.appName` / `meta.titleSuffix` = LaunchLens; many pages hardcode `\| LaunchLens`; Demo sets `Demo Workspace \| LaunchLens` | ALABOM |
| Landing | Hero negation: “LaunchLens는 사업계획서를 만드는 AI가 아닙니다”; meta title “CEO를 위한 AI PM Company”; nav brand LaunchLens | 사업 검증/알아봄 (positive Know Before You Build) |
| Header | Landing: `landing.nav.brand` = LaunchLens + Sparkles; App shell: `meta.appName` | ALABOM |
| Workspace | Hardcoded **LaunchLens** in `workspace-shell.tsx` + `journey-layout.tsx` + `v2-workspace-home-view.tsx`; DEMO badge uppercase | ALABOM |
| Demo | CTAs “Open Demo” / “Demo Workspace”; document.title Demo Workspace \| LaunchLens | 알아보기 / Demo |
| Login | Uses `meta.appName` + auth tagline “AI Strategy Consultant”; minimal brand surface | 최소 변경 (appName만) |
| Metadata | `meta.*` + `landing.meta.*` + hardcoded page titles; PWA `manifest.ts` name/short_name LaunchLens | ALABOM |
| OG | `apps/web/app/opengraph-image.tsx` hardcodes LaunchLens + “AI Strategy Consultant” + “Research · Validation · Executive Reports”; root layout OG from `meta.appName` | ALABOM |

---

## 2. File inventory

### Logo / favicon / PWA / OG

| Path | Role |
|------|------|
| `apps/web/public/icon.svg` | Favicon / Apple / PWA icon (L mark) |
| `apps/web/app/layout.tsx` | Root metadata: title, description, OG, Twitter, `icons: /icon.svg` |
| `apps/web/app/manifest.ts` | PWA name/short_name/description hardcoded **LaunchLens** |
| `apps/web/app/opengraph-image.tsx` | OG image generator — hardcoded LaunchLens copy |
| `apps/web/features/landing/lib/landing-metadata.ts` | Landing SEO/OG from `landing.meta` |
| `apps/web/lib/site/page-metadata.ts` | Shared page metadata helper |

### Wordmark / header / workspace (UI)

| Path | Role |
|------|------|
| `apps/web/features/landing/components/landing-header.tsx` | Landing wordmark via `landing.nav.brand` + Sparkles |
| `apps/web/components/app-shell.tsx` | Shell sidebar brand via `meta.appName` / `meta.appTagline` |
| `apps/web/components/app-footer-links.tsx` | Footer © appName |
| `apps/web/features/workflow-journey/components/project-workspace-shell/workspace-shell.tsx` | **Hardcoded** `LaunchLens` + DEMO badge + `document.title` |
| `apps/web/features/workflow-journey/components/journey-layout.tsx` | **Hardcoded** `LaunchLens` |
| `apps/web/features/workflow-journey/components/v2/v2-workspace-home-view.tsx` | **Hardcoded** `<h1>LaunchLens</h1>` |
| `apps/web/features/auth/components/login-panel.tsx` | Login brand via `meta.appName` |
| `apps/web/components/landing/launch-lens-landing.tsx` | Legacy landing component name + `meta.appName` |
| `apps/web/components/intelligence/intelligence-hero.tsx` | `meta.appName` · tagline |

### Landing hero / i18n brand strings (central)

| Path | Role |
|------|------|
| `packages/i18n/src/messages/ko.json` | Canonical KO: `meta.*`, `landing.nav.brand`, `landing.hero.*`, `landing.meta.*`, auth, FAQ, footer |
| `packages/i18n/src/messages/en.json` | Canonical EN (same keys) |
| `packages/i18n/src/messages/{ja,zh-CN,zh-TW,de,es,fr,id,pt,vi}.json` | Locale copies — most still LaunchLens / EN fallbacks for brand |

### Hardcoded page titles (sample; not exhaustive)

Many `apps/web/app/[locale]/(shell)/projects/**/page.tsx` titles append `| LaunchLens` instead of `meta.titleSuffix`. Also: `apps/web/app/demo/start/page.tsx`, `apps/web/app/version/route.ts`, `apps/web/app/api/version/route.ts`.

### Domain / package identifiers (not user-facing, rename-sensitive)

| Path | Role |
|------|------|
| `packages/types/src/domain/launchlens-domain.ts` | Export path `@repo/types/domain/launchlens-domain` |
| Widespread `launchlens.*` localStorage / event keys | Persistence & analytics (see Risk) |

### Production URL (not brand string, but public identity)

- Prod: `https://ai-startup-validation-tau.vercel.app`
- Repo slug historically: `ai-startup-validation` (`apps/web/lib/site/beta-config.ts`)

---

## 3. Copies that say or imply “사업계획서를 만드는 AI” / business-plan writer

### Positioning (landing — negation hero)

| Quote | Path |
|-------|------|
| `"LaunchLens는\n사업계획서를 만드는 AI가 아닙니다"` | `packages/i18n/src/messages/ko.json` → `landing.hero.title` |
| `"LaunchLens is not\nan AI that writes business plans"` | `packages/i18n/src/messages/en.json` → `landing.hero.title` |
| `"LaunchLens is not an AI that writes documents. It is a Thinking Workspace for founders."` (EN) / KO equivalent under how-it-works | `landing` how-it-works / related keys in i18n |

Negation still **anchors the category to business-plan AI** (user must parse “not X”). Conflicts with ALABOM positive frame: Know Before You Build / 사업 검증.

### Product surfaces that still sell or imply plan generation

| Quote / pattern | Path |
|-----------------|------|
| `"사업계획서 생성"`, empty states “검증 데이터로 사업계획서를 생성하세요” | `packages/i18n/.../ko.json` → `businessPlan.*` |
| Route + titles: Business Plan \| … \| LaunchLens | `apps/web/app/[locale]/(shell)/projects/[id]/business-plan/page.tsx` |
| Analytics event `business_plan_generate` | `apps/web/lib/analytics/types.ts` |
| Demo UI: `"사업계획서 파일 업로드"` | `apps/web/features/workflow-journey/components/demo/demo-start-view.tsx` |
| Intake: `"사업계획서를 올려 주세요"` / paste placeholders naming 사업계획서 | i18n journey / intake keys; e.g. ko `headline`: 사업계획서를 올려 주세요 |
| Guide label: `"사업계획서 작성 가이드"` | i18n journey copy |
| Zero-lie corpus forbids overclaim “사업계획서를 모두 읽었습니다” | `apps/web/features/workflow-journey/lib/first-trust/zero-lie-corpus.ts` — input-doc language, not product promise |

**Note:** Using “사업계획서” as **user input document type** (paste/upload) is OK for ALABOM. Risk is **output** framing (generate / writer / investor-ready plan as primary value).

---

## 4. Centralization opportunity

| Question | Answer |
|----------|--------|
| Can brand rename be mostly i18n-driven? | **Yes — partially.** |
| Primary hub | `packages/i18n/src/messages/*.json` → `meta.appName`, `meta.titleSuffix`, `meta.appTagline`, `meta.appDescription`, `landing.nav.brand`, `landing.meta.title` |

**Gaps (must touch code, not only i18n):**

1. Hardcoded UI: `workspace-shell.tsx`, `journey-layout.tsx`, `v2-workspace-home-view.tsx`
2. Hardcoded metadata: many project pages, `manifest.ts`, `opengraph-image.tsx`, version routes
3. Anchor id `#why-launchlens` in `landing-header.tsx`
4. Storage/event prefixes `launchlens.*` (should **not** rename blindly — see Risk)
5. Type module path `launchlens-domain`

**Recommendation for Phase 1 (when approved):** Single brand source (`meta.appName` + optional `meta.wordmarkKo`) consumed by headers/OG/manifest; kill hardcoded LaunchLens in UI first; treat storage keys as separate migration.

---

## 5. Positioning risk

1. **Negation hero** (`사업계획서를 만드는 AI가 아닙니다`) fights ALABOM positive promise; users may still encode “plan AI.”
2. **Dual identity today:** Landing says Thinking Workspace / AI PM Company; `meta.appTagline` = “AI Strategy Consultant”; OG = Research · Validation · Executive Reports; business-plan **feature** still live.
3. **Hardcoded workspace wordmark** means i18n-only rename leaves Demo/Workspace showing LaunchLens.
4. **Locale drift:** non-KO/EN locales often still LaunchLens English brand strings.
5. **URL/repo identity** (`ai-startup-validation-tau.vercel.app`) will not match ALABOM until infra rename — separate CPO/ops decision.

---

## 6. Risk notes — do not rename blindly

| Surface | Risk if naive find-replace |
|---------|----------------------------|
| `launchlens.*` localStorage / cookies / CustomEvents | Breaks returning users’ workspace cache, consent (`launchlens_analytics_consent`), favorites, AI-PM meeting state |
| Analytics / funnel event names & docs | Time-series discontinuity; dashboards break |
| `@repo/types/domain/launchlens-domain` | Import graph / package exports break |
| Package/npm names (`@repo/*`) | Not branded “LaunchLens” in package.json names — low risk |
| Production hostname / GitHub repo | SEO, OAuth redirect URLs, bookmarks — **auth/config high risk** |
| E2E selectors / fixtures mentioning LaunchLens or 사업계획서 placeholders | CI flake |
| Admin CSV download prefix `launchlens-ops-` | Low; cosmetic |
| Docs / ADRs / evidence | Historical; leave as LaunchLens unless CPO wants doc sweep |

---

## 7. Recommendation

**Wait for CPO scope freeze before Phase 1.**

Suggested freeze checklist for CPO:

1. Official EN/KO names: ALABOM vs 알아봄 vs both (when to show which).
2. Tagline lock: “사업, 시작하기 전에 알아봄.” / Know Before You Build — replace Consultant / AI PM Company?
3. Hero: drop negation; positive validation workspace copy only.
4. Business-plan **feature**: keep as artifact, demote, or rename in nav — product decision, not brand-only.
5. Domain/URL rename: in or out of Phase 1.
6. Storage-key migration: explicit allowlist (likely Phase 2+).

Until freeze: no logo, landing, or Workspace branding work.

---

## 8. Explicit status

| Item | Status |
|------|--------|
| Phase 0 Brand Audit | Done (this doc) |
| Phase 1–5 | **Not started** |
| Product / UI / i18n code changes | **Zero** |
| Implementation | **NOT started** |

---

**Scope Freeze (next gate):** [`ALABOM_PHASE0_SCOPE_FREEZE.md`](./ALABOM_PHASE0_SCOPE_FREEZE.md) — brand vs UX separation; await CPO PASS before Phase 1.

*Next Autonomous Target (record only): await CPO brand scope freeze; then Phase 1 brand surface swap (i18n + hardcoded headers/OG/favicon) excluding storage keys and Workspace UX refactor.*
