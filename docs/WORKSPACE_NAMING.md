# Workspace Naming Review — PM Doc Only

**Date:** 2026-07-24  
**Sprint:** Autonomous Alpha v2.0.1  
**Action:** Documentation only — no route rename in this sprint

---

## Current

- i18n key: `workflow.workspace.title` → **Strategy Workspace**
- Route: `/workspace`

---

## Candidates (PM)

| Name | Pros | Cons |
|------|------|------|
| **AI Strategy Workspace** | Matches North Star verbatim | Long in nav |
| **Decision Workspace** | Decision-first emphasis | Less "strategy project" |
| **Strategy Project** | Project growth metaphor | Less "workspace" SaaS feel |

---

## Recommendation (Engineering)

Keep **Strategy Workspace** in UI until Epic 2 Intelligence ships, then A/B **AI Strategy Workspace** on Workspace H1 only.

Do not rename `/workspace` path — breaks Alpha smoke URLs and bookmarks.

---

## Related

- [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)
- [sprints/EPIC1_CLOSE_REPORT.md](./sprints/EPIC1_CLOSE_REPORT.md)
