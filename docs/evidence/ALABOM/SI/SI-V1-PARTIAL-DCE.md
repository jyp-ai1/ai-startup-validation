# S.I. Partial DCE Promotion Gate

**PR:** #104  
**Branch:** `cursor/si-partial-dce-e648`  
**Base:** PR #103 Founder Outcome MEASUREMENT COMPLETE / FAIL  
**금지:** 질문 생성기 수정 · 사업명 분기 · `decideNextQuestionFromReview` · 신규 SoT · Production

PR #103의 핵심 결함: 지불만 답해도 Headline이 `viable` / S3로 올랐다.

불변식:

```text
DCE가 여러 조건이면
일부만 충족된 답은 전체 DCE를 VALIDATED로 승격하지 않는다.
```

```text
유료 전환 = VALIDATED
수치화 지표 전후 = OPEN
Judgment = 보류
Stage ≠ S3
```

지표가 실제로 줄고 지불이 같이 있으면 승격할 수 있다.

클리닉플로우·핏브릿지는 대표 사례다. 규칙은 `quantified_problem` + `stake_improved`이지 사업명이 아니다.

## 핵심 테스트

| 입력 | 결과 |
|---|---|
| 클리닉플로우 + 지불만 | **deferred / S1** — S3 아님 |
| 핏브릿지 + 지불만 | **deferred / S1** — S3 아님 |
| 이름 없는 no-show + 지불만 | deferred / ≠ S3 |
| 이름 없는 no-show + 지불 + 18%→9% | S3, 승격 가능 |
| 이름 없는 반품률 + 지불만 | deferred / ≠ S3 |
| 이름 없는 반품률 + 지불 + 32%→20% | S3, 승격 가능 |

## 회귀

- 주인집 / LMULM / RIDM t0 CU·질문 고정
- directionMatch 5/5
- PR #98 2회 루프
- 질문 생성기 diff 없음 (`QUESTION_BY_KIND` 유지)
- Production 불변. CEO 재테스트 없음.

## Founder Outcome 재측정

지불만으로 더 이상 헤드라인이 “사업화 가능성이 높음”이 아니다. 클리닉/핏브릿지 Outcome은 FAIL에서 PARTIAL로 내려온다 (지표 전후는 아직 OPEN). 이번 Gate의 CLOSED 조건은 **지불만 → S3가 아닌가**이다.
