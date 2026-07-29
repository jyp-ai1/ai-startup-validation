# Workspace Information Architecture

> **Sprint P1 Epic 2** — CPO sign-off target  
> **Status:** IA fixed · Layout implementation = Step 2 (Thu)

---

## Principle

One **Project Workspace** per project. Four **sections**, not four **pages**.

```
Project Workspace (/validation?project=:id)

├── Review      ← default entry, Summary + Action above fold
├── Evidence    ← auxiliary (drawer / expand)
├── Strategy    ← in-workspace panel
└ Execution     ← flows from Review Action, not a separate route
```

User mental model: *"I'm in my Workspace. I pick Review / Evidence / … on the left."*

---

## Layout (frozen)

```
┌──────────────────────────────────────────────────┐
│ GNB — project name · locale · account            │
├──────────────┬───────────────────────────────────┤
│ Navigation   │ Main                              │
│              │                                   │
│ Review    ▼  │  [Current section content]        │
│  Summary  ✔  │                                   │
│  Market      │  Action (sticky / top when Review)│
│  Risk        │                                   │
│ Evidence     │                                   │
│ Strategy     │                                   │
│ Execution    │                                   │
└──────────────┴───────────────────────────────────┘
```

| Zone | Responsibility |
|------|----------------|
| **GNB** | Brand, project context, global actions |
| **Navigation** | Section tree; expands with AI PM progress |
| **Main** | Exactly one active section view |

**Not allowed:** third column, full-page hops to `/execution`, separate Evidence page.

---

## Navigation behavior

### Top-level sections (fixed order)

1. **Review** — primary; always available
2. **Evidence** — secondary
3. **Strategy** — secondary
4. **Execution** — secondary (linked from Review Action)

### Review subtree (grows with AI PM — Epic 3)

Initial:

```
Review
```

After AI PM questions:

```
Review
 ├ Summary ✔
 ├ Problem ✔
 ├ Customer
 ├ Competitor
 └ Pricing
```

- ✔ = completed / answered
- Click leaf → Main shows that slice (no route change)
- Tree state = **AI PM progress UX** (not a separate progress page)

---

## Main content by section

| Section | Main shows | Evidence |
|---------|--------------|----------|
| **Review** | Summary + **Action** (above fold) | Expand/drawer for detail |
| **Evidence** | List / cards of supporting data | Inline or drawer |
| **Strategy** | Strategy canvas / edits | — |
| **Execution** | Tasks from accepted Action | — |

### Review rules (Epic 5)

- First paint: **Summary + Action only**
- Metrics, Risk, long Evidence lists → collapsed or drawer
- **Action always visible** when on Review

---

## Routing vs IA

| User action | URL | Page navigation? |
|-------------|-----|------------------|
| Open project | `/validation?project=id` | Once from hub |
| Switch section | `?section=review` or in-memory state | **No** full page load |
| Switch Review leaf | hash or `?focus=market` | **No** |
| Open Evidence drawer | overlay | **No** |

Legacy `/execution`, `/projects/[id]/evidence`, etc. → **redirect** to Project Workspace (see `legacy-route-redirects.ts`).

---

## Implementation map (Step 2 — no UI yet in Step 1)

| Current file | Role today | Target |
|--------------|------------|--------|
| `v2-strategy-workspace.tsx` | Monolithic canvas | Shell: Nav + Main router |
| `v2-journey-mini-nav.tsx` | Phase pills | Replace with **section tree** |
| `journey-layout.tsx` | GNB + width | **Workspace layout freeze** |
| `v2-thinking-workspace-main.tsx` | Main compose | Main: Review compose |
| `execution-workspace-view.tsx` | Separate page | **Delete** — absorb into Main |
| `/execution` route | Page | **Blocked** → `/validation` |

---

## Completion criteria (Epic 2)

- [ ] Single URL `/validation?project=` hosts all four sections
- [ ] Clicking Nav item changes **Main only**
- [ ] No user-facing navigation to legacy `/projects/*`
- [ ] `docs/UX_RULES.md` referenced in PR template / Cursor rules

---

## Related docs

- `docs/SCREEN_MAP.md` — routes & journey
- `docs/UX_RULES.md` — non-negotiable UX law
