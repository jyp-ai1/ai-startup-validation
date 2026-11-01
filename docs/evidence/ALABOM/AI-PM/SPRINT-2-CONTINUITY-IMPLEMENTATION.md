# Sprint 2 — 상담 연속성 1차 구현

2026-11-01 23:53 KST. CPO가 PR #228에 조건부로 승인한 1차 구현이다. GPT 실호출은 0회다. Production은 잠겨 있다. Sprint 2 PASS는 선언하지 않는다. #227 실패 증거는 수정하지 않았다.

기준은 세 가지다. 창업자의 답을 질문과 출처에 맞게 저장한다. 이전 판단에서 무엇이 달라졌는지는 모델이 쓰고, 코드는 빈 변화와 사실 승격을 거절한다. 아직 모르는 것은 모르는 상태로 남긴다. 판단 문장과 다음 질문의 품질은 이번 단계에서 호출하지 않았으므로 NOT TESTED다.

## 1. 계약에 반영한 보완

| 보완 | 구현 |
| --- | --- |
| `SIMULATION`은 사실 상태가 아님 | `epistemicStatus`는 `VERIFIED_FACT` `FOUNDER_CLAIM` `ASSUMPTION` `UNKNOWN`. `provenance`는 `FOUNDER_INPUT` `SIMULATION` `EXTERNAL_EVIDENCE` `AI_INFERENCE`. 본문이 `SIMULATION`으로 시작하면 출처는 `SIMULATION`으로 고정 |
| 원문 구간은 검증이 아님 | 구간이 출처에 없으면 `span_not_in_source`. `VERIFIED_FACT`는 `EXTERNAL_EVIDENCE`와 `evidenceId`가 있을 때만 유지. “양조장과 계약했다”는 `FOUNDER_CLAIM` |
| 미연결 정보는 질문과 따로 누적 | 질문 id가 없거나 그 단계의 질문이 아니면 연결하지 않음. 질문은 열린 채로 남음. 원문과 출처를 보존. 다음 요청의 `unlinkedStatements`. 같은 원문은 한 행. 미연결만으로 단계를 완료하지 않음 |

없는 `choiceId`는 `c1`이 되지 않는다. 제공 선택지에 없는 id도 ChoiceAnswer를 만들지 않는다. 그 본문은 `FOUNDER_CLAIM`으로 남는다.

같은 `submittedAt`이면 마지막 저장이 그 질문의 현재 답이 되도록, 이미 있는 시각보다 이르거나 같으면 1ms 뒤 시각으로 저장한다. 로컬 sqlite 조회는 `submitted_at`, `rowid` 순이다. SQL 마이그레이션은 없다.

## 2. 코드

| 파일 | 내용 |
| --- | --- |
| `ai-pm-decision-contract.ts` | `settleSavedStatement`, `evaluateSourcedStatement`, `collapseDuplicateStatements`. 사업 내용이 있는 답의 빈 `changes`는 `answer_not_recorded`. `STATE_SYSTEM`, `SELECTION_SYSTEM`은 유지 |
| `ai-pm-review.ts` | `submitConsultingStage`의 `c1` 기본값 제거. 미연결 저장. `runStageReanalysis`가 `unlinkedStatements`와 `answerRecords`를 제품 요청에 넣음. 시스템 문장 유지. 모델 상수 `gpt-4o-mini` 유지 |
| `ai-pm-review-store.ts` | 피드백 JSON의 선택 필드. 조회 순서만 고정 |
| `ai-pm-continuity-contract.test.ts` | 새 단위. 스텁 chat. 네트워크 0 |
| `ai-pm-decision-contract.test.ts` | 빈 변화 1건 추가 |
| 설계 세 문서 | 위 세 보완을 기존 문서에 반영 |

제품 경로는 `submitConsultingStage` → `runStageReanalysis`다. `runDecisionContractFollowUp`의 얇은 요청은 제품으로 올리지 않았다. 실험 B와 #227 라이브 하니스는 수정하지 않았다. `run-web-build.sh`에 실호출을 넣지 않았다.

시스템 문장을 고치지 않았으므로, 이번 조각은 모델 JSON에 새 델타 키가 없다는 이유만으로 기존 단계 파서를 실패시키지 않는다. 라이브 모델이 답을 이해했는지는 NOT TESTED다.

## 3. 단위 테스트

2026-11-01 23:52 KST. `vitest run`. 스텁 chat. GPT 실호출 0. 저장소 요율 0.

| 파일 | 결과 |
| --- | --- |
| `ai-pm-continuity-contract.test.ts` | 5 통과. 같은 파일을 한 번 더 실행해 5 통과 |
| `ai-pm-decision-contract.test.ts` | 10 통과. 기존 9건과 `answer_not_recorded` |
| `ai-pm-consulting-stage.test.ts` | 33 통과 |
| `ai-pm-founder-context.test.ts` | 2 통과 |

확인한 동작:

- 연습 문장을 `VERIFIED_FACT`와 `FOUNDER_INPUT`으로 저장 요청하면 `provenance` `SIMULATION`, `epistemicStatus` `FOUNDER_CLAIM`.
- “양조장과 계약했다”를 `VERIFIED_FACT`로 요청하면 `FOUNDER_INPUT` + `FOUNDER_CLAIM`. `EXTERNAL_EVIDENCE`와 `evidenceId`가 있으면 `VERIFIED_FACT`가 유지된다.
- 미연결만 저장하면 호출은 늘지 않고 `q1`은 열린 채로 남는다. `modelCalls`는 0. 같은 문장을 다시 보내도 행은 하나다.
- 질문이 둘이면 한쪽만 답한 단계는 `pending`이고 호출은 0이다.
- 라벨만 있고 id가 없으면 `choiceId`는 null이다. 제공된 `c1`을 저장하지 않는다. 창업자가 고른 `c2`는 `c2`로 남는다.
- 단계가 끝나면 스텁 호출 1회. 모델 상수는 `gpt-4o-mini`. 같은 답을 다시 보내면 호출은 0이고 자식 행을 재사용한다.
- 자식 행의 `parentReviewId`는 1차 리뷰이고 `callCount`는 1이며 `status`는 `succeeded`다. 이 성공은 스텁 JSON이 기존 단계 파서를 통과했다는 뜻이다. 라이브 판단 품질이 아니다.

## 4. 조립된 제품 요청

2026-11-01 23:53 KST 단위 실행의 사용자 JSON이다. `feedbackId`는 그 실행의 로컬 sqlite id다. Founder 프로젝트가 아니다. 요청 모델은 `gpt-4o-mini`다.

`stagePairs`는 질문 답만 담는다. 연습 문장은 여기 없다. `q1`의 현재 선택은 창업자가 고른 `c2`다. 제공 목록의 `c1`은 선택되지 않았다.

```json
{
  "questionId": "q1",
  "question": "양조장과의 협력 가능성을 어떻게 확인할 것인가?",
  "choiceId": "c2",
  "choiceLabel": "아직 정하지 못했다.",
  "supplement": "상품은 구상 단계이며 공급 계약과 가격은 없다.",
  "status": "answered"
}
```

`unlinkedStatements`는 `stagePairs` 옆이다.

```json
{
  "questionId": null,
  "choiceId": null,
  "text": "SIMULATION. 양조장 한 곳에 문의했지만 아직 참여 의향은 확인하지 못했다.",
  "submittedAt": "2026-11-01T14:40:00.004Z",
  "provenance": "SIMULATION",
  "epistemicStatus": "FOUNDER_CLAIM",
  "evidenceId": null
}
```

`answerRecords`에는 질문 답이 시간 순으로 남는다. `VERIFIED_FACT`는 없다. id 없는 라벨은 `choiceId` null인 `FOUNDER_CLAIM`이다.

| submittedAt (UTC) | questionId | choiceId | epistemicStatus | provenance | 원문 |
| --- | --- | --- | --- | --- | --- |
| 14:40:00.000Z | q1 | c2 | FOUNDER_CLAIM | FOUNDER_INPUT | 협력 방법은 정하지 않았다. |
| 14:40:00.001Z | q1 | null | FOUNDER_CLAIM | FOUNDER_INPUT | 양조장과 직접 협상하여 의사를 확인한다. |
| 14:40:00.002Z | q1 | c2 | FOUNDER_CLAIM | FOUNDER_INPUT | 상품은 구상 단계이며 공급 계약과 가격은 없다. |
| 14:40:00.003Z | q2 | c2 | FOUNDER_CLAIM | FOUNDER_INPUT | 가격은 아직 정하지 않았다. |
| 14:40:00.004Z | null | null | FOUNDER_CLAIM | SIMULATION | SIMULATION. 양조장 한 곳에 문의했지만 아직 참여 의향은 확인하지 못했다. |

현재 단계 쌍은 각 질문의 마지막 행을 쓴다. `q1`은 14:40:00.002Z의 `c2`다. 14:40:00.001Z의 라벨은 선택으로 바뀌지 않은 채 기록에 남는다.

## 5. 저장과 재조회

미연결만 보낸 경우 피드백 1행이다. `questionId` null, `unlinked` true, `provenance` `SIMULATION`, `epistemicStatus` `FOUNDER_CLAIM`, `modelCalls` 0. 같은 문장의 두 번째 제출은 같은 `feedbackId`를 다시 읽는다.

단계가 끝난 뒤 자식 리뷰를 다시 읽으면 `parentReviewId`는 1차 리뷰이고 `callCount`는 1이다. 같은 답과 같은 미연결 문장을 다시 제출하면 `called`는 false이고 스텁 호출 수는 2에서 멈추다. 1차는 최초 검토, 2차는 그 단계의 재분석이다.

## 6. 이번 제출에서 통과하지 않은 것

| 항목 | 상태 |
| --- | --- |
| 전체 사업 맥락을 제품 요청에 넣는 경로 | 단위로 조립 확인. 라이브 모델의 이해는 NOT TESTED |
| 질문·답 출처 | 단위 통과 |
| 미연결 정보 | 단위 통과 |
| 사실·주장·시뮬레이션 구분 | 저장과 검사 단위 통과. 라이브 출력은 NOT TESTED |
| 판단 변화 | 빈 변화는 `answer_not_recorded`로 단위 통과. `RETAIN` `MODIFY` `ADD` `DEFER` `RESOLVE`의 라이브 문장은 NOT TESTED |
| GPT 판단 품질 | NOT TESTED |
| 다음 검증 목표 선택 품질 | NOT TESTED |
| Sprint 2 | FAIL |
| Production | 잠금 |

라이브 GPT 1회는 이 단위 결과의 별도 승인 전이다.
