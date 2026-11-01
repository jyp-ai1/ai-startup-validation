# Sprint 2 — 상담 연속성 통합 Payload 검증

2026-11-02 08:38 KST. 기준 커밋은 이 문서가 들어간 커밋이다. 직전 구현은 `e9de4fb4`다. GPT 실호출은 0회다. Production은 잠금이다. Sprint 2 PASS는 선언하지 않는다. Founder 프로젝트 데이터는 쓰지 않았다.

검증 기준은 2026-11-02 08:32 KST에 바뀌었다. 코드는 GPT의 사업 판단이 옳은지 검수하지 않는다. 한 사업 컨텍스트에서 질문, 답변, 미연결 정보, 이전 분석이 다음 라운드로 이어지는지를 본다.

아래 GPT 응답 원문은 테스트가 넣은 스텁이다. `evidence`는 `injected_http`다. 라이브 모델 출력은 NOT RUN이다.

## 1. 구현 변경 파일

| 파일 | 이유 |
| --- | --- |
| `apps/web/features/business-validation-journey/lib/ai-pm-review.ts` | 미연결 문장을 사업 연쇄 전체에서 한 번만 저장. 답변 기록을 시각 순으로 정렬. 선택 id의 라벨은 그 질문 메뉴의 라벨 |
| `apps/web/features/business-validation-journey/lib/ai-pm-decision-contract.ts` | 변화 목록이 비어 있다는 이유만으로 실패시키지 않음 |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-e2e-continuity.test.ts` | 스텁 1~4차와 예산 삭제 범위 |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-decision-contract.test.ts` | 빈 변화 실패 기대 제거 |
| 설계 문서 세 건과 `SPRINT-2-CONTINUITY-IMPLEMENTATION.md` | 검증 기준 변경을 기존 문장에 반영 |

시스템 프롬프트, 모델 상수 `gpt-4o-mini`, SQL, #227 실패 증거는 그대로다. 제품 후속 경로는 `submitConsultingStage` → `runStageReanalysis`다. `buildStateRequest`는 이 경로에 없다.

## 2. 데이터 흐름

1. `runFirstReview`가 최초 아이디어를 저장하고 스텁 1차 분석을 받는다.
2. `submitConsultingStage`가 질문 id가 있는 답은 그 질문에, 없는 id와 `unlinked`는 미연결 행에 저장한다. 단계가 열려 있으면 호출은 0회다.
3. 단계의 질문이 모두 답해지면 `runStageReanalysis`가 요청을 조립한다. 현재 답은 `stagePairs`, 이전 답은 `priorStagePairs`, 미연결은 `unlinkedStatements`다.
4. 응답이 기존 단계 파서의 필수 필드를 갖추면 자식 리뷰로 저장된다. 다음 질문 id는 `q1`부터 다시 붙고, 선택 id는 메뉴 순서대로 `c1`, `c2`다. 라운드 구분은 `parentReviewId`와 `answerLinks.sourceReviewId`다.
5. 다음 제출은 그 자식 리뷰를 부모로 삼는다. 같은 답과 같은 미연결 문자는 추가 호출 없이 저장된 자식을 다시 읽는다.

## 3. 최초 요청 원문

사용자 `e2e-user`, 프로젝트 `e2e-brewery`. 입력 원문:

`다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 전통주 양조장 체험을 안내하는 사업을 구상 중이다.`

1차 요청 모델은 `gpt-4o-mini`다. 시스템 문장은 기존 `firstReviewSystemPrompt`다.

## 4. 최초 GPT 응답

스텁이다. 저장된 고객은 `전통주 양조장에 관심 있는 관광객`이다. 판단 문장은 `수요 충족은 확인되지 않았다. 협력은 미확인이다.`다. 행 상태는 `succeeded`, `callCount`는 1, 토큰은 스텁 사용량 20 / 20 / 40이다.

## 5. 최초 질문과 선택지

| questionId | 질문 | 선택 id |
| --- | --- | --- |
| q1 | 양조장과의 협력 가능성을 어떻게 확인할 것인가? | c1 양조장과 직접 협상하여 의사를 확인한다. / c2 아직 정하지 못했다. / other 기타 / 직접 입력 |
| q2 | 체험 가격을 언제 정할 계획인가? | c1 가격 기준을 먼저 적는다. / c2 아직 정하지 못했다. / other 기타 / 직접 입력 |

## 6. 창업자 답변 원문

| 라운드 | 연결 | choiceId | 저장된 라벨 | 원문 |
| --- | --- | --- | --- | --- |
| 1 | q1 | c2 | 아직 정하지 못했다. | 협력 방법은 정하지 않았다. |
| 1 | q2 | c2 | 아직 정하지 못했다. | 가격은 아직 정하지 않았다. |
| 1 | 미연결 | null | 없음 | 축제 일정은 다음 달로 생각하고 있다. |
| 1 | 미연결 | null | 없음 | SIMULATION. 양조장 한 곳에 문의했지만 아직 참여 의향은 확인하지 못했다. |
| 2 | q1 | c2 | 수용 인원은 아직 모른다 | 장소 수용은 아직 모른다. |
| 3 | q1 | c2 | 안내 인력은 아직 모른다 | 안내 인력은 아직 정하지 못했다. |

2차와 3차 제출은 라벨을 `아직 정하지 못했다.`로 보냈고, 그 라운드 메뉴의 c2 라벨이 저장됐다. c1은 선택되지 않았다.

## 7. 답변 취합 결과

q1만 답하고 질문 id `q9`의 축제 문장을 보낸 시점의 호출 수는 1이다. q2는 열린 채로 남고, 축제 문장은 `questionId` null, `provenance` `FOUNDER_INPUT`, `epistemicStatus` `FOUNDER_CLAIM`, `modelCalls` 0이다.

q2와 연습 문장을 보낸 뒤에야 2차 호출이 1회 나간다. 연습 문장을 `VERIFIED_FACT`로 요청해도 저장은 `SIMULATION` + `FOUNDER_CLAIM`이다. 같은 연습 문장을 공백만 바꿔 다시 보내도 행은 하나다.

## 8. 후속 GPT 요청 Payload

2차, 3차, 4차 사용자 JSON의 키는 같다. 모델은 `gpt-4o-mini`다.

`businessState`, `currentAnswerStatements`, `closedQuestions`, `revisionTask`, `stagePairs`, `priorStagePairs`, `unlinkedStatements`, `answerRecords`, `stagePartial`, `answerReading`, `answerSource`, `evidenceLedger`, `originalInput`, `firstAnalysis`, `latestAnalysis`, `priorQuestionTexts`, `answerLinks`, `priorReadings`, `doNotCopy`, `consultingPath`, `priorAnalyses`

작업 B의 11항목이 들어가는 위치:

| 항목 | 위치 |
| --- | --- |
| 최초 사업 아이디어 | `originalInput`. 2·3·4차 모두 위 원문과 같다 |
| 최초 GPT 분석 | `firstAnalysis`. 고객 문장 `전통주 양조장에 관심 있는 관광객`이 3차에 남아 있다 |
| 이전 GPT 피드백 | `priorReadings`, `latestAnalysis`, `doNotCopy`. 판단 키는 메아리를 피하려고 `priorJudgmentText`로 이름이 바뀐다. 문장은 남는다 |
| 현재 사업 컨텍스트 | `businessState` |
| 이전 단계 질문 | `priorStagePairs`, `priorQuestionTexts`, `closedQuestions` |
| 질문별 실제 선택지 | 각 pair의 `offeredChoices` |
| 창업자 답변 | 현재는 `stagePairs`, 이전은 `priorStagePairs`, 출처 행은 `answerRecords` |
| 질문과 답변의 출처 | `answerLinks.sourceReviewId` + `questionId` + `choiceId` |
| 미연결 추가 정보 | `unlinkedStatements`. `stagePairs` 안에 없다 |
| 해결 및 미해결 | `businessState.priorReview`와 `priorReadings` |
| 현재 단계의 질문과 답변 | `stagePairs` |

4차 `priorStagePairs`에는 협력 답, 가격 답, 장소 답이 순서대로 있다. 4차 `stagePairs`는 안내 인력 답 하나다. 4차 `answerLinks`에서 `questionId` `q1`의 `sourceReviewId`는 1차 리뷰, 2차 리뷰, 3차 리뷰로 서로 다르다. 단계마다 `q1`이 다시 쓰여도 출처 리뷰로 구분된다.

4차까지 미연결 둘은 같은 행이다.

| 시각 (UTC) | provenance | epistemicStatus | 원문 |
| --- | --- | --- | --- |
| 2026-11-02T00:00:00.001Z | FOUNDER_INPUT | FOUNDER_CLAIM | 축제 일정은 다음 달로 생각하고 있다. |
| 2026-11-02T00:00:00.003Z | SIMULATION | FOUNDER_CLAIM | SIMULATION. 양조장 한 곳에 문의했지만 아직 참여 의향은 확인하지 못했다. |

`feedbackId`는 그 실행의 로컬 sqlite id다.

## 9. 후속 GPT 응답 원문

스텁이다. 파서에 통과한 뒤에 저장된 다음 질문과 판단은 아래다.

| 호출 | 저장된 판단 | 저장된 다음 질문 |
| --- | --- | --- |
| 2차 | 이번 답은 구상과 가격 미정만 말했다. 계약 문서는 없다. | 체험 장소의 수용 인원을 확인했는가? |
| 3차 | 장소 쪽 기록은 아직 없다. 협력 문서는 늘지 않았다. | 안내 인력은 누구로 둘 계획인가? |
| 4차 | 인력 계획은 아직 없다. 수용 인원 기록도 없다. | 예약 취소 규칙은 정했는가? |

이 문장이 전략적으로 옳은지는 검증하지 않았다. 필수 필드가 빠져 파서가 거절하면 자식 행은 `failed`가 되고 다음 질문이 생기지 않는다. 이번 스텁 세 건은 `error` null, `status` `succeeded`다.

## 10. 저장 및 재조회

성공 리뷰는 4개다. 4차 자식을 다시 읽으면 `parentReviewId`는 3차 리뷰이고 `callCount`는 1이며 `nextQuestion`은 `예약 취소 규칙은 정했는가?`다. 그 질문의 선택 id는 `c1`, `c2`다.

부모 연쇄는 4차 → 3차 → 2차 → 1차다.

## 11. 3차·4차 컨텍스트

3차 요청에는 1차 원문, 1차 고객 문장, 협력 질문, 협력 답, 가격 답, 2차 판단, 2차 질문, 장소 답, 미연결 둘이 있다.

4차 요청에는 거기에 3차 판단과 안내 인력 답이 더해진다. 현재 답은 `stagePairs` 하나이고, 이전 답은 `priorStagePairs`에 남는다.

## 12. 호출 횟수 및 토큰

| 호출 | 내용 | 모델 | 토큰 |
| --- | --- | --- | --- |
| 1 | 1차 분석 스텁 | gpt-4o-mini | 40 |
| 2 | 2차 재분석 스텁 | gpt-4o-mini | 40 |
| 3 | 3차 재분석 스텁 | gpt-4o-mini | 40 |
| 4 | 4차 재분석 스텁 | gpt-4o-mini | 40 |

합계 4회, 160토큰. 스텁이 보고한 숫자이고 청구서가 아니다. 라이브 호출 비용은 0이다.

입력 예산은 24,000이다. 오래된 `priorAnalyses` 요약만 빠진다. 같은 테스트의 두 번째 케이스는 큰 과거 요약을 넣었고, 요청에서 `DROP_OLD_0`은 사라졌다. `originalInput`, 미연결 원문, 답변 원문, 최신 판단 문장, `unlinkedStatements`, `answerRecords`는 남았다. `priorAnalyses`는 빈 배열이 됐다.

## 13. 중복 요청

2차를 끝낸 뒤 같은 q1, q2, 연습 문장, 축제 문장을 다시 제출했다. `called`는 false이고 호출 수는 2에서 멈췄다.

4차를 끝낸 뒤 같은 안내 인력 답과 연습 문장을 다시 제출했다. `called`는 false이고 호출 수는 4에서 멈췄다.

## 14. 부분 답변

q1만 답한 상태는 `pending` true, `called` false, 호출 수 1이다. q2가 열린 동안 재분석은 나가지 않는다.

## 15. 미연결 정보

질문 id `q9`와 본문만 있는 축제 문장, `unlinked: true`인 연습 문장은 질문 답으로 붙지 않는다. 2차 `stagePairs`에 두 문장은 없다. 3차와 4차 요청의 `unlinkedStatements`에는 둘 다 있고 길이는 2다. 3차에서 같은 두 문장을 다시 보내도 저장 행은 각 1개다. 미연결만으로는 단계가 완료되지 않는다. q2를 답하기 전에는 호출이 늘지 않았다.

## 16. 발견한 문제와 수정

| 문제 | 수정 |
| --- | --- |
| 빈 변화 목록을 사업 판단 실패로 저장하던 `answer_not_recorded` | 제거. 원문이 요청에서 빠지면 호출 전 `answer_missing`은 유지 |
| 같은 미연결 문장을 다음 라운드에 다시 보내면 그 리뷰에 새 행이 생김 | 같은 사업 연쇄의 기존 미연결 원문이면 저장하지 않음 |
| 답변 기록의 순서가 리뷰 조회 순서에 끌림 | `submittedAt`, `feedbackId` 순으로 정렬. 같은 시각이면 1ms 뒤로 저장하고, 이전 라운드 시각도 기준에 넣음 |
| 선택 id는 맞아도 다른 라운드의 라벨이 그대로 저장됨 | 그 질문 메뉴에 id가 있으면 메뉴 라벨을 저장 |

남은 한계: 라이브 GPT가 필수 필드를 빠뜨리면 그 행은 실패로 저장되고 다음 질문은 생기지 않는다. 그 실패를 프롬프트 수정으로 되돌리지 않는다. 실호출은 이 문서 이후의 별도 승인 전이다. Sprint 2 PASS는 실제 사용자 시나리오의 라이브 흐름 증거가 있어야 한다.

2026-11-02 08:38 KST 단위 실행: 연속성 통합 2, 기존 연속성 5, 판단 계약 9, 상담 단계 33, 창업자 맥락 2. 합계 51 통과. 네트워크 호출은 없다.
