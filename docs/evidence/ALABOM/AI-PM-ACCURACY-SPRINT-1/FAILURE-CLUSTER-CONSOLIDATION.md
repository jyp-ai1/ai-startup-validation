# Failure cluster consolidation (Long Sprint Phase 1–2)

**Inputs:** Layer B RCA (`CPO-ROOT-CAUSE-biz-01/07`) · `EVAL/cross-business-failure-search.json` (165 cells = 15 biz × 11 perturbations)

RCA documents **unchanged**.

## Cluster map (symptom → layer)

| Cluster | Sprint 2 types | Surface symptom | SoT / layer candidate | Layer B RCA |
|---------|----------------|-----------------|----------------------|-------------|
| **A — WTP / assumption** | F04, F05 | “아마 낼 것 같다” → FACT; pricing/revenue CLOSED | `build-answer-review` evidence class · `update-gap-state-from-review` | biz-01 T4 |
| **B — Sparse gap class** | F06, F07 | “중소기업입니다.” → customer CLOSED not PARTIAL | Gap completeness on minimal answers | cross-matrix sparse (15/15) |
| **C — Off-slot + state** | F07, F10, F01 | competitor/revenue on customer ask; asked gap stays CLOSED | Slot normalization + **longitudinal** gap re-open | biz-07 T3 · biz-01 T3 |
| **D — Multi-fact** | F13, F03 | payer/user/problem in one blob | Clause split / semantic slots | biz-01 T2 |
| **E — Contradiction** | F11 | payer conflict not in contradictions[] | Contradiction detector + gap CONTRADICTED | biz-01 T5 |

## Cross-business search (Phase 2) — key findings

### Universal (15/15 businesses)

| Perturbation | Types | Interpretation |
|--------------|-------|----------------|
| **uncertainty** (WTP) | F04, F05 (+ F06/F07 on gap) | **Cluster A** — engine-wide, not biz-specific |
| **sparse** | F06, F07 | **Cluster B** — rubric expects PARTIAL; verify CPO vs engine intent |

### Isolated off_slot cell (165-matrix)

- **off_slot** single-turn: **PASS** across businesses in fresh state (includes Golden C-shaped input).
- **Layer B biz-07 T3**: **FAIL** with accumulated state.

→ **Cluster C** is **stateful / longitudinal**, not single-turn extraction alone. Fix must regression **longitudinal pilots**, not only 1-turn matrix.

### Layer B open failures (unchanged)

5 turns in `EVAL/sprint2-open-failures.json` — map to clusters A–E above.

## Fix policy (Phase 3 — not started)

One **layer-only** change per **cluster**, ordered:

1. **A (WTP)** — highest breadth (15/15 on uncertainty probe)  
2. **C (off-slot + gap on IRRELEVANT)** — ties Golden C + longitudinal biz-07  
3. **D (multi-fact)**  
4. **E (contradiction)**  
5. **B (sparse)** — confirm CPO Expected before code  

After each cluster fix: failure-type regression log · Golden 8 · dev cross-matrix · regression 11–13 · **unseen 14–15 one-shot only at end of cycle**.

## Delivery

Single package: `AI-PM-ACCURACY-SPRINT-2-COMPLETION-EVIDENCE.md` (PENDING until full cycle).
