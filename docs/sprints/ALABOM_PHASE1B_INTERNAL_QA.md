# ALABOM Phase 1-B — Internal QA Report (W12)

```text
Status: INTERNAL QA — PARTIAL PASS (unit + prod smoke)
Date: 2026-08-25
Head at test run: 18fbe8c (then this package commit)
Unit suite: 23 files · 92 tests · 0 fail
Prod smoke: https://ai-startup-validation-tau.vercel.app → HOME/DEMO/ICON/MARK HTTP 200
```

## Method

- Targeted Vitest: `features/workflow-journey/lib/business-understanding/__tests__` + `lib/brand/__tests__`
- Artifact: [`unit-suite-result.json`](../evidence/ALABOM/phase1b/unit-suite-result.json)
- Prod smoke: [`prod-smoke-2026-08-25.json`](../evidence/ALABOM/phase1b/prod-smoke-2026-08-25.json)
- **No full Playwright suite** this session (token/cost discipline). Live CEO walkthrough still required before Final CPO.

---

## QA Matrix A–F

### A — Document First

| ID | Result | Evidence / test |
|----|--------|-----------------|
| A1 Strong PDF / readable doc | **PASS (unit)** | `s17-document-first` rich doc draft + provenance |
| A2 Weak PDF honesty + gap-only | **PASS (unit)** | PDF placeholder draft + `gapFieldIds`; trust contract copy |
| A3 Filename ≠ business name | **PASS (unit)** | `s15-p0-1-upload-filename` + s17 filename case |
| A4 Doc facts confirm-style | **PASS (unit)** | missing-field priority + Document First confirm card path |

### B — Loop / engines

| ID | Result | Evidence / test |
|----|--------|-----------------|
| B1 Answer → Processing → Update | **PASS (unit)** | Thinking stages 1–2s; loop write path |
| B2 Contradiction | **PASS (unit)** | `answer-quality` CONTRADICTORY; `correction-and-why` resolve; UI confirm mounted |
| B3 Answer Quality | **PASS (unit)** | nonsense not mergeable; S15 bag sync rejects asdf |
| B4 Spine / Summary / Why | **PASS (unit)** | Spine marks; Why follow-up; S11 Summary/Detail |

### C — State / Memory

| ID | Result | Evidence / test |
|----|--------|-----------------|
| C1 Refresh persist | **PARTIAL** | sessionStorage + Memory rebuild unit; **live refresh walkthrough pending** |
| C2 Resume | **PASS (unit)** | `demo-login-promotion` resume briefing |
| C3 Transition ≠ answer count | **PASS (unit)** | `stage-transition` turn-count alone blocked |
| C4 Memory bag sync | **PASS (unit)** | S14/S15 memory tests |

### D — Product surfaces

| ID | Result | Evidence / test |
|----|--------|-----------------|
| D1 Demo same contract | **PASS (unit)** + **prod HTTP** | demo continuity + `/demo/start` 200 |
| D2 Auth durable | **PARTIAL** | same Understanding code path; **auth live persistence not re-walked** |
| D3 Mobile Hero=1 | **PARTIAL** | Presenter Hero=1 unit; **device walkthrough pending** |
| D4 Desktop Fatigue | **PASS (unit)** | Evidence-first panel: secondary behind 더보기 |

### E — Review / Analysis

| ID | Result | Evidence / test |
|----|--------|-----------------|
| E1 Review Start success | **PASS (unit)** | workspace-state canStart when evidence pack confirmed |
| E2 Review Start cannot | **PASS (unit)** | blockedReason user-facing (incl. demo_readonly) |
| E3 Review Start error | **PARTIAL** | no silent block unit; **network fail Retry live pending** |
| E4 Evidence First + Hero=1 | **PASS (unit)** | `presentAnalysisScreen` + assertSingleHeroCta |

### F — Cross-journey / regression / brand

| ID | Result | Evidence / test |
|----|--------|-----------------|
| F1 Journey B seed | **PARTIAL** | empty-project seed exists; **live Idea path walkthrough pending** |
| F2 Correction / edit | **PASS (unit)** | USER_CORRECTED apply + contradiction resolve |
| F3 Brand Concept 3 | **PASS (unit + prod)** | brand-config tests; `/icon.svg` + `/brand/alabom-mark.svg` 200; ALABOM in HTML |
| F4 S16/S17 regression | **PASS (unit)** | Document First, Thinking stages, journey stages, Hero=1 presenters |

---

## Honest gaps (block Final CPO until closed)

1. Live walkthrough Evidence 01–20 (screens / short clips) — most cells unit-only today  
2. Auth durable refresh on Production account  
3. Mobile viewport Hero/order integrity  
4. CEO Walkthrough A + B execution  

**Internal QA batch:** not full green for DoD §30. Status remains **EXECUTING**.
