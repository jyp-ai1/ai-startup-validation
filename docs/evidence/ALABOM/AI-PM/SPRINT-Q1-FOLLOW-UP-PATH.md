# Sprint Q1 follow-up path

1차 분석과 Founder 답변이 2차 요청에 들어가는 경로를 코드와 기존 실행 기록으로 추적한 기록이다. 이번 턴에 모델 호출은 없다. 프롬프트는 바꾸지 않았다. 증분 반영은 FAIL이다. 1차 검증 단계가 아니다. 기본값은 `quality-2`다. Production 잠금은 유지했다. 제품 2차 리뷰 경로는 호출하지 않았다.

## 판정

| 항목 | 상태 |
|---|---|
| 구조 계약 | FAIL. 화면은 2차 요청을 만들지 않는다. 저장 파서는 증분 반환을 섹션으로 받지 않는다 |
| 회귀 | PASS. 2026-10-30 00:40 KST. 기존 45건과 경로 추적 2건, 합계 47 passed. 모델 호출 없음 |
| 모델 반환 품질 | FAIL. 마지막 격리 run `q1-incremental-reflection-question-2026-10-29` 자동 검증 13건. 이번 턴에 새 호출 없음 |
| 데이터 저장 및 복원 | FAIL. 제품 함수는 증분 반환의 `sections`를 null로 저장한다. 브라우저 재조회는 NOT RUN |
| 실제 브라우저 | NOT RUN. Preview `GET /workspace` HTTP 401은 2026-10-29 18:07 KST 기록 그대로다 |

## 데이터 흐름

두 경로가 있다. 최근 격리 run은 제품 화면 경로가 아니다.

### 제품 화면

1. `POST /api/ai-pm-review`가 `runFirstReview`로 1차 요청을 만들고, 성공하면 `sections`와 `rawContent`를 저장한다. 식별자는 `reviewId`, `projectId`, `inputSha`다. `conversationId`라는 필드는 없다.
2. 화면 `saveChoice`는 `POST /api/ai-pm-review/feedback`만 호출한다. `saveReviewFeedback`은 `modelCalls: 0`이다. 화면 문장은 `답을 저장했습니다. 모델 호출은 없습니다.`다.
3. `ai-pm-review-panel.tsx`에는 `/api/ai-pm-review/follow-up`이 없다. 선택 저장 본문에는 `choiceId`, `choiceLabel`, `otherText`만 있고 추가 설명 칸은 없다. `other`가 아니면 `otherText`는 빈 문자열이다.
4. `runFollowUpReview`는 부모 `inputText`, `sections`, 마지막 feedback, supplement로 `buildFollowUpRequest`를 만든다. `answerOrigin`은 `founder-input`이다. 이 함수는 화면에서 호출되지 않는다.
5. 로그인한 재조회는 `GET /api/ai-pm-review`가 같은 `projectId`의 review와 feedback을 돌려준다. 로그인하지 않은 선택은 `sessionStorage`다. 2차 분석은 만들어지지 않으므로 복원할 2차 결과가 없다.

### 격리 harness

`apps/web/scripts/preview-quality-compare-once.mjs`는 고정 JSON을 읽어 모델을 직접 호출한다. 제품 라우트를 호출하지 않는다. 기록의 `productFollowUpInvoked`는 false다.

마지막 기록 `sprint-q1-incremental-reflection-question-recorded.json`:

| 단계 | 증거 |
|---|---|
| 사업 설명 | user JSON `originalInput` 길이가 20자를 넘음 |
| 1차 분석 | `previousAnalysis.judgment`가 비어 있지 않음. `previousQuestion`은 `previousAnalysis.nextQuestion`과 같음 |
| Founder 답변 | `founderChoice.label`은 `체험 프로그램을 먼저 검증할 것`. `founderSupplement`에 `확정된 양조장`이 있음. `answerOrigin`은 `synthetic-test-data` |
| 모델 반환 | 가설은 `미확인`. 질문은 `양조장 후보가 있는가?`. 검증 문장은 요구 문장과 같음. 수익 가설은 저장 문장과 같음 |
| 후처리 | harness는 원문을 그대로 저장한다. 필드를 지우는 후처리는 없다 |
| 검증 | `followUpOutputContractErrors` 13건. 가설·검증·질문의 `choice`, `supplement`, `choiceTrace.label`이 null |
| 제품 저장 | `parseSections(raw)`는 null. `finishCall`은 계약 오류가 있으면 `sections`를 null로 두고 `rawContent`만 남긴다 |

주입 채팅 테스트 `keeps the parent analysis when a reflection return cannot be stored as sections`가 같은 원문을 `runFollowUpReview`에 넣었다. 2차 요청의 `originalInput`, `previousAnalysis.judgment`, `founderChoice.label`, `founderSupplement`는 부모와 선택에서 왔다. 저장된 자식의 `sections`는 null, `status`는 `failed`, `rawContent`는 원문과 같다. 부모의 판단과 질문은 그대로다.

## 원인

| 코드 | 판별 | 근거 |
|---|---|---|
| A | 제품 화면은 해당 | 2차 요청 자체가 나가지 않는다. 화면은 feedback 저장에서 멈춘다 |
| A | 격리 run은 아님 | 마지막 user JSON에 1차 분석, 선택, 추가 설명이 있다 |
| B | 격리 run은 해당 | 요청에 답이 있는데 세 원소의 선택과 추가 설명과 label이 null이다 |
| C | 제품 저장은 해당 | 증분 JSON은 `parseSections`를 통과하지 못해 `sections`가 null이 된다. harness는 원문을 덮어쓰지 않는다 |
| D | 아님 | 부모 `reviewId`와 feedback은 같은 검토에 붙는다. 다른 사업으로 바뀐 증거는 없다 |
| E | 해당 | 증분 계약은 `customer`, `problem`, `nextQuestionReason`, `answerHint` 없이 `changes`만 요구한다. 저장 파서는 그 필드를 요구한다. 검증기는 모델이 선택과 추가 설명을 원소마다 다시 쓰기를 요구한다. 코드는 그 원문을 이미 요청에 갖고 있다 |

원인 A와 C는 제품 경로의 코드에서 확인했다. 원인 B와 E는 마지막 격리 원문과 검증기에서 확인했다. 새 모델 호출로 확인한 항목은 없다.

## 연속성 상태

기존 이름과 대응한다. 새 식별자를 만들지 않았다.

| 지시 이름 | 현재 코드 |
|---|---|
| `conversationId` | `reviewId`. 자식은 `parentReviewId` |
| `originalBusinessInput` | `StoredReview.inputText`. 2차 요청의 `originalInput` |
| `currentAssessment` | `StoredReview.sections`. 증분 반환은 여기 들어가지 않음 |
| `feedbackHistory` | `StoredFeedback[]`. 선택, 마크, `submittedAt` |
| `changeHistory` | 모델 JSON의 `changes`. 저장 섹션과는 별도이고, 계약 실패 시 섹션에 복사되지 않음 |
| `nextQuestion` | `sections.nextQuestion` |

불변 조건 1은 선택 저장에서 성립한다. 조건 2는 `runFollowUpReview`가 호출될 때 성립하고, 화면에서는 호출되지 않는다. 조건 4는 증분 반환에서 깨진다. `sections`가 null이라 저장된 분석과 모델 원문이 같지 않다. 조건 6은 요청의 `answerOrigin`과 분리 규칙에 있다. 화면 재로그인의 브라우저 확인은 NOT RUN이다.

## 시나리오

| 시나리오 | 상태 | 근거 |
|---|---|---|
| A 동일 대화의 증분 반영 | FAIL | 화면은 2차를 보내지 않음. 격리 요청에는 이전 분석과 답이 있으나 반환 품질은 13건 오류 |
| B 기존 상태 보존 | NOT RUN | 계정 재조회 코드는 있다. 브라우저에서 새로고침·재로그인을 실행하지 않음 |
| C 근거 없는 추론 방지 | FAIL | 질문 run은 가설을 `미확인`으로 뒀다. 그 전 link run은 수요 문장을 넣었다. 자동 검증 0건이 아니다 |
| D 추가 설명 없음 | NOT RUN | 화면 선택은 `otherText`가 빈 값일 수 있다. 그 상태로 2차 요청을 보내는 실행은 없다 |

## 토큰

증거 JSON 39호출의 합이다. 보고된 47요청, 53,778토큰과 같은 집합이 아니다. 가격표가 저장소에 없어 원화·달러 비용은 NOT RUN이다.

| 구분 | prompt | completion | total | 호출 |
|---|---:|---:|---:|---:|
| 증거 파일 합 | 50,375 | 23,455 | 73,830 | 39 |

마지막 질문 run은 prompt 2,972, completion 1,167, total 4,139. 모델 `gpt-4o-mini-2024-07-18`.

## 하지 않은 것

| 항목 | 상태 |
|---|---|
| 이번 턴의 모델 호출 | 없음 |
| 프롬프트 수정 | 없음 |
| Production | 잠금 유지 |
| 제품 2차 리뷰 | 호출하지 않음 |
| 검증 규칙 완화 | 없음 |
| 브라우저 | NOT RUN |

## 남은 결함

화면이 저장된 부모 분석과 선택을 `runFollowUpReview`로 넘기지 않는다. 넘기더라도 현재 증분 JSON은 `parseSections`를 통과하지 못해 최신 검토로 저장되지 않는다. 검증기는 모델이 선택과 추가 설명을 원소마다 다시 쓰게 한다. 다음 수정은 그 세 지점 중 저장 경로를 코드에서 맞추는 일이다. 그 전에 모델을 다시 호출하지 않는다.

코드 SHA는 이 문서의 커밋과 함께 기록한다. 직전 모델 SHA는 `42d087ccd0c5e06638ee9a6b8cf6d4baa0a4a264`다.
