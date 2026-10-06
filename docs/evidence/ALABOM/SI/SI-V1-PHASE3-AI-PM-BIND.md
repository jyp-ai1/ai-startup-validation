# S.I. Phase 3 — AI PM Bind

**Branch:** `cursor/si-phase3-ai-pm-bind-e648`  
**Base:** PR #93 Phase 2 PASS `9b16059`  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-phase3-ai-pm-bind.json`  
**Tests:** `pnpm exec vitest run features/strategic-intelligence` → 7 files / 25 passed  
**금지:** `decideNextQuestionFromReview` 개조 · PR #89 · P0-1/P0-2 · 새 persist SoT · 사업별 질문 하드코딩 · Critical Unknown 복사 · 질문 수 증가를 성공으로 취급

PR #93 원본은 보존한다. 이 PR에 Phase 2를 되돌려 쓰지 않는다.

## Acceptance

```text
S.I. Judgment
 → Critical Unknown
 → Decision Evidence
 → Validation Priority
 → AI PM 질문 1개
 → Founder Answer
 → Phase 2 Evidence Update
 → S.I. Re-Judgment
```

성공 기준은 “질문이 나왔다”가 아니다. S.I.가 지정한 증거가 AI PM 질문이 되고, 답이 Phase 2로 들어가 판단이 움직여야 한다.

## LMULM — 지정된 검증

| S.I. 입력 | 값 |
|---|---|
| Critical Unknown | C2C 재판매가 반복적으로 발생하는가 |
| Decision Evidence | 최근 구매자의 실제 재판매 등록·거래·재구매 데이터 |
| Validation Priority | 최근 구매 코호트의 재판매 등록·체결·재구매 |

AI PM 질문 (Critical Unknown 복사가 아님):

> 최근 실제로 구매한 고객 중에서, 재판매 등록·거래 체결·재구매처럼 두 번째 행동이 일어난 경우가 있습니까? 있다면 규모(명 또는 건)를 알려주세요. 아직 없다면 계획만 있다고 답해도 됩니다.

## VALIDATED 답 → 판단 이동

> 최근 구매자 100명 중 35명이 실제 재판매를 등록했고 12건이 거래됐다.

| Field | Before | After |
|---|---|---|
| class | — | VALIDATED |
| Stage | S3 | S4 |
| Critical Unknown | C2C 재판매 반복 | 반복 가능한 사업 여부 |
| Validation Priority | 재판매 등록·체결 | 구매 고객의 두 번째 행동 |
| update source | — | `si-v1-update` (PR #93 경로) |

## INTENT 답 → 판단 유지

> 재판매를 생각하고 있지만 아직 아무도 등록하지 않았다.

CLAIM, S3 유지, Unknown 유지. `CLAIM/INTENT ≠ VALIDATED`.

## 분리

- 질문 엔진 / `decideNextQuestionFromReview` / PR #89: import 없음
- RIDM은 payer/job 질문을 받고 재판매 질문을 받지 않음 (사업명 하드코딩 없음)
- 답변은 세션 메모리. 새 persist SoT 없음
