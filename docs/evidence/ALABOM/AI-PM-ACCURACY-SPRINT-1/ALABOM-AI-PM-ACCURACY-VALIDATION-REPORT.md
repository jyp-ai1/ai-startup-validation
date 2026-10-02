# ALABOM — AI PM Accuracy Validation Report (Sprint 1 · Slice 1)

**Date:** 2026-10-02 UTC  
**Branch:** `cursor/ai-pm-accuracy-sprint1-6423`  
**Pack index:** `CPO-ACCURACY-PACK-INDEX.md`

---

## 1. Executive summary

CPO 작업지시에 따라 **CEO TEST READY** 우선순위를 **AI PM 정확도 검증·개선**으로 전환했고, V3 SoT 파이프라인 위에 **8 Golden Scenario · Turn-level evidence** 자동화를 구축했다.

| Metric | Before (baseline harness) | After (this branch) |
|--------|---------------------------|---------------------|
| Golden 8 PASS | **4 / 8** | **8 / 8** |
| Evidence | — | `EVAL/golden-scenarios-turn-evidence.json` |

**CPO 2차 검증:** CTO 자동 테스트 **8/8 PASS** — CPO 독립 Layer 1–5 및 Real Business Review(로그인)는 **별도 2-pass 필요**.

---

## 2. Business Judgment Taxonomy

26항목 정의 및 V3 `gapId` / `ConversationFactKey` 매핑 — `BUSINESS-JUDGMENT-TAXONOMY.md`, 코드 `apps/web/lib/ai-pm-accuracy/business-judgment-taxonomy.ts`.

---

## 3. Golden Scenario 8종

| ID | Letter | Purpose | Gates |
|----|--------|---------|-------|
| golden-a-normal-input | A | 이해 (과잉 추론 방지) | Gate 1 |
| golden-b-sparse | B | PARTIAL / probe | Gate 1, 6 |
| golden-c-wrong-slot | C | 엉뚱한 답변 | Gate 3 |
| golden-d-contradiction | D | CONTRADICTED | Gate 5 |
| golden-e-no-repeat | E | CLOSED gap 재질문 방지 | Gate 4, 2 |
| golden-f-multi-slot | F | multi-slot | Gate 1, 2 |
| golden-g-overclaim | G | evidence class | Gate 7 |
| golden-h-wtp-assumption | H | WTP assumption | Gate 7 |

정의: `apps/web/lib/ai-pm-accuracy/golden-scenarios.ts`

---

## 4. Turn-level accuracy results

**Command:** `cd apps/web && pnpm test:accuracy-golden`  
**Output:** `docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/EVAL/golden-scenarios-turn-evidence.json`

각 turn 필드: Scenario, Turn, User Input, Expected/Actual Interpretation, State, Gap, Next Question, Reason, PASS/FAIL, Failure Type (F1–F10).

---

## 5. Failure taxonomy

`apps/web/lib/ai-pm-accuracy/failure-taxonomy.ts` — F1 Slot … F10 Judgment.

**This cycle addressed (from baseline 4/8):**

| Failure | Scenario | Fix (minimal, V3 SoT) |
|---------|----------|------------------------|
| F1 / F3 / F5 / F8 | C wrong-slot | `customerPersona` off-slot → OPEN + `IRRELEVANT`, no false CLOSE |
| F1 | A, F | Persona ask + problem/revenue cues → multi-fact enrich |
| F3 | E | Persona entity cues (양조장 등) → CLOSED when on-slot |

---

## 6. Before / after comparison

```text
Baseline (harness only, pre-fix): 4 PASS / 8 FAIL
  FAIL: A, C, E, F

Post-fix + regression:
  Golden harness:     8 PASS / 0 FAIL
  p0-2c wrong-slot:   7 PASS
  correction-semantics: 7 PASS
```

---

## 7. Regression

- `lib/ai-pm-accuracy/__tests__/golden-scenarios-accuracy.test.ts` — 10 tests  
- `p0-2c-wrong-slot-merge.test.ts`, `ai-pm-correction-semantics.test.ts` — PASS  

---

## 8. Production evidence

**NOT RUN** in this slice (Auth `storageState` / Real Business Review path unchanged). Production DoD remains per Release Checklist; accuracy sprint **local V3 harness** is the verification surface for CPO Layer 1 (State) on golden inputs.

---

## 9. CEO test results

| Milestone | Status |
|-----------|--------|
| CEO TEST 1 Understanding | **HOLD** — CPO 2-pass pending |
| CEO TEST 2 Reasoning | **HOLD** |
| CEO FINAL Judgment | **HOLD** |

---

## 10. Remaining accuracy risks

- Real user free-form (non-golden) · document intake · LLM paths not covered by harness  
- Question **priority** (Gate 11) — golden asserts target gap, not full PM ranking matrix  
- Gate 8–9 Reasoning/Judgment — not in golden 8 yet  
- Demo regression table: `demo-scenario-regression.ts` — **PENDING_CPO** browser fill  

---

## 11. Final AI PM Accuracy Assessment (CTO · Slice 1)

**Golden V3 deterministic loop:** **PASS (8/8)** with measurable before/after — *CTO self-check only*.  
**CPO 1-pass (2026-10-02):** **Slice 1 PASS (conditional) / Sprint 1 OPEN** — see `CPO-1PASS-VERDICT-ACCURACY-SLICE1-2026-10-02.md`.  
**Next:** `pnpm test:cpo-2pass-evidence` → `CPO-ACCURACY-2PASS.md` for CPO Layer 1–3 independent review.

---

## CPO verification steps

1. Read this report + `EVAL/golden-scenarios-turn-evidence.json`  
2. Re-run `pnpm test:accuracy-golden` on branch  
3. Spot-check failed-turn format against §16 evidence schema  
4. Issue Work Order for next failure class or promote CEO TEST 1 when Layer 1–3 PASS  
