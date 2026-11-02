# Sprint 2 — 3차 파서 차단 원인과 최소 변경안

2026-11-02 11:25 KST. 기준 증거 `3a261197`. 이 문서는 조사와 변경안이다. 파서 코드, 프롬프트, SQL, Supabase, Vercel은 바꾸지 않았다. GPT 호출은 0회다. Sprint 2 PASS는 선언하지 않는다. Production은 잠금이다.

## 1. 3차에서 실제로 맞은 조건

3차 응답 `chatcmpl-Efbd9RroEWRZwQtaeBwxSkYw9Vm74`는 수신됐다. `finishReason`은 `stop`이다. 저장 행 `0e75ff46-88fd-4ce2-b567-bdc3f3048531`의 상태는 `failed`이고 error는 `stage_judgment_copied,stage_questions_repeated`다.

비교에 쓰인 이전 판단은 2차 저장 문장이다.

`사업의 방향성이 불확실하여 성공 가능성이 낮아졌다. 고객층을 명확히 정의하고 체험 프로그램의 구체적인 내용을 설정하는 것이 필요하다.`

3차 `updatedJudgment`는 그 문장과 같다. 공백을 지운 뒤의 완전 일치다. 비슷하다는 추정으로 실패한 것이 아니다.

3차 `nextQuestions` 두 문장도 2차가 이미 물었고 3차 요청의 `stagePairs`에 답으로 들어 있던 질문과 같다.

- `전통주 체험 프로그램의 고객층을 명확히 정의하기 위해 어떤 조사를 해야 할까?`
- `체험 프로그램의 구체적인 내용 및 가격을 설정하기 위해 어떤 요소를 고려해야 할까?`

질문 개수는 2차와 3차가 모두 2개다. 개수가 달라서 실패한 것이 아니다.

### stage_judgment_copied

| 항목 | 내용 |
| --- | --- |
| 함수 | `judgeStageContract`가 `repeatsPriorJudgment`를 호출 |
| 파일 | `apps/web/features/business-validation-journey/lib/ai-pm-review.ts` 3217–3223행, 3386–3388행 |
| 비교 대상 | 응답 `updatedJudgment`와 `stageContract.priorJudgmentText` |
| 그 이전 판단의 출처 | `runStageReanalysis`가 부모 `sections.analysis.judgmentDetail` 또는 `sections.judgment`를 넣음. 3756–3760행 |
| 실패 조건 | 공백을 없앤 두 문장이 같거나, 이전 문장이 24자 이상이고 새 문장이 그 이전 문장을 포함 |
| 이번 3차 | 첫 조건. 두 문장이 같음 |

### stage_questions_repeated

| 항목 | 내용 |
| --- | --- |
| 함수 | `judgeStageContract`. 보조 함수는 `repeatsAskedQuestion`, `questionPurposeKey` |
| 파일 | 같은 파일 3191–3215행, 3519–3534행 |
| 비교 대상 | 응답 `nextQuestions[].text`와 `stageContract.askedQuestions`. 이번 계약의 `askedQuestions`는 `previousQuestions` |
| 같이 보는 집합 | `closedSentences`와 이번 `stagePairs`의 질문, 선택 라벨, supplement. 3756–3759행에서 그 문장들을 넣음 |
| 실패 조건 | 질문 문장의 공백 제거 결과가 이미 물은 질문이나 그 집합에 있거나, `questionPurposeKey`가 같거나 12자 이상의 짧은 쪽이 긴 쪽에 포함되거나, `verificationPurpose`가 비었거나 그 집합과 같거나 질문 문장과 같음 |
| 이번 3차 | 질문 문장 두 개가 `askedQuestions`와 공백 제거 후 일치. 목적 축약까지 가지 않음 |

### 응답을 받고도 failed가 된 위치

`finishCall`의 stage 분기, 5240–5285행.

1. `judgeStageContract`가 이슈 배열을 만든다.
2. 이슈가 하나라도 있으면 `sections`는 `null`이다. 3580행이 먼저 반환한다.
3. `finishCall`은 `accepted`가 아니면 `status: 'failed'`, `sections: null`, `error`에 이슈 코드를 넣고 `rawContent`에는 응답 원문을 넣는다.
4. 수리 호출은 이 분기에 없다. 호출은 1회로 끝난다.

원문은 행에 남는다. 다음 분석이 읽는 구조인 `sections`는 비워진다.

### 4차를 막은 위치

`runStageReanalysis` 3604–3606행과 `submitConsultingStage` 3805–3807행.

부모의 `status`가 `succeeded`가 아니거나 `sections`가 없으면 `review_missing`을 반환하고 `chat`을 호출하지 않는다. 3차 행은 그 두 조건을 모두 못 맞춘다. 시험 실행기도 저장 상태가 `succeeded`가 아니어서 4차 요청을 만들지 않았다.

화면 라우트 `apps/web/app/api/ai-pm-review/follow-up/route.ts`는 그 오류를 400으로 반환한다.

## 2. 책임 분리

이번 3차를 막은 두 코드는 전략 비교다. 필수 필드, JSON, 질문 id와 선택 id의 연결을 검사한 결과가 아니다.

유지하는 구조 검사:

| 코드 | 이유 |
| --- | --- |
| `invalid_json` | 응답을 객체로 읽지 못함 |
| `stage_fields_missing` | 필수 키 누락 |
| `stage_field_blank` | 필수 칸이 공백 |
| `stage_content_insufficient` | `supplyState` `marketingState`와 문장이 맞지 않음 |
| `stage_choices_missing` | 다음 질문의 선택지가 2개 미만이거나 두 배열이 다름 |
| `stage_questions_missing` | 다음 질문이 0개이거나 같은 응답 안에서 질문 문장이 중복 |
| `choice_link_mismatch` | 해석의 `questionId` `choiceId`가 이번 답과 다름 |
| `stage_answer_echo` | 해석 칸이 선택 라벨이나 supplement와 같음 |
| `stage_claim_promoted` | 답 문장을 `verifiedFacts`에 넣음 |

`stage_questions_missing`은 이전 라운드와 개수가 다르다는 검사가 아니다. 이번 응답 안에 다음 질문이 없는 경우다. 3차는 여기에 해당하지 않았다.

이번 변경안에 넣지 않고 남겨 두는 코드는 `stage_issues_copied`, `stage_issues_dropped`, `stage_reassessment_missing`, `stage_claim_as_positive`다. 3차 error에는 없었다.

빼는 실패 조건:

| 코드 | 빼는 이유 |
| --- | --- |
| `stage_judgment_copied` | 이전 판단과 같거나 그 문장을 포함한다는 이유. 판단 유지다 |
| `stage_questions_repeated` | 이전 질문과 같거나 목적이 겹친다는 이유 |

시스템 프롬프트는 그대로 둔다. 프롬프트는 여전히 같은 판단 문장과 같은 질문 목적을 내지 말라고 적는다. 그 문장을 고치지 않는다. 바꾸는 것은 그 결과를 제품 실패로 버려 다음 라운드를 막는 파서 쪽이다.

## 3. 최소 변경안

`judgeStageContract`에서 두 `issues.push`만 실행하지 않는다.

- 3386–3388행의 `stage_judgment_copied`
- 3534행의 `stage_questions_repeated`

`repeatsPriorJudgment`와 `repeatsAskedQuestion` 함수는 파일에 남긴다. 프롬프트 문자열, `finishCall`의 수리 분기, 라우트, 저장소는 건드리지 않는다.

이 응답만 다시 파서에 넣으면 두 코드가 없어지고, 다른 구조 이슈가 없으면 `sections`가 채워지고 행은 `succeeded`가 된다. 그 행을 부모로 4차 `submitConsultingStage`가 `review_missing` 없이 요청을 만들 수 있다. 이번 조사에서는 그 호출을 하지 않는다.

같이 고칠 테스트는 `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts`다. 두 코드만으로 `failed`와 `sections: null`을 기대하는 사례는, 원문을 저장하고 `succeeded`이며 다음 질문 문장이 남는 기대로 바꾼다. `stage_fields_missing`이나 `stage_field_blank`가 함께 있는 사례는 계속 실패다. 과거 증거 JSON의 `rowError` 문자열을 읽는 테스트는 그 파일의 기록이라 파서 수정과 별개다.

## 4. 시험 경로와 제품 경로

이번 3회는 제품 함수를 프로세스 안에서 호출했다. 제품 화면과 제품 데이터베이스의 끝까지는 아니다.

| 항목 | 이번 실행 | 제품 |
| --- | --- | --- |
| 진입 | 새 Cloud Agent에서 `runFirstReview`, 이어서 `submitConsultingStage` | 화면 `ai-pm-review-panel.tsx`가 `POST /api/ai-pm-review`, `POST /api/ai-pm-review/follow-up` |
| 인증 | 없음. 사용자 `e2e-live-user`, 프로젝트 `e2e-live-brewery` | `getServerAuthUser`, `requireOwnedProject` |
| 모델 호출 | `OpenAIProviderAdapter.chat` | `openReviewChat`이 그 어댑터를 감쌈. 할당량 오류면 Gemini로 한 번 전환할 수 있고 OpenAI 호출을 4회로 자름 |
| `openReviewChat`을 안 쓴 이유 | 승인 조건이 Gemini 전환과 재시도를 금지했기 때문 | 화면 라우트는 `openReviewChat()`을 넘김. `follow-up/route.ts` 33행 |
| 본문 | `COMPARE_BUSINESS_BODY`. 저장소의 양조장 SIMULATION 문장 | 로그인한 사용자의 입력 |
| 저장 | `/tmp` sqlite. `productionDatabase` false. 실행 후 삭제 | `openReviewBackend`. 관리자 키가 있으면 Supabase, 없으면 작업 디렉터리 sqlite |
| 재조회 | 같은 프로세스의 sqlite에서 부모를 다시 읽음 | 제품 저장소와 화면 재조회는 하지 않음 |
| 파서 | 같은 `judgeStageContract` | 같은 함수 |

`submitConsultingStage` → `runStageReanalysis` → `finishCall` → `judgeStageContract`는 제품과 같은 함수다. 다른 점은 그 함수에 도달하는 입구, 로그인, `openReviewChat` 포장, 저장 매체다. 시험 하네스의 3회를 제품 E2E 성공으로 적지 않는다.

## 5. 테스트 계획

CPO가 이 변경안을 승인한 뒤에만 코드를 고친다. 승인 전 GPT 호출은 0회다.

1. 저장된 3차 원문 `sprint-2-e2e-live-gpt.json`을 `judgeStageContract`에 다시 넣는다. 네트워크는 쓰지 않는다. `stage_judgment_copied`와 `stage_questions_repeated`가 이슈에 없고 `sections`가 채워지는지 본다.
2. 잘못된 JSON, 필수 칸 공백, `choiceId` 불일치는 계속 `failed`인지 본다.
3. 판단 문장이 이전과 같고 다음 질문이 이전 질문과 같아도, 구조 이슈가 없으면 `succeeded`이고 그 질문 문장이 `sections`에 남는지 본다.
4. `pnpm` 단위 테스트만 실행한다. Preview 빌드와 `run-web-build.sh`에는 넣지 않는다.

예상 GPT 호출은 0회다. 저장소 요율 `packages/ai/src/token/manager.ts`의 `gpt-4o-mini`는 입력 $0.15 / 1M, 출력 $0.60 / 1M이다. 호출이 없으므로 금액은 0이다. 이 요율은 청구서가 아니다.

4차를 실제로 보내려면 파서 변경 뒤의 별도 승인이 필요하다. 그 호출은 이 계획에 넣지 않는다.
