# Roadmap Queue — Infinite Consumer

**Parent:** `docs/RELEASE_QUEUE.md` · **State:** `docs/QUEUE_STATE.md`

Cursor reads `QUEUE_STATE.md` → executes `current_task` → updates → repeats until R7 last task.

## Releases

| Release | Tasks | IDs | Status |
|---------|-------|-----|--------|
| R1 Closed Beta | 300 | T001–T300 | **active** 42/300 |
| R2 Open Beta | 280 | T301–T580 | queued |
| R3 RC1 | 240 | T581–T820 | queued |
| R4 RC2 | 200 | T821–T1020 | queued |
| R5 v1.0 | 500 | T1021–T1520 | queued |
| R6 Real Intelligence | 1000+ | T1521+ | PM gate |
| R7 Commercial Scale | TBD | — | queued |

---

## R1 Task Index (T001–T300)

### M1 Landing (T001–T050)

| ID | Task | Status |
|----|------|--------|
| T001 | Hero north star copy | ✅ |
| T002 | Hero subtitle + CTA | ✅ |
| T003 | Hero static LCP preview | ✅ |
| T004 | Journey strip visual | ✅ |
| T005 | Story section | ✅ |
| T006 | Before/After contrast | ✅ |
| T007 | Journey 7-step section | ✅ |
| T008 | Why section | ✅ |
| T009 | AI PM explainer | ✅ |
| T010 | FAQ top objections | ✅ |
| T011 | Footer legal + version | ✅ |
| T012 | SEO metadata + OG | ✅ |
| T013 | Landing analytics CTA events | ✅ |
| T014 | Below-fold lazy sections | ✅ |
| T015 | Dynamic below-fold imports | ✅ |
| T016 | Deferred analytics idle | ✅ |
| T017 | Nav anchor fix #journey | ✅ |
| T018 | Lighthouse Landing 95+ | ⏳ |
| T019 | Responsive 390 | ⏳ |
| T020 | Responsive 768 | ⏳ |
| T021 | Responsive 1024 | ⏳ |
| T022 | Responsive 1440 | ⏳ |
| T023 | Responsive 1920 | ⏳ |
| T024 | A11y skip link | ✅ |
| T025 | A11y focus order Landing | ⏳ |
| T026 | A11y contrast pass | ⏳ |
| T027 | Founder 5s clarity QA | ⏳ |
| T028–T050 | Landing polish · telemetry · docs · regression | ⏳ |

### M2 Goal (T051–T080)

| ID | Task | Status |
|----|------|--------|
| T051 | Goal 4-card selection | ✅ |
| T052 | 7-step thinking overlay | ✅ |
| T053 | Thinking rotating copy | ✅ |
| T054 | Thinking modal a11y | ✅ |
| T055 | Goal → Workflow handoff | ✅ |
| T056 | Thinking < 8s feel QA | ✅ |
| **T043*** | **Intake interactive textarea** | 🔄 |
| **T044*** | **Intake refinement chips** | 🔄 |
| **T045*** | **Intake sessionStorage** | 🔄 |
| T046 | Intake analytics event | 🔄 |
| T047 | Goal i18n en parity | ⏳ |
| T048 | Goal Lighthouse 95+ | ⏳ |
| T049–T080 | Goal error · empty · retry · docs | ⏳ |

*Note: T043–T046 renumbered in active sprint — see QUEUE_STATE.*

### M3 Workflow (T081–T105)

T081 compose mock ✅ · T082 single CTA ✅ · T083 stack cards ✅ · T084 nav focus ✅ · T085–T105 perf · QA ⏳

### M4 Workspace (T106–T135)

T106 Today PM ✅ · T107 progress ring ✅ · T108 confidence gain ✅ · T109 tabs ✅ · T110 coach ✅ · T111 feedback a11y ✅ · T112–T135 ⏳

### M5 Decision (T136–T165)

T136 GO/NO-GO ✅ · T137 undo/redo ✅ · T138 evidence drawer ✅ · T139 confidence ✅ · T140 history JSON ✅ · T141 history CSV ✅ · T142–T165 ⏳

### M6 Execution (T166–T190)

T166 GO celebration a11y ✅ · T167 link /execution ✅ · T168 task board ✅ · T169 back nav ✅ · **T170** task toggle ⏳ · **T171** progress ring ⏳ · **T172** dynamic coach ⏳ · T173–T190 ⏳

### M7 Daily (T191–T210) · M8 Intelligence (T211–T230) · M9 Admin (T231–T255)

Most core ✅ — remaining perf · analytics · docs ⏳

### M10 Perf (T256–T275) · M11 A11y (T276–T290) · M12 Ops (T291–T300)

Route split ✅ · SSG ✅ · flags ✅ · release notes ✅ · Lighthouse 95+ all routes ⏳ · A11y 100 ⏳

---

## Active sprint batch 2.14.0 (T043–T055)

| ID | Task |
|----|------|
| T043 | Goal intake interactive textarea + AI refinement preview |
| T044 | Intake refinement chips (problem/customer/market) |
| T045 | Intake sessionStorage persistence |
| T046 | Intake analytics `goal_intake_refined` |
| T047 | Execution task toggle + localStorage |
| T048 | Execution progress ring + completion % |
| T049 | Execution dynamic coach copy |
| T050 | Execution analytics `execution_task_completed` |
| T051 | Execution responsive 390–430 |
| T052 | Admin release notes 2.14.0 |
| T053 | QUEUE_STATE + ROADMAP sync |
| T054 | i18n ko/en intake + execution |
| T055 | Build · tag `closed-beta-v2.14.0` |

After T055 → auto-start T018 (Lighthouse Landing pass).
