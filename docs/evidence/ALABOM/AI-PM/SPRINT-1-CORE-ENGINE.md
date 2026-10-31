# Sprint 1 — 상담 엔진 현황과 질문 수 고정 해제

2026-11-01 00:49 KST. 피벗 테이블은 만들지 않았다. Production 배포는 하지 않았다. GPT 실호출은 NOT RUN이다.

기준 구현은 PR #212~#218이다. 구조 조사는 PR #221~#224다. 이미 있는 호출 정책은 다시 작성하지 않았다.

## 1. 현재 구현 상태

| Sprint 1 항목 | 상태 | 근거 |
| --- | --- | --- |
| 최초 분석이 사업 필드 구조를 요구 | PARTIAL | `firstReviewSystemPrompt`와 `readBusinessAnalysis`가 고객, 문제, 가치, 수익, 시장, 운영, 경쟁, 판단을 요구한다. 그 문장이 사업 전체에 걸치는지는 Sprint 2다. 이번 턴의 실호출은 NOT RUN |
| 질문 N개와 선택지 | PASS | 질문 배열 1개 이상을 단계로 받는다. 0개는 실패다. 선택지는 질문마다 2개 이상인 기존 계약을 유지한다. `nextQuestion`만 있는 행은 단계가 아니다 |
| 질문별 답과 보충 저장 | PASS | `submitConsultingStage`가 `questionId`로 저장한다. `saveReviewFeedback`의 `modelCalls`는 0 |
| 단계 완료 판정 | PASS | `stageComplete`는 모든 쌍이 `answered`일 때만 참 |
| 부분 답변 | PASS | 미완료는 `pending`, `called: false`. 화면은 `allowPartial`을 보내지 않는다 |
| 통합 재분석 1회 | PASS | 단계 경로는 `stageContract`에서 첫 응답만 저장한다. 수리 호출 루프에 들어가지 않는다 |
| 중복 요청 | PASS | 같은 부모, 같은 답 해시, 같은 부분 여부의 기존 행을 반환하고 `called: false` |
| 이전 단계 답 전달 | PARTIAL | `priorStagePairs`는 성공 사슬의 `stageAnswers`를 요청에 넣는다. 실패 행 `3be5715e`의 답은 그 사슬 밖이다. 계보 표는 피벗 HOLD라 만들지 않음 |
| 판단 변화와 다음 질문 필드 | PARTIAL | 엔진은 `impactOnPreviousJudgment`, `updatedJudgment`, `nextQuestions`를 요구하고 반복 질문을 실패로 저장한다. 문장 품질은 Sprint 2. 실호출 NOT RUN |
| 계보와 원본 | PASS | 새 행의 `parentReviewId`, `rawContent`, 실패 상태. 기존 행은 수정하지 않는다. 분기 표는 없음 |

## 2. 재사용할 기존 코드

다시 만들지 않은 경로:

- `runFirstReview` — 같은 사용자, 프로젝트, 입력 해시의 성공 행 재사용
- `saveReviewFeedback` — 저장만, 모델 호출 0
- `submitConsultingStage` — 답 저장 후 단계가 닫힐 때만 `runStageReanalysis`
- `runStageReanalysis` — 답 해시가 같으면 기존 행
- `finishCall`의 `stageContract` — 호출 1회, 형식 오류는 `failed`와 `rawContent`
- `pairConsultingStage` — `questionId`로 답을 묶고, 질문 식별자 없는 답은 여러 질문에 펼치지 않음
- `reviewChain` — 부모 포인터로 이전 `stageAnswers`를 모음
- 후속 라우트 `app/api/ai-pm-review/follow-up/route.ts` — `submitConsultingStage`만 호출

## 3. 이번 변경

코드가 질문 수를 2개로 고정했다. 제품 원칙은 질문 수와 순서를 코드가 정하지 않는 것이다. 모델이 질문 1개를 내면 단계로 실패하던 것을 고쳤다.

유지한 경계:

- 질문 배열이 없거나 비어 있으면 상담 단계가 아니다.
- `nextQuestion` 문장만 있는 행은 후속 단계 라우트로 들어가지 않는다.
- 다음 질문이 0개면 단계 응답은 실패이고 호출은 1회다.
- 선택지가 2개 미만이면 기존처럼 실패다.
- 같은 질문 문장의 반복은 실패다.
- 실패 행의 답을 다른 질문 아래에 붙이는 계보 표는 만들지 않는다.

바꾼 파일:

- `apps/web/features/business-validation-journey/lib/ai-pm-review.ts`
- `apps/web/features/business-validation-journey/components/ai-pm-review-panel.tsx`
- `apps/web/features/business-validation-journey/lib/ai-pm-review-failure-copy.ts`
- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts`
- `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-round4.live.test.ts` — 저장 판정 사본의 최소 질문 수만 1로 맞춤. 라이브 호출은 하지 않음

데이터 구조 변경은 없다. 테이블 추가, 컬럼 변경, INSERT, UPDATE, DELETE는 없다.

## 4. 테스트

실행: `pnpm exec vitest run features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts`

결과: 14 tests passed. 주입한 응답만 사용했다.

확인한 동작:

- 질문 목록이 빠진 최초 응답은 `failed`, `callCount` 1, 후속 호출 없음
- 질문 1개인 최초 응답은 `succeeded`
- 그 질문의 답이 없으면 `pending`, 추가 호출 없음
- 그 질문의 답이 있으면 통합 호출 1회, `callCount` 1, 요청의 `stagePairs`에 보충 문장이 있음
- 같은 답의 재제출은 `called: false`
- 다음 단계 요청의 `priorStagePairs`가 직전 단계 답과 같음
- 피드백 `modelCalls`는 0
- 부모 `finishedAt`은 그대로
- 다음 질문이 빈 배열이면 `failed`, `rawContent` 유지, `callCount` 1
- 화면 정적 렌더에 `data-question-id="q1"`이 있고 `질문 2개 이상` 문구는 없음

하지 않은 검증:

- GPT 실호출 NOT RUN
- 로그인 후 브라우저 조작 NOT RUN
- 기존 양조장 행에 대한 재분석 NOT RUN
- 라이브 품질 하니스의 `nextQuestionsDistinct`는 여전히 질문 2개 이상을 PASS로 센다. 엔진 규칙과 별개인 과거 품질 채점이다. 이번 턴에 그 채점을 느슨하게 바꾸지 않았다

## 5. 위험

- 질문 1개 단계에 질문 식별자 없는 옛 피드백이 있으면 `pairConsultingStage`가 그 답을 그 질문에 연결한다. 새 저장은 `questionId`를 쓴다.
- 다음 실호출부터 모델은 질문 1개를 내도 단계로 저장될 수 있다. 그 문장이 사업을 진전시키는지는 Sprint 2다.
- 실패 행 `3be5715e`의 답은 여전히 성공 사슬의 `priorStagePairs`에 없다. 계보 표 없이 그 답을 다른 질문 아래에 넣지 않는다.
- 단계가 아닌 예전 후속 경로 `runFollowUpReview`는 수리 호출이 있다. 제품 후속 라우트는 그 함수를 호출하지 않는다.

## 6. 판정 기준

CPO 판정용이다. 이 문서가 Sprint 1 PASS를 선언하지 않는다.

- 답 저장의 모델 호출은 0회다. 테스트로 확인.
- 미완료 단계의 모델 호출은 0회다. 테스트로 확인.
- 완료된 단계의 통합 호출은 1회다. 테스트로 확인. 실 GPT는 NOT RUN.
- 같은 답의 재요청은 새 분석을 만들지 않는다. 테스트로 확인.
- 이전 단계의 `stageAnswers`는 다음 요청에 들어간다. 테스트로 확인. 사슬 밖 답은 PARTIAL.
- 형식 오류는 원문을 남기고 실패로 저장한다. 테스트로 확인.
- 단계 경로의 추가 수리 호출은 없다. 코드 경로와 테스트의 `callCount` 1.

## 7. 보류

- 피벗 `branch_id` 구현은 Sprint 1~6 판정 전까지 HOLD.
- Production은 CEO 승인 전까지 잠금.
- Sprint 2의 전략 품질 판정은 이번 테스트로 대체하지 않는다.
