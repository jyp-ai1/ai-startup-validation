# DESIGN_REBOOT.md — Sprint UI 4.0 LaunchLens UX Reboot

**Date:** 2026-07-20  
**Scope:** Full product redesign — not incremental UI polish. No new features or API.  
**Status:** Complete. Build verified. No deploy.

---

## 1. What Changed vs. the Old UI

| Before | After |
|--------|-------|
| Root `/` redirected to dashboard | **Marketing landing page** — brand, value props, recent projects, CTA |
| Sidebar + header + tables (Admin/CRUD) | **Executive intelligence layout** — Hero → AI Summary → KPI → Decision → Actions → Charts → Timeline → Experts |
| "AI Startup Validation Framework" branding | **LaunchLens** — `AI Startup Intelligence Platform` |
| Small typography, dense grids | **Typography-first** — 56px hero, 64px numbers, 2× whitespace |
| Cards patched onto old layout | **`IntelligenceDashboard`** rebuilt; legacy `ConsultingDashboard` retired |
| Validation Score in sidebar | Sidebar matches PM spec — Workspace / Validation / AI Studio / Intelligence / Settings |
| No risk visualization | **Risk Heatmap** + **Score Breakdown** alongside Validation Radar |
| Action list without impact | **Action Center** shows score impact, estimated time, status |

The old UI was **improved**. The new UI is **replaced**.

---

## 2. Reference Design Systems

Primary references (information architecture + visual tone):

| Product | What we borrowed |
|---------|------------------|
| **Linear** | Sidebar groups, icon + label nav, active/hover states, minimal chrome |
| **Vercel Dashboard** | Hero typography, whitespace, flat cards with soft borders |
| **Stripe Dashboard** | Executive KPI hierarchy, trust through restraint |
| **PitchBook** | Data-dense but conclusion-first layout for investors |
| **Perplexity** | AI accent color, recommendation-first summary card |
| **Notion** | Clean section rhythm (used sparingly — not CRUD-first) |

---

## 3. Layout Architecture

```
Sidebar (260px)
  └── Workspace | Validation | AI Studio | Intelligence | Settings

Header (minimal — locale, theme)

Dashboard Content
  1. Hero          — LaunchLens brand, project, Startup Readiness 84, Grade A, GO, Top 12%
  2. AI Summary    — GO / ★★★★★ / Funding Probability / Recommendation narrative
  3. Executive KPI — Readiness rings (Startup, Investment, Grant, AI Confidence)
  4. Decision      — Key Insights + AI Reasoning (WHY)
  5. Action Center — Priority 1–3 with score impact + time estimate
  6. Charts        — Radar + Risk Heatmap + Score Breakdown
  7. Timeline      — Growth timeline (evidence/VOC trend)
  8. Expert Opinion — VC / PM / CTO / Marketing consensus cards

Landing (/)
  Brand → AI Value → Recent Projects → Dashboard CTA
  (No app shell — distinct from workspace)
```

Feature pages (UI 4.1) use `IntelligencePage`: Insight before data, table last.

---

## 4. Before / After

### Before
```
Admin

Sidebar
----------------
Header

Table
Table
Table
```

### After
```
LaunchLens
AI Startup Intelligence Platform

Hero KPI (84 · Grade A · GO)
↓
AI Executive Summary
↓
Executive KPI Rings
↓
Decision Analysis
↓
Action Center (impact + time)
↓
Radar · Heatmap · Breakdown
↓
Timeline
↓
Expert Consensus
```

---

## 5. Design Philosophy

1. **Conclusion before data** — Users see GO, funding probability, and AI recommendation before tables.
2. **Typography is the UI** — Numbers at 48–64px; sections at 32px; captions at 13px.
3. **Premium restraint** — White/gray base, indigo primary, purple AI accent. No decorative noise.
4. **Decision platform, not document tool** — Validation scores drive the experience; CRUD is secondary.
5. **Brand is product** — LaunchLens is the product name; "Validation Framework" is technical footnote only.

---

## 6. UX Improvements

- **First impression:** Landing page separates marketing from workspace; dashboard feels like paid SaaS.
- **Trust:** Expert consensus cards, confidence meter, risk heatmap signal institutional quality.
- **Actionability:** Action Center shows expected score impact and time — not just task labels.
- **Navigation:** Linear-style sidebar with clear domain groups reduces "admin menu" feel.
- **Motion:** Count-up on KPIs, progress bar animation, hover lift on cards, fade-in on page load.
- **Mobile:** Landing and dashboard sections stack; sidebar becomes drawer on small screens.

---

## 7. Next UI Improvements (UI 4.2+)

1. Migrate **Research, Competitors, Project Overview, AI Agent, AI Studio hub** to `IntelligencePage`
2. **Skeleton loading** + unified empty states on all feature routes
3. **Real LLM AI Summary** when backend ready (swap template keys for API response)
4. **Korean translations** for all new `landing.*` and `intelligence.*` keys
5. Remove orphaned **`consulting-dashboard.tsx`** and related legacy panels
6. Lighthouse pass before production deploy

---

## Key Files

| Area | Path |
|------|------|
| Landing | `apps/web/components/landing/launch-lens-landing.tsx` |
| Dashboard | `apps/web/features/dashboard/components/intelligence-dashboard.tsx` |
| Intelligence components | `apps/web/components/intelligence/` |
| App shell gate | `apps/web/components/app-shell-gate.tsx` |
| Sidebar nav | `apps/web/lib/sidebar-nav.ts` |
| Typography tokens | `packages/ui/src/styles/globals.css` |
| Brand constants | `packages/config/constants/index.ts` |

---

## Build

```
pnpm --filter web build  ✓
pnpm --filter web lint   ✓
```

**Deploy:** Not performed (per PM instruction).
