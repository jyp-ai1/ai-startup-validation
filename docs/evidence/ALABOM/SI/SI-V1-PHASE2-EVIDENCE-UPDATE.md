# S.I. Phase 2 — Evidence Update

**Branch:** `cursor/si-phase2-evidence-update-e648`  
**Base:** PR #92 CONDITIONAL PASS lock `940bd47`  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-phase2-evidence-update.json`  
**Tests:** `pnpm exec vitest run features/strategic-intelligence` → 5 files / 18 passed  
**금지:** 질문 엔진 · AI PM · PR #89 · UI · 점수 · C4/C5 문장 보강 · 사업별 예외 · Production 승격

Calibration Gate first judgments remain identical to the frozen `#92` dump. This PR does not rewrite `si-v1-calibration-output.json`.

## Acceptance

```text
초기 S.I. 판단
 → Founder 답변 1개
 → 새 Evidence 분류
 → Critical Unknown 변화
 → Judgment 변화 여부
 → Validation Priority 변화
```

## LMULM — VALIDATED

> 최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.

| Field | Before | After |
|---|---|---|
| Evidence class | — | **VALIDATED** |
| Evidence strength | — | **up** |
| Stage | S3 | **S4** |
| Verdict | viable | viable (유지) |
| Critical Unknown | C2C 재판매가 반복적으로 발생하는가 | 현재 강점이 반복 가능한 사업으로 이어지는가 |
| Validation Priority | 최근 구매 코호트의 재판매 등록·체결·재구매 | 이미 구매한 고객의 두 번째 행동 |
| Judgment | 리스크 = C2C 반복 미검증 | 리스크 = 반복 가능 사업 여부 |

Deltas: `criticalUnknownChanged=true`, `judgmentChanged=true`, `validationPriorityChanged=true`. Evidence map gains a `VALIDATED` item.

## LMULM — INTENT

> 재판매를 생각하고 있지만 아직 아무도 등록하지 않았다.

| Field | Result |
|---|---|
| Evidence class | **CLAIM** |
| VALIDATED? | **아니오** |
| Evidence strength | unchanged |
| Stage | S3 유지 |
| Verdict | viable 유지 |
| Critical Unknown | C2C 반복 미검증 유지 |
| Validation Priority | 변경 없음 |
| Judgment | 변경 없음 |

`CLAIM/INTENT ≠ VALIDATED`.

## Generic marketplace (no brand)

Same two answers on a nameless launched marketplace document produce the same movement: VALIDATED → S3 to S4; INTENT → CLAIM and S3 hold. Analyzer and update modules contain no calibration brand names.

## What this is not

- Not a question-generation bind
- Not an AI PM bind
- Not a UI change
- Not a score
- Not a C4/C5 prose patch
- Not merged into PR #92
- Not Production
