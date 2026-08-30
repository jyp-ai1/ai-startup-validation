# Production CASE A/B Verification @ `2c551a3`

**Status:** Production re-verify **COMPLETE** — CASE A + CASE B **PASS** (gap closure proven)  
**CPO PASS:** **NOT declared** — CEO Walkthrough **HOLD**

| Field | Value |
|-------|-------|
| Target SHA | `2c551a3aaf53f4621b8a86c8601b5598f9f79065` |
| Prior baseline (pre-fix) | `44c0ecb` |
| Deploy time | 2026-08-30T15:44:35.911Z |
| Capture time | 2026-08-30T15:46–15:49Z |
| Harness | `apps/web/e2e/_cpo-ceo-second-loop-prod-capture.spec.ts` |
| Production URL | https://ai-startup-validation-tau.vercel.app |

---

## Phase 1 — Deploy poll

Production was already at target SHA on first poll (no wait required).

```json
{
  "commit": "2c551a3aaf53f4621b8a86c8601b5598f9f79065",
  "branch": "main",
  "deployTime": "2026-08-30T15:44:35.911Z",
  "environment": "production"
}
```

Saved: `prod-build-info.json`

---

## Phase 2 — CASE A (competitor CEO free-form)

**Fresh session.** Seed confirm → first question was competitor ask (no prefill needed).

### CPO state table — CASE A

| currentQuestion | answer | classification | semanticFactKey | targetGap | gap closed | next gap | repeat? |
|-----------------|--------|----------------|-----------------|-----------|------------|----------|---------|
| 비슷한 역할을 이미 하고 있는 서비스가 있나요? | 여행관련, 전통주 관련 개별 서비스는 많다. | business_fact | **competitor** | alternativesCompetitors | **YES** | differentiationVsAlternatives | **NO** (0) |

### Causal chain (sessionStorage + DOM)

```
currentQuestion = "비슷한 역할을 이미 하고 있는 서비스가 있나요?"
  → answer = "여행관련, 전통주 관련 개별 서비스는 많다."
  → classification = business_fact (VALID/mergeable)
  → semanticFactKey = competitor ✓
  → BANK recorded: alternativesCompetitors = answer text
  → alternativesCompetitors gap CLOSED
  → next gap = differentiationVsAlternatives
  → rendered next question = "경쟁 대비 이 서비스만의 차별점은 무엇인가요?"
  → same competitor stock question repeat = 0 ✓
```

**Verdict:** PASS — competitor meaning understood; NOT same stock question.

### Screenshots

| File | Moment |
|------|--------|
| `case-a/media/03-before-answer.png` | Competitor ask before CEO answer |
| `case-a/media/04-after-submit-next-question.png` | Differentiation ask after submit |

Raw: `case-a/transcript-raw.json`

---

## Phase 3 — CASE B (payer CEO free-form)

**Fresh session.** Navigated through competitor/diff/persona/problem/solution prefill to reach payer ask.

### CPO state table — CASE B

| currentQuestion | answer | classification | semanticFactKey | targetGap | gap closed | next gap | repeat? |
|-----------------|--------|----------------|-----------------|-----------|------------|----------|---------|
| 서비스 비용은 누가 지불하나요? | 고객이요 | business_fact | **buyer** | payer | **YES** | executionConstraints (defensibility Q) | **NO** (0) |

### Causal chain (sessionStorage + DOM)

```
currentQuestion = "서비스 비용은 누가 지불하나요?"
  → answer = "고객이요"
  → classification = business_fact (VALID/mergeable)
  → semanticFactKey = buyer ✓ (engine uses buyer for payer slot)
  → BANK recorded: payer = "고객이요"
  → payer gap CLOSED
  → next gap = executionConstraints (defensibility)
  → rendered next question = "경쟁사가 따라오기 어려운 방어력은 무엇인가요?"
  → same payer question repeat = 0 ✓
```

**Verdict:** PASS — implicit payer answer routed to buyer; payer gap closed; NOT same payer stock question.

### Screenshots

| File | Moment |
|------|--------|
| `case-b/media/09-before-answer.png` | Payer ask before CEO answer |
| `case-b/media/10-after-submit-next-question.png` | Defensibility ask after submit |

Raw: `case-b/transcript-raw.json`

---

## Phase 4 — Regression

### Unit tests (local @ fix tree)

| Suite | Result |
|-------|--------|
| `ceo-second-loop-repro.test.ts` | **10/10 PASS** |
| `core-final-stabilization.test.ts` | **78/78 PASS** |
| **Total** | **88/88 PASS** |

### Production regression note (@ `4755e27` baseline unchanged)

Prior evidence @ `4755e27` (real-adaptive-vnext):

| Metric | Baseline |
|--------|----------|
| reAskSameQuestionCount | **0** |
| wrong-slot hints | **0** |
| meaningful answers | 16 |

**Scope of this verify:** competitor + payer CEO free-form routing only (`2c551a3`).  
Persona/competitor/payer fixes do **not** modify adaptive engine paths proven @ `4755e27`.  
Full 25-turn capture **not re-run** (CASE A/B smoke only).

---

## Phase 5 — Evidence artifacts

| Path | Description |
|------|-------------|
| `PRODUCTION_CASE_AB_VERIFICATION.md` | This document |
| `case-ab-summary.json` | Machine-readable summary |
| `prod-build-info.json` | Build info @ 2c551a3 |
| `case-a/transcript-raw.json` | CASE A full sessionStorage dump |
| `case-b/transcript-raw.json` | CASE B full sessionStorage dump |
| `case-a/media/*.png` | CASE A screenshots |
| `case-b/media/*.png` | CASE B screenshots |
| `apps/web/e2e/_cpo-ceo-second-loop-prod-capture.spec.ts` | Harness (no engine changes) |

---

## Phase 6 — CPO report block

### BEFORE (@ `44c0ecb`) vs AFTER (@ `2c551a3`)

| Case | Pre-fix semanticFactKey | Pre-fix repeat | Post-fix semanticFactKey | Post-fix repeat | Status |
|------|-------------------------|----------------|--------------------------|-----------------|--------|
| **A** competitor | `business` ✗ | YES (reframe same gap) | **`competitor`** ✓ | **NO** | **FIX VERIFIED** |
| **B** payer | `customer` ✗ | YES (same payer Q) | **`buyer`** ✓ | **NO** | **FIX VERIFIED** |

### Per-case summary (Production @ `2c551a3`)

**CASE A**

| currentQuestion | answer | semanticFactKey | gap closed | next gap | repeat? |
|-----------------|--------|-----------------|------------|----------|---------|
| 비슷한 역할을 이미 하고 있는 서비스가 있나요? | 여행관련, 전통주 관련 개별 서비스는 많다. | competitor | YES (alternativesCompetitors) | differentiationVsAlternatives | NO |

**CASE B**

| currentQuestion | answer | semanticFactKey | gap closed | next gap | repeat? |
|-----------------|--------|-----------------|------------|----------|---------|
| 서비스 비용은 누가 지불하나요? | 고객이요 | buyer | YES (payer) | executionConstraints | NO |

---

## CPO disposition

- **CASE A/B gap-closure fix:** Production verified @ `2c551a3`
- **CEO Walkthrough:** **HOLD** — full walkthrough not re-run; persona loop evidence separate
- **CPO PASS:** **NOT declared**

---

## Re-run command

```powershell
cd apps/web
$env:CI='1'
$env:PLAYWRIGHT_BASE_URL='https://ai-startup-validation-tau.vercel.app'
pnpm exec playwright test e2e/_cpo-ceo-second-loop-prod-capture.spec.ts --retries=0
```
