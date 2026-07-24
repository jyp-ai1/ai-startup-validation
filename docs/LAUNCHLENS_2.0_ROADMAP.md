# LaunchLens 2.0 — Product Roadmap

**Status:** Active (2026-07-24)  
**PM:** GPT · **Implementation:** Cursor (role-separated)  
**Supersedes:** Feature-list sprints (Sprint 0–14, L2.x–L3.4 legacy track — archived, not deleted)

---

## Why we pivoted

Feature-unit sprints (SWOT, TAM, Persona, …) grew the codebase but **blurred product concept**.  
LaunchLens 2.0 is **user journey / workflow first**, not menu-first.

**From:** AI Report Generator · menu-heavy workspace  
**To:** **Workflow Driven AI Strategy Workspace**

---

## Process (every Epic & Sprint)

```text
Vision
  ↓
Product Concept
  ↓
Epic
  ↓
Sprint (+ 4 kickoff questions — see SPRINT_PROCESS.md)
  ↓
QA (Product QA, not only bug QA)
  ↓
Preview Deploy
  ↓
PM QA + UX QA
  ↓
Fix
  ↓
Production
  ↓
Git Tag
  ↓
User Feedback
  ↓
Next Sprint
```

**Sprint completion ritual:** Preview → PM QA → UX QA → fix → Production → Git Tag → next Sprint

Details: [SPRINT_PROCESS.md](./SPRINT_PROCESS.md)

---

## Phase 0 — Product Pivot (Sprint 0)

**Goal:** Fix product philosophy before any new feature code.

| Deliverable | Doc |
|-------------|-----|
| Product Vision | `docs/sprints/SPRINT_0_PRODUCT_PIVOT.md` |
| Product Principle | same + update `LAUNCHLENS_PRODUCT_EXPERIENCE.md` |
| Workflow Map | same |
| Information Architecture | same |
| Navigation model | same |
| UX Flow | same |

**Forbidden in Sprint 0:** AI models, analysis features, new tools, prompts, export — **UX / product structure only**.

**Sprint brief:** [sprints/SPRINT_0_PRODUCT_PIVOT.md](./sprints/SPRINT_0_PRODUCT_PIVOT.md)

---

## Epic roadmap

| Phase | Epic | Goal | Done when |
|-------|------|------|-----------|
| **0** | **Product Pivot** | Philosophy, IA, UX, Workflow defined | Sprint 0 deliverables signed by PM |
| **1** | **Workflow Experience** | User follows AI guide through project | 5s value prop · guided flow · no menu confusion |
| **2** | **Decision Engine** | GO / HOLD / NO GO + Confidence | Decision clear without reading full report |
| **3** | **Evidence Engine** | Citation, Confidence, Why, Assumption | Every claim traceable |
| **4** | **Execution Workspace** | PRD, Roadmap, dev handoff | Idea → executable plan |
| **5** | **Living Strategy** | Ongoing monitoring, decision log | Strategy stays alive after first report |

---

## Epic 1 — Workflow Experience (after Sprint 0)

### Sprint 1 — First journey shell

```text
Landing → Goal Selection → Workflow creation → Strategy Workspace
```

- **No new analysis features** — structure and flow only  
- **UX QA:** Can a new user understand what this is in **5 seconds**?

### Sprint 2 — Guided navigation

- Workflow navigation, Progress, AI Guide, Completion states  
- **UX QA:** Does it feel like a **guide**, not a **menu**?

### Sprint 3 — Quick assessment surface

- Quick Assessment, GO / HOLD / NO GO, Confidence (presentation layer)  
- **UX QA:** Can user decide **without reading the full report**?

→ Epic 1 Production + tag

---

## Epic 2 — Evidence Engine

| Sprint | Focus | UX QA question |
|--------|-------|----------------|
| E2-S1 | Evidence, Citation, Confidence | Is every number backed by a visible source? |
| E2-S2 | Why button | Can user explain the verdict in one sentence? |
| E2-S3 | Assumption tracking | Are gaps and assumptions explicit? |

---

## Epic 3 — Decision Workspace

Decision-first workspace (evolve current Decision Center / Executive Dashboard toward workflow-native UX).

---

## Epic 4 — Execution Workspace

PRD, Roadmap, development spec — tied to workflow steps, not orphan menus.

---

## Epic 5 — Living Strategy

Monitoring, decision history, strategy updates over time.

---

## Legacy track (reference only)

Beta v0.9 RC (L3.4) shipped on `ai-startup-validation-tau.vercel.app`.  
Technical foundation (auth, AI providers, dashboard, reports) **remains** — Epic sprints **reshape UX**, not throw away backend.

| Legacy | Status |
|--------|--------|
| L3.0–L3.3 AI integration | ✅ Keep |
| L3.4 Open Beta QA / RC | ✅ Complete — see TASKS.md |
| L3.5 Browser Agent (old plan) | ⏸ Deferred — re-enter under Epic 2+ after workflow shell |

---

## Related docs

- [SPRINT_PROCESS.md](./SPRINT_PROCESS.md) — roles, kickoff questions, QA types
- [LAUNCHLENS_PRODUCT_EXPERIENCE.md](./LAUNCHLENS_PRODUCT_EXPERIENCE.md) — v1.0 bible (to be aligned in Sprint 0)
- [TASKS.md](./TASKS.md) — current sprint pointer
- [templates/SPRINT_KICKOFF_TEMPLATE.md](./templates/SPRINT_KICKOFF_TEMPLATE.md)
- [templates/UX_QA_TEMPLATE.md](./templates/UX_QA_TEMPLATE.md)
