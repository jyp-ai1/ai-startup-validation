# Sprint Q1 incremental normalize

2차 증분 반환을 저장 섹션으로 정규화한 엔진 기록이다. 화면 연결, Production 배포, 제품 2차 리뷰는 호출하지 않았다. 현재 판정은 FAIL이다. 이 기록은 CPO PASS가 아니다.

## 계약

| 항목 | 이전 `reflection-output-10` | 현재 `reflection-output-11` |
|---|---|---|
| 입력 | `originalInput`, `previousAnalysis`, `founderChoice`, `founderSupplement`, `answerOrigin` | 같음. 답변은 검증된 사실이 아니다 |
| 변경 원소 | `field`, `previous`, `current`, `decision`, `reason`, `founderAnswer`, `choiceTrace`, `evidenceStatus` | `field`, `previous`, `current`, `decision`, `reason`, `evidenceStatus` |
| 답변 추적 | 원소마다 `choice`, `supplement`, `label` 반복을 요구 | 입력에 둔다. `reason` 또는 `current`가 분석적 영향을 설명한다 |
| 저장 | `parseSections`가 1차 분석 모양만 받는다. 증분 JSON은 `sections=null` | `normalizeIncrementalSections`가 변경을 기존 섹션에 반영한다 |
| 실패 | 오류가 있으면 `sections=null`, `status=failed`, `rawContent` 유지 | 같음. `sections=null`은 성공이 아니다 |
| 옛 채점 | `followUpOutputContractErrors` | 그대로 둔다. 과거 run의 오류 목록을 유지한다 |

## 정규화

1. 모델 JSON을 읽는다. 파싱 실패는 `follow_up_output_unparsed`이고 섹션은 null이다.
2. `incrementalReflectionErrors`가 구조와 분석 연결을 본다. 선택·추가 설명의 반복 필드는 보지 않는다.
3. 오류가 없으면 부모 섹션을 복사한다. `customer`, `problem`, `market`, `execution`, `risks`, `uncertain`, `answerHint`, `claimConfirmation`, 수익 문장은 유지한다.
4. `judgment`, `hypotheses`, `nextQuestion`만 반환값으로 덮는다. 질문이 바뀌면 `nextQuestionReason`은 그 변경의 `reason`이다.
5. `analysis`가 있으면 `analysis.nextVerification`만 갱신한다. 부모 객체는 수정하지 않는다.
6. 필수 문자와 배열이 있으면 자식 리뷰를 `succeeded`로 저장한다. 없으면 `failed`이고 원문과 오류를 남긴다.

## 모델 없는 검증

기준 47건은 유지됐다. 이 변경으로 구조 테스트 3건이 추가되어 50건이다. 2026-10-30 16:19 KST에 50 passed다.

| 테스트 | 결과 |
|---|---|
| 입력 계약. 요청에 원문, 1차 분석, 선택, 추가 설명 | PASS |
| 출력 계약. 변경 원소의 필수 키 | PASS |
| changes를 sections로 변환. 질문 run 원문 | PASS. 섹션이 생기고 고객·문제·`answerHint`가 남음 |
| 필수 필드와 malformed JSON | PASS. `{`는 `follow_up_output_unparsed`, 섹션 null |
| `sections=null`을 성공으로 두지 않음 | PASS |
| 부모 분석 불변 | PASS |
| 자식 저장 후 재조회 | PASS. 주입 응답. 모델 호출 아님 |
| 같은 제출의 중복 자식 | PASS. 두 번째 호출 없음 |
| 과거 47건 | PASS |
| 격리 모델 품질 | FAIL. 아래 호출 |

## 격리 호출

| 항목 | 값 |
|---|---|
| Run ID | `q1-incremental-reflection-normalize-2026-10-30` |
| 이전 run | `q1-incremental-reflection-question-2026-10-29`. `finishedAt` `2026-10-29T15:17:41.952Z` 유지 |
| Git SHA | `a68fd6c2a39a52f0945f7c5ad709dcc20dc9ffa8` |
| 시각 | 2026-10-30 16:11:35–16:11:43 KST |
| 모델 | `gpt-4o-mini-2024-07-18` |
| Prompt tokens | 2497 |
| Completion tokens | 687 |
| Total tokens | 3184 |
| 재시도 | 0. 하네스는 한 번만 호출한다 |
| 비용 | NOT RUN. 가격표 없음 |
| `productFollowUpInvoked` | false |
| 원문 | `sprint-q1-incremental-reflection-normalize-recorded.json` |

요청에는 1차 분석, 선택 `체험 프로그램을 먼저 검증할 것`, 추가 설명의 `확정된 양조장`이 있다. 반환은 `founderAnswer`와 `choiceTrace`를 넣지 않았다. 가설은 `미확인`, 질문은 `양조장 후보가 있는가?`, 검증 문장은 양조장 후보 계획, 수익 가설은 유지, `evidenceStatus`는 `unverified-input`이다.

판단과 가설은 `retained`인데, reason이 답변으로 바꾸지 않는 이유를 설명하지 않는다. `incrementalReflectionErrors` 결과:

```text
reason_insufficient:judgment
reason_insufficient:hypotheses
```

그래서 `normalizeIncrementalSections`의 sections는 null이다. 이 반환은 성공한 자식 리뷰로 저장되지 않는다. 호출 SHA의 첫 채점은 reason마다 추가 설명 문장과 `질문`이라는 단어를 요구해 10건이 더 있었다. 그 문자 반복 검사는 빼고, 유지된 필드의 이유 검사는 남겼다. 같은 원문을 다시 채점했고 모델은 다시 호출하지 않았다.

| 격리 항목 | 결과 |
|---|---|
| 1차 분석이 요청에 있는가 | PASS |
| 선택과 추가 설명이 요청에 있는가 | PASS |
| 검증 계획과 다음 질문이 바뀌었는가 | 원문에는 있다 |
| 유지된 판단·가설의 이유가 답변과 연결되는가 | FAIL |
| 저장 가능한 sections | FAIL |
| 자식 리뷰 저장과 복원 | 이 반환으로는 NOT RUN. 정상 주입 반환의 저장·복원은 PASS |

## 하지 않은 것

화면 수정, follow-up API의 화면 연결, Production 배포, Production 잠금 해제, 실제 창업자 답변, `conversationId` 추가, `reviewId`와 `parentReviewId` 관계 변경.

## 남은 문제

유지된 판단과 가설의 reason이 답변의 없음이 왜 부족한지 말하지 않으면 자식 리뷰를 만들지 않는다. 이번 격리 반환이 그 경우다. 다음 엔진 작업은 그 이유를 요구하는 계약을 유지한 채, 유지 reason이 답변을 인용하지 않고도 부족함을 설명하게 하는 것이다. 화면 연결과 Production은 이 품질이 통과한 뒤에 다룬다.
