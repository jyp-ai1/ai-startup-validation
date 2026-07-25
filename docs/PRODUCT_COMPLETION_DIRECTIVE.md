# LaunchLens Product Completion Directive v7

**Supersedes:** Mission Mode · Epic/Sprint completion targets  
**Mode:** Release Queue Consumer + **Product Completion Standard**  
**Consumer pointer:** `docs/QUEUE_STATE.md`

---

## Operating principle (immutable)

LaunchLens is completed through **Closed Beta → Open Beta → RC → v1.0**.

- Do **not** target Epic, Sprint, or Mission completion as goals.
- Goal = **service completion** at defined quality bar.
- Consume `ROADMAP_QUEUE` (T001–T300+) to end; when empty, **generate next queue** and continue.
- No mid-stream approval, questions, or confirmation.

---

## Development principle

A Task is **done** only when **all** completion criteria pass:

| Layer | Required |
|-------|----------|
| Core | Feature implementation |
| UX | UX improvement |
| Motion | Animation |
| States | Loading · Error · Empty · Retry |
| Resilience | Offline · Reconnect · Autosave · Restore |
| Access | Accessibility · Responsive |
| Discovery | SEO |
| Speed | Performance |
| Ops | Analytics · Admin monitoring · History |
| Ship | Documentation · Regression QA · Production deploy |

**Feature-only delivery is not completion.**

---

## Product vision (do not change)

LaunchLens is **not**:

- AI Chat
- Report generator
- Business plan writer

LaunchLens **is**:

> **AI Strategy Project Manager**

User does not ask questions. AI understands the project, builds Workflow, makes Decisions, and continuously proposes next actions. User **approves**.

Every implementation must match this vision. Read `docs/PRODUCT_VISION_V3.md`.

---

## Completion phases (16)

Phases are **quality bars**, not stop points. Queue consumer runs Tasks; Tasks map to Phases.

### Phase 1 — Product Journey Complete

**Goal:** Landing → Goal → Workflow → Workspace → first GO/HOLD → Execution in **~3 minutes**.

| Surface | Completion scope |
|---------|------------------|
| Landing | Hero · Story · Trust · Social proof · FAQ · CTA |
| Goal | AI Intake · Thinking · Progress · Context |
| Workflow | AI Recommendation · Why · Expected result · Confidence · Risk · Duration |
| Workspace | Today · Coach · Decision · Confidence · Timeline · History · Memory |
| Execution | MVP · Interview · Pricing · GTM · Government · Investment |

**R1 Tasks:** T001–T080 · **Active**

### Phase 2 — Intelligence Complete

Mock aligned with real architecture: Evidence · Citation · Confidence · Rule · Risk · Decision · Recommendation · Memory · Timeline · Execution · Reasoning · Tradeoff · Missing data · Health · Stability.

**R1–R2 Tasks:** T081–T140

### Phase 3 — Admin Complete

Dashboard · Funnels · Dropoff · Sessions · Goals · Projects · Retention · DAU/WAU/MAU · GO/HOLD rates · Completion · Errors · Flags · Release notes · Feedback · CSV · Analytics · Heatmap · Clarity · PostHog.

**Tasks:** T141–T180

### Phase 4 — Closed Beta Complete

Feedback widget · Beta notice · Announcements · User guide · Help · Onboarding · Email templates · Error guide · Recovery · Offline · Reconnect · Autosave · Restore.

**Tasks:** T181–T210

### Phase 5 — Open Beta Complete

Performance · Caching · Bundle split · SSR · ISR · Streaming · Images · Fonts · LCP · CLS · TBT · Memory · Monitoring · Logging · Alerts.

**Tasks:** T211–T250

### Phase 6 — Experience Complete

Animation · Transition · Skeleton · Loading copy · Celebration · Micro-interaction · Empty · Hover · Keyboard · Focus · (optional sound) on all core surfaces.

**Tasks:** cross-cutting per Task checklist

### Phase 7 — Responsive Complete

390 · 430 · 768 · 1024 · 1440 · 1920 — all pages QA ✅

### Phase 8 — Accessibility Complete

Keyboard · ESC · Focus · ARIA · Contrast · Screen reader · Dialog · Skip nav — **100** target

### Phase 9 — Performance Complete

Landing · Goal · Workflow · Workspace · Execution · Admin:

- Performance ≥ 95
- Accessibility ≥ 100
- Best Practices ≥ 100
- SEO ≥ 100

### Phase 10 — SEO Complete

Metadata · OG · Schema · Robots · Sitemap · Canonical · JSON-LD · Blog-ready structure

### Phase 11 — Documentation Complete

ADR · Release notes · Architecture · Product docs · Journey · QA report · Analytics · Ops guide · Dev guide (auto-maintained)

### Phase 12 — Regression Complete

Journey smoke · Regression · Functional · A11y · Responsive · Production verification

### Phase 13 — Product Polish

Copy · Spacing · Typography · Motion · Color · Icons · Cards · Buttons · Dialogs · Forms — unified UX

### Phase 14 — Open Beta Ready

100 real users operable

### Phase 15 — RC Ready

Bug-fix-only state

### Phase 16 — v1.0 Ready

Product complete → Commercial launch

---

## Auto-progress cycle (per Task)

```
Implement → Self Review → QA → Build → Lint → Type Check → Regression
→ Commit → Push → Production → Tag → Release Note → QUEUE_STATE update → Next Task
```

No questions. No waiting for approval.

---

## Stop conditions (5 only)

1. Build impossible (fix and resume)
2. Production outage (fix and resume)
3. External cost: DB · LLM · Billing · Auth
4. Security issue
5. Founder Product Vision change

Otherwise: **continue**.

---

## Reporting

**Once daily at 08:00 KST** — `docs/templates/DAILY_AUTONOMOUS_REPORT.md`

Never end with: questions · approval requests · "진행할까요?" · "배포할까요?"

---

## Source files

| File | Role |
|------|------|
| `docs/QUEUE_STATE.md` | Current Task pointer |
| `docs/ROADMAP_QUEUE.md` | Numbered queue |
| `docs/RELEASE_QUEUE.md` | Release stack R1–R7 |
| `.cursor/rules/product-completion-directive.mdc` | Cursor always-on rule |
| `.cursor/rules/infinite-queue-consumer.mdc` | Queue consumer rule |

Production: https://ai-startup-validation-tau.vercel.app
