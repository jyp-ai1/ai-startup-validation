# LaunchLens Design System v1.0

**Status:** Sprint Design 5.0A — Visual & component spec (no code until 5.1)  
**Date:** 2026-07-20  
**Authority:** Implementation reference for *how* things look.  
**Primary authority:** [LAUNCHLENS_PRODUCT_EXPERIENCE.md](./LAUNCHLENS_PRODUCT_EXPERIENCE.md) — *why* LaunchLens feels the way it does.

> **Read order for Cursor:** Product Experience Bible first → this Design System second → then implement.

---

## 0. Purpose

LaunchLens competes on **Product Experience**, not feature count.

| Dimension | Current (PM estimate) | Target |
|-----------|----------------------|--------|
| Feature structure | 95% | Maintain |
| UX | 65% | 90%+ |
| Brand | 40% | 85%+ |
| SaaS completeness | 55% | 90%+ |

**Rule for Cursor (Design 5.1+):** Do not “improve” existing screens. **Rebuild from this spec.** If a screen is not defined here, do not ship it.

---

## 1. Brand Identity

### 1.1 Name & Voice

| Item | Value |
|------|-------|
| Product name | **LaunchLens** |
| Tagline | **AI Startup Intelligence Platform** |
| Voice | Confident, institutional, concise — VC memo tone, not startup blog |
| Avoid | “Framework”, “Admin”, “Tool”, “Dashboard only” as primary identity |

**Logo:** Text-only mark. No illustration in v1.

```
┌─────────────────────────┐
│  ◆ LaunchLens           │  ← 16px indigo square + wordmark
│    AI Startup           │
│    Intelligence Platform│  ← 11px muted caption
└─────────────────────────┘
```

Legacy name `AI Startup Validation Framework` → footer / About / technical docs only.

### 1.2 Reference Products (mandatory study)

| Product | Borrow |
|---------|--------|
| **Linear** | Sidebar IA, hover/active, section dividers, collapsed nav |
| **Vercel** | Hero typography, whitespace, deployment-style status chips |
| **Stripe** | KPI hierarchy, trust through restraint, semantic color |
| **PitchBook** | Data-dense executive layout, ranking/percentile |
| **Perplexity** | AI summary card, purple accent, recommendation-first |

**Anti-reference:** Generic admin templates, Notion CRUD-first, dense table-first ERP.

### 1.3 Design Principles

1. **Conclusion before data** — GO, probability, AI summary before tables.
2. **Typography is the UI** — Numbers and headings carry hierarchy; decoration is minimal.
3. **Decision before management** — User decides; system supports with evidence.
4. **Premium restraint** — Few colors, large whitespace, flat cards, soft borders.
5. **Table is last** — Raw data is evidence layer, not the hero.

---

## 2. Design Tokens

### 2.1 Color

| Token | Light | Usage |
|-------|-------|-------|
| `--background` | `#FAFAFA` | Page background |
| `--card` | `#FFFFFF` | Card surface |
| `--border` | Gray 200 (`#E5E7EB`) | Card borders, dividers |
| `--primary` | Indigo 600 (`#4F46E5`) | CTA, active nav, links |
| `--ai` | Purple 600 (`#9333EA`) | AI labels, recommendation eyebrow |
| `--success` | Emerald 600 (`#059669`) | GO, low risk, completed |
| `--warning` | Amber 500 (`#F59E0B`) | REVIEW, moderate risk, pending |
| `--danger` | Rose 600 (`#E11D48`) | HOLD, critical risk, NO GO |
| `--muted-foreground` | Gray 500 | Captions, secondary text |
| `--foreground` | Gray 900 | Primary text |

Dark mode: preserve hierarchy; reduce saturation 10–15%; never pure black `#000`.

### 2.2 Typography

Font: **Geist Sans** (system fallback: `ui-sans-serif`).

| Role | Size | Weight | Line height | CSS class (implementation) |
|------|------|--------|-------------|------------------------------|
| Hero number | **64px** | 600 | 1.0 | `.text-ll-hero-number` |
| Hero title | **42px** | 600 | 1.08 | `.text-ll-hero-title` |
| Section title | **30px** | 600 | 1.2 | `.text-ll-section` |
| Card number | **40px** | 600 | 1.0 | `.text-ll-card-number` |
| Card title | **18px** | 600 | 1.3 | `.text-ll-card-title` |
| Body | **15px** | 400 | 1.6 | default `text-[15px]` |
| Caption | **13px** | 500 | 1.4 | `.text-ll-caption` |
| Eyebrow | **13px** | 600 | 1.4 | uppercase, tracking `0.18em` |

### 2.3 Spacing & Grid

| Token | Value |
|-------|-------|
| Container max-width | **1440px** |
| Container padding (desktop) | 40px horizontal |
| Section gap | **64px** |
| Card gap | **24px** |
| Card padding | **32px** |
| Card radius | **16px** (`rounded-2xl`) |
| Sidebar width | **260px** (expanded) / **64px** (collapsed) |
| Header height | **72px** |

### 2.4 Elevation

| Level | Rule |
|-------|------|
| Default card | `border border-gray-200`, no shadow |
| Hover card | `translate-y -2px`, `shadow-md` |
| AI Summary | `border-primary/15`, gradient `from-primary/[0.04]` |
| Popover / dropdown | `shadow-lg`, `border-gray-200` |

---

## 3. Information Architecture

```
/                          Landing (no app shell)
/dashboard                 Executive command center
/projects                  Project portfolio
/projects/[id]             Workspace Overview
/projects/[id]/research    Research intelligence
/projects/[id]/evidence    Evidence intelligence
/projects/[id]/voc         VOC / Pain dashboard
/projects/[id]/competitors Competitor matrix
/projects/[id]/grants      Government funding
/projects/[id]/reports     Validation report (AI Studio)
/projects/[id]/business-plan
/projects/[id]/prd
/projects/[id]/development-spec
/projects/[id]/knowledge   Intelligence
/projects/[id]/agent       AI Consultant
/settings
```

### 3.1 Global Shell

Every workspace route (except `/` Landing) uses:

```
┌──────────┬──────────────────────────────────────────────────────┐
│ Sidebar  │ Header (72px)                                        │
│ 260px    │ Breadcrumb ············· Search · Bell · Theme · User│
├──────────┼──────────────────────────────────────────────────────┤
│          │ Main content (max 1440px, centered)                  │
│          │ Section gap 64px                                     │
└──────────┴──────────────────────────────────────────────────────┘
```

### 3.2 Sidebar Structure

```
WORKSPACE
  Dashboard
  Projects

VALIDATION
  Research
  Evidence
  VOC
  Competitors
  Government

AI STUDIO
  Report
  Business Plan
  PRD
  Development Spec

INTELLIGENCE
  Knowledge
  AI Consultant

SETTINGS
  Settings
```

**Collapsed mode:** Icons only + tooltip on hover. Logo → `◆` mark.

---

## 4. Component Library

### 4.1 Card (Intelligence Card)

```
┌─────────────────────────────────────────────┐  padding: 32px
│ CAPTION (13px uppercase muted)                │  radius: 16px
│                                             │  border: 1px gray-200
│ Card Title (18px semibold)                  │  bg: white
│                                             │
│ [content]                                   │
└─────────────────────────────────────────────┘
```

Variants: `default` | `ai` (purple eyebrow) | `metric` (large number) | `expert` | `action`

### 4.2 Button

| Variant | Use |
|---------|-----|
| Primary | Single main CTA per section |
| Secondary | Outline, secondary actions |
| Ghost | Tertiary, nav-adjacent |
| AI | Purple tint — generate / ask AI only |

Height: 40px default, 48px hero CTA. Radius: 12px.

### 4.3 AI Verdict Badge

| Verdict | Color | Label |
|---------|-------|-------|
| GO | Emerald | GO |
| REVIEW | Amber | REVIEW |
| HOLD | Rose | HOLD |

Padding: 8px 16px. Radius: full. Font: 13px semibold uppercase.

### 4.4 Hero Block

Used on Dashboard + Project Overview.

```
LaunchLens                          ← 13px eyebrow muted
AI Startup Intelligence Platform    ← 42px hero title (Dashboard only)

Project Name                        ← 30px section (linked)
Updated Today                       ← 13px caption

Startup Readiness    Grade    Decision    Ranking
      84              A         GO        Top 12%
   (64px number)   (64px)    (36px)     (36px)
```

### 4.5 AI Executive Summary

Always **3 lines** narrative below Hero on Dashboard & feature pages.

```
┌─ AI RECOMMENDATION ─────────────────────────────── ★★★★★  [GO] ─┐
│ Funding Probability 84%  ·  Top 12%  ·  Confidence 87%        │
│                                                                 │
│ Line 1: Primary insight (market / opportunity)                  │
│ Line 2: Primary gap (what's missing)                            │
│ Line 3: Expected impact if action taken                         │
└─────────────────────────────────────────────────────────────────┘
```

Example copy pattern:
- "시장성은 높습니다."
- "VOC 확보가 부족합니다."
- "인터뷰 15건 진행 시 투자 준비도가 향상될 것으로 예상됩니다."

### 4.6 KPI Ring Row

4 rings in a row (2×2 on tablet, 1 col mobile):

| KPI | Source |
|-----|--------|
| Startup Readiness | Validation total score |
| Investment Readiness | Derived composite |
| Grant Readiness | Grant fit |
| AI Confidence | Evidence + validation confidence |

Ring: 120px diameter, 8px stroke, number centered at 40px.

### 4.7 Action Center Row

```
┌──┐  Priority 1 · VOC 인터뷰 15건 확보
│1 │  +8 score impact  ·  ~2 days  ·  [HIGH]
└──┘  →
```

Max 3 visible. Completed state: emerald banner, no rows.

### 4.8 Expert Opinion Card

```
┌─────────────────────┐
│ VC Opinion          │
│ 82%    ★★★★★        │
│ 긍정 — 2 line summary│
└─────────────────────┘
```

Grid: 4 columns desktop, 2 tablet, 1 mobile.

### 4.9 Empty State

```
        [illustration — simple line art, 120px]

        No evidence yet
        Add market data to unlock AI recommendations.

        [ Primary: Add Evidence ]  [ Secondary: Import sample ]

        Or import sample project →
```

Required on every list/feature page when count = 0.

### 4.10 Chart Components

| Chart | Use | Library |
|-------|-----|---------|
| Radar | Validation 6-axis | Recharts |
| Risk Heatmap | Category risk cells | Custom grid |
| Timeline | Month bars, trend | Recharts bar |
| Score Breakdown | Horizontal bars | Custom |
| BCG Matrix | Competitor position | 2×2 quadrant (Competitors page) |
| VOC Severity | Bar or donut | Recharts |

Chart container: same Intelligence Card wrapper, min-height 320px.

---

## 5. Screen Wireframes

Standard feature page order (unless noted):

```
Header breadcrumb
→ Page eyebrow + title
→ AI Executive Summary
→ Key metrics / insights
→ Primary content (cards)
→ Timeline / charts
→ Raw table (LAST)
```

---

### Screen 1 — Landing (`/`)

**No app shell.**

```
┌─────────────────────────────────────────────────────────────────┐
│ ◆ LaunchLens ··························· [Open Dashboard]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ENTERPRISE AI INTELLIGENCE                                    │
│   Validate startups like a VC                                 │
│   (42px hero title)                                             │
│                                                                 │
│   [ Open Dashboard ]  [ Start New Project ]                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ AI-First     │ │ Evidence     │ │ Executive    │            │
│  │ Decisions    │ │ Driven       │ │ Ready        │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
├─────────────────────────────────────────────────────────────────┤
│  Recent Projects (card grid)                                    │
├─────────────────────────────────────────────────────────────────┤
│  Ready to decide? → [ Open Dashboard ]                          │
├─────────────────────────────────────────────────────────────────┤
│  © LaunchLens · Powered by AI Startup Validation Framework      │
└─────────────────────────────────────────────────────────────────┘
```

---

### Screen 2 — Dashboard (`/dashboard`)

```
┌──────────┬──────────────────────────────────────────────────────┐
│ SIDEBAR  │ Workspace > 실버 세대 매칭 > Dashboard    🔍 🔔 🌙 👤 │
├──────────┼──────────────────────────────────────────────────────┤
│          │ HERO (see §4.4)                                      │
│          │ gap 64px                                             │
│          │ AI EXECUTIVE SUMMARY (see §4.5)                      │
│          │ gap 64px                                             │
│          │ KPI RINGS ×4 (see §4.6)                              │
│          │ gap 64px                                             │
│          │ DECISION ANALYSIS                                    │
│          │ ┌ Key Insights ──────┐ ┌ AI Reasoning ──────────┐  │
│          │ └────────────────────┘ └────────────────────────┘  │
│          │ gap 64px                                             │
│          │ ACTION CENTER (see §4.7)                             │
│          │ gap 64px                                             │
│          │ ANALYTICS                                            │
│          │ ┌ Radar ────────┐ ┌ Risk Heatmap ────────────────┐ │
│          │ └───────────────┘ └──────────────────────────────┘ │
│          │ Score Breakdown (full width)                       │
│          │ gap 64px                                             │
│          │ GROWTH TIMELINE                                      │
│          │ gap 64px                                             │
│          │ EXPERT OPINION ×4 (see §4.8)                       │
└──────────┴──────────────────────────────────────────────────────┘
```

---

### Screen 3 — Project / Workspace Overview (`/projects/[id]`)

**Replace project card list detail with executive overview.**

```
HERO
  Project title · status chip · updated

AI SUMMARY (project-level)

PROGRESS STRIP
  Research ████░░ 65%  ·  Evidence ██████ 80%  ·  VOC ███░░░ 45%

VALIDATION SNAPSHOT
  Score 84 · Grade A · GO · [Run Validation]

WORKSPACE MODULES (card grid, not table)
  ┌ Research ──┐ ┌ Evidence ──┐ ┌ VOC ───────┐ ┌ Competitors ┐
  │ 3 plans    │ │ 126 items  │ │ 12 entries │ │ 5 mapped    │
  └────────────┘ └────────────┘ └────────────┘ └─────────────┘

ACTIVITY TIMELINE
  May · Jun · Jul · Aug

UPCOMING DEADLINES (if any)
```

---

### Screen 4 — Research

```
AI SUMMARY

METRICS ROW
  Plans: 3 · Completed: 1 · Progress: 65%

CARD GRID (not table first)
  ┌ Plan card ──────────────────────────────┐
  │ Market Research · In Progress · 65%     │
  │ Type: Primary · Due: Aug 15             │
  │ [View] [Edit]                           │
  └─────────────────────────────────────────┘

PROGRESS BY TYPE (small chart)

RAW TABLE (last)
```

---

### Screen 5 — Evidence

```
AI SUMMARY

CONFIDENCE METER (circular) + CATEGORY CHIPS
  Startup · Investment · Technology · Government

EVIDENCE CARDS (primary)
  Source · Confidence badge · Category · Date

GROWTH TIMELINE

RAW TABLE (last)
```

---

### Screen 6 — VOC (Pain Point Dashboard)

```
AI SUMMARY

SEVERITY CHART (distribution)

METRICS
  Interviews: 12 · High pain: 5 · Payment intent: 68%

PAIN CARDS
  ┌ Pain: "매칭 신뢰 부족" ──────────────────┐
  │ Severity: HIGH · Intent: YES · n=4      │
  └─────────────────────────────────────────┘

INTERVIEW LIST (cards, table last)
```

---

### Screen 7 — Competitors (BCG Matrix)

```
AI SUMMARY

BCG QUADRANT (2×2)
        High Share
    ┌─────────┬─────────┐
    │ LEADER  │CHALLENGER│
    ├─────────┼─────────┤
    │FOLLOWER │   NEW    │
    └─────────┴─────────┘
        Low Share

COMPETITOR CARDS positioned by quadrant color

COMPARISON TABLE (last)
```

---

### Screen 8 — Government / Grants

```
AI SUMMARY

FUNDING CARDS
  ┌ TIPS ────────────────────────────────────┐
  │ Fit: 87% · Deadline: Aug 30 · ₩500M max │
  │ [View program]                            │
  └──────────────────────────────────────────┘

DEADLINE TIMELINE

PROGRAM TABLE (last)
```

---

### Screen 9 — AI Studio Hub

**Feel: AI workspace, not document list.**

```
AI SUMMARY

DOCUMENT STATUS GRID
  ┌ Validation Report ── ● Ready      ─ [Open] [Generate] ┐
  ┌ Business Plan     ── ◐ Generating ─ progress bar      ┐
  ┌ PRD               ── ○ Draft       ─ [Generate]       ┐
  ┌ Development Spec  ── ✓ Completed   ─ [Preview] [Export]┐

Status chips: Ready (gray) · Generating (amber pulse) · Completed (emerald)
```

---

### Screen 10 — AI Consultant (`/projects/[id]/agent`)

```
HERO (minimal)
  AI Consultant · Project context

CONTEXT STRIP
  Validation 84 · Evidence 126 · Knowledge chunks 340

CHAT AREA (Perplexity-like)
  ┌─────────────────────────────────────────┐
  │ User question                             │
  │ AI answer with citations                │
  └─────────────────────────────────────────┘

SUGGESTED PROMPTS (chips)
  "Should we pursue GO?" · "What's the biggest risk?" · ...

INPUT (fixed bottom)
```

---

### Screen 11 — Report / Business Plan / PRD / Dev Spec (list pages)

Same pattern as AI Studio item rows but single-feature focus:

```
AI SUMMARY → STATUS METRICS → DOCUMENT CARDS → PREVIEW ACTIONS → TABLE LAST
```

---

## 6. Interaction Rules

| Interaction | Spec |
|-------------|------|
| Page enter | Fade in 300ms, `opacity 0→1`, `translateY 8px→0` |
| Hero numbers | Count-up 800ms ease-out on mount |
| KPI rings | Stroke animate 0→value over 600ms |
| Card hover | `translateY -2px`, shadow-md, 200ms |
| Button hover | Background darken 5%, no scale |
| Sidebar item | Active: `bg-primary/10 text-primary`; hover: `bg-muted` |
| Loading | Skeleton pulse matching card layout — never spinner-only full page |
| AI generating | Amber pulse dot + "Generating..." caption |

**No** bounce, parallax, or decorative motion.

---

## 7. Responsive Rules

| Breakpoint | Width | Layout changes |
|------------|-------|----------------|
| Desktop | ≥1280px | Full sidebar, 4-col KPI, 2-col charts |
| Tablet | 768–1279px | Sidebar collapsible default, 2-col KPI, 1-col charts |
| Mobile | <768px | Drawer sidebar, stacked everything, Hero numbers 48px |

Header: breadcrumb truncates; search becomes icon → full-screen overlay.

---

## 8. Icon Rules

- Library: **Lucide React** only (already in project).
- Size: 16px inline, 20px nav, 24px empty state.
- Stroke width: default 2.
- Nav icons: 70% opacity inactive, 100% + primary color active.
- Do not mix icon sets.

---

## 9. Prototype Flow (screen connections)

```
Landing ──[Open Dashboard]──► Dashboard
Dashboard ──[Project link]──► Project Overview
Project Overview ──[module card]──► Feature pages
Sidebar ──► any workspace route
Feature pages ──[Action Center row]──► targeted feature
AI Studio ──[Generate]──► document editor (existing, shell only reskin in 5.1)
AI Consultant ──◄── Intelligence sidebar
```

---

## 10. Implementation Handoff (Design 5.1)

When PM approves this doc, each Cursor sprint uses:

```markdown
## Screen: [name]
- Spec: docs/LAUNCHLENS_DESIGN_SYSTEM.md § Screen N
- Rebuild: yes (do not patch existing component)
- Out of scope: new API, new features, new DB
- Done when: matches wireframe order + tokens + empty states
```

**File targets (Design 5.1):**

| Screen | Primary file(s) to rebuild |
|--------|---------------------------|
| Shell | `app-shell.tsx`, `app-layout.tsx`, `globals.css` |
| Dashboard | `intelligence-dashboard.tsx` |
| Project | `projects/[id]/page.tsx` + new overview component |
| Research | `research` feature list |
| Evidence | `evidence-list.tsx` |
| VOC | `voc-list.tsx` |
| Competitors | `competitors` + new BCG component |
| Government | `grant-list.tsx` |
| AI Studio | `ai-studio-hub.tsx` |
| AI Consultant | `validation-agent` panel |

---

## 11. Design Review Checklist (before Design 5.1)

PM signs off when:

- [ ] Brand reads **LaunchLens**, not framework
- [ ] First screen feels **PitchBook / McKinsey SaaS**, not admin
- [ ] AI Summary appears **before** any table on every feature page
- [ ] Typography matches token scale (64/42/30/18/15/13)
- [ ] Spacing matches 64/32/24 system
- [ ] Empty states defined for all 11 screens
- [ ] Header 72px with breadcrumb + search + profile specified
- [ ] Sidebar collapse behavior specified
- [ ] Dark mode token pairs documented (§2.1 note)

---

## 12. Version History

| Version | Date | Change |
|---------|------|--------|
| 1.0 | 2026-07-20 | Initial design system — Sprint Design 5.0A |

---

**Next step:** PM Design Review → Sprint Design 5.1 (Cursor implementation, one screen at a time).
