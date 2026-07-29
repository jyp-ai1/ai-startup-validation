# Workspace Information Architecture

> **Sprint P1 — P1 (최우선)** · CPO sign-off  
> **Status:** ✅ Design fixed · Implementation forbidden until Thu Step 2  
> **User-facing name:** **Project Workspace** (internal route: `/validation?project=:id`)

---

## 1. One sentence

**Project Workspace** is where the founder talks with AI PM and reviews strategy — Review, Evidence, Strategy, and Execution are **sections inside one room**, not separate products.

---

## 2. Product hierarchy

```
LaunchLens
├── Home (Landing)
├── Login
├── Workspace List (/workspace)     ← "내 프로젝트들"
└── Project Workspace (/validation) ← ★ 본체
    ├── Review
    ├── Evidence
    ├── Strategy
    └── Execution
```

**Not in user vocabulary:** Validation, Dashboard, Decision Center, Projects shell.

---

## 3. Physical layout (fixed)

```
┌─────────────────────────────────────────────────────────┐
│ GNB                                                     │
├──────────────┬──────────────────────────────────────────┤
│ Sidebar      │ Main                                     │
│ (= Navigation│ (= current section content)              │
│   tree)      │                                          │
└──────────────┴──────────────────────────────────────────┘
```

| Area | Role | User question it answers |
|------|------|--------------------------|
| **GNB** | Global context | "Which project am I in?" |
| **Sidebar** | Progress + sections | "Where am I in the review?" |
| **Main** | Focus | "What do I need to read/do now?" |

**CPO:** No third column. No enterprise SaaS layout.

---

## 4. Sidebar (Navigation) — structure

### 4.1 Top-level (fixed order, always visible)

```
Review
Evidence
Strategy
Execution
```

Clicking a top-level item switches **Main** only — **no route change**, no new page.

### 4.2 Review subtree (dynamic — Epic 3)

Starts collapsed or minimal:

```
Review
```

As AI PM asks questions, tree **grows**:

```
Review
 ├ Summary        ✔
 ├ Problem        ✔
 ├ Customer       ●  ← in progress
 ├ Competitor
 └ Pricing
```

| Symbol | Meaning |
|--------|---------|
| ✔ | Complete |
| ● | Active |
| (none) | Not started |

**Source of truth:** AI PM session state → drives nav children.  
**User feeling:** "I'm building my review with AI" — not "endless scroll of questions."

### 4.3 Sidebar vs old UI

| Old | New |
|-----|-----|
| AppShell sidebar (Validation/Projects/Settings) | Only on **Workspace List** & settings — **not** on Project Workspace |
| V2JourneyMiniNav (right rail, scroll anchors) | **Replaced** by left tree |
| Phase pills (goal/workflow/workspace) | Pre-workspace only (`/who`, `/workflow`) |

---

## 5. Main — by section

### Review (default entry)

**Order in Main (top → bottom):**

1. **Action** — recommended next step (always visible above fold)
2. **Summary** — short verdict / state
3. Collapsed: Metrics, Risk, detail blocks
4. Evidence teaser → opens drawer

**Epic 5 rule:** User sees **current state + Action** without scrolling.

### Evidence

- Supporting data, sources, cards
- **Auxiliary** — opened from Review or Sidebar
- Prefer drawer / expand over full Main scroll

### Strategy

- Edits AI PM proposes (price, target, USP, market, BM)
- Lives in Main when Sidebar → Strategy selected

### Execution

- **Not a page** — tasks flowing from accepted Action
- Sidebar item for overview; detail in Main
- No `/execution` route (blocked)

---

## 6. AI PM flow (UX, not implementation)

```
Loading (labeled steps)
    ↓
Review / Summary appears in Main
    ↓
AI PM asks question (inline or thread — Main)
    ↓
Sidebar Review tree gains child + ✔
    ↓
Action updates in Main
    ↓
User accepts Action → Execution section activates
```

**Anti-pattern (delete):** Question → question → question → infinite scroll with no nav growth.

---

## 7. Routing vs IA

| User action | URL change? |
|-------------|-------------|
| Login → open project | Yes → `/validation?project=id` (once) |
| Switch Review / Evidence / … | No (state or `?section=`) |
| Switch Review leaf (Market, …) | No (`?focus=` optional) |
| Open Evidence drawer | No (overlay) |

All legacy URLs → redirect (see `ROUTE_QA.md`).

---

## 8. Onboarding path (new user)

```
/workspace → bootstrap
    ↓
/who (persona)
    ↓
/workflow (AI PM interview — pre-Workspace)
    ↓
/validation?project=id&welcome=1  → Project Workspace
```

Multi-project returning user:

```
/workspace → pick project → /validation?project=id
```

---

## 9. Mapping from current code (reference only)

| Today | Target |
|-------|--------|
| `v2-strategy-workspace.tsx` | Workspace shell |
| `v2-journey-mini-nav.tsx` | **Replace** → Navigation tree |
| `journey-layout.tsx` | GNB |
| `v2-thinking-workspace-main.tsx` | Main (Review) |
| `v2-ai-pm-inbox.tsx` | AI PM entry in Main |
| `execution-workspace-view.tsx` | **Delete** — Execution section |

---

## 10. Sign-off checklist

- [x] Workspace = one Project Workspace per project
- [x] Four sections, not four pages
- [x] Sidebar = Navigation tree (AI PM grows Review)
- [x] Main = single focus + Action first on Review
- [ ] CPO explicit approval
- [ ] Implementation sprint (Thu+) — **no code before approval**

---

## Related

- `docs/DESIGN_SYSTEM.md` — layout + components + visual rules
- `docs/UX_RULES.md` — 8 laws
- `docs/UI_CONSISTENCY.md` — what to delete
- `docs/SCREEN_MAP.md` — routes
