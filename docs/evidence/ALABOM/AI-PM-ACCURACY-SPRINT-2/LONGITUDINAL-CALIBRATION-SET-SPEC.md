# Longitudinal Calibration Set — Spec (Sprint 2)

## Archetypes (8+)

All `MINI_SANDBOX_BUSINESSES` rows:

- B2B SaaS · B2C SaaS · Marketplace · Commerce · Subscription  
- Local Service · Platform · Hardware · Professional Service · AI Service  

## Scripted behaviors (harness)

### P0 — `longitudinal_f11`

| Turn | User intent |
|------|-------------|
| 1 | Fact A — seed customer |
| 2 | Fact B — problem emphasis |
| 3 | Unrelated (team / location) |
| 4 | Correction — refine customer scope |
| 5+ | Persona reversal / contradiction utterance |

**Checkpoints recorded:** turns 4, 5, 6, 7  

**Primary assertions (for CPO / auto-mining):**

- Turn ≥5: `customerPersona` ∈ { `CONFLICT`, `CONTRADICTED` } (gap completeness)
- `contradictions.length ≥ 1` on contradiction turn
- Turn 6–7: contradiction state **not silently cleared** without resolution

### P1 — `longitudinal_f04_pricing`

| Turn | User intent |
|------|-------------|
| 1–2 | Customer + problem baseline |
| 3 | WTP hedge (assumption cues) |
| 4 | Unrelated (competition) |
| 5 | Validation cues → FACT |
| 6+ | New unvalidated claim |

**Checkpoints:** turns 3, 5, 6  

**Primary assertions:**

- Turn 3: revenue `evidenceClass` ≠ `FACT` (prefer `ASSUMPTION`)
- Turn 5: revenue `evidenceClass` = `FACT`
- `pricingHint` gap transitions without false CLOSED on hedge-only

## P2–P4 (next calibration waves)

- **F08:** sample from Sprint 1 pack — re-classify intent/priority vs GT only.  
- **F13:** evaluator/GT alignment cases — no AI PM enrich path.  
- **STATE_DRIFT:** transition log vs GT `CLOSED|PARTIAL|OPEN|CONFLICT|ASSUMPTION`.

## Output schema

See `EVAL/longitudinal-calibration-pack.json`:

- `scenarios[]` — per `businessId` × `behavior`  
- `checkpoints[]` — `{ turn, replay, customerPersona, pricingHint, contradictionCount, revenueEvidenceClass }`

CPO fills per-checkpoint: `cpoCalibratedVerdict`, `calibrationClass`, `cpoNotes` in a follow-up submission file (same pattern as Sprint 1).
