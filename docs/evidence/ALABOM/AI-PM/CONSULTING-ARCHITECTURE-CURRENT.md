# ALABOM 상담 구조 현황

Phase 1 조사. 이 문서는 2026-10-31 23:27 KST 이후 코드와 이미 커밋된 증거를 읽은 결과다.

이번 단계에서 한 일:

- 상담 API, 저장, 단계 재분석, 화면 제출 경로를 코드에서 확인했다.
- 피벗, 상담 분기, 스키마 변경, GPT 호출, 기존 행 수정은 하지 않았다.

이번 단계에서 하지 않은 일:

- 라이브 데이터베이스를 다시 조회하지 않았다. 아래 계보의 행 ID와 건수는 커밋된 증거 파일의 기록이다. 그 이후 행이 늘었는지는 NOT RUN이다.
- `PIVOT-ARCHITECTURE-DESIGN.md`는 쓰지 않았다.

## Phase 1 보고

| 항목 | 상태 |
| --- | --- |
| 작업 범위 | 기존 상담 코드와 커밋된 계보 조사. 피벗 구현 없음 |
| 변경 파일 | 이 문서, `docs/TASKS.md` 상태 한 줄 |
| 변경 DB 구조 | NOT RUN |
| 기존 기능 영향 | 코드 동작 변경 없음 |
| 테스트 결과 | 회귀 테스트 NOT RUN. 경로 확인은 코드 읽기 |
| GPT 실제 호출 여부 | NOT RUN |
| 실제/시뮬레이션 구분 | 이 문서는 코드 조사다. 새 시뮬레이션 답을 만들지 않았다 |
| 미해결 문제 | 아래 9절. 5차 답변은 여전히 없음 |
| 잔여 작업 | Phase 2 설계는 이 문서 검토 전 NOT RUN |

---

## 1. 실제 코드 경로

상담의 제품 경로는 세 API와 한 라이브러리다.

| 단계 | 위치 |
| --- | --- |
| 최초 입력과 최초 분석 | `POST /api/ai-pm-review` → `runFirstReview` |
| 목록 | `GET /api/ai-pm-review?projectId=` → `presentReview` |
| 답변·피드백 저장 | `POST /api/ai-pm-review/feedback` → `saveReviewFeedback` |
| 단계 답변 제출과 통합 재분석 | `POST /api/ai-pm-review/follow-up` → `submitConsultingStage` → `runStageReanalysis` |
| 화면 | `apps/web/features/business-validation-journey/components/ai-pm-review-panel.tsx` |
| 엔진 | `apps/web/features/business-validation-journey/lib/ai-pm-review.ts` |
| 저장 선택 | `openReviewBackend`. 서비스 롤이 있으면 Supabase, 없으면 sqlite |
| 테이블 쓰기 | `packages/db/src/repositories/ai-pm-review.repository.ts` |

화면의 실제 호출:

1. 최초 검토는 `POST /api/ai-pm-review`.
2. 선택지 하나 저장은 `saveChoice` → `POST /api/ai-pm-review/feedback`. 이 요청에는 `questionId`가 없다.
3. 이해가 틀리거나 핵심이 빠졌다는 표시는 `submitFeedback` → 같은 feedback API. 모델 호출은 없다.
4. 질문 2개 이상일 때만 `submitReanalysis` → `POST /api/ai-pm-review/follow-up`. 질문이 2개 미만이면 화면이 요청을 보내지 않는다.

`runFollowUpReview`는 답 하나와 보충 설명을 받는 이전 재분석 경로다. 현재 follow-up 라우트는 이 함수를 호출하지 않고 `submitConsultingStage`만 호출한다.

4차 통합 호출은 제품 라우트가 아니다. Preview 빌드가 `apps/web/scripts/run-web-build.sh`에서 `ai-pm-consulting-round4.live.test.ts`를 실행하고, 그 테스트가 `OpenAIProviderAdapter.chat`을 한 번 호출한 뒤 새 행을 넣는다. 요청 원문은 `docs/evidence/ALABOM/AI-PM/consulting-round4-2026-10-31.json`에 있다.

5차 질문 행의 증거는 `docs/evidence/ALABOM/AI-PM/consulting-round5-question-2026-10-31.json`이다. 그 행을 넣는 스크립트는 현재 트리에 없다. 제품 API는 질문 1개짜리 단계를 분석 단계로 받지 않는다.

## 2. API 호출 구조

### 최초 분석

`runFirstReview`는 입력 텍스트의 sha256으로 같은 사용자·같은 프로젝트의 최신 행을 찾는다.

- 최신이 `succeeded`이면 호출하지 않고 그 행을 돌려준다.
- 최신이 `not_run`이고 이번에도 채팅 함수가 없으면 호출하지 않는다.
- 키가 없으면 `not_run`, `callCount` 0, 오류 `gpt_api_key_missing` 행을 새로 넣는다. 키 이름은 `GPT_API_KEY`다.
- 키가 있으면 `buildFirstReviewRequest` 한 번을 `finishCall`에 넘긴다. `parentReviewId`는 null이다.

최초 요청:

- 모델 `gpt-4o-mini`, temperature 0.2, maxTokens 2400
- 시스템 프롬프트 `firstReviewSystemPrompt`
- 사용자 메시지는 사업 원문과 출력 키 설명
- 스키마 `productReanalysisSchema`
- 질문 배열 `questions`가 2개 미만이면 `finishCall`이 `stage_questions_missing`으로 실패 처리한다

### 답변 저장

`saveReviewFeedback`는 항상 `modelCalls: 0`이다. 채팅 함수를 받지 않는다. 대상 검토가 같은 프로젝트의 `succeeded`일 때만 피드백 행을 새로 넣는다.

선택 답의 저장 필드는 `choiceAnswer.choiceId`, `choiceAnswer.label`, `choiceAnswer.otherText`, 그리고 선택적 `questionId`다. `comment`는 선택 라벨 또는 보충 설명으로 채워진다.

### 단계 통합 재분석

`submitConsultingStage` 순서:

1. 부모 행이 같은 프로젝트이고 `succeeded`이며 `sections`가 있어야 한다.
2. `acceptedStageQuestions`가 아니면 `stage_questions_missing`. 조건은 질문 2개 이상, questionId와 문장이 서로 다르고 비어 있지 않은 것이다.
3. 넘어온 답을 질문별로 피드백에 넣는다. 같은 질문의 최신 선택·보충과 같으면 건너뛴다.
4. `runStageReanalysis`를 호출한다.
5. 답이 하나도 없거나 일부만 있고 `allowPartial`이 아니면 `pending: true`, `called: false`. 부모 화면을 그대로 돌려준다. 모델 호출은 없다.
6. 단계가 끝나면 통합 호출 1회 또는 기존 자식 재사용이다.

화면은 `allowPartial`을 보내지 않는다. 따라서 화면 경로에서 일부 답만으로 GPT가 호출되지 않는다.

중복 제출은 부모 `reviewId` + 답 묶음의 sha256(`supplementSha`) + `stagePartial`이 같은 기존 자식이 `succeeded` 또는 `failed`이면 그 행을 재사용한다. `forceNew`는 이 라우트에서 켜지지 않는다.

### 한 호출과 수리

`finishCall`에 `stageContract`가 있으면 채팅 함수를 한 번 호출하고, 형식 오류면 `failed`와 `rawContent`를 저장한다. 수리 호출은 없다.

`stageContract`가 없는 경로(`runFollowUpReview`, 최초가 아닌 읽기 수리)는 다르다. 출력 계약 실패 시 수리 1회, 또는 읽기 이슈가 있으면 최대 3회까지 추가 호출할 수 있다. 현재 화면의 follow-up은 단계 경로라 이 수리를 타지 않는다.

`openReviewChat`은 쿼터 오류일 때 같은 `chat()` 안에서 Gemini로 한 번 넘길 수 있다. 단계 `finishCall`은 그 결과를 호출 1회로 센다. 4차 증거 호출은 이 스위치를 타지 않도록 어댑터를 직접 썼다.

## 3. 데이터베이스 테이블과 주요 컬럼

상담 전용 테이블은 두 개다. 마이그레이션 `023_ai_pm_reviews.sql`, `024_ai_pm_review_project.sql`.

### `ai_pm_reviews`

| 컬럼 | 역할 |
| --- | --- |
| `user_id`, `review_id` | 기본 키 |
| `project_id` | 워크스페이스. nullable. `startup_projects.id`를 참조하고, 프로젝트 하드 삭제 시 검토도 삭제 |
| `input_sha` | 사업 원문 해시. 최초 재사용 키 |
| `version` | 1 이상. 같은 원문 해시의 다음 번호 |
| `parent_review_id` | 직전 검토. 분기 테이블은 없다 |
| `source_feedback_id` | 이 분석을 연 피드백 |
| `supplement_sha` | 보충 또는 단계 답 묶음 해시. 중복 재사용 키 |
| `status` | `succeeded`, `failed`, `not_run` |
| `record_json` | `StoredReview` 전체. 원문, 섹션, 원문 응답, 단계 답, 토큰 |
| `finished_at` | 삽입 시각. 저장소에 이 컬럼을 고치는 메서드는 없다 |

저장소의 상담 쓰기는 `insertReview`와 `insertFeedback`뿐이다. 기본 키가 겹치면 `wrote: false`를 반환하고 기존 행을 덮어쓰지 않는다. `deleteForUser`, `deleteForProject`는 계정·프로젝트 삭제용이다. 상담 수정 경로가 아니다.

`record_json`에는 `userId`가 들어간다. `asReview`는 컬럼 `user_id`와 JSON의 `userId`가 다르면 행을 버린다. 증거 파일에는 그 식별자를 넣지 않는다.

요청 메시지 원문은 행에 저장되지 않는다. 저장되는 모델 원문은 `rawContent`다. 수리가 있었던 비단계 경로만 `firstRawContent`를 남긴다. 4차 증거 JSON이 요청 전문을 가진 예외다.

### `ai_pm_feedback`

| 컬럼 | 역할 |
| --- | --- |
| `user_id`, `feedback_id` | 기본 키 |
| `review_id` | 검토 외래 키. 검토 삭제 시 피드백도 삭제 |
| `record_json` | 선택, 보충, `questionId`, `modelCalls` |
| `submitted_at` | 삽입 시각 |

피드백 JSON에는 답의 출처(실제 Founder / 시뮬레이션) 컬럼이 없다. 4차는 요청 JSON의 `answerProvenance`에 시뮬레이션을 적었다. 5차 증거는 `questionOrigin`을 질문 행 쪽에 적었다고 기록한다.

RLS는 켜져 있고 anon·authenticated 정책은 없다. 서비스 롤이 우회한다.

### `startup_projects`

상담 분기가 아니다. 워크스페이스다. 마이그레이션 002와 015–017, 020, 021 기준 컬럼은 `id`, `title`, `summary`, `problem`, `solution`, `target_customer`, `industry`, `business_model`, `status`, `project_type`, `user_id`, `country`, `project_goal`, `is_demo`, `onboarding_context`, `deleted_at`, `is_pinned`, `thumbnail_color`, `last_activity_at`이다.

`project_type`의 주석에 pivot이라는 단어가 있으나, 값은 `STARTUP` 같은 프로젝트 종류다. 사업 방향 전환 이벤트가 아니다.

`project_context`는 021에 있다. 상담 엔진 폴더는 이 테이블과 `onboarding_context`를 읽지 않는다.

015 파일 주석의 “Product pivot”과 이번 작업의 사업 피벗은 다른 것이다.

023 파일 주석은 “아직 미적용, 호스트 DNS 없음”이라고 적혀 있다. 그 문장과 달리 이후 증거는 이 테이블에 행이 생겼다고 기록한다. 주석은 오래되었다. 이번 조사는 라이브 스키마를 다시 조회하지 않았다.

## 4. 실제 데이터 연결

계보의 유일한 연결은 `parent_review_id`다. `reviewChain`은 그 포인터를 부모 방향으로 걷고, 배열을 뿌리부터 정렬한다. 실패 행은 부모가 되지 않으면 이 체인에 들어가지 않는다.

단계 재분석이 이전 답으로 쓰는 값은 `stageAnswers`뿐이다. `consultingTurn`만 있는 행은 이전 단계 쌍으로 들어가지 않는다.

커밋된 양조장 증거 계보. 프로젝트 `3a5fc4a0-2e90-45e6-8370-350beda67342`.

| 행 | 부모 | 상태 | 호출 | 의미 |
| --- | --- | --- | --- | --- |
| `0a13c604-9931-40c5-88a5-80f06687fd5a` | 없음 | succeeded | 1 | 1차 성공 분석. 질문과 선택 구조가 지금 단계 계약과 다르다 |
| `3be5715e-7294-44bd-b163-f3af1dec4259` | 없음 | failed | 기록상 호출 있음 | Founder가 실제로 답한 질문. `sections.nextQuestion`은 비어 있고 질문·선택지는 `rawContent`에만 있다 |
| 피드백 `7d2d04e5-93a1-4cd6-aebf-03582eeb003f` | 검토 `3be5715e` | 저장 | 0 | 선택 `c1`. 라벨과 보충이 같은 협력 가능성 문장 |
| `9e169fef-7428-4d21-a6f0-f3034bcc91d1` | `0a13c604` | succeeded | 1 | 1차 성공 행의 자식. Founder가 답한 질문 행이 아니다 |
| `970b8ce1-3e4b-4840-834f-2c6a87b2ec54` | `9e169fef` | succeeded | 1 | 3차 분석으로 다룬 행. 요청 원문은 행에 없다 |
| `cbf201a2-0ed5-41b8-b225-ff022e5b253a` | `970b8ce1` | succeeded | 1 | 4차 통합 분석. 2026-10-31 21:44 KST. 모델 `gpt-4o-mini-2024-07-18`. 토큰 8753 / 399 / 9152. 4차 답은 시뮬레이션 |
| `e3d42c90-5358-40a0-91e3-52cf439551a5` | `cbf201a2` | succeeded | 0 | 5차 질문 보관. 2026-10-31 22:06 KST. `answer`는 null. 분석이 아니다 |

4차 삽입 시점 증거: 검토 66에서 67, 피드백 32에서 32, 기존 `finished_at` 변경 없음.

5차 질문 삽입 시점 증거: 검토 67에서 68, 피드백 32, 기존 `finished_at` 변경 없음. 이 질문 행의 피드백은 0, 자식은 0으로 기록되어 있다.

질문과 답의 어긋남:

- 1차 성공 행의 질문은 파트너십을 어떻게 구축할 계획인가다.
- Founder 답은 실패 행 `3be5715e`에 붙어 있고, 그 질문 원문은 협력 가능성이 어떻게 되는가다.
- 4차 요청은 이 차이를 `recordLink.questionsDiffer`로 남겼다. 실패 행을 성공 행의 부모로 바꾸지 않았다.

같은 원문을 반복 실험한 다른 계보(판단 논리 d/e/f, 단계 읽기 c)도 `ai_pm_reviews`에 별도 행으로 있다. 그것들은 위 부모 체인의 자식이 아니다. 프로젝트 하나가 상담 하나를 의미하지 않는다.

## 5. 최초 분석과 후속 분석의 차이

| | 최초 `runFirstReview` | 단계 `runStageReanalysis` | 이전 한 답 `runFollowUpReview` |
| --- | --- | --- | --- |
| 진입 | 원문 POST | 질문 2개 이상이 모두 답해진 뒤 | 현재 화면 라우트는 호출하지 않음 |
| 부모 | 없음 | 방금 답한 검토 | 방금 답한 검토 |
| 시스템 프롬프트 | `firstReviewSystemPrompt` | `stageReanalysisSystemPrompt` | `productReanalysisSystemPrompt` 또는 수정 게이트 프롬프트 |
| 사용자 JSON | 원문 텍스트 | `stagePairs`, `priorStagePairs`, 뿌리 원문, 압축된 최초 분석, 직전 분석 | `thisAnswer`, `founderAnswers`, `consultingPath`, `experimentRecords`, `failedCalls` |
| 출력 | 고객·문제·가치·수익·시장·운영이 있는 사업 필드 | 판단·해석·다음 질문. 저장 시 고객·문제·가치 등 사업 필드는 빈 문자열 | 최초와 같은 사업 필드 스키마 |
| 수리 | 단계 질문이 없으면 실패. 단계 계약 수리는 없음 | 형식 오류는 실패와 원문 보존. 재호출 없음 | 수리 재호출이 가능 |
| 재사용 | 같은 원문 sha의 최신 성공 | 같은 부모·답 해시·부분 여부 | 같은 부모·피드백·보충 해시 |

단계 결과가 저장될 때 `judgeStageContract`는 `customer`, `problem`, `market`, `revenueModel`, `execution`, `value`, `operatingModel`, `payer`, `competition`, `operations`, `profitability`를 비운다. 판단은 `judgment`와 `analysis.judgmentDetail`에, 확인된 사실은 `founderFacts`에, 미검증 주장은 `inferences`에 넣는다. 후속 단계의 사업 구조 필드는 직전 단계 행에 누적되지 않는다. 뿌리 행의 섹션이 `firstAnalysis`로 다시 전달된다.

토큰 예산이 넘으면 `buildProductReanalysisRequest`는 오래된 `priorAnalyses`부터 자른다. 단계 경로의 `priorTurns`는 비어 있다.

단계 요청에는 `founderAnswerSource`, `experimentRecords`, `failedCalls`가 없다. 한 답 경로에는 있다. 그래서 실패 행에만 있는 Founder 답은 단계 체인이 자동으로 집어주지 않는다. 4차는 테스트가 그 답을 요청에 따로 넣었다.

`renameEchoKeys`는 요청 안의 `judgment`를 `priorJudgmentText`로, `nextQuestion`을 `priorQuestionText`로 바꾼다. 모델이 이전 문장을 출력 키에 그대로 복사하는 것을 줄이려는 장치다.

## 6. 단계별 질문과 답변 처리

질문의 제품 형태는 `analysis.questions[]`다. 각 원소는 `questionId`, `text`, `choices[]` (`id`, `label`)다. 배열이 없으면 `nextQuestion` 하나만 `questionId: q1`로 취급한다. 그 한 질문 형태는 `acceptedStageQuestions`를 통과하지 못한다.

답 연결은 `pairConsultingStage`다.

- 같은 `questionId`의 최신 피드백을 그 질문에 붙인다.
- 질문이 하나이고 피드백에 `questionId`가 없을 때만 그 피드백을 q1에 붙인다.
- 질문이 둘 이상이면 `questionId` 없는 선택 저장은 단계 답으로 쓰이지 않는다.
- 선택 라벨 또는 보충이 있으면 `answered`, 아니면 `open`.

`stageComplete`는 모든 쌍이 `answered`일 때다.

모델이 다음 질문을 내면 `judgeStageContract`가 `q1`, `q2`…를 새로 부여한다. 선택지 라벨에 `기타` 또는 `직접 입력`이 있으면 둘 다 id `other`가 된다. 4차 테스트는 그 충돌을 피하려고 `직접 입력`만 `other`로 두었다. 제품 저장 경로는 아직 그 구분을 하지 않는다.

화면은 질문마다 초안(`choiceId`, `otherText`, `comment`)을 들고, 제출 시 채워진 질문만 `answers`로 보낸다. 서버가 남은 질문이 있다고 보면 저장만 하고 `pending`을 반환한다. 문구는 “답을 저장했습니다. 남은 질문에 답하면 이 단계를 한 번 다시 분석합니다.”다.

5차 질문 `round5-q1`은 질문이 하나다. 현재 화면과 `submitConsultingStage`는 이 행을 통합 분석으로 넘기지 않는다. 5차 답이 생긴 뒤의 통합 호출은 4차와 같이 제품 라우트 밖에서 요청을 조립해야 한다. 그 호출은 답이 생기기 전에는 NOT RUN이다.

지시서의 1차~5차 목적 표는 코드에 단계 번호로 고정되어 있지 않다. 코드가 정한 고정 순서도 없다. 다만 한 답 경로의 `nextFactToAsk`와 단계 경로의 `founderAnswerKinds`는 한국어 정규식으로 답의 종류를 미리 붙인다. 양조장 후보가 없다는 문장, “가능성이 높”, “계획” 같은 패턴이다. 이것은 점수가 아니다. 요청의 `answerReading.kinds`와 `evidenceLedger`에 들어가 모델보다 먼저 분류된다. 사업 일반 규칙이 아니라 이번 양조장 문장에 묶여 있다.

## 7. GPT 입력 및 출력 계약

### 최초

시스템 프롬프트가 요구하는 검토 범위는 고객, 문제, 기존 대안, 가치, 이용자와 지불자, 수익, 운영, 차별화, 경쟁이다. 출력 키는 `summary`, `customer`, `problem`, `value`, `operatingModel`, `payer`, `revenueModel`, `market`, `competition`, `operations`, `profitability`, `strengths`, `risks`, `assumptions`, `evidenceToChange`, `founderFacts`, `inferences`, `judgment`, `nextVerification`, `nextQuestion`, `nextQuestionReason`, `choices`, `questions`다.

`questions`는 2개 이상이다. `nextQuestion`은 첫 질문과 같아야 한다. 가격·매출·제휴 확정은 원문에 없으면 사실로 쓰지 말라고 적혀 있다.

저장된 1차 성공 행 `0a13c604`의 원문은 이 전체 키 집합이 아니라 짧은 JSON(`problem`, `target_customer`, `solution`, `business_model`, `validation_metric`, `nextQuestion`)으로 증거에 적혀 있다. 지금 코드의 최초 계약과 그 행의 저장 형태는 다르다.

### 단계 재분석

시스템 프롬프트 순서는 답 해석, 진전과 미해결, 신뢰 수준, 사업성 재평가, 다음 질문이다. 출력 키 순서는 `answerInterpretation`, `verifiedFacts`, `unverifiedClaims`, `assumptions`, `resolvedIssues`, `unresolvedIssues`, `impactOnPreviousJudgment`, `updatedJudgment`, `judgmentReason`, `nextVerification`, `nextQuestions`, `nextQuestionChoices`다.

`judgeStageContract`가 거절하는 경우:

- 필수 키 누락, JSON 파손 → `stage_fields_missing` 또는 `invalid_json`
- 해석의 `questionId`/`choiceId`가 이번 답 쌍과 다르면 `choice_link_mismatch`
- 다음 질문이 2개 미만이거나 중복이면 `stage_questions_missing`
- 질문별 선택지가 2개 미만이거나 `nextQuestionChoices`와 다르면 `stage_choices_missing`
- 이미 물은 질문 문장과 같으면 `stage_questions_repeated`

거절해도 첫 응답 `rawContent`는 남고, 두 번째 호출은 없다.

코드는 단계 경로에서 사업성 문장을 만들지 않는다. 판단 문장은 모델 JSON이다. 코드가 하는 일은 형식 검사, 필드 매핑, 그리고 요청 전에 답 종류를 정규식으로 붙이는 일이다.

### 한 답 재분석

`productReanalysisSystemPrompt`는 누적 이력, 증거 구분, 재평가, 판단, 다음 질문을 요구한다. 출력은 최초와 같은 사업 필드다. `verificationStage`는 `nextFactToAsk`가 계산한다. 이 경로는 지금 follow-up 라우트의 본체가 아니다.

## 8. 현재 구현된 기능과 미구현 기능

구현되어 있고 제품 경로에서 동작하는 것:

- 원문 1회로 최초 분석을 저장하고, 같은 원문이면 재호출하지 않는다.
- 키 부재는 `not_run`으로 남기고 문장을 만들지 않는다.
- 선택·보충 저장은 모델 0회다.
- 질문 2개 이상인 단계에서, 일부 답은 저장만 하고 호출하지 않는다.
- 모든 답이 모이면 통합 1회다. 같은 답 묶음은 기존 자식을 재사용한다.
- 단계 형식 실패는 원문 응답을 보존하고 수리하지 않는다.
- 새 결과는 새 행이다. 상담 저장소는 기존 `finished_at`을 갱신하지 않는다.
- 화면은 분석, 질문 초안, 제출, 대기, 실패 문구를 보여 준다.

구현되어 있으나 이번 양조장 5차 질문에는 닿지 않는 것:

- 단계 계약은 질문 2개 이상을 요구한다. CPO가 잠근 5차 질문은 1개다.
- 4차 누적 호출은 제품 `submitConsultingStage`가 아니라 Preview 테스트다.

없는 것. 코드 검색에서 `pivot`, `branchId`, `parentBranch`는 상담 기능 안에 없다.

- 사업 분기, 피벗 이벤트, 피벗 유형
- 유지할 자료와 제외할 자료
- 피벗 확정 전 취소
- 이전 분기로 돌아가기
- 피벗 전후 비교 화면
- 변경된 사업을 뿌리로 하는 새 1차 분석
- 피드백에 답 출처를 저장하는 필드
- 행에 GPT 요청 전문을 저장하는 필드

지시서의 Business → Branch → Stage → Pivot Event 트리는 현재 스키마에 없다. 대응하는 현재 트리는 다음뿐이다.

```text
startup_projects (워크스페이스)
  └── ai_pm_reviews
        ├── parent_review_id 로 잇는 한 줄 계보
        └── ai_pm_feedback
```

한 프로젝트 안에 부모 없는 행이 여러 개 있을 수 있다. 그것이 상담 분기를 뜻하지는 않는다.

## 9. 현재 구조의 문제

1. 계보가 상담 내용과 어긋난다. Founder의 실제 답은 실패 행에 있고, 성공 체인은 다른 질문을 부모로 걷는다. 단계 재분석은 `stageAnswers`만 이전 답으로 쓰므로 이 답을 자동으로 가져가지 않는다.
2. 질문 1개 단계는 제품 통합 분석이 아니다. 5차 질문은 그 경우다. 답을 제품 화면에 저장해도 `stage_questions_missing`으로 끝나고 GPT는 호출되지 않는다.
3. 단계 결과 행은 사업 구조 필드가 비어 있다. 다음 분석의 사업 그림은 뿌리 `firstAnalysis`와 판단 문장에 의존한다. 뿌리가 짧은 구형 JSON이면 지금 프롬프트가 요구하는 전체 사업 필드가 그 행에 없다.
4. 요청 전문이 행에 없다. 1차·3차의 실제 입력은 재구성하지 않는 한 증거로 제출할 수 없다. 4차만 증거 파일에 요청이 있다.
5. 답 종류 정규식과 `nextFactToAsk`가 모델보다 먼저 양조장 문맥을 분류한다. 점수는 아니나, 사업 방향 판단을 코드가 보조하는 지점이다. 다른 업종의 피벗에 이 정규식을 재사용하면 그 사업의 답을 잘못 분류한다.
6. `기타`와 `직접 입력`이 같은 choice id `other`가 될 수 있다.
7. 비단계 `finishCall`은 아직 수리 재호출을 한다. 단계 경로와 한 호출 원칙이 파일 안에서 갈린다.
8. 쿼터 전환은 한 `chat()` 안에 두 번째 공급자 호출을 넣을 수 있다.
9. 5차 질문 행은 `succeeded`이고 호출은 0이다. 상태만 보면 분석 성공으로 읽을 수 있다. 섹션에는 4차 판단 문장이 복사되어 있다. 질문 보관과 분석 완료가 상태 값으로 구분되지 않는다.
10. 시뮬레이션 표시는 표준 컬럼이 아니다. 행을 읽는 제품 경로는 `answerProvenance`를 해석하지 않는다.
11. 프로젝트 삭제 하드 캐스케이드와 계정 삭제는 검토와 피드백을 지운다. 상담 화면의 일반 경로와는 별개다. 소프트 삭제(`deleted_at`)는 검토 행을 다른 워크스페이스로 옮기지 않는다는 024 주석이 있다.
12. 같은 프로젝트에 실험 계보가 섞여 있다. 분기 id가 없으므로 목록은 프로젝트의 모든 검토를 한 화면에 올린다.

## 10. 피벗을 추가할 때 재사용 가능한 구조

재사용해도 되는 것:

- 삽입만 하는 검토·피드백. 피벗은 새 행이어야 하고, 기존 `finished_at`과 기존 답은 그대로 둔다.
- `parent_review_id`로 한 분기 안의 단계를 잇는 방식. 다만 이것만으로는 형제가 생기지 않는다. 새 사업은 옛 체인의 다음 단계가 되면 안 된다.
- 답 저장 0회, 단계가 닫힌 뒤 1회, 같은 답 해시 재사용.
- 단계 형식 실패 시 원문 보존과 수리 금지.
- 최초 분석 프롬프트가 이미 요구하는 전체 사업 범위. 새 사업의 1차는 이 계약에 가깝다.
- 화면의 대기 처리. 확정 전 기존 상담을 끝내지 않는 동작은 `pending`이 부모를 유지하는 방식과 같다.

그대로 쓰면 피벗이 깨지는 것:

- 같은 `input_sha` 재사용. 최초 분석은 원문이 같으면 기존 성공 행을 돌려준다. 새 사업 원문이 같으면 새 분기가 생기지 않는다. 원문이 달라도 자식 행은 부모의 `inputText`를 복사한다. `runStageReanalysis`의 뿌리 원문은 체인 뿌리의 옛 아이디어다. 피벗 자식을 옛 체인에 붙이면 새 사업이 아니라 옛 사업을 다시 분석한다.
- `stageAnswers`만 이전 답으로 보는 규칙. 유지할 사실과 제외할 자료를 고르려면 별도 선택 집합이 필요하다. 옛 답 전체를 자동 복사하면 지시서의 제외 정책을 어긴다.
- 단계 결과의 빈 사업 필드. 전후 비교를 코드가 필드 대 필드로 만들 수 없다. 비교 문장은 모델이 양쪽 원문과 판단을 읽고 써야 한다.
- 양조장 정규식. 피벗 후 업종이 바뀌면 그 분류는 틀린 입력이 된다.
- 질문 2개 강제. 새 1차도 제품 경로를 타면 질문 1개를 단계로 저장할 수 없다. 설계에서 이 제약을 유지할지, 1개 질문을 허용할지는 구현 전에 정해야 한다.
- `succeeded` + `callCount` 0 질문 행. 새 분기와 분석 완료를 같은 상태로 두면 5차 질문 행과 같은 혼동이 반복된다.

논리 필드와의 대응:

| 논리 필드 | 현재 |
| --- | --- |
| businessId | `project_id`. 워크스페이스지 사업 분기가 아니다 |
| branchId | 없음. 부모 없는 행이 여러 개일 뿐 |
| parentBranchId | 없음. `parent_review_id`는 단계의 직전 행 |
| pivotEventId | 없음 |
| pivotType, pivotReason, 방향, 유지, 제외 | 없음 |
| createdBy | `user_id`는 소유자다. 피벗 실행 주체 기록은 없다 |

기존 행을 새 사업의 원본처럼 복사하는 컬럼은 없다. 그 상태를 유지해야 한다.

## 11. 이번 조사에서 확인하지 않은 것

- 라이브 데이터베이스의 현재 행 수, 5차 질문 행의 피드백·자식, `finished_at` 재확인. NOT RUN.
- 브라우저에서 상담 화면을 다시 누르는 회귀. NOT RUN.
- 5차 통합 GPT 호출. 답이 없다. NOT RUN.
- 피벗 설계 문서와 구현. NOT RUN.
- Production 배포. 잠금 유지.

5차 답이 저장되면, 그 작업은 이 조사와 별개다. 기존 1~4차 행과 질문 행을 수정하지 않고, 질문 행 `e3d42c90-5358-40a0-91e3-52cf439551a5`를 부모로 새 행 하나만 만들며, 호출은 1회다. 그 호출은 이 문서의 범위가 아니다.
