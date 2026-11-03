# Sprint 2 Objective 연속 요청

**시각:** 2026-11-03 12:02 KST

**판정:** Sprint 2 PARTIAL. 이 문서는 요청 계약과 비실시간 검증이다. 실제 GPT 3차 재호출과 4차는 하지 않았다.

## 요청 계약

단계 사용자 JSON에 `objectiveContinuity`가 있다.

| 필드 | 내용 |
| --- | --- |
| `order` | 이번 답이 미해결 objective를 닫았는지 먼저 본다. 열린 remainder는 `__new__`보다 먼저 잇는다. `__new__`는 그 남은 과제도 아니고 해결된 원래 목적도 아닌 새 검증 과제에만 쓴다. |
| `resolved` | `objectiveId`, `questionKey`, `originalPurpose`, `resolutionGrounds` |
| `unresolved` | `objectiveId`, `originalPurpose`, `remainingTask`, `parentObjectiveId`, `relation` |
| `thisRoundAnswers` | `questionKey`, `answerText`, `provenance`, `epistemicStatus`, `newlyConfirmed`, `stillUnconfirmed`, `closedObjectiveId`, `openedRemainderId` |

`relation`은 `remainder_of_partial_answer` 또는 `still_open`이다. `epistemicStatus`는 `FOUNDER_CLAIM`이다.

시스템 지시는 같은 순서를 말한다. 해결된 원래 목적을 표현만 바꿔 `__new__`로 만들지 않는다. 같은 사업 주제라도 남은 과제와 다른 검증 과제는 `__new__`로 남길 수 있다. 질문 문장은 모델이 쓴다. 코드는 사업 주제와 질문 문장을 정하지 않는다.

`judgmentReason`과 `answerEvidence.answerText`는 `thisRoundAnswers.answerText`를 답마다 그대로 포함한다. 주제만 비슷한 말은 그 원문이 아니다. 판단을 유지해도 각 답이 확인한 것과 남은 과제를 적는다.

`continuesObjectiveId` enum은 미해결 id와 `__new__`다. 파서의 `stage_objective_reselected`, `stage_objective_overlap`, `stage_purpose_repeated`, `stage_judgment_ungrounded`, `stage_answer_evidence_mismatch`는 그대로다.

## 상태 전달 예시

부모 `5f6d705d-fe2a-468f-97be-da16482abd32`의 저장된 답 q1 `설문조사 실시`, q2 `비용 분석`으로 만든 요청이다. 이 문장은 코드에 고정된 질문이 아니다.

| objectiveId | 상태 | originalPurpose | 연결 |
| --- | --- | --- | --- |
| `5f6d705d-fe2a-468f-97be-da16482abd32:q1` | resolved | 고객층 조사를 묻는 그 질문 | `resolutionGrounds`에 `설문조사 실시` |
| `5f6d705d-fe2a-468f-97be-da16482abd32:q2` | resolved | 가격 요소를 묻는 그 질문 | `resolutionGrounds`에 `비용 분석` |
| `5f6d705d-fe2a-468f-97be-da16482abd32:q1:remainder` | open | 부모의 원래 질문 | `remainingTask`는 실행 대상, 실행 여부, 응답 결과가 답에 없다는 문장. `relation`은 `remainder_of_partial_answer` |
| `5f6d705d-fe2a-468f-97be-da16482abd32:q2:remainder` | open | 부모의 원래 질문 | 같은 방식의 남은 과제 |
| `48d06eaa-ad74-4851-a919-fbd8ecefdc1a:q1` | open | 1차 질문 | `relation`은 `still_open` |

`thisRoundAnswers`의 `answerText`는 `설문조사 실시`, `비용 분석`이다. `provenance`는 `FOUNDER_INPUT`이다.

## answerEvidence

응답의 각 항목은 `questionKey`, 그 `answerText`, `FOUNDER_INPUT` 또는 `SIMULATION`, `FOUNDER_CLAIM`이다. 원문이 다르거나 출처가 다르거나 `VERIFIED_FACT`면 `stage_answer_evidence_mismatch`다.

## 파서 기준

| 응답 | 판정 |
| --- | --- |
| 해결된 objective id | 거절 |
| `__new__`로 해결된 목적을 다시 제안 | 거절 |
| 문장만 다른 같은 목적 | 거절 |
| remainder의 남은 과제를 구체화 | 허용 |
| 같은 사업 주제의 다른 검증 목적 | 허용 |
| 일부만 해결된 목적의 remainder 연결 | 허용 |
| 원문이나 출처가 다른 evidence | 거절 |
| 답 원문이 없는 판단 근거 | 거절 |

PR #238 저장 실패와 PR #240 저장 실패를 성공 응답으로 바꾸지 않는다. PR #240 증거 파일에는 선택된 후보의 objective 문장이 없다. 회귀는 저장된 질문, `judgmentReason`, `__new__`와 해결된 부모 목적을 함께 넣어 저장된 오류 코드를 다시 거절한다.

## 호출과 비용

이 변경의 실제 GPT 호출은 0회다. 재시도는 0회다. 4차는 NOT RUN이다.

CEO 승인 뒤의 범위는 3차 1회, 재시도 0회다. 그 행이 succeeded로 저장된 뒤에만 4차 1회다. 3차가 실패하면 4차는 하지 않는다.

직전 3차 호출은 입력 23,567, 출력 1,645, 합계 25,212 토큰이었다. 공개된 `gpt-4o-mini` 단가 입력 100만 토큰당 0.15달러, 출력 100만 토큰당 0.60달러로 그 한 호출은 약 0.005달러다. 승인 후 1회 또는 성공 시 2회도 0.02달러를 넘기지 않는 추정이다. 청구서가 아니다.

## 무결성

`docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json` SHA-256은 `6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd`다.

보존한 행은 `48d06eaa-ad74-4851-a919-fbd8ecefdc1a`, `5f6d705d-fe2a-468f-97be-da16482abd32`, `0e75ff46-88fd-4ce2-b567-bdc3f3048531`, `9d51935d-891e-424c-b3f1-9b1c5e529c2f`, `8ec32bae-461b-449a-99b7-db95a92fb2c0`, `a4e3455e-1043-403b-acd5-500c1c81bed4`다.

이 변경은 Supabase에 쓰지 않았다. 주입 응답으로 확인했던 제품 경로는 이번 실제 GPT 결과가 아니다. Production 배포는 하지 않았다. Sprint 3는 시작하지 않았다.
