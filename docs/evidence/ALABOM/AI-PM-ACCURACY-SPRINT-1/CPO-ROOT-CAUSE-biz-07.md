# CPO Root Cause Sheet — biz-07 (Local F&B · Layer B pilot)

**Harness:** `EVAL/multi-business-harness-report.json`  
**Pilot status:** FAIL (T3) · T1–T2 PASS · **Fix:** NOT STARTED

---

## T3 · off_slot (customer ask)

| Step | Content |
|------|---------|
| **User input** | 월 매출 3천만원이고 배달앱이 경쟁사입니다. |
| **Asked gap** | customerPersona |

### ①–⑤ decomposition

| Step | Detail |
|------|--------|
| ① Input | Revenue fact + competitor name while asked WHO |
| ② AI understanding | revenue FACT “월 매출 3천만원”; competitor value **includes revenue clause** |
| ③ State | customer + problem preserved; polluted competitor string |
| ④ Gap | customerPersona **CLOSED** (should OPEN); revenueModel PARTIAL |
| ⑤ Next Q | Probes **revenueModel** — not customerPersona |

### CPO Expected vs Actual

| Field | CPO Expected (independent) | Actual |
|-------|---------------------------|--------|
| Understanding | competitor FACT value **“배달앱”** only; revenue FACT separate | competitor value = full sentence |
| State | No customer slot pollution | customer unchanged |
| Gap | **customerPersona: OPEN**; revenueModel PARTIAL; alternatives CLOSED | **customerPersona: CLOSED** |
| Next Q (L4) | Re-probe **customerPersona** (primary OPEN gap) | Probe revenueModel |

| Failure (harness) | Sprint 2 |
|-------------------|----------|
| F3_GAP_MISCLASSIFICATION | **F07**, **F10**, **F01**, **F08** |

**Root cause (hypothesis):** Same failure family as Golden C (Fix Cycle 2 @ `7abb071`) — competitor clause merge + asked gap wrongly CLOSED on IRRELEVANT answer. Local F&B longitudinal exposes regression or context-dependent gap update.  
**Fix:** _pending — verify parity with golden-c-wrong-slot pipeline under accumulated state_  
**Regression:** Golden C + biz-07 T3 + cross-business off_slot probes (dev set) + unseen **after** fix (one-shot)

---

## Session summary (biz-07)

| Turn | Perturbation | Pass |
|------|--------------|------|
| T1 | normal | PASS |
| T2 | sparse | PASS |
| T3 | off_slot | FAIL |

**Note:** T2 sparse uses ASSUMPTION on problem — CPO may PARTIAL on L1; harness PASS on gap PARTIAL only.

**CPO verdict on improvement:** OPEN.
