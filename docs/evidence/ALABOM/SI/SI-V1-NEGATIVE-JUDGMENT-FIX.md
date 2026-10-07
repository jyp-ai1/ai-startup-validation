# S.I. Negative Judgment Fix — ACCURACY FIX BATCH

**Branch:** `cursor/si-negative-judgment-fix-e648`  
**Base / Production:** `dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2` 불변  
**RCA:** append-only 문서 + 과거 strongest-signal OR  
**구현:** 분석 시점 retract + CONFLICT + stake 방향 + 유효 시그널로 재판단  
**금지 준수:** Presenter · `decideNextQuestionFromReview` · persist SoT · 사업명 분기 · Production merge 없음

## Fix

문서는 그대로 append-only다. `scanDocument` 이후 `applySignalRetractions()`가 라인 순서로:

- 기존 **VALIDATED** `revenue` / `repeat_validation` / `stake_improved`만 철회
- 문서 FACT 매출(LMULM 1차 판매)은 건드리지 않음
- `hasKind(*, false)`는 철회되지 않은 시그널만 본다
- `decideStage` / `decideVerdict` / `pickCriticalUnknown` 시그니처 불변

CONFLICT는 같은 축에서 기존 VALIDATED와 양립 불가할 때만. 재구매 0·해지는 철회하되 CONFLICT로 단정하지 않음.

`stake_improved`는 문제지표 `%`가 내려가거나 감소 동사일 때만. `9%에서 22%`는 개선이 아니다.

## Fix Test Batch

`si-negative-judgment.test.ts` 9.

| 시나리오 | 결과 |
|---|---|
| 지불만 1/2 | deferred · ≠ S3 (#104) |
| 2/2 no-show 18%→9% | S3 · CU 다음 고객/기간 (#107) |
| 9%→22% 악화 | S3/viable 유지 안 함 · CONFLICT |
| 해지 + 지표 악화 | 하향 |
| “아무도 결제하지 않았다” | CONFLICT · S3/viable 유지 안 함 |
| LMULM 재구매 0 | S4 아님 · CONFLICT 아님 |
| Founder 번복 + 결제 없음 | CONFLICT · 하향 |
| 주인집 거절 · RIDM 취소 · 핏브릿지/unnamed 해지+악화 | viable+S3/S4 유지 안 함 |

## Regression Batch

SI `__tests__` + Recovery2 P0-1/P0-2 unit **25 files / 150 tests PASS**.

| Gate | 결과 |
|---|---|
| #104 Partial DCE | PASS |
| #107 stale-cu 2/2 CU 이동 | PASS |
| #102 present-si-dce-ask | PASS |
| CU calibration / first-pass / founder journey / integration | PASS |
| P0-1 / P0-2 unit | PASS |
| 사업명 토큰 | analyzer/presenter 없음 |
| Presenter | diff 0 vs 이번 Fix (파일 미변경) |

## 남은 P1 (이번 묶음 밖)

- 질문 생성기 / `generic_ask_after_specific_cu` — Presenter 미수정. 하향 후 CU가 다시 열리면 질문은 따라갈 수 있으나 별도 측정.
- 주인집/RIDM 긍정 승격 후 leftover CU
- 한 코호트 S4 과승격의 “몇 번이면 S4인가”

## Production

UNCHANGED. Merge/deploy 없음.
