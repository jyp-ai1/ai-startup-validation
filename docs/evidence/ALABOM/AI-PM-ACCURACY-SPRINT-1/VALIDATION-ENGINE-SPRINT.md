# AI PM Validation Engine Sprint

**Mission:** Measure and generalize AI PM quality — not case-by-case prompt fixes.  
**Cluster / case fixes:** **HOLD** (no new patches this sprint).  
**Seed failures A–F:** `EVAL/seed-failure-set.json` — permanent regression seeds.

## Design constraints (Gemini → adopted)

| Constraint | Rule |
|------------|------|
| State drift | Log `groundTruthState` vs `aiState` every turn; flag drift |
| User agent quality | Deterministic agent from Business Truth + Behavior — no random LLM answers |
| Deterministic evaluation | L1–L3 rule/schema first; no “evaluator LLM” as authority |
| Cost | Scale ladder: **10×3×5 POC first** — no 300k turns until POC gate |

## Layer model

**L1–L5 unchanged.** `evidenceStrength` (L1–L5) lives **inside L5 Reasoning/Judgment** — no L6.

## Execution order

```text
P1 Schema + state transitions
→ P2 Mini Sandbox (150 turns)
→ P3 Dynamic conversation
→ P4 Evaluation engine
→ P5 CPO calibration
→ P6 Failure mining
→ P7 Holdout
→ P8 Scale
→ P9 Real business
```

## First gate

**10 business × 3 behavior × 5 turns = 150 turns** — `pnpm test:mini-sandbox`

Evidence: `EVAL/mini-sandbox-evidence.json`

## Completion

Single package: `VALIDATION-ENGINE-COMPLETION-EVIDENCE.md` (not started).

## Stop conditions

V3 SoT conflict · Production arch change · Engine/PM boundary blur · cost overrun · prod break · ground-truth deadlock.
