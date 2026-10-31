# Sprint Q1 reflection array contract

증분 반영 FAIL 뒤에 `changes`를 JSON 배열로 고정하고, 빈 `grounds`를 실패로 둔 계약 `reflection-output-2`의 재검증이다. 이전 세 run은 반복하지 않았다. 호출 전 음성 테스트는 모델 없이 통과했다. 이 호출의 자동 스키마 오류 목록은 비어 있다. 증분 반영 기준은 충족되지 않았다. 1차 검증 완료가 아니다. 기본값은 `quality-2`다. Production 잠금은 유지했다. 제품 2차 리뷰 경로는 호출하지 않았다.

## 별도 기록

| 기록 | run id | 상태 | 실행 SHA | 시각 |
|---|---|---|---|---|
| 직접 호출 | `q1-incremental-structure-2026-10-29` | `RECORDED` 유지 | `ca72261c9a3623707e8d2e94eafe90a05178d2c9` | 2026-10-29 18:30:43–18:30:50 KST |
| 짧은 키 반환 | `q1-incremental-reflection-2026-10-29` | `RECORDED` 유지 | `1f153fc754fc50533351593d40768949de951f91` | 2026-10-29 21:18:08–21:18:12 KST |
| 객체 맵 반환 | `q1-incremental-reflection-output-2026-10-29` | `RECORDED` 유지 | `8c3f236eea62a27a551e88005e147b43984368d9` | 2026-10-29 21:37:25–21:37:32 KST |
| 이번 배열 계약 | `q1-incremental-reflection-array-2026-10-29` | `RECORDED` | `24a100b3809d32f05c2ca225ffdc7f9761baf7b4` | 2026-10-29 21:55:35–21:55:43 KST |

모델 `gpt-4o-mini-2024-07-18`. temperature 0.2. max tokens 2400. prompt 2354, completion 606, finish `stop`. 원문 `sprint-q1-incremental-reflection-array-recorded.json`. `productFollowUpInvoked`는 false다. `reflectionScored`는 false다. 보낸 요청의 `analysisContract`는 `parsed-sections-1`이고 `outputContract`는 `reflection-output-2`다. `answerOrigin`은 `synthetic-test-data`다.

호출 전 음성 테스트는 `ai-pm-review.test.ts`에서 모델 없이 돌렸다. 객체 맵, 문자열, 누락, 잘못된 원소 타입, 바뀐 필드의 빈 `grounds`, 그대로 둔 필드의 빈 `grounds`가 실패한다. 세 파일 합계 45 passed. 그 통과는 이 호출의 품질 통과가 아니다.

## 자동 검증

`followUpOutputContractErrors`를 이 반환에 적용한 결과는 `[]`다. 하네스는 그 목록을 저장하지 않는다. 저장 객체의 `reflectionScored`는 false이고, 이 목록은 저장본을 받은 뒤 같은 함수로 계산했다.

`changes`는 길이 4의 배열이다. 네 원소의 `field`는 `judgment`, `hypotheses`, `nextVerification`, `nextQuestion`이다. `grounds`는 네 칸 모두 `체험 프로그램을 먼저 검증할 것이라는 선택 문장.`이다. `unchangedReason`은 네 칸 모두 빈 문자열이다.

## 필드

| 필드 | 저장값 | 반환 | 내용 |
|---|---|---|---|
| `judgment` | 양조장 체험을 구상 중이라는 요약 | `체험 프로그램을 먼저 검증하는 것이 필요하다.` | 선택 문장과 글자는 다르고, 내용은 그 계획을 필요로 옮긴 것이다. `grounds`는 선택 문장만 가리킨다. 추가 설명은 없다 |
| `hypotheses` | `미확인` | `체험 프로그램의 수요가 존재할 것이다.`와 체험·마케팅 결합 모델 | 가설을 유지하지 않았다. 추가 설명의 예약 고객, 가격, 계약, 확정된 양조장은 이유에 없다. 계획은 수요가 존재할 것이라는 가설이 되었다 |
| `nextVerification` | 체험 수요와 온라인 마케팅 효과 | `체험 프로그램의 수요 검증` | 마케팅 효과를 같은 순위에서 뺐다. `grounds`는 선택 문장이다. 확정된 양조장이 없다는 추가 설명은 확인 행동이 아니다 |
| `nextQuestion` | 체험과 마케팅 중 어느 쪽을 먼저 검증할지 | `양조장 체험의 구체적인 내용은 무엇인가?` | 마케팅 효과로 돌아가지는 않는다. 가격, 예약, 계약, 확정된 양조장을 묻지 않는다 |
| `revenueModel` | `가설: 체험 프로그램 참가비 및 관련 상품 판매 수익(가설)` | 같은 문장 | 가설 표시가 남았다 |
| 선택 | `체험 프로그램을 먼저 검증할 것` | `choiceTrace.label`이 그 문장이고 `role`은 `plan`, `answerOrigin`은 `synthetic-test-data` | `founderFacts` 키는 없다. 판단 칸은 그 계획의 필요를 말한다 |

`강화`는 반환에 없다. `수요가 있다`도 없다. `수요가 존재할 것이다`는 있다.

## 기준

| 기준 | 이 호출 |
|---|---|
| 새 run id, SHA, 시각, 증거 | 위 표. 이전 세 객체는 같은 `finishedAt`으로 남아 있다 |
| `changes` 배열과 네 필드 | 배열이고 네 원소가 있다. 자동 검증 오류는 `[]` |
| 바뀐 필드의 입력 근거 | `grounds`는 비어 있지 않다. 네 칸이 선택 문장 한 줄이고 추가 설명은 없다 |
| 가설을 유지한 이유와 추가 설명 | 가설을 유지하지 않았다. 유지 이유와 추가 설명의 관계는 없다 |
| 선택과 추가 설명을 검증된 사실로 올리지 않음 | 사실 배열에는 없다. 가설은 계획에서 수요 존재 예상으로 바뀌었다 |
| 수익 가설 표시 | 보존되었다 |
| 반환 JSON과 자동 검증 | 원문 파일과 이 문서의 오류 목록 `[]` |

증분 반영 관문은 이 호출에서도 충족되지 않았다.

## 하지 않은 관문

| 관문 | 상태 |
|---|---|
| 제품 요청 구조 | PASS. SHA `eed29780cf9b43f2f580bb003bd7c0142c053a77` |
| 증분 반영 | FAIL. 배열 스키마는 맞았고, 추가 설명과 가설 경계는 비어 있다 |
| 2차 품질 | NOT RUN |
| 저장·복원 | NOT RUN |
| 화면 Q9·Q10 | BLOCKED. 2026-10-29 18:07 KST |
| Production | 잠금 유지 |
| 기본 프롬프트 | `quality-2` |
| 제품 2차 리뷰 | 호출하지 않음 |
