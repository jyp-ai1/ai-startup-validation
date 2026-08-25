# ALABOM Phase 1-B — Evidence Package 01–20

```text
Folder: docs/evidence/ALABOM/phase1b/
Updated: 2026-08-25 (session 5 — live capture + PARTIAL closeout)
Honesty rule: Code merge ≠ Evidence. Unit PASS ≠ live walkthrough.
Production tip at capture: https://ai-startup-validation-tau.vercel.app (ALABOM brand live)
```

## Artifacts in this folder

| File | Purpose |
|------|---------|
| `unit-suite-result.json` | Vitest JSON — business-understanding + brand |
| `prod-smoke-2026-08-25.json` | Production HTTP smoke + brand signal |
| `live-evidence-2026-08-25.json` | Playwright live capture summary |
| `REGRESSION_SIGNOFF.md` | S7/S8/S14/S16/S17 unit sign-off |
| `media/*.png` | LIVE screenshots from Production |
| `EVIDENCE_INDEX.md` | This index |

## Evidence checklist

| # | Item | Status | Proof |
|---|------|--------|-------|
| 01 | Strong PDF / Document First | **LIVE + UNIT** | `media/03-document-rich.png` + s17 unit |
| 02 | Weak PDF gap-only | **LIVE + UNIT** | `media/04-document-weak-pdf.png` + s17 unit |
| 03 | No filename-as-name | **LIVE + UNIT** | weak PDF body assert no `plan.pdf` as business |
| 04 | Provenance labels | **UNIT** | draft.provenance; UI Detail |
| 05 | Confidence / skip re-ask | **UNIT** | understanding-contract |
| 06 | Contradiction confirm | **UNIT** | answer-quality + correction-and-why |
| 07 | Answer Quality | **UNIT** | answer-quality + s15 nonsense |
| 08 | Staged Processing | **UNIT** | thinking-stages |
| 09 | Before→After update | **UNIT** | clarity / evolution |
| 10 | Summary/Detail + Spine | **UNIT** | spine + S11 |
| 11 | Stage Transition | **UNIT** | stage-transition |
| 12 | Evidence First + Hero=1 | **UNIT** | presentAnalysisScreen |
| 13 | Memory + refresh | **LIVE + UNIT** | `media/13-refresh-persist.png` + w12 C1 test |
| 14 | Demo vs Auth | **LIVE Demo / Auth GAP** | Demo live; Auth durable not walked |
| 15 | Review cannot + error | **UNIT + CODE** | blockedReason; Retry UI wired (E3) — prod deploy pending for live Retry shot |
| 16 | Mobile + Fatigue | **LIVE + UNIT** | `media/16-mobile-workspace.png` · `19-mobile-landing.png`; Hero≤1 |
| 17 | Brand Concept 3 | **LIVE + UNIT** | `media/01-landing-brand.png` + icon/mark |
| 18 | Correction / Why | **UNIT** | correction-and-why |
| 19 | Validation handoff + regression | **UNIT** | REGRESSION_SIGNOFF |
| 20 | CEO Walkthrough A+B | **NOT STARTED** | After Final CPO open |

## Counts (honest)

| Kind | Count |
|------|-------|
| **LIVE** (or LIVE+UNIT) | **8** — #01,02,03,13,16,17 + Demo entry (#02 surface) + F1 intake media |
| **UNIT only** | **10** — #04–12,18,19 (approx.) |
| **PARTIAL / GAP** | **2** — #14 Auth · #15 Retry live on tip |
| **NOT STARTED** | **1** — #20 CEO |

Minimum live set from EXECUTION_PLAN (01,02,06,08,09,11,12,13,15,17): **still missing LIVE** for 06,08,09,11,12,15.

Do **not** invent screenshots. Attach real captures under `media/` when executed.
