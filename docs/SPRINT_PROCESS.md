# Sprint Process — LaunchLens 2.0

**Effective:** 2026-07-24  
**Principle:** User journey over feature list. No sprint starts without a clear **experience delta**.

---

## Roles (Autonomous Mode v4)

| Role | Owner | Responsibility |
|------|-------|----------------|
| **CPO** | GPT | Product Vision, morning read, direction & priority adjustment — **not an approver** |
| **Founder** | User | Closed Beta feedback, business decisions |
| **Cursor (Senior Product Team)** | Cursor | Roadmap execution: develop → QA → Production → next Epic — **no stop, no questions** |

Cursor implements and verifies; CPO adjusts direction from morning reports.

---

## Before every Epic (kickoff — Cursor autonomous)

1. **이번 Epic에서 사용자가 달라지는 경험은 무엇인가?**
2. **어떤 Workflow 단계를 완성하는가?**
3. **Production 배포 가능한 완성도인가?**

PM approval is **not** required to start standard Closed Beta Epics.

Template: [templates/SPRINT_KICKOFF_TEMPLATE.md](./templates/SPRINT_KICKOFF_TEMPLATE.md)

---

## QA types

### Functional QA (baseline)

- Build, lint, typecheck
- Smoke URLs (`docs/DEPLOY_SMOKE.md`)
- Regression on auth, demo, dashboard

### Product / UX QA (primary — constitution)

Each sprint uses **exactly 5 Product QA questions** (all must PASS).  
Epic 1 default set in [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) and [templates/UX_QA_TEMPLATE.md](./templates/UX_QA_TEMPLATE.md).

Functional QA (login, API, build) is **necessary but not sufficient**.

---

## Sprint completion checklist (Autonomous Mode v4)

```text
[ ] Epic scope = user experience delta
[ ] Implementation complete (experience-first)
[ ] Functional QA PASS (lint, build, smoke)
[ ] Production Deploy + Git Tag
[ ] Daily Autonomous Report (ends with Next Autonomous Target — no PM questions)
[ ] TASKS.md + RELEASES updated when applicable
[ ] Immediately start next Epic (no PM wait)
```

**Policy:** [PM_REVIEW_POLICY.md](./PM_REVIEW_POLICY.md) v4

- **Standard Epics:** Production → Report → **next Epic** (CPO reads morning report only).
- **Pivot / Auth / Real AI / Billing / DB:** Production blocked until CPO approval.

### Daily Autonomous Report (mandatory)

Template: [templates/DAILY_AUTONOMOUS_REPORT.md](./templates/DAILY_AUTONOMOUS_REPORT.md)

```text
Version · Production · Commit · Tag · 경험 · UX · Issues · Analytics · QA · Next Autonomous Target
```

No Preview URL. **No closing question to PM.**

**Deploy target:** repo root · `vercel --prod --yes` · prod `https://ai-startup-validation-tau.vercel.app`  
See [DEPLOY_QUICKSTART.md](./DEPLOY_QUICKSTART.md), [DEPLOY_SMOKE.md](./DEPLOY_SMOKE.md)

---

## What changed from L3.x

| Before | After |
|--------|-------|
| Sprint = feature batch | Sprint = **workflow step** + UX outcome |
| QA = feature test | QA = **Product QA** + regression |
| Menu / module growth | **Guide / progress** growth |
| Cursor = generic dev | Cursor = **named roles** per task |

---

## Current pointer

**Constitution:** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md)  
**PM Review:** [PM_REVIEW_POLICY.md](./PM_REVIEW_POLICY.md)  
**Stage:** LaunchLens Closed Beta 2.1.0 — [Day 1 report](./sprints/AUTONOMOUS_REPORT_v2.1.0.md)  
**Production:** https://ai-startup-validation-tau.vercel.app  
**Next:** Day 2 — Analytics & Admin Operations
