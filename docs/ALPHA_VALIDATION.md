# Alpha Validation — LaunchLens 2.0

**Stage:** LaunchLens 2.0 Alpha (`alpha-v2.0.0` prod · v2.0.1 autonomous Preview)  
**Goal:** Validate product experience before Public Beta (Epic 2 complete)

---

## Success criteria (user must feel)

1. **"AI is preparing my project"** — Goal → thinking overlay → Workflow
2. **"I understand why HOLD"** — Why + Evidence within 3 seconds on Workspace
3. **"I know what unlocks GO"** — Missing data + future confidence gains
4. **"AI guides next action"** — Coach speaks first, not empty dashboard

---

## Funnel metrics (design targets)

| Step | Event | Target (Alpha internal) |
|------|-------|---------------------------|
| Landing → Goal | `goal_selected` / landing views | > 25% |
| Goal → Workflow | `workflow_created` / `goal_selected` | > 80% |
| Workflow → Workspace | `workspace_loaded` / `workflow_created` | > 70% |
| Workspace → Coach | `coach_clicked` or `why_opened` | > 50% |

---

## QA gates (autonomous sprint)

| Gate | Threshold |
|------|-----------|
| Build / Lint / Type | PASS |
| Smoke (landing, goal, workflow, workspace, demo) | PASS |
| Responsive (375 / 768 / 1280) | Manual checklist |
| Accessibility (keyboard, aria on overlay/coach) | PASS |
| Lighthouse landing | ≥ 90 performance (best effort) |

---

## Feedback collection

- **Mock widget** on Workspace (👍/👎) — Alpha v2.0.1
- PM review of Preview URL + funnel doc before Public Beta

---

## Session replay

Compare PostHog vs Clarity — see [ANALYTICS_PLAN.md](./ANALYTICS_PLAN.md).

Install deferred until Epic 2 analytics wiring sprint.

---

## Related

- [ANALYTICS_PLAN.md](./ANALYTICS_PLAN.md)
- [EVENT_SCHEMA.md](./EVENT_SCHEMA.md)
