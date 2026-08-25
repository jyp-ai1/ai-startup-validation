# ALABOM Phase 1-B — Internal QA Report (W12)

```text
Status: INTERNAL QA — IMPROVED (live Evidence started; PARTIAL mostly closed)
Date: 2026-08-25 (session 5)
Unit: business-understanding + brand + w12-partial-closeout PASS
Live: e2e/alabom-phase1b-live-evidence.spec.ts → 6/6 PASS on Production
```

## Method

- Targeted Vitest + Production Playwright evidence capture (not full suite)
- Artifacts: `unit-suite-result.json`, `live-evidence-2026-08-25.json`, `media/*.png`
- **No full Playwright regression suite**

---

## QA Matrix A–F

### A — Document First

| ID | Result | Evidence / test |
|----|--------|-----------------|
| A1 Strong PDF / readable doc | **PASS (LIVE + unit)** | `media/03-document-rich.png` + s17 |
| A2 Weak PDF honesty + gap-only | **PASS (LIVE + unit)** | `media/04-document-weak-pdf.png` |
| A3 Filename ≠ business name | **PASS (LIVE + unit)** | weak PDF assert + s15/s17 |
| A4 Doc facts confirm-style | **PASS (unit)** | Document First path |

### B — Loop / engines

| ID | Result | Evidence / test |
|----|--------|-----------------|
| B1 Answer → Processing → Update | **PASS (unit)** | Thinking / loop write |
| B2 Contradiction | **PASS (unit)** | answer-quality + UI confirm |
| B3 Answer Quality | **PASS (unit)** | nonsense gate |
| B4 Spine / Summary / Why | **PASS (unit)** | Spine + Why |

### C — State / Memory

| ID | Result | Evidence / test |
|----|--------|-----------------|
| C1 Refresh persist | **PASS (LIVE + unit)** | `media/13-refresh-persist.png` + w12 C1 |
| C2 Resume | **PASS (unit)** | demo-login-promotion |
| C3 Transition ≠ answer count | **PASS (unit)** | stage-transition |
| C4 Memory bag sync | **PASS (unit)** | S14/S15 |

### D — Product surfaces

| ID | Result | Evidence / test |
|----|--------|-----------------|
| D1 Demo same contract | **PASS (LIVE + unit)** | demo start + document path |
| D2 Auth durable | **PARTIAL (honest)** | Same Understanding code path; **Auth live persistence not walked** (no prod auth credentials in session). Demo-equivalent = C1 LIVE. |
| D3 Mobile Hero=1 | **PASS (LIVE + unit)** | mobile screenshots; Hero CTA ≤1; presenter assert |
| D4 Desktop Fatigue | **PASS (unit)** | secondary behind 더보기 |

### E — Review / Analysis

| ID | Result | Evidence / test |
|----|--------|-----------------|
| E1 Review Start success | **PASS (unit)** | canStart when evidence confirmed |
| E2 Review Start cannot | **PASS (unit)** | blockedReason |
| E3 Review Start error | **PASS (code + unit)** | Visible error + Retry CTA wired in panel/workspace; **LIVE Retry shot pending tip deploy of this SHA** |
| E4 Evidence First + Hero=1 | **PASS (unit)** | presentAnalysisScreen |

### F — Cross-journey / regression / brand

| ID | Result | Evidence / test |
|----|--------|-----------------|
| F1 Journey B seed | **PASS (LIVE + unit)** | `media/f1-idea-seed-intake.png` + empty-project seed unit |
| F2 Correction / edit | **PASS (unit)** | USER_CORRECTED |
| F3 Brand Concept 3 | **PASS (LIVE + unit)** | `media/01-landing-brand.png` |
| F4 S16/S17 regression | **PASS (unit)** | REGRESSION_SIGNOFF |

---

## Honest gaps (still block Final CPO)

1. Deep LIVE still missing for Contradiction / Processing / Stage / Evidence-first Review / Review Retry on tip  
2. Auth durable refresh on Production account (D2)  
3. CEO Walkthrough A + B  

**Internal QA:** improved, not DoD §30 complete. Status remains **EXECUTING**.
