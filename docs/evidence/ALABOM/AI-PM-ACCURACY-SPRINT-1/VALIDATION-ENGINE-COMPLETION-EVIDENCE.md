# Validation Engine Sprint — Completion Evidence

**Date:** 2026-10-02 UTC  
**Git SHA:** `f0034af569de2d9f9d3d407d91127e4559bb6ead` (regenerate via `pnpm test:validation-engine-completion`)  
**Branch / PR:** `cursor/alabom-validation-engine-p1-6423` · PR #67  

## Mission outcome

CPO 요청대로 **“케이스 추가형 테스트” → “생성·측정·클러스터링 Validation Engine”** 전환을 **1차 Sprint Definition of Done** 수준으로 완료했습니다.

> 본 Sprint는 **AI PM 정확도를 즉시 올리는 Sprint가 아닙니다.**  
> 측정·회귀·홀드아웃·캘리브레이션 **인프라** 구축이 목표이며, **Golden 8 회귀 PASS**로 기존 Production 경로는 유지합니다.

---

## 1. Architecture & schemas

| Item | Status | Location |
|------|--------|----------|
| BusinessScenario | ✅ | `schemas/business-scenario.schema.json` |
| AnswerBehavior | ✅ | `schemas/answer-behavior.schema.json` |
| ConversationState + transitions | ✅ | `schemas/conversation-state.schema.json`, `state-transition-rules.ts` |
| ExpectedTurn | ✅ | `schemas/expected-turn.schema.json` |
| EvaluationResult | ✅ | `schemas/evaluation-result.schema.json` |
| Engine code | ✅ | `apps/web/lib/ai-pm-validation-engine/` |
| Architecture doc | ✅ | `VALIDATION-ENGINE-ARCHITECTURE.md` |
| Evaluation rules | ✅ | `EVALUATION-RULES.md` |

**Design constraints:** state drift · deterministic user agent · rule-first eval · cost ladder (150 → 300 turns).

**L6:** 미도입. Evidence Strength 1–5는 L5 내부.

---

## 2. Engine components

| Component | Status |
|-----------|--------|
| Business generator (10 archetypes) | ✅ `mini-sandbox-businesses.ts` |
| Answer behavior generator | ✅ `deterministic-user-agent.ts` |
| Dynamic conversation runner | ✅ `mini-sandbox-runner.ts` (V3 pipeline) |
| Ground truth / state transition | ✅ `ground-truth-engine.ts` |
| Evaluation engine (L1–L5 rules) | ✅ `deterministic-evaluator.ts`, L4/L5 helpers |
| Failure mining | ✅ `failure-mining.ts` |
| Holdout separation | ✅ `holdout-runner.ts` (biz-16, biz-17) |
| Seed regression A–F | ✅ `seed-regression-runner.ts` |
| CPO calibration compare | ✅ `cpo-calibration-compare.ts` |
| Coverage matrix | ✅ `coverage-matrix.ts` |
| Scale ladder step 2 | ✅ `scale-ladder-runner.ts` (10×6×5) |

**Cluster fix Sprint 2B:** **HOLD** — seeds in `EVAL/seed-failure-set.json`.

---

## 3. Mini Sandbox (First Gate)

| Metric | Value |
|--------|-------|
| Matrix | 10 × 3 × 5 |
| Total turns | **150** |
| Evidence | `EVAL/mini-sandbox-evidence.json` |
| State drift turns logged | 20 |
| User agent | Deterministic ✅ |

---

## 4. Scale ladder (post-POC)

| Step | Matrix | Turns |
|------|--------|-------|
| Step 2 | 10 × 6 × 5 | **300** |

Behaviors added: `sparse`, `off_slot`, `uncertainty`.

---

## 5. Holdout

| Item | Value |
|------|-------|
| IDs | biz-16 (GovTech), biz-17 (FinTech) |
| Isolation from dev mini-sandbox | ✅ verified |
| Sample evidence | `EVAL/holdout-results.json` |

---

## 6. Failure mining (combined POC + scale)

| Metric | Value |
|--------|-------|
| Turns analyzed | 450 |
| Failed turns (rule eval) | 138 |
| Top clusters | F13_MULTI_FACT_LOSS, F11_CONTRADICTION_MISHANDLING, STATE_DRIFT, … |
| Full report | `EVAL/failure-mining-report.json` |

---

## 7. CPO calibration

| Item | Value |
|------|-------|
| Set | `EVAL/cpo-calibration-set.json` |
| Auto vs CPO | `EVAL/cpo-calibration-compare.json` |
| CPO sign-off | **PENDING** (CEO/CPO 2차 검증) |

Auto evaluator는 캘리브레이션 튜닝 전 — 일부 mismatch **예상됨** (evaluator authority 아님).

---

## 8. Seed & golden regression

| Check | Result |
|-------|--------|
| Seed A–F harness runs | ✅ `seed-regression-runner` |
| Golden 8 | ✅ `pnpm test:accuracy-golden` (10/10) |

---

## 9. Real business

Production real-business trace는 기존 파이프라인 유지:

`pnpm evidence:real-business-review` (본 Sprint에서 재실행하지 않음 — Known limitation).

---

## 10. Known limitations

1. Synthetic sandbox ≠ Production quality claim.  
2. L5 heuristics — CPO calibration required before auto-eval as gate.  
3. Scale stops at 10×6×5 until next CPO gate (50×6×10 not run — cost control).  
4. AI PM 본체 버그 수정은 **다음 “Improvement Sprint”** — 본 Sprint에서 HOLD.

---

## 11. Recommended next fix clusters (from mining)

1. F13_MULTI_FACT_LOSS  
2. F11_CONTRADICTION_MISHANDLING  
3. STATE_DRIFT (ground truth vs AI gap alignment)  
4. F04_FACT_ASSUMPTION_CONFUSION (uncertainty / WTP)  
5. F08_WRONG_GAP_PRIORITY  

---

## 12. Reproduce

```bash
cd apps/web
pnpm test:mini-sandbox
pnpm test:validation-engine-completion
pnpm test:accuracy-golden
```

Full pack JSON: `EVAL/validation-engine-completion-pack.json`

---

## CPO 12 questions — engine can now answer (with data)

| # | Question | Evidence source |
|---|----------|-----------------|
| 1–2 | Diversity of business / behavior | Coverage matrix, scale ladder |
| 3–5 | Understanding, state, gap | Per-turn eval + drift |
| 6 | Question intent | L4 rules + intent map |
| 7–8 | Reasoning / judgment vs evidence | L5 + evidenceStrength |
| 9 | Failure concentration | Failure mining clusters |
| 10–11 | Dev vs holdout | holdout-runner + separate ids |
| 12 | Real business | Existing real-business evidence path |

**Sprint 종료 조건:** 위 Evidence 패키지 + 재현 명령 + 회귀 시드 + 홀드아웃 분리 — **충족.**

**다음 단계 (CPO 2차):** Validation Evidence 기반 **AI PM Improvement Sprint** (cluster 단위 fix, auto prompt patch 금지).
