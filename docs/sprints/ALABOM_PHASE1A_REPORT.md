# ALABOM Phase 1-A — CPO Report

**Date:** 2026-08-25  
**Role:** CTO → CPO  
**Gate:** Phase 0 ✅ PASS (`8487979`) → **Phase 1-A implemented**  
**Status:** Phase 1-A 🟢 READY FOR CPO REVIEW  
**Explicit:** **Phase 1-B NOT started** · CEO Walkthrough remains HOLD · CartPilot out

---

## Goal (Phase 1-A)

User understands in ~10s what ALABOM is; Demo / Start Free CTAs work.  
**Scope:** Brand + Landing first experience only.

---

## Locked brand applied

| Surface | Value |
|---------|--------|
| Primary | ALABOM |
| Korean | 알아봄 |
| Descriptor / H1 | 사업, 시작하기 전에 알아봄. |
| Secondary | Know Before You Build. |
| Supporting | 사업계획서를 올리거나 아이디어를 입력하면 AI가 먼저 이해하고, 부족한 부분만 질문합니다. |
| CTAs | `무료로 시작하기` · `Demo로 알아보기` |
| Aux | 신용카드 필요 없음 · 30초 안에 시작 |
| Negation hero | **Removed** |

---

## Changed files

### Brand foundation
- `apps/web/lib/brand/brand-config.ts` **(new)**
- `apps/web/lib/brand/__tests__/brand-config.test.ts` **(new)**
- `apps/web/vitest.config.ts` — include BrandConfig tests
- `apps/web/app/layout.tsx` — favicon from BrandConfig
- `apps/web/app/manifest.ts` — PWA name/short_name/description
- `apps/web/app/opengraph-image.tsx` — ALABOM OG
- `apps/web/public/icon.svg` — “A” mark

### Landing / i18n / nav
- `packages/i18n/src/messages/ko.json` — meta, landing.hero, nav, footer, soften plan-writer landing copy
- `packages/i18n/src/messages/en.json` — same EN surfaces
- `packages/i18n/src/messages/{ja,zh-CN,zh-TW,es,fr,de,pt,vi,id}.json` — `meta.appName` / brand display
- `apps/web/features/landing/components/landing-header.tsx` — `#why-alabom`
- `apps/web/features/landing/components/landing-gtm-why-narrative.tsx` — section id
- `apps/web/features/workflow-journey/components/journey-global-nav.tsx` — anchor
- `apps/web/e2e/smoke.spec.ts` — expect ALABOM

### Evidence / this report
- `docs/evidence/ALABOM/phase1a/hero-desktop-ko.png`
- `docs/evidence/ALABOM/phase1a/hero-mobile-ko.png`
- `docs/sprints/ALABOM_PHASE1A_REPORT.md` (this file)

### Explicitly NOT changed (locked)
- `launchlens.*` / `ll_*` storage & analytics keys — **KEEP**
- `businessPlan.generate` API / engine / events — **KEEP**
- AI Engine / S17 loop / Workspace business logic — **NOT touched**
- Phase 1-B Workspace first-experience AI UX — **NOT started**

---

## Before → After (copy)

| | Before | After |
|--|--------|-------|
| Hero H1 (KO) | LaunchLens는 / 사업계획서를 만드는 AI가 아닙니다 | **사업, 시작하기 전에 알아봄.** |
| Eyebrow | Think Better. Decide Better. | **ALABOM** |
| Supporting | Thinking Workspace… | AI가 먼저 이해하고, 부족한 부분만 질문… |
| CTAs | Start Free / Open Demo | **무료로 시작하기** / **Demo로 알아보기** |
| Aux hint2 | 30초 안에 이해 | **30초 안에 시작** |
| Meta title | LaunchLens — CEO를 위한 AI PM Company | **ALABOM — 사업, 시작하기 전에 알아봄.** |
| Nav brand | LaunchLens | **ALABOM** |

Screenshots: `docs/evidence/ALABOM/phase1a/` (desktop + mobile KO hero).

---

## Tests

```text
pnpm --filter web test -- lib/brand
✓ lib/brand/__tests__/brand-config.test.ts (2 tests)
```

E2E smoke regex updated to ALABOM (not re-run in this pass; unit + build gated).

---

## Build

```text
pnpm --filter web build
✓ Compiled successfully
✓ Generating static pages (391/391)
Exit 0
```

---

## Commits

| SHA | Message |
|-----|---------|
| `c9ceb06` | feat(alabom): BrandConfig + visible brand foundation |
| `77bbbe5` | feat(alabom): Landing hero and CTAs for Phase 1-A |
| *(report tip)* | docs(alabom): Phase 1-A report for CPO (+ vitest include + evidence) — tip `52c8f32` |

---

## Production deploy

- Pushed: `main` @ `52c8f32` → Vercel Production https://ai-startup-validation-tau.vercel.app
- `/api/build-info` **commit:** `52c8f322cec800037f8e8c959220d45bf316561b` (**MATCH tip**)
- `deployTime`: `2026-08-25T01:46:47.904Z`
- Live KO landing check: **PROD_HERO_PASS** · **NEGATION_GONE** · **ALABOM_PRESENT**

---

## CPO Review checklist

| # | Criterion | Result |
|---|-----------|--------|
| 1 | ~10s brand clarity: ALABOM + descriptor in hero | **PASS** |
| 2 | Negation hero removed | **PASS** |
| 3 | CTAs: 무료로 시작하기 + Demo로 알아보기 present | **PASS** |
| 4 | Aux: no credit card · 30s start | **PASS** |
| 5 | BrandConfig = display source of truth (logo/favicon/manifest/OG) | **PASS** |
| 6 | i18n meta / nav / landing hero wired | **PASS** |
| 7 | `launchlens.*` keys unchanged | **PASS** |
| 8 | `businessPlan.generate` internals unchanged | **PASS** |
| 9 | No Engine / S17 / Workspace logic changes | **PASS** |
| 10 | Phase 1-B not started | **PASS** |
| 11 | Evidence screenshots desktop + mobile | **PASS** |
| 12 | Build green | **PASS** |
| — | Full Workspace LaunchLens hardcoding purge | **GAP** (Phase 1-A out of scope; deferred) |
| — | All below-fold FAQ LaunchLens mentions | **GAP** (non-blocking; soften later if CPO asks) |

---

## Explicit status

| Item | Status |
|------|--------|
| Phase 0 | ✅ PASS |
| Phase 1-A Brand + Landing | 🟢 Implemented — await CPO Review |
| Phase 1-B Workspace first-experience | ⛔ **NOT started** |
| CEO Walkthrough | ⛔ HOLD |
| CartPilot | Out of project |

Next Autonomous Target  
Epic: ALABOM Phase 1-A CPO Review → (only if PASS) Phase 1-B  
진행률: Phase 1-A code complete  
예상 완료: CPO gate  
다음 보고 08:00
