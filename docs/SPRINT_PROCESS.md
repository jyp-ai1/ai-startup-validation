# Sprint Process — LaunchLens 2.0

**Effective:** 2026-07-24  
**Principle:** User journey over feature list. No sprint starts without a clear **experience delta**.

---

## Roles

| Role | Owner | Responsibility |
|------|-------|----------------|
| **PM** | GPT | Vision, Epic design, PASS/HOLD, Product QA criteria |
| **Senior Frontend** | Cursor | UI, workflow screens, `@repo/ui`, app routes |
| **Senior Backend** | Cursor | Services, repositories, API — no SDK in apps |
| **UX Engineer** | Cursor | IA, flows, copy, progress/guide patterns |
| **QA Engineer** | Cursor | Product QA scripts + regression — not bugs only |
| **DevOps** | Cursor | Preview/prod deploy, smoke, tags, rollback report |

PM sets *what* and *why*; Cursor roles implement and verify *how*.

---

## Before every Sprint (mandatory kickoff)

Do **not** write feature code until PM approves answers to:

1. **이번 Sprint에서 사용자가 달라지는 경험은 무엇인가?**
2. **이 Sprint가 어떤 Workflow 단계를 완성하는가?**
3. **PM이 무엇을 검증해야 하는가?** (UX QA question)
4. **완료 후 즉시 Production에 배포 가능한 수준인가?**

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

## Sprint completion checklist (Autonomous Mode — Closed Beta)

```text
[ ] Day Epic scope = user experience delta (1 Day = 1 Epic)
[ ] Implementation complete (experience-first — no invisible features)
[ ] Functional QA PASS (lint, build, smoke on Preview — internal)
[ ] Production Deploy + Git Tag
[ ] Morning Autonomous Report (Production URL — no Preview URL)
[ ] TASKS.md + RELEASES updated
[ ] PM reviews Production only (~5 min checklist — docs/PM_REVIEW_POLICY.md)
```

**PM Review Policy:** [PM_REVIEW_POLICY.md](./PM_REVIEW_POLICY.md)

- **Standard sprints:** Cursor → Preview (internal QA) → **Production** → Report. PM checks Production only.
- **Pivot / Auth / Real AI / Billing / DB:** Preview → **PM approval** → Production blocked until approved.

### Morning Autonomous Report (mandatory)

Template: [sprints/AUTONOMOUS_REPORT_v2.1.0.md](./sprints/AUTONOMOUS_REPORT_v2.1.0.md)

```text
Version · Production · Commit · Tag · QA · 새로운 사용자 경험 · Known Issues · 다음 Epic · 진행률
```

No Preview URL unless PM approval category applies.

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
