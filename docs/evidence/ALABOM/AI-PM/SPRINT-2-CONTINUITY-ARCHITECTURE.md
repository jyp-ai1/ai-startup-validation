# Sprint 2 — 상담 연속성 구조

2026-11-01 23:29 KST 설계다. 그 시점의 코드 변경과 프롬프트 변경과 GPT 호출은 0이었다. PR #227의 실패 실행과 추적 자료는 수정하지 않았다. Production은 잠겨 있다. Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않는다.

2026-11-01 23:49 KST 같은 구조에 CPO 보완을 반영했다. `epistemicStatus`와 `provenance`는 다른 축이다. 원문 구간은 `VERIFIED_FACT`가 아니다. 미연결 정보는 질문과 따로 쌓인다. 구현 증거는 `SPRINT-2-CONTINUITY-IMPLEMENTATION.md`다. GPT 실호출은 0회다.

기준 실행은 PR #227, 기록 커밋 `8afa04b3`, 추적 커밋 `f3ee8e6d`다. 추적 원문은 `docs/evidence/ALABOM/AI-PM/SPRINT-2-END-TO-END-TRACE.md`와 `sprint-2-end-to-end-trace.json`이다. 이 문서는 그 실패를 고친 결과가 아니다. 현재 코드가 실제로 데이터를 어디로 보내는지, 그리고 하나의 사업 맥락으로 이어지려면 어느 연결이 필요한지를 적는다.

## 1. 두 개의 경로

지금 저장소에는 후속 분석 경로가 둘이다. #227은 두 번째만 실행했다.

| 경로 | 진입 | #227에서 |
| --- | --- | --- |
| 제품 상담 단계 | `saveReviewFeedback` 뒤 `submitConsultingStage` → `runStageReanalysis` → `buildProductReanalysisRequest` | 호출하지 않음. `runStageReanalysisCalled` false |
| 판단 계약 실험 | `runDecisionContractFollowUp` → `buildStateRequest` | 2차에 이 경로만 사용. 선택 호출은 검사 실패로 나가지 않음 |

1차만 제품 함수 `runFirstReview` → `buildFirstReviewRequest`를 탔다. 전송 직전 모델만 `gpt-4o`로 바뀌었다. 제품 상수 `AI_PM_REVIEW_MODEL`은 `gpt-4o-mini`다. 제품 파일은 수정되지 않았다.

제품 단계 경로는 이미 `originalInput`, `firstAnalysis`, `latestAnalysis`, `stagePairs`, `answerLinks`, `priorReadings`를 한 요청에 넣는다. 실험 경로는 사업 문단, 판단 문장 하나, 위험, 가정, 질문 문장, 선택 라벨, `currentAnswer`만 넣는다. `questionId`와 1차 전체 분석 객체는 실험 요청에 없다. 추적 자료의 원인 후보 1은 이 실험 조립이다.

이번 설계의 기준 경로는 제품 상담 단계다. 실험 러너는 실패 증거로 남기고, 제품 경로를 그 러너로 바꾸지 않는다.

## 2. 현재 구현의 14단계

아래 표의 “#227”은 캡처에 있는 실제 값이다. “제품”은 소스에서 읽은 현재 동작이다. sqlite 파일은 저장소에 없어 행의 `requestedAt`과 `rawContent`는 재조회하지 않았다.

| 단계 | 데이터 원천 | 식별자 | 연결 | 다음 GPT에 포함 | 의미 | 상태 | 저장 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1. 최초 사업 입력 | 사용자 입력. #227은 고정 본문 `COMPARE_BUSINESS_BODY` | `projectId` `sprint2-final-local-sqlite`. 로그인 창업자 세션 아님 | `inputText`, `inputSha` | 1차 사용자 메시지의 `사업 입력:` 뒤에 그대로 | 보존됨. 검사 `round1UserContainsIdeaVerbatim` true | 입력 자체에는 상태 칸이 없음 | `StoredReview.inputText` |
| 2. 최초 GPT 요청 | 코드가 시스템 문장과 사용자 메시지를 조립 | 요청 모델은 전송 시 `gpt-4o`. 상수 `gpt-4o-mini` | 사업 문단만 사용자 메시지에 붙음. 검토 목적 값은 비어 있음 | 해당 호출 자체 | 시스템 키에는 `alternatives`, `differentiation`이 있고 사용자 키 목록에는 없음. 모델이 그 두 키를 채움 | 없음 | 캡처 `round1.request` |
| 3. 최초 GPT 응답 원문 | GPT 출력 | `chatcmpl-EfQCm9ORwEBK97bV0qZXYjOY5vZYN` | 1차 리뷰 `ff2b5f3e-0ec5-4c8d-8ae6-e43322a5c4b4` | 후속 요청에 원문 전체가 들어가지 않음 | 응답 JSON 그대로가 캡처에 있음 | `founderFacts` `[]` | 캡처 response content. sqlite `rawContent`는 재조회하지 않음 |
| 4. 최초 사업 분석 | 파서 `readBusinessAnalysis`가 GPT 출력을 칸에 배치 | 같은 reviewId | `sections.judgment`는 모델 `summary`. `analysis.judgmentDetail`는 모델 `judgment` | #227 후속에는 `judgmentDetail` 문장만 `priorJudgment`로 전달 | 고객·문제·가치·수익·시장·경쟁·운영은 상태 없이 문장으로 저장. 가정은 `uncertain`과 `hypotheses`에 중복 | 추론만 `inferences`로 분리. 나머지 문장에는 VERIFIED와 ASSUMPTION 구분이 없음 | `sections` |
| 5. 질문과 선택지 | GPT 출력. 별도 질문 호출 없음 | 응답에는 id 없음 | `questions[0].text`와 `choices` 문자열 | 후속에는 문장과 라벨만 | 협력 확인 방법 하나. 수요 가정은 질문이 되지 않음 | 없음 | 응답 원문 |
| 6. ID 생성 | 코드. `readConsultingQuestions`가 `q1`, `readChoices`가 `c1` `c2` `c3` `other` | `q1`, `c1`, `c2`, `c3`, `other` | 1차 리뷰의 `analysis.questions` | #227 후속 JSON에는 이 id가 없음 | 라벨 의미는 유지. id 연결은 후속에서 끊김 | 없음 | sections |
| 7. 답변 저장 | #227은 저장 함수를 호출하지 않음. 제품은 `saveReviewFeedback`. `modelCalls` 0 | 제품은 `feedbackId`. #227은 없음 | 제품은 `reviewId` + 선택적 `questionId` | 저장 자체는 GPT 0회 | #227의 문장은 선택지가 아님 | SIMULATION 접두 | 캡처에 피드백 행 없음 |
| 8. 질문과 출처 연결 | 제품 `pairConsultingStage`는 `questionId`가 같은 피드백만 그 질문에 붙임. id 없는 피드백은 어떤 질문의 답도 아님 | `questionId`, `choiceId`, `feedbackId` | 부모 리뷰 | 제품 단계 요청의 `stagePairs` | #227은 `currentAnswer`만 넣고 `sourceFeedbackId` null | 질문과 맞지 않는 문장도 그 질문의 답처럼 전달됨 | 2차 `parentReviewId`만 1차를 가리킴 |
| 9. 후속 Payload | #227은 `buildStateRequest`. 제품이면 `buildProductReanalysisRequest` | 부모 reviewId | 실험 경로는 질문 문장을 `closedQuestions`에 넣음. 선택 저장이 없어도 닫힌 질문이라는 키 이름 | 실험 경로에 포함된 것은 아이디어, 판단 상세, 위험, 가정, 질문 문장, 선택 라벨, 이번 답. 1차 전체 객체와 `q1`은 제외 | `priorAnswers` `[]`. `presentInAnswers` 전부 false | `answerSource` `simulation` | 캡처 `round2Payload` |
| 10. 후속 응답 | GPT 출력 | `chatcmpl-EfQCrUCmtR7uZRBse4zNPX5iJy2Ox` | 2차 리뷰 `58bcce50-4f79-47c3-8f62-924f9542db0b` | 다음 호출 없음 | `changes` `[]`, `answerImpact` `none` | `confirmedFacts` `[]` | ledger가 응답과 같음. sections null |
| 11. 판단 비교 | 실험 검사는 응답 ledger를 봄. 제품에는 `assessFollowUpRevision`과 stage reading이 있으나 이번 실행은 호출하지 않음 | 없음 | `judgmentText`가 `priorJudgment`와 같음 | 선택 호출로 넘어가지 않음 | 구상, 공급 계약 없음, 가격 없음이 구간에 없음. `충족`이 남음 | 유지로 기록. 유보 문장 없음 | 실패 행. error `decision_contract` |
| 12. 이슈 갱신 | GPT ledger | 모델이 적은 질문 id는 `closedQuestions`. 저장 id `q1`이 아님 | `answeredQuestions` 비어 있음 | 다음 요청 없음 | 미확인 두 줄은 1차 가정 문장 복사 | 협력 질문은 미답. kept 인용은 빈 배열 | ledger |
| 13. 다음 검증 | 실험 시스템 문장은 후보와 질문을 만들지 말라고 함. 제품 단계 문장은 모델이 `objectiveCandidates`와 `selectedCandidateId`를 고르게 함 | 없음 | 코드는 후보를 고르지 않음. 검사가 실패하면 선택 요청을 만들지 않음 | NOT RUN | 다음 질문이 없어 반복 여부를 볼 수 없음 | 없음 | `selection` null |
| 14. 저장과 재조회 | 코드. 로컬 sqlite. `productionDatabase` false | 위 두 reviewId | 2차 부모는 1차 | 재조회 결과는 캡처 `storageIds` | 실패 행을 성공으로 덮지 않음 | failed / succeeded | sqlite는 커밋되지 않음. 같은 입력의 재실행은 `inputSha` 또는 `supplementSha`로 기존 행을 재사용 |

## 3. 제품 경로가 이미 보존하는 것

`buildProductReanalysisRequest`의 단계 묶음은 다음을 한 사용자 JSON에 넣는다.

- `originalInput`
- `firstAnalysis`의 고객, 문제, 시장, 수익, 상품, 공급, 마케팅
- `latestAnalysis`
- `stagePairs`의 `questionId`, 질문 문장, 선택지, `choiceId`, 라벨, supplement, `status`
- `priorStagePairs`
- `answerLinks`의 `sourceReviewId`, `questionId`, 선택, supplement, `submittedAt`, `status`
- `answerSource`가 문장이 `SIMULATION`으로 시작하면 `simulation`, 아니면 `founder`
- `priorReadings`
- `doNotCopy`의 이전 판단 문장, 이전 질문, 이전 미해결 목록

답변 저장은 `modelCalls: 0`이다. 단계의 질문이 하나라도 `open`이면 `runStageReanalysis`는 `stage_incomplete`를 반환하고 모델을 호출하지 않는다. `submitConsultingStage`는 그 경우 `called: false`, `pending: true`로 부모 리뷰를 돌려준다. 같은 부모와 같은 답 조합의 재실행은 저장된 자식 행을 재사용한다.

입력 예산은 `AI_PM_PRODUCT_REANALYSIS_INPUT_TOKEN_BUDGET` 24,000이다. 예산을 넘으면 `priorAnalyses`와 `priorTurns`의 오래된 항목부터 빠진다. `originalInput`과 `stagePairs`는 그 삭제 목록에 없다.

## 4. 제품 경로에서 끊기는 연결

### 4.1 상태 없는 1차 문장

1차 파서는 모델이 쓴 문제, 지불자, 경쟁, 강점을 상태 칸 없이 sections에 둔다. #227에서 이 문장들은 입력에 없었다. `founderFacts`만 비어 있었다. 후속 요청이 sections를 그대로 넘기면, 추정 문장이 이전 분석의 내용으로 전달된다. #227 실험 경로는 sections 전체를 넘기지 않았고, 판단 상세 문장만 넘겼다. 그 문장 안에 `충족`이 있어 추정 판단이 다음 근거의 자리에 남았다.

### 4.2 질문과 답이 다른 정보

`pairConsultingStage`는 `questionId`가 없는 피드백을 어떤 질문에도 붙이지 않는다. 그 정보는 다음 단계 요청의 `stagePairs`에 들어가지 않는다. 그래서 질문 밖에 있는 사업 정보는 억지 연결은 되지 않고, 다음 재분석에서도 빠진다.

`submitConsultingStage`는 선택 라벨이 있는데 `choiceId`가 비어 있으면 `c1`을 넣는다. 라벨과 다른 선택 id가 저장될 수 있다.

```3740:3743:apps/web/features/business-validation-journey/lib/ai-pm-review.ts
        ...(choiceLabel
          ? { choiceId: (answer.choiceId ?? '').trim() || 'c1', choiceLabel, otherText: supplement }
          : {}),
```

단계에 없는 `questionId`는 저장 루프에서 건너뛴다. 그 문장은 피드백으로 남지 않는다.

### 4.3 코드가 사실 종류를 고르는 자리

`founderAnswerKinds`는 문장 패턴으로 `fact`, `claim`, `plan`, `choice`를 붙인다. 이 값은 요청의 `answerReading.kinds`로 전달된다. 계약의 `VERIFIED_FACT`가 아니다. “아직 정하지 못했다”류 문장이 `fact`로 붙을 수 있다. 사업 판단의 출처로 쓰지 않는다.

### 4.4 #227이 제품 경로를 비운 결과

실험 요청은 제품이 이미 갖고 있는 `stagePairs`와 `answerLinks`를 쓰지 않았다. 이번 답은 협력 질문에 대한 선택이 아니었는데 `closedQuestions` 배열에 그 질문 문장만 들어갔다. 모델은 질문 id로 `closedQuestions`라는 키 이름을 썼다. 구상, 공급 계약 없음, 가격 없음은 구간으로 남지 않았다.

## 5. 목표 흐름

한 사업은 한 `projectId` 아래의 리뷰 연쇄다. 부모는 `parentReviewId`다. 최초 입력 문장은 루트 `inputText`에만 있고, 이후 요청은 그 문단을 다시 복사해 `originalInput`으로 넣는다. 모델이 그 문단을 고친 문장으로 바꾸지 않는다.

각 사업 문장은 출처 레코드를 가진다.

| 필드 | 담당 |
| --- | --- |
| `statementId` | 코드가 발급 |
| `text` | GPT 또는 창업자 원문 |
| `epistemicStatus` | `VERIFIED_FACT`, `FOUNDER_CLAIM`, `ASSUMPTION`, `UNKNOWN`. 코드가 별도 증거 없이 `VERIFIED_FACT`를 내림 |
| `provenance` | `FOUNDER_INPUT`, `SIMULATION`, `EXTERNAL_EVIDENCE`, `AI_INFERENCE`. `SIMULATION` 접두 본문은 `SIMULATION`으로 고정 |
| `sourceId` | `reviewId` 또는 `feedbackId` |
| `span` | 출처 원문에 그 문장이 있는지. 구간이 맞아도 사실 검증은 아님 |
| `evidenceId` | `VERIFIED_FACT`를 유지하는 외부 근거. 없으면 사실은 아님 |
| `createdAt` | 저장 시각 |

정의는 `SPRINT-2-DECISION-CONTRACT.md`에 있다. `SIMULATION`은 사실 상태 목록에 없다.

1차 응답의 문제, 고객, 경쟁, 수요, 협력, 가격, 수익은 별도 `evidenceId` 없이 `VERIFIED_FACT`가 되지 않는다. 입력에 구간이 없는 문장도 `VERIFIED_FACT`가 아니다. 구간이 있는 창업자 문장 “양조장과 계약했다”도 그 말만으로는 `FOUNDER_CLAIM`이다.

## 6. 질문과 답

한 답은 다음을 함께 저장한다. 저장 때 GPT 호출은 0회다.

| 요구 항목 | 저장 위치 |
| --- | --- |
| `questionId` | 피드백. 단계의 질문과 같을 때만 그 질문의 답 |
| `reviewId` | 질문을 만든 부모 리뷰 |
| 제공 선택지 | 부모 `analysis.questions[].choices`. 답 행이 라벨을 다시 쓰지 않음 |
| `choiceId` | 창업자가 고른 id. 비어 있거나 제공 선택지에 없으면 ChoiceAnswer를 만들지 않음. `c1`으로 채우지 않음 |
| 선택 라벨 | id가 제공 선택지에 있으면 그 메뉴의 라벨을 저장. 요청 라벨이 달라도 메뉴 라벨을 씀. id가 없으면 본문만 남음 |
| 직접 입력 | `otherText` 또는 comment. `other`가 아닐 때도 보충으로 남김 |
| `provenance` | `FOUNDER_INPUT`, `SIMULATION`, `EXTERNAL_EVIDENCE`, `AI_INFERENCE`. 본문이 `SIMULATION`으로 시작하면 `SIMULATION` |
| `epistemicStatus` | 기본 `FOUNDER_CLAIM`. `VERIFIED_FACT`는 `EXTERNAL_EVIDENCE`와 `evidenceId`가 있을 때만 |
| 저장 시각 | `submittedAt` |
| 질문 상태 | `answered` 또는 `open`. 미연결 문장은 이 상태를 바꾸지 않음 |

질문 밖의 새 사업 정보는 다음을 지킨다.

- `questionId`가 없거나 그 단계의 질문이 아니면 어떤 질문에도 붙이지 않는다.
- 질문은 `open`으로 남는다.
- 원문, `provenance`, `epistemicStatus`를 보존한다.
- 다음 통합 재분석의 `unlinkedStatements`로 `stagePairs`와 따로 전달한다.
- 같은 원문을 다시 보내도 행을 추가하지 않고, 변화로 다시 세지 않는다.
- 미연결 정보만으로 미완료 단계를 완료로 두지 않는다. 저장의 GPT 호출은 0회다.

#227의 문장 “상품은 구상, 공급 계약과 가격은 없다”는 질문 id가 없었다. 그 경우 `q1`은 `open`이고 문장은 `unlinkedStatements`다. 연습 접두가 있으면 `provenance`는 `SIMULATION`이고 `epistemicStatus`는 `FOUNDER_CLAIM`이다. 창업자가 같은 문장을 질문 id와 함께 보내면 그 질문의 답으로 남고, 사실로 올라가지 않는다. 재분석은 단계가 끝나거나, 이미 있는 `allowPartial`처럼 창업자가 중간 분석을 명시할 때만 1회 호출된다.

## 7. 후속 요청이 보존할 18항목

문자열로 붙인 이전 응답 전체는 이 목록을 대체하지 않는다. 각 항목은 출처 id, 상태, 시각을 가진다.

| # | 항목 | 현재 제품 단계 요청 | 목표 |
| --- | --- | --- | --- |
| 1 | 최초 아이디어 원문 | `originalInput` | 유지. 루트 `inputText`와 같아야 함 |
| 2 | 최초 전체 분석 | `firstAnalysis` 일부 | 문장마다 상태와 구간. 상태 없는 추정은 `ASSUMPTION` |
| 3 | 현재 사업 모델 | `latestAnalysis` | 판단 문장과 사업 모델 문장을 분리 |
| 4 | 고객과 문제 | 분석 필드 | 입력 구간이 없으면 `ASSUMPTION` 또는 `UNKNOWN` |
| 5 | 제품과 가치 | 단계 요청은 비어 있으면 `not_analyzed` 문장 | 구상은 `FOUNDER_CLAIM`. 연습 입력이면 `provenance`는 `SIMULATION` |
| 6 | 시장과 경쟁 | 1차 문장이 그대로 들어갈 수 있음 | 입력에 없는 경쟁 유형은 `ASSUMPTION` |
| 7 | 수익과 지불 | 1차 가설 문장 | 가격 미정은 `UNKNOWN`. 참가비 가설을 확정 수익으로 올리지 않음 |
| 8 | 공급과 파트너 | 1차 협력 문장 | 계약 없음은 이번 답의 구간. 협력 가능성은 `UNKNOWN` |
| 9 | 마케팅과 판매 | `marketingState` | 채널을 말하지 않았으면 `UNKNOWN` |
| 10 | 운영 | 1차 플랫폼 문장 | 입력에 없는 예약 플랫폼은 `ASSUMPTION` |
| 11 | 위험과 가정 | `priorHypotheses`, uncertain | 가정 id를 유지. 답 구간이 없으면 `UNKNOWN` |
| 12 | 이전 판단과 변경 이력 | `priorReadings`, `doNotCopy.priorJudgmentText` | `RETAIN` `MODIFY` `ADD` `DEFER` `RESOLVE`와 근거 id |
| 13 | 해결된 문제 | stage reading `resolvedIssues` | 구간이 있는 답만 `RESOLVE` |
| 14 | 미해결 문제 | `doNotCopy.priorUnresolvedIssues`와 새 `unresolvedIssues` | 미답 질문은 `UNKNOWN`으로 남김 |
| 15 | 이전 질문과 답 | `priorStagePairs`, `answerLinks` | id, 선택, 시각, 출처 |
| 16 | 이번 질문과 답 | `stagePairs` | 이번 단계의 id만. 질문 밖 정보는 여기 넣지 않음 |
| 17 | 출처와 검증 상태 | `answerRecords`의 `provenance`와 `epistemicStatus`. 접두 `answerSource`는 유지 | `SIMULATION` 접두는 `provenance` `SIMULATION`. 구간은 `VERIFIED_FACT`가 아님 |
| 18 | 다음 검증 목표 | 모델이 `selectedCandidateId`로 고름 | 코드는 후보를 바꾸지 않음. 앞의 세 검사가 실패하면 그 질문을 창업자에게 보여 주지 않음 |

예산으로 `priorAnalyses`가 빠져도 1, 15, 16, 17과 현재 판단 이력의 최신 행은 남긴다. 빠진 리뷰 id는 `omittedPriorReviewIds`로 요청에 적는다.

## 8. #227에 이 구조를 대면

| 실패 | 이 구조에서의 위치 |
| --- | --- |
| 입력에 없는 수요·경쟁·지불자 | 구간이 없고 별도 증거도 없으므로 `VERIFIED_FACT` 불가 |
| 추정이 다음 판단의 근거가 됨 | `priorJudgment` 한 줄 전달을 그만두고, 상태 있는 판단 이력으로 전달 |
| 질문과 답의 연결 불완전 | `q1`과 `feedbackId` 없이 `currentAnswer`만 보내던 조립을 제품 경로의 `stagePairs`로 대체 |
| 질문 밖 정보를 구분하지 못함 | 그 문장은 `unlinkedStatements`. `q1`은 `open` |
| 새 답을 판단에 반영하지 못함 | 구상, 공급 계약 없음, 가격 없음은 각각의 span. 반영이 없으면 행은 실패 |
| 유지와 유보의 이유가 없음 | `RETAIN`과 `DEFER`는 근거 id와 이유가 있을 때만 통과 |
| 다음 질문이 반복될 수 있음 | 선택 호출이 없어 아직 관찰되지 않음. 통과 조건은 닫힌 목적과 다른 `verificationPurpose` |

## 9. 범위

23:29 KST 문서는 코드를 바꾸지 않았다. 23:49 KST 보완 이후의 1차 구현은 제품 경로의 저장·요청 조립·검사다. 프롬프트 문장, DB SQL, Founder 세션, Production, #227 실패 증거는 그대로다. 파일 범위는 `SPRINT-2-IMPLEMENTATION-PLAN.md`다. 실행 결과는 `SPRINT-2-CONTINUITY-IMPLEMENTATION.md`다.
