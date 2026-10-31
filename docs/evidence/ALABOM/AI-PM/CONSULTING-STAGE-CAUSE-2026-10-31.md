# AI PM 상담 진전 — 원인

**날짜:** 2026-10-31 20:09 KST 기준 분석  
**대상:** PR #214 제품 경로와 Preview 실호출 `consulting-stage-live-2026-10-31-a.json`  
**이번 변경:** 원인과 수정 범위만 적는다. 프롬프트, 판단 문장, 점수, Production은 바꾸지 않는다.

상담이 끊기는 곳은 호출 횟수가 아니다. 객관식 선택이 다음 사업성 분석의 입력이 되기 전에, 요청이 그 선택을 빈 답과 이전 단계 목적으로 덮어 쓴다. 응답 계약은 그 선택을 해석하는 칸이 없고, 같은 사업 설명 필드를 다시 채우게 한다. 수리 루프는 문장 규칙 위반 개수만 줄인다.

## A. 제품 경로

| 단계 | 함수 | 요청 | 응답 | 저장 |
| --- | --- | --- | --- | --- |
| 1. 아이디어 | `POST /api/ai-pm-review` | 본문 텍스트 | — | — |
| 2–3. 최초 분석과 질문 N개 | `runFirstReview` → `buildFirstReviewRequest` → `finishCall` | `firstReviewSystemPrompt`, 스키마 `productReanalysisSchema` | 분석 필드와 `questions[]` (`text`, `choices`) | `ai_pm_reviews.record_json`. 질문 2개 미만이면 `stage_questions_missing` |
| 4. 객관식과 보충 | 화면 `submitReanalysis` | `{ projectId, reviewId, answers[] }`에 `questionId`, `choiceId`, `choiceLabel`, `otherText`, `comment` | 모델 호출 없음 | `submitConsultingStage` → `saveReviewFeedback` → `ai_pm_feedback` |
| 5. 취합 | `pairConsultingStage` | 피드백을 질문과 연결 | — | 메모리의 `StagePair`. `choiceId`와 선택지 목록은 여기서 빠진다 |
| 6. 누적 맥락 | `assembleConsultingHistory`, `buildEvidenceLedger`, `nextFactToAsk` | 아래 C절 | — | — |
| 7–8. 통합 재분석과 다음 질문 | `runStageReanalysis` → `buildProductReanalysisRequest` → `finishCall` | 시스템 프롬프트 `productReanalysisSystemPrompt`, 같은 스키마 | 같은 사업 필드와 `judgment`, `questions` | 새 `ai_pm_reviews` 행. `parent_review_id`, `stage_answers` |
| 9. 반복 | 자식 행이 다음 부모 | 같은 함수 | 같은 계약 | 기존 행은 수정하지 않음 |

화면은 `apps/web/features/business-validation-journey/components/ai-pm-review-panel.tsx`의 `submitReanalysis`다. 라우트는 `apps/web/app/api/ai-pm-review/follow-up/route.ts`다. 로그인 클릭은 이 환경에서 실행하지 않았다.

저장된 양조장 행에는 `questions`가 없다. Preview 실호출은 그 행을 고치지 않고, 분석 `9e169fef`를 복사한 새 단계 행에 기존 질문 4개를 붙여 `submitConsultingStage`를 호출했다. 요청을 만든 함수는 제품 경로와 같다.

## B. 객관식 선택이 모델에 도착하는 형태

화면과 피드백 행에는 `choiceId`가 있다. 모델 요청의 `stagePairs`에는 없다.

`pairConsultingStage` (`ai-pm-review.ts`)가 남기는 필드는 `questionId`, `question`, `choiceLabel`, `supplement`, `status`뿐이다. `buildProductReanalysisRequest`의 단계 분기도 그 다섯 필드만 보낸다.

2026-10-31 17:50 KST 2차 요청의 실제 쌍:

- 질문 원문과 `choiceLabel`, `supplement`는 있다.
- `choiceId`는 없다.
- 그 질문의 선택지 전체는 `stagePairs`에 없다.
- 부모 분석의 `questions[].choices`는 `renameEchoKeys`가 `priorChoices`로 바꿨다. 2차 요청의 hist-3 선택지는 고른 항목 하나뿐이었다. `{ id: "c1", label: "아직 떠오르는 양조장이 없다" }`.

그래서 모델은 “이 질문에서 어떤 갈림길을 두고 어느 쪽을 골랐는지”를 받지 못한다. 고른 문장만 받는다.

`answerReading.kinds`는 문장 정규식으로 붙인 사실·주장·계획·선택이다. 선택지의 사업적 의미는 아니다. 사업성 점수는 없다.

한 답 경로의 `founderChoice`, `founderSupplement`, `founderFeedback`은 단계 경로에서 비어 있다. `runStageReanalysis`가 세 값을 `null` 또는 `''`로 넘긴다. 2차 요청에서 셋 다 비어 있고 `founderAnswers`도 빈 배열이다. 프롬프트는 그 빈 필드를 “이번 답”이라고 부른다. 실제 답은 `stagePairs`에만 있다.

## C. 재분석 계약이 진전을 요구하지 않는다

출력 스키마 `productReanalysisSchema`의 필수 필드는 최초 분석과 같다. 고객, 문제, 수익, 운영, 판단 문자열, 질문 배열이다. 다음 칸은 없다.

- 각 선택이 기존 가설에 무엇을 의미하는지
- 그 선택이 판단을 유지하는지 바꾸는지와 이유
- 이번에 확인된 것과 아직 모르는 것
- 종료된 문제
- 남은 불확실성에서만 나온 다음 질문

프롬프트는 이 여섯 가지를 판단 문장 안에 쓰라고 한다. 스키마는 그 여섯 가지를 받지 않는다. 모델은 사업 설명 필드를 다시 채우고 판단을 한두 문장으로 줄이면 형식은 통과한다.

추가로 지시가 서로 다르다.

- 최초 검토 프롬프트는 불확실성을 가장 줄이는 갈림길 질문을 만들고, 선택지를 고객·문제·지불자·운영의 차이로 둔다.
- 재분석 스키마 설명은 다음 질문을 접근 경로, 협력 의사, 협력 조건 중 하나로 고정한다.
- 같은 프롬프트는 질문을 하나만 묻게 하고, 스키마는 질문을 2개 이상 요구한다.

2차 실응답은 그 충돌의 결과다. 질문은 두 개인데 둘 다 “계획을 무엇인가”, “방법은 무엇인가”이고, `nextVerification`은 방금 답한 기준 질문이다.

## D. 원인 분류

### 1. 데이터 전달

`choiceId`와 선택지 목록이 모델 입력에서 빠진다. 질문에 붙어 있던 `choices`는 `priorChoices`가 되어 “복사하지 말 이전 문장”으로 읽힌다. 위치: `pairConsultingStage`, `buildProductReanalysisRequest`의 `stagePairs` 매핑, `renameEchoKeys`.

근거: 2차 요청 `stagePairs` 키는 다섯 개다. hist-3의 `priorChoices`는 선택 라벨 하나다.

### 2. 맥락과 순서

단계 호출은 이번 답을 빈 문자열로 두고 `nextFactToAsk`를 돌린다. 2차 `verificationStage`는 다음 목적이 `named_target_and_path`이고 `alreadyAnswered`는 빈 배열이다. 같은 요청의 `stagePairs`는 이미 “떠오르는 양조장이 없다”와 체험 기준을 담고 있다.

`consultingPath`와 `priorTurns`는 0이다. `evidenceLedger.unresolved`와 `priorGoals`도 비어 있다. `stillUnknown`은 접촉, 협력 의사, 협력 조건이라는 고정 목록이다. 이번 선택에서 나온 미해결이 아니다.

같은 요청에 실험 기록 28개, 실패 호출 5개, `priorAnalyses` 4개가 있다. 예산이 오래된 분석을 지우고 최근 실험을 남긴다. 그 4개의 판단은 다음 두 문장이다.

- “협력 가능성이 높지만, 실제 접촉 및 협력 조건에 대한 구체적인 증거가 부족하다.” (`524878d3`, `cbaec036`)
- “주장은 검증되지 않은 가설이다. 구체적인 후보가 선정되지 않았다.” (`98736271`, `38417d03`)

2차에 저장된 요약은 첫 문장이고, 저장된 판단은 둘째 문장에 가깝다. 대화 순서가 아니라 최근 실험 문장이 재분석의 재료가 됐다.

위치: `runStageReanalysis`가 `founderSupplement: ''`를 넘기는 부분, `buildEvidenceLedger`가 경로와 그 빈 보충만 보는 부분, `assembleConsultingHistory`, 입력 예산에서 `priorAnalyses`를 앞에서 잘라 최신을 남기는 반복.

### 3. 프롬프트와 응답 계약

모델에게 “이전 분석과 답을 보고 다시 써라”에 가까운 계약만 있다. 출력은 최초 분석과 같은 사업 필드다. 선택 해석, 영향, 종료된 문제, 남은 불확실성은 판단 문자열에 압축하라고만 한다.

위치: `productReanalysisSchema`, `productReanalysisSystemPrompt`. 이번 작업에서는 문장을 고치지 않았다.

### 4. 응답 품질과 검증

`productReadingIssues`는 양조장 문장 규칙이다. 주장을 가설로 적었는지, “높지만”이 있는지, 기준 질문을 다시 썼는지다. 선택이 사업성 판단을 구체화했는지는 보지 않는다.

`finishCall`은 그 규칙 위반이 더 적은 수리를 남긴다. 첫 호출과 수리 3회까지다. 1차는 3회, 2차는 4회를 썼다. 2차 저장 판단은 여전히 가설 문장에 후보 부재 한 줄을 더한 수준이고, 요약은 “가능성이 높지만”을 유지했다. 수리는 진전을 만들지 못했다.

저장된 문장과 호출별 원문은 `consulting-stage-live-2026-10-31-a.json`에 있다. 이 기록으로 품질 통과를 선언하지 않는다.

| CPO 영역 | 유형 | 판단 |
| --- | --- | --- |
| ① 질문 설계 | 3 | 최초 검토의 갈림길 질문과 재분석의 고정 주제 질문이 다른 계약이다. 스키마는 질문 2개, 프롬프트는 주제 1개다. |
| ② 선택 해석 | 1, 3 | 선택지 의미와 `choiceId`가 요청에 없고, 응답에도 해석 칸이 없다. |
| ③ 누적 맥락 | 2 | 답 쌍은 전달된다. 순서와 다음 목적은 빈 답 기준으로 계산되고, 최근 실험 판단 4개가 남는다. |
| ④ 후속 분석 | 3, 4 | 저장된 2차 결과는 기존 판단의 반복과 요약 모순, 이미 답한 기준의 재등장이다. |

## 수정 범위

프롬프트를 문장 단위로 더 금하는 작업은 범위 밖이다. 질문·답변 `questionId` 연결과 부모 행 구조는 유지한다. 코드가 사업성 문장을 쓰거나 점수를 계산하지 않는다.

1. 단계 요청의 각 쌍에 질문 원문, 화면에 있던 선택지 전체, `choiceId`, `choiceLabel`, 보충을 함께 둔다. 질문의 선택지를 `priorChoices`로 바꾸지 않는다.
2. `verificationStage`, `evidenceLedger`, “이번 답”은 `stagePairs`와 `priorStagePairs`에서 만든다. 빈 `founderSupplement`로 다음 목적을 계산하지 않는다. 반복 실험 판단이 최신이라는 이유로 재분석의 본문이 되지 않게 한다.
3. 응답 계약에 모델이 쓸 칸을 둔다. 선택 해석, 기존 판단에 준 영향, 유지 또는 변경과 이유, 새로 확인된 것, 아직 모르는 것, 종료된 문제, 남은 불확실성에 대한 다음 질문과 그 질문의 선택지. 코드는 그 칸이 비었거나 종료된 문제를 다시 묻는지만 본다.
4. 문장 규칙 수리를 진전의 대체물로 쓰지 않는다. 수리가 더 돌아도 2차처럼 요약이 주장을 현재 상태로 쓰면 품질 실패로 남긴다.

## 재검증

수정 후에만 Preview에서 같은 양조장 답 4개로 다시 호출한다. 기존 행은 고치거나 지우지 않는다. 마커 `consulting-stage-live-2026-10-31-a`는 다시 호출하지 않는다.

확인할 것:

- 요청 쌍에 `choiceId`와 선택지 목록이 있다.
- 2차 `verificationStage`가 이미 지난 “이름과 연락 경로”를 다음 목적으로 두지 않는다.
- “후보를 선정하지 못했다”가 미해결로 요청에 있다.
- 저장된 판단이 `98736271`의 문장을 한 줄 더한 수준이 아니라, 체험 기준 선택과 후보 부재를 구분해 유지 또는 변경 이유를 쓴다.
- 요약이 “가능성이 높지만”을 현재 상태로 쓰지 않는다.
- 다음 질문이 방금 답한 기준 질문이 아니다.

3차 통합 호출은 2차가 만든 새 질문에 저장된 Founder 답이 생기기 전에는 실행하지 않는다. 그 답을 만들어 넣지 않는다. 단위 테스트 통과는 이 재검증의 통과가 아니다.

Production과 화면 최종 연결, CEO 테스트는 이 재검증 전이다.
