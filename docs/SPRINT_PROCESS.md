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

## Sprint completion checklist

```text
[ ] Sprint kickoff 4 questions answered (PM sign-off)
[ ] Implementation complete (scope only — no drive-by features)
[ ] Functional QA PASS (lint, build, smoke)
[ ] Preview Deploy (never skip before Product QA)
[ ] PM Product QA PASS (5 questions + UX Laws)
[ ] Sprint close report (experience format — see below)
[ ] Fixes merged (if PASS WITH REVISION)
[ ] Production Deploy — only if PM approves (not automatic)
[ ] Git Tag (e.g. epic1-sprint2)
[ ] TASKS.md + ROADMAP updated
[ ] User feedback captured → next sprint input
```

### Sprint close report (mandatory — experience, not features)

Template: [templates/SPRINT_CLOSE_TEMPLATE.md](./templates/SPRINT_CLOSE_TEMPLATE.md)

```text
Sprint 결과

새 기능:
❌ 작성하지 않음

새로운 사용자 경험:
✅ (what changed for the user)

이번에 해결한 문제:
"(quoted user problem)"

다음 Sprint에서 해결할 문제:
"(quoted user problem)"
```

Sprints are defined by **new user experience**, not feature lists.

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
**Sprint 0:** ✅ Complete (PASS WITH REVISIONS)  
**Epic 1 Sprint 1:** ✅ Product QA Conditional PASS · Production ⛔ HOLD — [QA report](./sprints/EPIC1_SPRINT1_QA_REPORT.md)  
**Next:** [Epic 1 Sprint 2 kickoff](./sprints/EPIC1_SPRINT2_KICKOFF.md) — await PM **"Sprint 2 시작"**
