# AI PM Accuracy Sprint 2

**Status:** Phase 1 — Longitudinal Calibration Set (no AI PM structural fix until CPO adjudication)

## Mission

Validate **state transitions over long conversations** — not single-turn fixes.

Sprint 1 closed the loop: Calibration → F11/F04 structural fix → regression → holdout → **Production authenticated smoke PASS**.

Sprint 2 does **not** reinterpret that as “all accuracy solved.” It tests remaining risks:

| Priority | Track | Sprint 1 relation |
|----------|--------|-------------------|
| **P0** | Turn-5+ contradiction preservation (F11 longitudinal) | Production short-path PASS; mined ~20 remain |
| **P1** | Revenue / pricingHint longitudinal (F04) | FACT validation PASS; ASSUMPTION on pricing gap under-tested |
| **P2** | F08 gap priority | Evaluator defect (not AI PM) |
| **P3** | F13 multi-fact | Evaluator/GT alignment (not `enrichMultiFactSemantic`) |
| **P4** | STATE_DRIFT | GT / transition rules first |

## Phase order (no code fix before calibration)

```text
1. Longitudinal Calibration Set
2. Turn-5+ F11 validation
3. Revenue/Pricing state validation
4. F08 Evaluator/GT validation
5. F13 Evaluator/GT validation
6. STATE_DRIFT GT/transition validation
7. Confirm AI PM defects only
8. CPO approval → Structural Fix
9. Validation Engine before/after
10. Holdout
11. Production
```

## Principle

> Test **state transitions**, not turn count alone.

Example chain: `FACT → ASSUMPTION → CORRECTION → CONFLICT → RESOLUTION`

## Artifacts

| Artifact | Path |
|----------|------|
| Longitudinal spec | `LONGITUDINAL-CALIBRATION-SET-SPEC.md` |
| CPO instructions | `CPO-CALIBRATION-INSTRUCTIONS.md` |
| Generated pack | `EVAL/longitudinal-calibration-pack.json` |

Generate pack (harness only):

```bash
cd apps/web && node scripts/run-longitudinal-calibration-pack.mjs
```

## Hard rules

- **No AI PM structural changes** until calibration + CPO confirmed defect list.
- F08 / F13 / STATE_DRIFT: fix **evaluator or GT** when class says so — not AI PM first.
- Report only `[STOP]` or final `[SPRINT COMPLETE]` — no interim CEO testing.

## CEO

No action until Sprint 2 Completion Evidence gate.
