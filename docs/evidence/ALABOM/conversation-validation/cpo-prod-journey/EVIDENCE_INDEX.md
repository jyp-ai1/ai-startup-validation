# ALABOM conversation-validation — CPO Production Journey Evidence Index

```text
Folder: docs/evidence/ALABOM/conversation-validation/cpo-prod-journey/
Production tip: 5d255082f073e81513acb8b058b42902bacee2e6
Captured: 2026-08-26T14:16:06.313Z
Code: NONE · Auth: untouched
```

## Documents

| File | Purpose |
|------|---------|
| `TRANSCRIPT.md` | Turn-by-turn table (AI Q / user A / Understanding / Gap / Why-now / next reason) |
| `FINDINGS.md` | Factual observations only (no CPO PASS/FIX/HOLD verdict) |
| `EVIDENCE_INDEX.md` | This index |
| `transcript-raw.json` | Machine capture (full body excerpts, template flags) |
| `prod-build-info.json` | `/api/build-info` commit stamp + shaMatch |

## Media

| File | Maps to |
|------|---------|
| `media/01-after-ai-read.png` | AI Read first judgment / draft confirm |
| `media/02-q1-ask.png` | Q1 problem ask after confirm |
| `media/03-after-a1.png` | After problem answer |
| `media/04-after-a2.png` | After A2 (payer into customer slot) |
| `media/05-mid-review.png` | Mid-journey “정리해줘” overlay |
| `media/06-continue-l1.png` … `l8.png` | Demand Q re-ask loop |
| `media/06-competition.png` | Competition answer (while payer Q shown) |
| `media/07-differentiation.png` | Differentiation answer |
| `media/08-drain-l1.png` / `08-drain-l2.png` | Drain → sufficiency |
| `media/09-sufficiency.png` | Understanding sufficient / start analysis |
| `media/10-final-review.png` | Final viability review (GO · 74) |

## Related (not regenerated)

| Path | Note |
|------|------|
| `docs/evidence/ALABOM/conversation-validation/` | Prior conversation-validation pack |
| `docs/evidence/ALABOM/core-v2/cpo-live-journey/` | Earlier CPO live journey (different tip) |
| `docs/sprints/ALABOM_CPO_PROD_JOURNEY_POINTER.md` | Short pointer to this folder |

## Capture harness (local only — not product)

- `.tmp/alabom-cpo-prod-journey-capture.spec.ts`
- `apps/web/e2e/_tmp-cpo-prod-journey-capture.spec.ts` (ephemeral; do not treat as product)
