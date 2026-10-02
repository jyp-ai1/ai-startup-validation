# Phase ② — CPO longitudinal rubric (Real Business Review)

**Scope:** Production authenticated session · **not** Golden 8 unit turns alone.

**Phase ① carry-over gates (must hold across 12→30 turns):**

- FACT / ASSUMPTION / INFERENCE discipline  
- Slot contamination prevention  
- CLOSED state preservation (no silent re-open without contradiction/correction)

## Per-turn CPO checklist (independent 2-pass)

| # | Dimension | Layer | CPO question |
|---|-----------|-------|--------------|
| 1 | Answer understanding | L1 | Facts match user utterance? Wrong-slot / nonsense handled? |
| 2 | Knowledge state change | L2 | State updates justified; no invented fields? |
| 3 | Gap identification | L2 | OPEN / PARTIAL / CLOSED / CONTRADICTED correct vs taxonomy? |
| 4 | Prior knowledge preserved | L2 | CLOSED gaps and facts not dropped or overwritten? |
| 5 | Next question choice + why | L3 | Highest-value OPEN/CONFLICT gap; causality visible? |
| 6 | Off-slot / nonsensical answer | Gate | IRRELEVANT / probe / re-ask without polluting slots? |
| 7 | Contradiction | Gate | CONTRADICTED + clarify/challenge when answers conflict? |
| 8 | Reasoning | L4 | *(after initial 12-turn L1–3 pass)* chain grounded in evidence? |
| 9 | Judgment | L5 | *(after L4 wired)* dimensions stable across turns? |

**Verdict per turn:** `PASS` | `PARTIAL` | `FAIL` — CPO fills; CTO does not self-sign.

## Session gates

| Gate | Criterion |
|------|-----------|
| G1 | 12-turn trace `CAPTURED` on Production SHA |
| G2 | CPO Layer 1–3 independent 2-pass on all turns |
| G3 | Extend to 20–30 turns; same rubric |
| G4 | Layer 4–5 evidence + CPO pass |
| G5 | Production merge unlock (with ladder) |
| CEO TEST | **Not requested** until G2+ and CPO final accuracy sign-off |

## Evidence files

| File | When |
|------|------|
| `PRODUCTION/real-business-review-trace.json` | After `pnpm evidence:real-business-review` |
| `CPO-PHASE2-REVIEW-SHEET.md` | Generated when trace `CAPTURED` (future) |
| `ACCURACY-LAYER-METRICS.md` | Update denominators after CPO labels rows |

**Production merge:** HOLD until Phase ② CPO 2-pass on real longitudinal trace.
