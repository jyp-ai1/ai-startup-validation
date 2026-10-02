# Confirmed Failure Clusters (Phase 3 — post-calibration)

Generated with `pnpm test:cpo-calibration-phase3-confirm`.

## F13 Multi-fact

| Step | Content |
|------|---------|
| Observed | Single utterance with payer + daily use + workaround loses slot separation |
| Pattern | businessOneLiner ask + multi-clause Korean answer |
| Root cause | `enrichMultiFactSemantic` did not emit buyer/problem/customer together |
| Architecture | `buildAnswerReview` → `interpretAnswerSemantics` → `enrichMultiFactSemantic` |
| Fix | Clause cues for purchase/use + excel workaround (structural) |

## F11 Contradiction

| Step | Content |
|------|---------|
| Observed | Late-turn persona reversal |
| Pattern | Prior customer segment vs new segment |
| Root cause | Evaluator expected `CONFLICT` label; V3 uses `CONTRADICTED` |
| Architecture | `updateGapStateFromReview` + contradictions |
| Fix | Evaluator alignment + existing V3 contradiction path |

## STATE_DRIFT (Calibration)

| Step | Content |
|------|---------|
| Observed | Auto drift flags on sandbox GT vs V3 gap ids |
| Pattern | GT engine keys ≠ V3 gapState keys |
| Root cause | **GT Defect** in validation harness — not primary AI PM fix target |
| Fix | Evaluator/GT alignment — not overwrite V3 SoT |

## F04 Fact / Assumption

| Step | Content |
|------|---------|
| Observed | Uncertainty language with FACT evidence class on WTP/pricing |
| Root cause | `evidenceForExtractedFact` / assumption cues |
| Fix | Existing `isWtpHypothesisOnly` path — extend via assumption utterance cues |

## F08 Gap Priority

| Step | Content |
|------|---------|
| CPO confirm | **Evaluator defect** — intent/priority pass when aligned |
| Fix target | Validation engine L4 rules — not AI PM question strings |
