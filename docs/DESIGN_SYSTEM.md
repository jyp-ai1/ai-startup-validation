# LaunchLens Design System

> **Sprint P1** — consolidates Layout Rule + Design Rule + Component Guide (CPO decision)  
> **Status:** Design-only · **No implementation** until CPO sign-off  
> **Philosophy:** Figma-inspired simplicity — not pixel copy. **Nav + Main**, scroll minimized.

---

## Part 1 — Layout Rule (Workspace Freeze)

### Frozen shell (Project Workspace)

**Never change column structure after sign-off.**

```
┌─────────────────────────────────────────────────────────┐
│ Top GNB — logo · project · locale · account             │
├────────────────┬────────────────────────────────────────┤
│ Navigation     │ Main                                   │
│ (tree, fixed   │ (single active section — one job       │
│  width)        │  at a time)                            │
│                │                                        │
│ Overview    ▼  │  ┌─────────────────────────────────┐   │
│  Summary    ✔  │  │ Action (top when Overview)      │   │
│  Market        │  ├─────────────────────────────────┤   │
│ Insights       │  │ Section body                    │   │
│ Recommendations│  └─────────────────────────────────┘   │
│ Next Actions   │                                        │
└────────────────┴────────────────────────────────────────┘
```

| Zone | Mutable? | Notes |
|------|----------|-------|
| **Top GNB** | Labels/actions only | h-14; same as JourneyLayout today |
| **Navigation** | Tree items grow (AI PM) | **Not** AppShell sidebar |
| **Main** | Content per section | **Only zone for feature work** |

### Forbidden

- Third column (no Left | Center | Right SaaS)
- New workspace layouts
- AppShell sidebar on `/validation`
- Full-page `/execution`, `/evidence`, `/strategy` routes

### Other screens (not frozen here)

| Screen | Layout |
|--------|--------|
| Landing | Hero → Input → Examples → CTA (single column) |
| Workspace List | Project list only (`/workspace`) |
| Who / Workflow | JourneyLayout, single column, pre-Workspace |

---

## Part 2 — Design Rules (principles)

### 1. Simple

- One primary action per Main view
- Remove repeated CTAs and stat blocks on Landing (Epic 6)

### 2. Left summary, right detail → **Nav summary, Main detail**

- Navigation = **where you are** in the journey (tree + ✔)
- Main = **what you’re looking at now**
- Not a 3-column dashboard

### 3. Spacing

- Section padding: `p-6 sm:p-8` (match V2 panels today)
- Nav width: `240–280px` fixed
- Main max-width: `max-w-7xl` (match JourneyLayout `workspace` width)
- Gap between Nav and Main: border divider, no gutter card stack

### 4. Scroll minimized

- Review: Summary + Action **above fold**
- Evidence / long metrics → drawer or expand
- Prefer **click nav leaf** over scrolling past all sections

### 5. Typography

- Page title: `text-2xl font-semibold tracking-tight`
- Section label: `text-sm font-medium text-muted-foreground`
- Body: `text-sm leading-relaxed`
- AI PM message: `text-sm`; user vs AI via subtle background, not heavy borders

### 6. Cards

- One surface style: `rounded-2xl border border-border/60 bg-card` OR shared `@repo/ui` Card
- **Stop:** ad-hoc `ll-consulting-card` and 80+ custom bordered divs in founder tree
- Score/stat: one `ScoreStatCard` pattern (future merge)

### 7. Motion

- Loading: step list with ✔ / ● (Epic 4) — keep animation, add **labeled steps**
- Section change: cross-fade Main only; Nav tree persists

---

## Part 3 — Component Inventory

### Canonical (KEEP — build on these)

| Component | Path | Role |
|-----------|------|------|
| JourneyLayout | `journey-layout.tsx` | GNB shell → **Workspace shell** |
| V2StrategyWorkspaceView | `v2-strategy-workspace.tsx` | Workspace orchestrator |
| V2ThinkingWorkspaceMain | `v2-thinking-workspace-main.tsx` | Main / Review compose |
| V2AiPmInbox | `v2-ai-pm-inbox.tsx` | AI PM entry |
| V2AiPmWorkingExperience | `v2-ai-pm-working-experience.tsx` | AI PM thread + CTA |
| JourneyPageSkeleton | `journey-page-skeleton.tsx` | Loading |
| LandingCtaLink | `landing-cta-link.tsx` | Landing CTAs |
| AsyncStatePanel | `components/async-state-panel.tsx` | Error/empty/loading |

### Replace (MERGE in implementation sprint)

| Current | Target |
|---------|--------|
| V2JourneyMiniNav (right rail) | **Navigation tree** (left) |
| 8× entity `*-card.tsx` | `EntityListCard` |
| 6× score panels | `ScoreStatCard` |
| Inline Loader2 scatter | `LoadingSpinner` |
| AiPmOfficeChat variants | Single bubble + thread |

### Delete (after Route QA + CPO approval)

See `docs/UI_CONSISTENCY.md` — founder-ai-pm tree, projects UI, orphan V2 views, ExecutionWorkspaceView, duplicate headers.

### Component counts (audit 2026-07-29)

| Category | Active | Duplicate/orphan |
|----------|--------|------------------|
| Headers | 4 | 5 |
| Sidebars / nav rails | 2 | 4 |
| Workspace views | 6 | 12+ |
| Card patterns | ~15 V2/landing | ~80 legacy |
| Loading variants | 3 | 11 |
| AI chat surfaces | 2 (V2) | 8+ |

---

## Part 4 — Navigation component spec (design)

**Not implemented yet.**

```
NavigationItem
├── id: section (review | evidence | strategy | execution)
├── label: string
├── status: pending | active | complete
├── children?: NavigationItem[]  ← AI PM grows Review subtree
└── onSelect → updates Main only
```

**AI PM rule:** Each answered question may append a child under Review with `status: complete`.

---

## Part 5 — Review Main spec (design)

**First paint order (top → bottom):**

1. **Action** — recommended next step (sticky optional)
2. **Summary** — 3–5 lines max
3. **Expand:** Metrics, Risk, Evidence (collapsed by default)

Evidence opens in **Drawer** or inline expand — not a new page.

---

## Part 6 — Cursor enforcement

Before any UI PR:

1. Read `docs/UX_RULES.md`, `docs/WORKSPACE_IA.md`, this file
2. Changes only in **Main** unless CPO approves Nav/GNB
3. No new routes/pages/components unless audit lists them as KEEP/MERGE
4. Reference Figma philosophy: **2-column Workspace**, tree nav, minimal scroll

---

## Related docs

| Doc | Purpose |
|-----|---------|
| `SCREEN_MAP.md` | Routes |
| `WORKSPACE_IA.md` | Product IA + user terminology |
| `WORKSPACE_FLOW.md` | Journeys + AI PM state |
| `PRODUCT_PRINCIPLES.md` | Epic 3 law — AI PM > Report · 3-second rule |
| `UX_RULES.md` | 8 laws |
| `UI_CONSISTENCY.md` | Legacy debt + DELETE list |
| `ROUTE_QA.md` | Production redirect checklist |
