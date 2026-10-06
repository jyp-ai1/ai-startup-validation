# S.I. Full DCE State Reconciliation — GATE COMPLETE

**PR:** #107 Fix  
**Branch:** `cursor/si-dce-reconciliation-e648`  
**Base:** PR #106 MEASUREMENT COMPLETE / FAIL · Baseline SHA `fbf6f1c` (#104)  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-stale-cu.json`  
**금지:** #104 부분 정직 회귀 · 1/2→S3 · 사업명 분기 · `decideNextQuestionFromReview` · 신규 SoT · 질문 생성기 덮어쓰기 · Production

#106이 고정한 결함: DCE 2/2 이후 Judgment는 S3인데 CU/Priority/질문이 이전 미충족 상태를 반복한다.

수정은 `pickCriticalUnknown` 한 곳이다. `quantified_problem`이 있어도 `stake_improved`가 있으면 지표 전후 CU를 쓰지 않고, 다음 미검증(1회 성과의 반복)으로 옮긴다. 1/2 (`dceStakeOpen`)는 그대로 둔다.

## DoD

| 단계 | 결과 |
|---|---|
| #104 baseline | 1/2 · 지불만 ≠ S3 유지 |
| #106 FAIL 재현 정의 | `stale-cu-definition.ts` 불변 |
| DCE 2/2 reconciliation | CU/DCE/Priority/질문 leftover = 0 |
| 0/2 · 1/2 | N/A · deferred · 지표 질문 유지 |
| unnamed no-show / 반품 / 이탈 | 2/2 **PASS** |
| 클리닉플로우 / 핏브릿지 | 2/2 **PASS** |
| 2/2 + 재결제 | **PASS** · 이전 질문 반복 없음 |
| SI suite | 20 files / 118 passed |
| P0-1 / P0-2 | 23 passed |
| Production | 불변 |

## 2/2 이후

```text
Judgment = viable / S3
CU       = 이번 성과가 다음 고객·다음 기간에도 이어지는가
Priority = 다음 고객 또는 다음 기간에서 같은 성과가 반복되는지 한 번 확인한다
Ask      = generic — 전후/재판매 질문 아님
```

이름 없는 이탈과 클리닉/핏브릿지가 같다. 사업명 분기가 아니다.

## 1/2 — #104 lock

지불만 넣으면 여전히 `judgment_deferred` / S1이다. CU는 “지불만 있으면 확정할 수 없다”, 다음 질문은 지표 전후다.

## 고정

- Presenter (`QUESTION_BY_KIND`) diff 없음
- `decideNextQuestionFromReview` 미사용
- Analyzer 사업명 토큰 없음
- Production 불변. CEO 재테스트 없음.
