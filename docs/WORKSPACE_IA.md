# Workspace Information Architecture — Blueprint

> **Sprint Epic 2** · Workspace IA Blueprint  
> **Status:** ✅ **CPO APPROVED** (2026-07-29) · Epic 3 implementation authorized  
> **User-facing name:** **Project Workspace** (internal route: `/validation?project=:id`)  
> **Companion:** [`WORKSPACE_FLOW.md`](./WORKSPACE_FLOW.md) · [`PRODUCT_PRINCIPLES.md`](./PRODUCT_PRINCIPLES.md)

---

## 1. One sentence

**Project Workspace** is where **AI PM leads the founder** through one project — the Sidebar shows **live progress**, not a document outline. Overview, Insights, Recommendations, and Next Actions **emerge from AI PM work**, not the other way around.

---

## 2. Terminology — internal vs user-facing

CPO rule: **Review / Evidence / Strategy / Execution** are **engineering & docs vocabulary only**.  
Users never see these labels in navigation or copy.

| User sees (UI) | Korean hint | Internal (code/docs) | Role |
|----------------|-------------|----------------------|------|
| **Overview** | 현재 상태 | `review` | Where am I? What's the verdict? What should I do next? |
| **Insights** | 핵심 분석 | `evidence` | Supporting analysis & sources — on demand |
| **Recommendations** | 전략 제안 | `strategy` | Proposed changes (price, target, USP, market, BM) |
| **Next Actions** | 실행 계획 | `execution` | Tasks accepted from Overview — not a separate app area |

**Sidebar label length (implementation review):** CPO may shorten nav copy — e.g. **Overview · Insights · Strategy · Actions** — if tree width demands it. Full names stay in tooltips / section headers.

| Always say | Never say to users |
|------------|-------------------|
| Project Workspace | Validation, Dashboard, Decision Center |
| Workspace List | My Projects (duplicate hub) |
| Overview | Review (in UI) |

**i18n namespace suggestion (implementation sprint):**

```
workspace.sections.overview
workspace.sections.insights
workspace.sections.recommendations
workspace.sections.nextActions
```

Internal query keys may keep `?section=review` until a dedicated rename sprint; UI copy uses user terms only.

---

## 3. Product hierarchy

```
LaunchLens
├── Home (Landing)
├── Login
├── Workspace List (/workspace)          ← "내 프로젝트"
└── Project Workspace (/validation)      ← ★ 본체 — AI PM leads
    ├── AI PM mode      (first entry — Main)
    ├── Overview        (emerges after first topics)
    ├── Insights        (on demand)
    ├── Recommendations (after strategy delta)
    └── Next Actions    (after Action accepted)
```

**LaunchLens flow (product, not route list):**

```
Workspace
    ↓
AI PM                    ← first screen inside Project Workspace
    ↓
Overview                 ← generated as topics complete
    ↓
Insights
    ↓
Recommendations
    ↓
Next Actions
```

We are **not** a report-reading service. Overview is an **output of AI PM**, not the entry point.

---

## 4. Physical layout (frozen)

```
┌─────────────────────────────────────────────────────────┐
│ Top GNB — logo · project name · locale · account       │
├──────────────┬──────────────────────────────────────────┤
│ Sidebar      │ Main                                     │
│ (= AI PM     │ (= AI PM thread OR section content)      │
│   progress)  │                                          │
│              │                                          │
│ Overview  ▼  │  AI PM question — OR —                   │
│  ○ Summary   │  Business Score + Summary + Next Step    │
│  ● Customer  │                                          │
│  ○ Market    │                                          │
└──────────────┴──────────────────────────────────────────┘
```

| Zone | Role | User question |
|------|------|---------------|
| **GNB** | Global context | "Which project am I in?" |
| **Sidebar** | **AI PM progress** for this project | "Where is AI PM in the analysis?" |
| **Main** | AI PM thread **or** section focus | "What is AI PM asking / showing **now**?" |

### Layout constraints (non-negotiable)

| Rule | Detail |
|------|--------|
| **2 columns only** | Sidebar + Main under GNB |
| **No third column** | No Left \| Center \| Right enterprise SaaS |
| **No sticky right panel** | `V2JourneyMiniNav` (scroll anchors) → **delete/replace** |
| **No new routes** | Section switch = state / optional `?section=` |
| **No AppShell sidebar** | Project Workspace uses Journey GNB shell only |

See `docs/DESIGN_SYSTEM.md` Part 1 for spacing tokens.

---

## 5. Sidebar — AI PM progress (not a document outline)

### 5.1 Sidebar shows process, not a report structure

- Sidebar answers: **"Where is AI PM in *this* project?"**
- It is **not** a static document TOC with four finished chapters.
- It is **not** a global app menu (Settings, Admin, etc. live in GNB or Workspace List).
- Clicking a node updates **Main only** — no full page navigation.

**CPO principle:** Process-first, not deliverable-first.  
Users feel **AI PM leading them** — not **reading a report they didn't write yet**.

### 5.2 Sidebar Lifecycle (every nav node)

Every topic node under Overview moves through:

```
Waiting
    ↓
In Progress
    ↓
Completed
    ↓
Collapsed          ← optional; completed nodes fold to save space
```

| Lifecycle stage | Sidebar symbol | User sees |
|-----------------|------------------|-----------|
| **Waiting** | ○ | Topic exists but AI PM hasn't started it |
| **In Progress** | ● | AI PM is asking or analyzing this topic now |
| **Completed** | ✔ | Topic done — user may revisit leaf summary |
| **Collapsed** | ✔ (folded) | Completed node hidden under Overview expand |

**Navigation Node State (canonical — three symbols only):**

```text
○   Waiting      — not started
●   In Progress  — active now
✔   Completed    — done
```

No fourth symbol. Stale/re-review uses ✔ + subtle badge in implementation — not a new glyph.

### 5.3 Progress example (CPO reference)

**Project start:**

```text
Overview
 ○ Summary
```

**After one question:**

```text
Overview
 ✔ Summary
 ● Customer
```

**After market research completes:**

```text
Overview
 ✔ Summary
 ✔ Customer
 ✔ Market
 ● Competitor
```

Top-level sections (**Insights**, **Recommendations**, **Next Actions**) **unlock as outputs exist** — they do not appear as empty document tabs on day one.

### 5.4 Top-level sections (fixed order when visible)

```
Overview          ← subtree grows from first AI PM question
Insights          ← visible after first source exists
Recommendations   ← visible after first strategy proposal
Next Actions      ← visible after first Action accepted
```

| Behavior | Detail |
|----------|--------|
| Order | Always this sequence once unlocked |
| First entry | **AI PM in Main** — not Overview block stack |
| Selection | One active node OR one section at a time |
| URL | Optional `?section=` / `?focus=` — cosmetic only |

### 5.5 Overview subtree (dynamic — grows with AI PM)

Starts minimal:

```text
Overview
 ○ Summary
```

As AI PM progresses — see §5.3 examples.

**Source of truth:** AI PM session state (`WorkflowStepId` + review round → unified `NavNode` model).  
**User feeling:** "AI PM is building my project with me" — not "here are four empty report sections."

### 5.6 Other section subtrees (Phase 2+)

| Section | Subtree pattern |
|---------|-----------------|
| **Insights** | Flat list of source cards (Market data, Trends, Competitors…) — opens drawer from Main |
| **Recommendations** | One leaf per proposed change (Pricing, Target, USP…) |
| **Next Actions** | One leaf per accepted task (status: todo / in progress / done) |

Epic 2 fixes **Overview subtree + Main blocks** first. Other subtrees may stay flat in v1 implementation.

### 5.7 Sidebar vs current code

| Current (delete/replace) | Target |
|--------------------------|--------|
| `V2JourneyMiniNav` — right rail, scroll spy | Left **Navigation tree** |
| Long vertical Main with `#journey-section-*` anchors | Main swaps content; no anchor scrolling |
| Phase pills on `/who`, `/workflow` | Pre-Workspace only — not on Project Workspace |

---

## 6. Main — section content

**Rule:** Main shows **one job at a time** — **AI PM thread**, **Overview blocks**, or a **selected leaf**.

### 6.0 First entry — AI PM mode (not Overview)

When user opens Project Workspace:

| Zone | First paint |
|------|-------------|
| **Main** | AI PM thread — first question or resume prompt |
| **Sidebar** | `Overview → ○ Summary` (minimal tree) |
| **Overview blocks** | **Not shown yet** — emerge after first ✔ nodes |

Returning user with completed review: may land on Overview with Business Score + Summary — AI PM only re-activates if stale.

### 6.1 Overview (emerges from AI PM — not entry point)

Overview is **not** one long report. It is a **block stack** that **AI PM generates**:

```text
Business Score          ← brand anchor (e.g. 74)
    ↓
Summary
    ↓
Recommended Next Step   ← inline continuation, NOT a separate card section
    ↓
Risk
    ↓
Recommendation
```

| Block | Purpose | Default visibility |
|-------|---------|-------------------|
| **Business Score** | LaunchLens score — trust + progress anchor | Visible once first review completes |
| **Summary** | Current state in 2–3 sentences | Always expanded |
| **Recommended Next Step** | Single primary CTA flowing from Summary | **Inline** — reads as next paragraph, not a card |
| **Risk** | What could go wrong | Collapsible if non-empty |
| **Recommendation** | AI PM strategic suggestion | Collapsible if non-empty |

#### Action policy (CPO)

| Rule | Target |
|------|--------|
| **Not a card** | No bordered "Action card" — use **Recommended Next Step** inline after Summary |
| **Reading flow** | User reads Summary → immediately sees next step + `[ Start ]` — **no extra scroll to a separate Action section** |
| **Scroll budget** | Risk + Recommendation within **2–3 scrolls** total after Summary + Next Step |
| **One primary Action** | One recommended next step; no competing CTAs |
| **Above the fold** | Business Score (if exists) + Summary + Recommended Next Step on desktop |

**Layout intent (desktop — after Overview exists):**

```text
┌─────────────────────────────────────┐
│ Business Score          74          │  ← brand
│ Summary (compact)                   │
│ Recommended Next Step               │
│ → 고객 인터뷰 진행                    │  ← inline, not card
│ [ Start ]                           │  ← above fold
├─────────────────────────────────────┤
│ Risk (collapsible)                  │
│ Recommendation (collapsible)        │  ← within 2–3 scrolls
└─────────────────────────────────────┘
```

When user selects an Overview **leaf** (e.g. Customer), Main switches to **focused topic view**; block stack collapses to breadcrumb back to Overview home.

### 6.2 Insights — evidence policy

**Insights never dominate Main by default.**

| Rule | Detail |
|------|--------|
| **Not in Overview scroll** | No full Evidence section inline in Overview |
| **On demand** | User taps **"근거 보기" / "View sources"** → **Drawer** or **Expand** |
| **Teaser only** | Overview may show count + link: "3 sources" — not full cards |
| **Insights section** | Optional dedicated Main when Sidebar → Insights; still card list, not infinite scroll |

**Drawer contents:** source title, snippet, confidence, link out, related Overview leaf.

Existing component to evolve: `V2EvidenceDetailDrawer` — keep pattern, remove default inline `V2WhySourcesSection` from Overview scroll.

### 6.3 Recommendations

- AI-proposed edits grouped by domain (pricing, customer, USP, market, BM).
- Each item: before → after, rationale (1 paragraph), accept / defer.
- Accepting a recommendation may spawn a **Next Action** leaf.

### 6.4 Next Actions

- **Not a page** — section inside Project Workspace.
- List of tasks flowing from accepted Actions.
- Status chips; no `/execution` route (middleware blocked).
- Empty state: "Accept an Action from Overview to start."

---

## 7. AI PM ↔ Sidebar coupling

```
User opens Project Workspace
        ↓
Main = AI PM thread (first question)
Sidebar = Overview → ○ Summary
        ↓
AI PM asks question (Main — inline thread)
        ↓
Sidebar node → ● In Progress
        ↓
User answers / confirms
        ↓
Sidebar node → ✔ Completed; next node → ○ or ●
        ↓
Enough topics complete → Overview blocks appear in Main
        (Business Score → Summary → Recommended Next Step → …)
        ↓
User accepts Next Step → Next Actions section unlocks in Sidebar
```

| Anti-pattern | Why forbidden |
|--------------|---------------|
| Questions stack with no nav growth | User loses progress sense |
| Full page reload per question | Breaks "one room" metaphor |
| Evidence wall before Summary | Violates Insights-on-demand policy |

**Loading state:** labeled steps in Main ("Analyzing market…") — Sidebar may show ● on active leaf.

---

## 8. Routing vs IA

| User action | URL change? |
|-------------|-------------|
| Login → open project | Yes → `/validation?project=id` (once) |
| Switch Overview / Insights / … | Optional `?section=` only |
| Switch Overview leaf (Market, …) | Optional `?focus=` only |
| Open Insights drawer | No (overlay) |
| Accept Action | No (state + optional toast) |

All legacy URLs → redirect (see `ROUTE_QA.md`). **No new routes in Epic 2.**

---

## 9. Onboarding paths

**New user:**

```
/workspace → bootstrap
    ↓
/who (persona)
    ↓
/workflow (AI PM interview — pre-Workspace)
    ↓
/validation?project=id&welcome=1 → Project Workspace (AI PM first)
```

**Returning user (multi-project):**

```
/workspace → pick project → /validation?project=id
    ↓
AI PM resume OR Overview (if review complete)
```

Pre-Workspace screens (`/who`, `/workflow`) stay **single-column Journey layout** — not Project Workspace shell.

---

## 10. Mapping from current code (reference — do not implement here)

| Today | Target |
|-------|--------|
| `v2-strategy-workspace.tsx` | Workspace shell orchestrator |
| `v2-journey-mini-nav.tsx` | **Replace** → left Navigation tree |
| `journey-layout.tsx` | GNB shell |
| `v2-thinking-workspace-main.tsx` | Main — Overview blocks + leaf views |
| `v2-ai-pm-inbox.tsx` | AI PM entry in Main (Overview) |
| `v2-why-sources-section.tsx` | Move behind Insights / drawer only |
| `execution-workspace-view.tsx` | **Delete** — Next Actions section |
| `v2-workflow-steps.ts` | Seed data for Overview subtree nodes |

---

## 11. Sign-off checklist

- [x] 2-column layout defined (GNB + Sidebar + Main)
- [x] User-facing terminology mapped (Overview / Insights / Recommendations / Next Actions)
- [x] Sidebar = **AI PM progress** (process-first, not document TOC)
- [x] **Sidebar Lifecycle** — Waiting → In Progress → Completed → Collapsed
- [x] **Navigation Node State** — ○ ● ✔
- [x] Overview block stack — **Business Score** → Summary → Recommended Next Step → Risk → Recommendation
- [x] Recommended Next Step **inline** after Summary (not Action card)
- [x] Insights on-demand (drawer / expand); not default Main scroll
- [x] **AI PM-first flow** — Workspace → AI PM → Overview
- [x] No new routes / layouts / UI in this sprint
- [x] **CPO explicit approval** (2026-07-29)
- [ ] Implementation sprint — [`EPIC3_WORKSPACE_LAYOUT.md`](./sprints/EPIC3_WORKSPACE_LAYOUT.md)

---

## Related

- [`WORKSPACE_FLOW.md`](./WORKSPACE_FLOW.md) — flows & state machine
- [`UX_RULES.md`](./UX_RULES.md) — non-negotiable UX law
- [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md) — layout tokens + components
- [`SCREEN_MAP.md`](./SCREEN_MAP.md) — routes & journey
- [`UI_CONSISTENCY.md`](./UI_CONSISTENCY.md) — legacy deletion backlog
