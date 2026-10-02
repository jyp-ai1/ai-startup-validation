# CPO Root Cause Sheet — biz-01 (B2B SaaS · Layer B pilot)

**Harness:** `EVAL/multi-business-harness-report.json` @ Sprint 2  
**Pilot status:** FAIL (T2–T5) · **Fix:** NOT STARTED (RCA only)  
**Evidence SHA:** see report `generatedAt`

---

## T2 · multi_fact

| Step | Content |
|------|---------|
| **User input** | 대표가 구매하고 직원이 매일 사용하며 지금은 엑셀로 관리합니다. |
| **Asked gap** | problemJtbd |

### ①–⑤ decomposition

| Step | Detail |
|------|--------|
| ① Input | Buyer(대표) + user(직원) + tool pain(엑셀) in one utterance |
| ② AI understanding | Single `problem` FACT blob; no separate payer/user facts |
| ③ Knowledge state | `customer=중소기업` preserved; `problem`=full sentence |
| ④ Gap | `problemJtbd:CLOSED`, `customerPersona:CLOSED` |
| ⑤ Next Q | `businessOneLiner` advance — “이 사업은 누구에게…” |

### CPO Expected vs Actual

| Field | CPO Expected (independent) | Actual |
|-------|---------------------------|--------|
| Understanding | Split: payer/buyer vs daily user vs operational pain (엑셀); problem grounded | One problem blob only |
| State | Prior customer preserved; payer/user slots updated without dropping customer | Customer OK; no payer/user |
| Gap | problem PARTIAL or CLOSED with structured facts; customer stays CLOSED | Both CLOSED |
| Next Q (L4) | Probe unresolved payer/user or problem depth before businessOneLiner | Advance to businessOneLiner |

| Failure (harness) | Sprint 2 |
|-------------------|----------|
| F1_SLOT_MISCLASSIFICATION | **F13** multi-fact loss, **F03** payer/user confusion |

**Root cause (hypothesis — CPO review):** Multi-clause B2B utterance not decomposed; buyer/user roles collapsed into problem text.  
**Fix:** _pending — layer-only semantic split + regression_  
**Regression:** _pending_

---

## T3 · off_slot (customer ask)

| Step | Content |
|------|---------|
| **User input** | 경쟁사는 네이버웍스입니다. |
| **Asked gap** | customerPersona |

### CPO Expected vs Actual

| Field | CPO Expected | Actual |
|-------|--------------|--------|
| Understanding | competitor FACT → alternatives only; **no** market blob | competitor OK + **market INFERENCE** duplicate |
| State | No customer pollution | customer unchanged |
| Gap | **customerPersona: OPEN** (IRRELEVANT to ask); competitors CLOSED | **customerPersona: CLOSED** |
| Next Q | Probe **customerPersona** | null |

| Failure | Sprint 2 |
|---------|----------|
| F3_GAP_MISCLASSIFICATION | **F07** OPEN missed, **F10** off-slot, **F05** inference |

**Root cause (hypothesis):** Wrong-slot answer closed asked gap; spurious market fact from template clause.  
**Fix:** _pending_

---

## T4 · uncertainty (WTP)

| Field | CPO Expected | Actual |
|-------|--------------|--------|
| Understanding | “아마…검증 없음” → **ASSUMPTION** on pricingHint only | **FACT** on revenue + market |
| Gap | pricingHint PARTIAL; **revenueModel OPEN** | pricingHint + revenueModel **CLOSED** |
| Next Q | Probe pricing/WTP | advance businessOneLiner |

| Failure | Sprint 2 |
|---------|----------|
| F7, F3 | **F04**, **F05**, **F06**, **F15** premature close |

**Root cause (hypothesis):** Same class as Golden H regression — unverified WTP closed revenue path.  
**Fix:** _pending_

---

## T5 · contradiction (payer)

| Field | CPO Expected | Actual |
|-------|--------------|--------|
| Understanding | Conflict with T2 “대표 구매” vs “IT 담당자 결제” | **No extracted facts** |
| Gap | customer or payer **CONTRADICTED** | All major gaps CLOSED |
| Next Q | Clarify/challenge payer | null |

| Failure | Sprint 2 |
|---------|----------|
| F6_CONTRADICTION_HANDLING | **F11** |

**Root cause (hypothesis):** Contradiction not linked to prior buyer/payer state; IRRELEVANT empty extract.  
**Fix:** _pending_

---

## Session summary (biz-01)

| Turn | Perturbation | Pass | Primary Sprint 2 types |
|------|--------------|------|-------------------------|
| T1 | normal | PASS | — |
| T2 | multi_fact | FAIL | F13, F03 |
| T3 | off_slot | FAIL | F07, F10, F05 |
| T4 | uncertainty | FAIL | F04, F05, F06 |
| T5 | contradiction | FAIL | F11 |

**CPO verdict on improvement:** OPEN — no fix until failure-type regression plan approved.
