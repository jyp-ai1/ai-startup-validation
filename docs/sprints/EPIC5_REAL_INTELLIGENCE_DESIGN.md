# Epic 5 Design Brief — Real Intelligence

**Status:** Design only — **implementation forbidden** until PM approval  
**Epic 4 prerequisite:** Product Readiness gates pass

---

## Mission

Mock Intelligence → **Real Intelligence**

- Real LLM responses (via `@repo/ai`)
- Real citations and evidence lineage
- Real confidence scoring from project data
- DB-backed projects and per-user workspace memory

---

## Information Architecture

```
User Account
└── Projects (DB)
    ├── Intelligence Profile (computed)
    ├── Memory Entries (@repo/db)
    ├── Daily Brief (generated)
    └── Journey State (goal → workflow → workspace)
```

**Journey alpha path** (`/goal` → `/workspace`) merges into authenticated project after login.

---

## Data Model (draft)

| Entity | Storage | Notes |
|--------|---------|-------|
| `ProjectIntelligence` | Computed view | From stats + memories |
| `ProjectMemoryEntry` | `@repo/db` | Already exists |
| `JourneySession` | Cookie → DB on auth | Goal, template, mock progress |
| `ConfidenceSnapshot` | Memory type | Timeline history |

---

## ADR recommendation

Record as **ADR-00X Real Intelligence Boundary** in `docs/DECISIONS.md`:

- Apps never import LLM SDKs
- Intelligence services in `features/project-intelligence/services`
- Repository adapters in `@repo/db`
- Mock journey remains fallback when `DATABASE_URL` unset

---

## Out of scope (Epic 5)

- Billing, multi-tenant admin
- PostHog production keys (interface ready in Epic 4)
- Full dashboard ↔ journey unification (Epic 5 Sprint 2)
