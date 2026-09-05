# ALABOM — DAY 8-D Phase B Answer-First Routing Implementation Report

**Date:** 2026-09-05  
**Branch:** `cursor/day8d-phase-b-routing-6423`  
**Gate:** Phase A PASS → Phase B implementation  
**Phase C/D:** HOLD (not started)

---

## 1. Root Cause

DAY 8-C observation and code review identified three coupled failures:

```text
livingBefore 미연결 (Phase A fixed)
+
askedGap force-fill (solution → business unconditionally)
+
canonicalizeSubmitSemantics reinforcing wrong slot
```

Specifically:

- `interpret-answer-semantics.ts` L551–556: any mergeable answer on `solution` ask forced `factKey = 'business'`, ignoring competitor/problem cues already detected upstream.
- `build-answer-review.ts` L80–89: `canonicalizeSubmitSemantics()` re-applied the same solution→business override after semantic interpretation.
- `workspace-ai-pm-loop-panel.tsx` L1347–1360: duplicate solution force-fill at submit time.

Result: CEO saying "경쟁사는 A/B/C" on a value/solution question was stored as solution/business — the core DAY 8-C slot misrouting.

---

## 2. Changed Files

| File | Change |
|------|--------|
| `ai-pm-answer-first-routing-policy-v1.ts` | **NEW** — feature flag `AI_PM_ANSWER_FIRST_ROUTING_V1` |
| `ai-pm-answer-first-routing.ts` | **NEW** — general slot-conflict detection + routing |
| `interpret-answer-semantics.ts` | Skip asked-gap force-fill on conflict; extended market/delivery cues; wire routing |
| `build-answer-review.ts` | Guard solution canonicalization; asked gap stays OPEN on conflict |
| `workspace-ai-pm-loop-panel.tsx` | Guard solution submit canonicalization |
| `day8d-phase-b-routing.test.ts` | **NEW** — B1–B8 unit tests |
| `day8d-phase-b-routing.spec.ts` | **NEW** — Browser B1–B5 |
| `run-day8d-phase-b-e2e.mjs` | **NEW** — E2E runner |
| `next.config.ts` | Production flag default ON |
| `playwright.v3-p0.config.ts` | E2E flag defaults |

**Not changed:** V3 core, gapState, question engine, Phase C No-Ask, draft key.

---

## 3. Answer-First Routing Structure

```text
CEO Answer
        ↓
scoreRoutes() + collectFactHits()     ← semantic winner FIRST
        ↓
detectAnswerSlotConflict()            ← asked gap expected fact vs primary fact
        ↓
shouldSkipAskedGapForceFill()         ← blocks solution/customer/competitor force-fill
        ↓
applyAnswerFirstRouting()             ← finalize facts, attach slotConflict
        ↓
buildAnswerReview()
  → isAskedGapOpenDueToSlotConflict() ← asked gap OPEN, semantic gap CLOSED
        ↓
memory merge (per-fact keys preserved)
        ↓
Dynamic Judgment (Phase A, unchanged)
```

General abstraction — no `refuseSolutionSlotForCompetitor()`-style per-domain patches.

---

## 4. Wrong-Slot Resolution Results

| Case | Asked | Answer meaning | Result |
|------|-------|----------------|--------|
| B1 | solution | competitor | `competitor` — solution stays OPEN |
| B2 | customerPersona | problem | `problem` — customer stays OPEN |
| B3 | alternativesCompetitors | customer | `customer` — competition stays OPEN |
| B4 | solution (value) | problem | `problem` — solution stays OPEN |

Browser B1: competitor text appears in Understanding block; not forced into solution slot.

---

## 5. Multi-Fact Results (B6)

Input: "주 고객은 반찬가게고, 주문은 전화와 네이버에서 받고, 배송은 직접 합니다."

Routed facts: `customer` + `market` + `business` (≥3 keys).

Browser B2: Understanding reflects 반찬가게 content after single utterance.

---

## 6. Existing Knowledge Preservation (B8)

```text
Before: customer = 반찬가게
Answer: "경쟁사는 A, B, C입니다." (on solution ask)
After:  customer = 반찬가게 (preserved)
        competitor = A/B/C (added)
        solution = OPEN (not wrongly closed)
```

Browser B3: 반찬 + 경쟁 both visible after competitor answer following customer turn.

---

## 7. Correction Regression (B7)

`꽃집 → 반찬가게` CORRECT path unchanged:

- `isCustomerFieldCorrection()` bypasses slot-conflict skip
- `extractCorrectedFactValue()` returns accepted segment
- Browser B5: Understanding + Judgment show 반찬가게 revision

Correction 7/7 unit tests remain green.

---

## 8. Unit Tests

| Suite | Result |
|-------|--------|
| `day8d-phase-b-routing.test.ts` B1–B8 | **8/8 PASS** |
| `day8d-phase-a-judgment.test.ts` | **12/12 PASS** |
| `ai-pm-loop-v3.test.ts` | **72/72 PASS** |
| `day8b-phase2-focused-ui.test.ts` | **12/12 PASS** |
| `ai-pm-correction-semantics.test.ts` | **7/7 PASS** |
| **Total** | **111/111 PASS** |

---

## 9. V3 Regression

72/72 — no V3 core changes. CLOSED monotonic preserved; asked gap correctly stays OPEN when semantic domain differs.

---

## 10. Browser B1–B5

| ID | Scenario | Result |
|----|----------|--------|
| B1 | Wrong-slot competitor on value ask | PASS |
| B2 | Multi-fact single utterance | PASS |
| B3 | Customer preserved after competitor | PASS |
| B4 | Judgment continuity post-routing | PASS |
| B5 | Correction 꽃집→반찬가게 | PASS |

Evidence: `/opt/cursor/artifacts/screenshots/day8d-phase-b/`

---

## 11. Build

`pnpm run build` — PASS (Next.js 15.5.20 production bundle)

---

## 12. Scope Guard

| Item | Status |
|------|--------|
| gapState redesign | ❌ Not started |
| V3 core modification | ❌ Not started |
| Question Engine rewrite | ❌ Not started |
| Phase C No-Ask | ❌ HOLD |
| Phase D Research Engine | ❌ HOLD |
| Per-domain hardcode patches | ❌ Rejected — general abstraction used |
| Draft key rename | ❌ Not touched |

---

## 13. PR

Branch: `cursor/day8d-phase-b-routing-6423`  
Base: `main`

Feature flag: `AI_PM_ANSWER_FIRST_ROUTING_V1=true` (rollback → gap-first force-fill behavior)

---

## B Gate Summary

> **"현재 질문이 무엇이었는가"보다 "CEO가 무엇을 말했는가"가 우선한다.**

Phase B delivers general Answer-first routing. Solution slot no longer absorbs competitor answers. Multi-fact and knowledge preservation verified. Dynamic Judgment (Phase A) continues to update after routing.

**Phase C No-Ask — NOT implemented.**
