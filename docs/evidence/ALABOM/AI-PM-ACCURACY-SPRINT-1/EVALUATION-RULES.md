# Validation Engine — Evaluation Rules

## Principles

1. **L1–L3:** schema / rule comparison only.
2. **L4 Question:** intent + gap priority — not exact wording (`question-intent.ts`, `gap-priority-evaluator.ts`).
3. **L5 Reasoning/Judgment:** evidence class + `evidenceStrength` 1–5 (`l5-reasoning-evaluator.ts`) — **no L6 layer**.
4. **State drift:** `groundTruthGapAfter` vs `aiGapAfter` (`ground-truth-engine.ts`).
5. **Auto eval is not authority** — CPO calibration set required.

## Failure codes (mining)

Uses Sprint 2 taxonomy (`F01`–`F16`) plus `STATE_DRIFT`.

## Regression

- Seed A–F: `seed-regression-runner.ts` + `EVAL/seed-failure-set.json`
- Golden 8: `pnpm test:accuracy-golden`

## Commands

```bash
cd apps/web
pnpm test:mini-sandbox
pnpm test:validation-engine-completion
pnpm test:accuracy-golden
```
