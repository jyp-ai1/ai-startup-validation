# S.I. Partial DCE Promotion Gate

**PR:** #104  
**Branch:** `cursor/si-partial-dce-e648`  
**SHA:** `fbf6f1c97b12c9b7e51d0be9d4609510fb967845`  
**Base:** PR #103 Founder Outcome MEASUREMENT COMPLETE / FAIL  
**Dump:** `docs/evidence/ALABOM/SI/si-v1-founder-outcome.json`  
**금지:** 질문 생성기 수정 · 사업명 분기 · `decideNextQuestionFromReview` · 신규 SoT · Production · CEO 재테스트

PR #103의 핵심 결함: 지불만 답해도 Headline이 `viable` / S3로 올랐다.

불변식:

```text
DCE가 여러 조건이면
일부만 충족된 답은 전체 DCE를 VALIDATED로 승격하지 않는다.
```

```text
유료 전환 = VALIDATED
수치화 지표 전후 = OPEN
CU = OPEN
DCE = PARTIAL
Judgment = 보류
Stage ≠ S3
```

지표가 실제로 줄고 지불이 같이 있으면 승격할 수 있다.

클리닉플로우·핏브릿지는 대표 사례다. 규칙은 `quantified_problem` + `stake_improved`이지 사업명이 아니다.

## 핵심 테스트 — 지불만 답했을 때 S3가 되는가?

**아니오.**

| 입력 | t1 verdict | t1 stage | 결과 |
|---|---|---|---|
| 클리닉플로우 + 지불만 | `judgment_deferred` | **S1** | S3 아님 |
| 핏브릿지 + 지불만 | `judgment_deferred` | **S1** | S3 아님 |
| 이름 없는 no-show + 지불만 | `judgment_deferred` | ≠ S3 | 보류 |
| 이름 없는 no-show + 지불 + 18%→9% | viable / conditionally_viable | **S3** | 전체 DCE만 승격 |
| 이름 없는 반품률 + 지불만 | `judgment_deferred` | ≠ S3 | 보류 |
| 이름 없는 반품률 + 지불 + 32%→20% | viable / conditionally_viable | **S3** | 전체 DCE만 승격 |

지불만 들어가면 Evidence는 `VALIDATED`로 기록되고, Inference는 `DCE는 부분`이다. Headline은 “사업화 가능성이 높음”이 아니다.

## 5사업 회귀

| 사업 | directionMatch | 지불만 → S3? | Founder Outcome | 비고 |
|---|---|---|---|---|
| 주인집 | PASS | 해당 없음 (결제자 DCE) | PASS | t1 viable/S3 — 단일 조건 DCE |
| LMULM | PASS | 해당 없음 (재판매 DCE) | PASS | t0 S3 → t1 S4 |
| RIDM AI | PASS | 해당 없음 (결제자+직무) | PASS | t1 conditionally_viable/S3 |
| 클리닉플로우 | PASS | **아니오 (S1 / deferred)** | PARTIAL | #103 FAIL → 거짓 승격 제거 |
| 핏브릿지 | PASS | **아니오 (S1 / deferred)** | PARTIAL | #103 FAIL → 거짓 승격 제거 |

```text
directionMatch 5/5 PASS
지불만 → S3 = 0
clinicflow / fitbridge rejudgmentHonest FAIL → PARTIAL
엔진 사업명 분기 없음
```

클리닉/핏브릿지 Outcome이 아직 PASS가 아닌 이유: kind 정답 픽스처는 지불만 넣는다. 지표 전후는 OPEN이므로 재판단은 부분이다. 이번 Gate의 CLOSED 조건은 **지불만 → S3가 아닌가**이다.

## PR #98 2회 루프

클리닉플로우·핏브릿지: t1·t2 모두 `judgment_deferred` / S1. 두 번째 답도 지불 반복이지 지표 전후가 아니다. 재판매로 새지 않는다.

LMULM: 재판매 답이 들어가면 S3 → S4.

## 고정

- `present-si-ai-pm-question.ts` diff 없음 (`QUESTION_BY_KIND` 유지)
- `decideNextQuestionFromReview` 미사용
- Analyzer에 사업명 토큰 없음
- 신규 persist SoT 없음
- Production 불변. CEO 재테스트 없음.

## 검증

```text
apps/web SI suite: 18 files / 110 passed
partial-dce-promotion: 7/7
주인집 / LMULM / RIDM 질문 lock: 유지
```
