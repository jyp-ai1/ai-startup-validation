# Sprint 1 검토 보완 — PR #225

2026-11-01 01:05 KST. 상담 엔진을 다시 만들지 않았다. 기존 행은 수정하지 않았다. 피벗 표, 스키마 적용, GPT 실호출, Production 배포는 없다.

이 문서는 GitHub PR 화면 없이 코드 변경과 테스트 결과를 검토할 수 있게 적는다. Sprint 1 PASS는 선언하지 않는다.

기준 커밋은 `cursor/phase3-preimplementation-review-4b88`의 `db8283ef`다. PR #225의 첫 커밋은 `fc6f1e07`다. 이 보완은 그 위에 질문 식별자 없는 답을 질문에 붙이지 않는 변경을 더한다.

## 1. 변경 파일

PR #225 첫 커밋 `fc6f1e07`의 파일:

| 파일 | 역할 |
| --- | --- |
| `apps/web/features/business-validation-journey/lib/ai-pm-review.ts` | 질문 최소 개수 1. 단계 판정, 프롬프트, 스키마 |
| `apps/web/features/business-validation-journey/components/ai-pm-review-panel.tsx` | 질문 1개 단계를 질문별 입력으로 표시 |
| `apps/web/features/business-validation-journey/lib/ai-pm-review-failure-copy.ts` | 질문 목록이 없을 때의 문구 |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts` | 질문 1개 경로 테스트 |
| `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-round4.live.test.ts` | 저장 판정 사본의 최소 질문 수. 라이브 호출 없음 |
| `docs/evidence/ALABOM/AI-PM/SPRINT-1-CORE-ENGINE.md` | 이전 보고 |
| `docs/TASKS.md` | 상태 한 줄 |

첫 커밋의 `git diff --stat db8283ef..fc6f1e07`:

```text
 .../components/ai-pm-review-panel.tsx              |  14 +-
 .../__tests__/ai-pm-consulting-round4.live.test.ts |   2 +-
 .../lib/__tests__/ai-pm-consulting-stage.test.ts   | 172 ++++++++++++++++++++-
 .../lib/ai-pm-review-failure-copy.ts               |   2 +-
 .../lib/ai-pm-review.ts                            |  24 +--
 docs/TASKS.md                                      |   4 +-
 docs/evidence/ALABOM/AI-PM/SPRINT-1-CORE-ENGINE.md | 107 +++++++++++++
 7 files changed, 295 insertions(+), 30 deletions(-)
```

이번 보완의 코드 차이. 엔진 재작성은 없다.

```text
 .../lib/__tests__/ai-pm-consulting-stage.test.ts   | 99 +++++++++++++++++++++-
 .../lib/ai-pm-review.ts                            | 11 +--
 2 files changed, 97 insertions(+), 13 deletions(-)
```

`pairConsultingStage`는 `questionId`가 같은 피드백만 답으로 쓴다. 질문 1개여도 식별자가 없는 피드백은 `open`으로 남는다.

`runStageReanalysis`의 `sourceFeedbackId`는 그 답변된 `questionId`의 피드백만 가리킨다. 식별자 없는 행으로 떨어지지 않는다.

데이터 구조 변경은 없다.

## 2. 테스트 명령과 결과

작업 디렉터리: `apps/web`

```text
pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts --reporter=verbose
```

2026-11-01 01:05 KST 실행. 15 passed. 이전 14개에, 식별자 없는 답을 붙이지 않는 테스트 1개를 더했다. 실패한 테스트는 없다. GPT 실호출은 없다.

```text
 ✓ consulting stage batch > stores N questions from one first response and falls back to nextQuestion
 ✓ consulting stage batch > links an answer to its question and does not spread one unlabeled answer across the stage
 ✓ consulting stage batch > keeps the one-answer request free of a stage batch
 ✓ consulting stage batch > labels stored brewery answers without turning the cooperation claim into a fact
 ✓ consulting stage batch > collects N answers with no model call, then sends one paired reanalysis and repeats
 ✓ consulting stage batch > treats an explicit partial analysis as a separate call
 ✓ consulting stage batch > does not treat a missing question list as a consulting stage, and keeps one listed question
 ✓ consulting stage batch > calls once for a one-question stage and keeps that answer on the next stage
 ✓ consulting stage batch > does not attach an answer that has no question id, then sends only the linked answer
 ✓ consulting stage batch > stores a stage response with no next question as failed after one call
 ✓ consulting stage batch > saves stage answers on the product path and calls once when the stage is complete
 ✓ consulting stage batch > stores a malformed stage response once and does not call again
 ✓ consulting stage batch > stores a repeated stage question as failed after one call
 ✓ consulting stage batch > renders one answer field per question and does not reuse one shared choice list
 ✓ consulting stage batch > connects the follow-up route to the stage, not one supplement per call

 Test Files  1 passed (1)
      Tests  15 passed (15)
   Duration  1.04s
```

## 3. 질문 1개 경로

테스트 `calls once for a one-question stage and keeps that answer on the next stage`.

| 순서 | 동작 | 모델 호출 | 저장 |
| --- | --- | --- | --- |
| 1 | 최초 분석이 질문 배열 1개를 반환 | 호출 1회. `callCount` 1. `succeeded` | 질문 문장 `누구를 고객으로 하는가?` |
| 2 | 답 없이 `submitConsultingStage` | 추가 호출 없음. `pending` | 부모 행 유지 |
| 3 | `questionId` `q1`과 선택 `직장인`, 보충 `참가자는 직장인이다` | 호출 1회. 자식 `callCount` 1. `pending` 아님 | 부모는 그 자식의 `parentReviewId`. 요청 `stagePairs`가 저장된 `stageAnswers`와 같음 |
| 4 | 같은 답을 다시 제출 | `called` false. 호출 수 2 유지 | 같은 자식 행. 부모 `finishedAt` 불변 |
| 5 | 다음 질문 1개에 답 | 호출 1회. `callCount` 1 | `priorStagePairs`가 3번의 `stageAnswers`와 같음 |

단계 요청 스키마의 `nextQuestions.minItems`는 1이다. 시스템 문구는 `nextQuestions는 서로 다른 질문 1개 이상이다`를 포함한다.

## 4. 중복 제출

3번과 4번이 그 증거다. 재사용 키는 부모 검토, 답 해시, 부분 분석 여부다. 같은 답은 새 분석을 만들지 않는다.

N개 질문 경로의 `saves stage answers on the product path and calls once when the stage is complete`도 같은 세 답을 다시 제출하면 호출이 늘지 않는다.

## 5. 질문 식별자 없는 답

이전 코드는 질문이 1개일 때 식별자 없는 피드백을 `q1`의 답으로 썼다. 그 연결은 이번 보완에서 제거했다. 기존 양조장 행은 수정하지 않았다.

테스트 `does not attach an answer that has no question id, then sends only the linked answer`.

| 순서 | 동작 | 모델 호출 | 결과 |
| --- | --- | --- | --- |
| 1 | 질문 1개 최초 분석 | 1회. `callCount` 1 | `succeeded` |
| 2 | `saveReviewFeedback`. 선택 라벨 `양조장과의 협력 가능성이 높다.` `questionId` 없음 | 0. `modelCalls` 0 | 피드백은 저장되고 `questionId`는 없음 |
| 3 | 그 상태로 단계 제출 | 추가 호출 없음. 호출 수 1 | `pending` |
| 4 | `q1`에 `참가자는 직장인이다` | 1회. 자식 `callCount` 1 | `stageAnswers`의 보충은 그 문장. `양조장`은 `stageAnswers`와 요청 JSON에 없음. `sourceFeedbackId`는 식별자 없는 피드백이 아님 |
| 5 | 같은 `q1` 답 재제출 | 호출 수 2 유지 | 같은 자식 행. 부모 `finishedAt` 불변 |
| 6 | 다음 단계 답 | 1회 | `priorStagePairs`는 4번의 `stageAnswers`. `양조장` 없음 |

같은 파일의 단위 비교도 질문 1개와 질문 3개 모두에서 식별자 없는 피드백을 `open`으로 둔다. 질문 3개에는 한 답을 다른 질문으로 펼치지 않는다.

`priorStagePairs`는 사슬 행의 `stageAnswers`만 모은다. 피드백 표 전체를 읽지 않는다. 식별자 없는 답은 `stageAnswers`가 되지 않으므로 다음 요청에 들어가지 않는다.

실패 행 `3be5715e`와 피드백 `7d2d04e5`는 이번 턴에 다시 읽지 않았고 수정하지 않았다. 그 답을 다른 질문에 붙이거나 확인된 사실로 승격하는 코드는 추가하지 않았다. `founderAnswerKinds`는 그 문장이 답으로 들어올 때 `claim`으로 남기는 기존 함수다. 사실로 바꾸지 않는다.

## 6. 아직 닫히지 않은 항목

| 항목 | 상태 |
| --- | --- |
| 질문 1개 이상, 저장, 답변, 호출 0/1, 중복 재사용 | 위 테스트 |
| 식별자 없는 답의 오연결 | 위 테스트. 운영 행 재조회는 NOT RUN |
| 성공 사슬의 `priorStagePairs` | 위 테스트 |
| 실패 사슬의 답을 다음 판단에 인용 | 하지 않음. 계보 표는 피벗 HOLD |
| 최초 분석과 판단 문장의 실제 품질 | NOT RUN. GPT 실호출 없음 |
| 로그인 후 브라우저 | NOT RUN |

Sprint 2로 넘어가지 않는다. Production은 잠금이다. 피벗은 HOLD다.
