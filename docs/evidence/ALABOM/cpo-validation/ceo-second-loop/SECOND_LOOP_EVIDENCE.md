# CEO Second Conversation Loop — CASE A + CASE B

**Status:** ROOT CAUSE PROVEN · FIX DEPLOYED · **Production CASE A/B re-verify PASS @ `2c551a3`**

**Production baseline (pre-fix):** `44c0ecb`  
**Production verified:** `2c551a3` — see `PRODUCTION_CASE_AB_VERIFICATION.md`  
**Prior related fix:** customerPersona @ `294ac87` via `persona-answer-cues.ts`  
**Fix scope:** `competitor-answer-cues.ts` + `payer-answer-cues.ts` + gap inference + semantic routing (no UX/spine/ranking overhaul)

---

## CPO symptoms (Production @ `44c0ecb`)

| Case | Question | User answer | Next (FAIL) |
|------|----------|-------------|-------------|
| **A** | 비슷한 역할을 하는 서비스가 있어? | 여행관련, 전통주 관련 개별 서비스는 많다. | 「여행관련, 전통주 관련 개별 서비스는 많다」와 비슷한 역할을 이미 하는 서비스가 있나요? |
| **B** | 누가 비용을 지불합니까? | CEO free-form (exact text not captured; likely customer-implicit) | Same payer question repeats |

**Same pattern:** answer submitted → gap not closed → same gap re-selected → reframed stock question quotes user answer.

---

## Phase 1 — BEFORE (reproduce + prove)

### CASE A trace (@ `44c0ecb` logic)

| Field | Value |
|-------|-------|
| currentQuestion | 비슷한 역할을 이미 하고 있는 서비스가 있나요? |
| selectedGap | `alternativesCompetitors` |
| answerClassification | VALID (mergeable) |
| **semanticFactKey** | **`business`** ✗ (wrong — should be `competitor`) |
| BANK fact stored | `business` = "여행관련, 전통주 관련 개별 서비스는 많다." |
| alternativesCompetitors closed? | **NO** |
| ranked gaps | still includes `alternativesCompetitors` |
| next selected gap | `alternativesCompetitors` (reframe) |
| lastAskSurface | `「${business}」와 비슷한 역할을…` (reframeStem uses wrong business claim) |

**Failure chain:**

```
CEO answer on alternativesCompetitors ask
  → interpretAnswerSemantics()
  → "개별 서비스는" matches business route (서비스는) with score 7
  → hasCompetitorCue = false (no 클룩/경쟁/비슷한 키워드)
  → askedGap weak prior skipped because top !== null (top = business)
  → semanticFactKey = business  ✗
  → getAnsweredTargetGaps(): alternativesCompetitors NOT in answered set
  → listUnconfirmedCriticalGaps(): alternativesCompetitors still open
  → reframeQuestion() quotes stored business fact → CPO-visible repeat
```

**Same class as customerPersona?** YES — **wrong semanticFactKey / wrong-slot steal**, not reAsk-ban failure.

---

### CASE B trace (@ `44c0ecb` logic)

| Field | Value |
|-------|-------|
| currentQuestion | 누가 비용을 지불합니까? (i18n) |
| selectedGap | `payer` |
| inferTargetGapFromQuestionText(i18n Q) | **`null`** ✗ |
| CEO plausible answers tested | 고객이요 / 외국인 관광객이요 / 당연히 고객이지 |
| semanticFactKey (when askedTargetGap=null) | **`customer`** ✗ |
| semanticFactKey (when askedTargetGap=payer) | `buyer` ✓ |
| payer closed (askedTargetGap=null + customer answer) | **NO** |
| payer closed (askedTargetGap=payer) | **YES** |

**Failure chain (when visibleGap inference misses):**

```
i18n payer question "누가 비용을 지불합니까?"
  → inferTargetGapFromQuestionText() = null  (regex only matched "누가 지불", not "누가 비용을 지불")
  → visibleGap null at interpret unless whyTargetGap fallback present
  → CEO answer "고객이요" / "외국인 관광객이요"
  → customer route wins (no explicit 결제/지불 cue)
  → semanticFactKey = customer  ✗ NOT buyer
  → getAnsweredTargetGaps(): payer NOT closed
  → same payer question re-selected → FAIL
```

**Same root cause as CASE A?** **NO — related family (gap closure failure) but different mechanism:**

| | CASE A | CASE B |
|---|--------|--------|
| Primary break | business-slot steal on competitor ask | i18n gap inference miss + customer steal on payer ask |
| Wrong semanticFactKey | `business` | `customer` |
| askedGap honored? | weak prior blocked by business top-route | payer block skipped when askedTargetGap null |
| Pattern class | persona-style cue miss | gap inference + implicit payer cue miss |

---

## Phase 2 — ROOT CAUSE

### CASE A
Classification failure: CEO free-form competitor landscape answers (`여행관련`, `전통주`, `개별 서비스`, `많다`) lack BANK competitor keywords. Substring `서비스는` falsely triggers `business` route, blocking `alternativesCompetitors` weak prior.

### CASE B
Two compounding issues:
1. **Gap inference:** i18n `누가 비용을 지불합니까?` not matched by `inferTargetGapFromQuestionText`
2. **Routing:** Implicit payer answers (`고객이요`, `외국인 관광객이요`) route to `customer` when `askedTargetGap` is not reliably `payer`

---

## Phase 3 — FIX (minimal)

| File | Change |
|------|--------|
| `competitor-answer-cues.ts` | **NEW** — CEO competitor existence cues (verticals, "many services") |
| `payer-answer-cues.ts` | **NEW** — implicit payer cues on payer ask |
| `interpret-answer-semantics.ts` | `alternativesCompetitors` + enhanced `payer` asked-gap blocks |
| `gap-question-map.ts` | i18n payer + competitor question inference patterns |
| `workspace-ai-pm-loop-panel.tsx` | `visibleGap` fallback chain; payer/competitor display SoT canonicalization |
| `__tests__/ceo-second-loop-repro.test.ts` | CASE A + CASE B regression matrix |

**NOT changed:** gap ranking, reAsk counters, turn-count escape, question deletion, spine.

---

## Phase 4 — AFTER (local verification)

| Metric | Result |
|--------|--------|
| CASE A → semanticFactKey | **`competitor`** ✓ |
| CASE A → alternativesCompetitors closed | **YES** ✓ |
| CASE B i18n gap inference | **`payer`** ✓ |
| CASE B CEO answers (5 variants) | **payer closed** ✓ |
| ceo-second-loop-repro | **9/9 PASS** |
| core-final-stabilization | **79/79 PASS** (88 total with repro) |

### Turn sequence AFTER (CASE A)

| Turn | User | semanticFactKey | gap closed? | Next gap |
|------|------|-----------------|-------------|----------|
| Tn | 여행관련, 전통주 관련 개별 서비스는 많다. | `competitor` | **YES** → alternativesCompetitors | differentiationVsAlternatives (ranked next) |

### Turn sequence AFTER (CASE B — 고객이요)

| Turn | User | semanticFactKey | gap closed? | Next gap |
|------|------|-----------------|-------------|----------|
| Tn | 고객이요 | `buyer` | **YES** → payer | problemJtbd / next ranked |

---

## Phase 5 — Production re-verify (@ `2c551a3`)

**RUN 2026-08-30** — Playwright harness `_cpo-ceo-second-loop-prod-capture.spec.ts`

| Case | semanticFactKey | gap closed | repeat | Verdict |
|------|-----------------|------------|--------|---------|
| A competitor | `competitor` | alternativesCompetitors YES | 0 | PASS |
| B payer | `buyer` | payer YES | 0 | PASS |

Unit @ capture time: **88/88 PASS** (ceo-second-loop-repro 10 + core-final-stabilization 78)

Full evidence: `PRODUCTION_CASE_AB_VERIFICATION.md` · `case-a/` · `case-b/` · `case-ab-summary.json`

**CPO PASS: NOT declared.** CEO Walkthrough HOLD.

---

## Files

| Path | Role |
|------|------|
| `SECOND_LOOP_EVIDENCE.md` | This document |
| `PRODUCTION_CASE_AB_VERIFICATION.md` | Production re-verify @ 2c551a3 |
| `case-a/transcript-raw.json` | CASE A Production capture |
| `case-b/transcript-raw.json` | CASE B Production capture |
| `apps/web/e2e/_cpo-ceo-second-loop-prod-capture.spec.ts` | Playwright harness |
| `apps/web/.../competitor-answer-cues.ts` | CASE A fix |
| `apps/web/.../payer-answer-cues.ts` | CASE B fix |
| `apps/web/.../__tests__/ceo-second-loop-repro.test.ts` | Regression matrix |
| `../ceo-walkthrough-loop/INFINITE_LOOP_EVIDENCE.md` | Prior persona loop (same pattern class) |
