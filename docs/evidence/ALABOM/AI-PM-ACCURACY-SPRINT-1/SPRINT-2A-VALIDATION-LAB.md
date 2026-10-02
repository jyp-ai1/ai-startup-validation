# Sprint 2A — Validation Lab (CPO work order)

**Status:** Phase 1 — actual AI evidence capture (no cluster fix)  
**Mode:** No interim CPO reports → single Completion Evidence at cycle end

## Phase 1 (current)

Run V3 AI PM pipeline with **dynamic next question** (not fixed questionnaire).

```bash
cd apps/web && pnpm test:validation-lab-evidence
```

Output: `EVAL/validation-lab-evidence.json` (+ sample sheet `VALIDATION-LAB-SAMPLE-ROW.md`)

Each row captures: `userInput`, `aiVisibleResponse`, `answerUnderstanding`, `stateBefore/After`, `gapBefore/After`, `actualNextQuestion`, `nextQuestionReason`, `cpoVerdict: PENDING`.

L4: CPO judges **question family**, not exact string (`CPO-L4-QUESTION-RUBRIC.md`).

## Business sets (CPO §12)

| Set | IDs |
|-----|-----|
| Development | biz-01 … biz-10 |
| Regression | biz-11 … biz-15 (14–15: prior Layer A probe — not strict holdout) |
| **Holdout** | **biz-16 … biz-17** (no fix-cycle tuning) |

## After Phase 1

Phase 2 CPO 2-pass → cluster fix (A→C→D→E→B) → failure-type regression → longitudinal → holdout one-shot → Production subset.

**Cluster fix:** NOT STARTED until CPO confirms actual evidence on A–E.
