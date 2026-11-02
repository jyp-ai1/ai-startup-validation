# Sprint 2 — 3차 요청 본문과 질의 목적 조사

2026-11-02 13:04 KST. 기준 증거 `3a261197`의 `docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json`. 코드, 프롬프트, 파서는 바꾸지 않았다. GPT 호출은 0회다. Sprint 2 PASS는 선언하지 않는다. Production은 잠금이다.

앞서 적은 `stage_questions_repeated` 제거안은 이번 조사로 철회한다. 3차가 같은 질문을 다시 낸 것은 문장 비교로 지울 문제가 아니다. 답변은 요청 본문에 들어 있었고, GPT는 그 답을 해석에 적고도 같은 질문을 다음 질문으로 다시 냈다.

## 1. 실제 3차 요청 본문

3차 사용자 본문은 JSON이다. 글자 수 12,129. 시스템 문장 글자 수 6,348. 모델 `gpt-4o-mini`. 응답 id `chatcmpl-Efbd9RroEWRZwQtaeBwxSkYw9Vm74`.

| 확인 | 직렬화 본문 | 판정 |
| --- | --- | --- |
| 최초 사업 아이디어 | `originalInput`과 `businessState.statedRecord.originalIdea`가 같다. 186자. 양조장 체험 문장 | 들어 있음 |
| 1차 판단 | `firstAnalysis.priorJudgmentText`, `priorReadings[0]` | 들어 있음. `전통주 체험 프로그램은 관광객의 수요를 충족시킬 수 있는 가능성이 높으며…` |
| 2차 판단 | `latestAnalysis.priorJudgmentText`, `doNotCopy.priorJudgmentText`, `businessState.priorReview.judgment`, `priorReadings[1]`, `priorAnalyses[0]` | 들어 있음. `사업의 방향성이 불확실하여 성공 가능성이 낮아졌다…` |
| 2차 질문 전체 | `stagePairs` 두 질문, `closedQuestions` 2·3번째, `priorQuestionTexts` 2·3번째, `priorReview.reviewedObjectives` 2·3번째 | 들어 있음 |
| 2차 답변 연결 | `stagePairs` `q1` `c1` `설문조사 실시`, `q2` `c1` `비용 분석`. `answerLinks`의 `sourceReviewId`는 둘 다 `5f6d705d-fe2a-468f-97be-da16482abd32` | 질문 문장과 선택 id는 맞음 |
| 1차 답변 | `priorStagePairs`와 `answerLinks` 첫 행. `sourceReviewId` `48d06eaa-ad74-4851-a919-fbd8ecefdc1a`, `q1` `c4` `아직 핵심을 정하지 못했다` | 들어 있음 |
| 미연결 정보 | `unlinkedStatements` 한 건. `SIMULATION. 양조장 한 곳에 문의했지만 아직 참여 의향은 확인하지 못했다.` | 들어 있음 |
| 답변한 질문과 미해결의 구분 | `closedQuestions` 세 건 모두 `askAgain: false`. `priorReview.resolved`는 `[]`. `priorReview.unresolved`는 `사업의 방향성이 불확실하다.` 한 문장 | 질문은 닫힘으로 표시. 영역 상태는 아래처럼 그와 충돌 |
| 이번 회차의 재판단 목적 | 시스템 문장에 `이 호출은 한 단계의 통합 재분석이다`가 있다. `이전 사업성 판단을 초기화하지 말고`와 `현재 시점의 사업성을 다시 판단하라`는 없다 | 일부만 있음 |

답변이 요청에서 빠진 것은 아니다. 1번 가능성, 즉 현재 답의 미전달은 이 본문에서 기각한다.

같은 본문 안의 충돌은 세 가지다.

1. `questionId` `q1`이 두 질문을 가리킨다. `closedQuestions`에서 `q1`은 양조장 미팅 질문이고, 다시 `q1`은 고객층 조사 질문이다. `sourceReviewId`와 질문 문장으로는 구분된다. id만 보면 한 질문이다.
2. `currentAnswerStatements`는 선택 라벨과 supplement가 같아서 같은 문장을 두 번 넣는다. `설문조사 실시` index 0과 1, `비용 분석` index 0과 1이다.
3. `latestAnalysis.customer`는 `전통주를 좋아하는 내국인 및 외국인 관광객`이다. `problem`과 `market`에도 문장이 있다. 그런데 `businessState.areaStatus` 10개 영역은 모두 `not_analyzed`다. `revisionTask.nextQuestion`은 `미확인 영역은 areaStatus에서 고른다`라고 적는다.

`consultingPath`는 1건뿐이다. 1차 질문과 `아직 핵심을 정하지 못했다`다. 2차의 두 답은 경로 단계가 아니라 이번 `stagePairs`에 있다.

## 2. 시스템 프롬프트와 질의 목적

3차 시스템 문장은 `stageReanalysisSystemPrompt()`다. `apps/web/features/business-validation-journey/lib/ai-pm-review.ts` 2064–2082행. 2차와 3차의 시스템 문장 길이는 같다.

| 목적 | 실제 문장 | 판정 |
| --- | --- | --- |
| 최초 아이디어를 기준으로 판단을 계속한다 | `최초 사업 아이디어와 모든 이전 검토 및 파운더 답변을 종합해 이해한다` | 있음 |
| 이전 판단과 답변으로 현재 사업성을 재검토한다 | `통합 재분석`, `파운더의 답변을 단순 요약하지 말고 사업 모델에 미치는 영향을 판단한다` | 있음. `초기화하지 말고`라는 문장은 없음 |
| 이미 답한 질문은 반복하지 않는다 | `이전에 답변된 질문을 단순히 반복하지 않는다`, `방금 답한 질문을 반복하지 않는다`, `이전 질문이나 답과 같은 목적은 실패다` | 있음 |
| 답변이 부족해 다시 물으면 그 이유를 설명한다 | `재질문` 0회, `해결되지 않은 이유` 0회 | 없음 |
| 해결된 항목과 미해결 항목을 구분한다 | `이미 해결된 영역은 근거와 함께 해결 상태로 남긴다`, `근거가 없으면 미해결로 남긴다` | 문장은 있음. 본문의 `resolved`는 빈 배열이고 `areaStatus`는 전부 `not_analyzed` |
| 이번 회차의 새 판단과 추가 질문을 낸다 | `updatedJudgment`, `nextQuestions`를 요구 | 있음 |

프롬프트는 서로 다른 지시를 같이 준다.

- `기존 판단을 유지하거나 바꿀 수 있으며 그 이유를 사업 맥락에서 적는다.`
- `updatedJudgment는 priorJudgmentText를 출력하지 않는 현재 판단이다.`
- `updatedJudgment가 priorJudgmentText와 같거나 그 문장을 포함하면 재평가가 아니다.`
- `revisionTask.updatedJudgment`도 `그 문장을 유지라고 다시 적는 것은 재평가가 아니다`라고 적는다.

판단 유지를 허용하는 문장과, 같은 문장이면 재평가가 아니라고 하는 문장이 한 요청에 있다. 3차 모델은 2차 판단 문장을 그대로 `updatedJudgment`에 넣었다.

## 3. 질문 반복의 원인

2차 응답의 다음 질문과 3차 응답의 다음 질문은 두 문장 모두 같다. 선택지도 같다. `설문조사 실시`, `관광객 인터뷰 진행`, `경쟁사 분석`과 `비용 분석`, `시장 가격 조사`, `고객 피드백 수집`이다.

| 가설 | 근거 | 판정 |
| --- | --- | --- |
| 답변이 전달되지 않음 | `stagePairs`와 `answerLinks`에 질문 문장, `c1`, 라벨, 2차 `sourceReviewId`가 있다 | 기각 |
| 답변 연결 id가 질문 문장과 어긋남 | 2차 두 답의 `sourceReviewId`는 `5f6d705d-fe2a-468f-97be-da16482abd32`다. 질문 문장도 그 질문과 같다 | 문장 연결은 맞음. `q1` id는 1차 질문과 겹침 |
| 답변은 전달됐지만 요청이 그 답을 끝난 질문으로 읽기 어렵게 구성됨 | `areaStatus`가 고객 영역을 `not_analyzed`로 두고, 지시가 그 상태에서 다음 질문을 고르라고 한다. `objectiveCandidates`의 `overlapsReviewedObjective`를 모델이 `false`로 두고, 후보는 방금 답한 질문 문장이다 | 성립 |
| 답이 얇아 다시 물은 것 | 답은 메뉴 라벨 `설문조사 실시`, `비용 분석`뿐이다. 다시 물을 여지는 있다 | 출력은 그 이유를 설명하지 않음 |

3차 `answerInterpretation`은 두 답을 읽었다. `q1` `c1`의 meaning은 설문조사를 실시하겠다는 결정이라고 적고, `q2` `c1`은 비용 분석이라고 적는다. 그 다음 `selectedCandidateId`는 `1`이고, 그 후보의 objective는 방금 답한 고객층 질문 전문이다. `verificationPurpose`는 `고객층 정의가 불확실하다`와 `가격 설정이 불확실하다`다. 기존 답으로 왜 판단할 수 없는지는 없다.

그래서 원인은 2번과 3번의 겹침이다. 답변은 본문에 있었다. 영역 상태와 질문 id와 판단 유지 지시가 그 답을 끝난 확인으로 두지 않았다. 모델은 답을 해석한 뒤 같은 질문과 같은 선택지를 다시 냈고, 재질문 이유는 쓰지 않았다.

## 4. 1차부터 3차까지의 연속

| 회차 | 아이디어 | 이전 판단 | 질문과 답 | 미연결 |
| --- | --- | --- | --- | --- |
| 1차 | 사용자 본문에 양조장 체험 문장 | 이전 판단 없음. 최초 분석 | 질문 생성 | 없음 |
| 2차 | `originalInput` 186자 | 1차 판단이 `firstAnalysis`와 `doNotCopy`에 있음 | `stagePairs` `q1` `c4` `아직 핵심을 정하지 못했다`. `sourceReviewId`는 1차 `48d06eaa-ad74-4851-a919-fbd8ecefdc1a` | 미연결 1건 |
| 3차 | 같은 문장 | 1차 판단과 2차 판단이 각각 있음 | 1차 답은 `priorStagePairs`. 2차 두 답은 `stagePairs`와 `answerLinks` | 같은 미연결 1건 |

아이디어, 두 판단, 세 질문, 세 답, 미연결 문장은 3차 본문에서 빠지지 않았다. 회차마다 새 아이디어로 시작한 요청은 아니다.

다만 매 회차의 목적이 누적 재판단만으로 고정되어 있지는 않다. 같은 프롬프트가 답을 반영하라고 하면서, 같은 판단 문장은 재평가가 아니라고 하고, 영역은 아직 분석되지 않았다고 하고, 부족한 답의 재질문 이유는 요구하지 않는다.

## 5. 파서 방향

`stage_questions_repeated`는 이번 3차에서 이유 없는 질문 반복을 잡았고, 그 결과는 `sections` null과 4차 차단으로 이어졌다. 그 검사를 먼저 제거하지 않는다.

`stage_judgment_copied`는 2차 판단 문장과 3차 `updatedJudgment`가 같아서 같이 실패했다. 같은 판단을 유지한 것 자체는 구조 실패가 아니다. 이 코드만 행 실패에서 빼는 안은 유지할 수 있다. 이번 조사에서는 적용하지 않는다.

이유 있는 재질문과 이유 없는 반복을 파서가 구분하려면, 응답에 기존 답변을 가리키는 이유가 있어야 한다. 그 칸은 지금 없다. 칸을 만들기 전에 반복 검사를 없애면, 이번처럼 같은 선택지를 다시 낸 응답이 다음 부모로 통과한다.

구조 검사는 유지한다. JSON, 필수 칸, 공백, 공급·마케팅 상태 문장, 선택지 배열, 질문 0개, `choiceId` 불일치, 답 문장을 사실로 올린 경우다.

## 6. 최소 수정안

적용하지 않는다. 승인 뒤에만 순서를 지킨다.

1. `mechanicalAreaStatus`가 고객, 문제, 시장처럼 이미 문장이 있는 칸을 `not_analyzed`로 두지 않게 한다. 다음 질문을 `areaStatus`에서 고르라는 지시가 방금 답한 영역을 미분석으로 되돌리지 않게 한다.
2. 선택 라벨과 supplement가 같으면 `currentAnswerStatements`에 한 번만 넣는다.
3. 라운드마다 `q1`을 다시 쓰지 않거나, 닫힌 질문의 id를 질문 문장과 1:1로 둔다. 지금 `closedQuestions`의 `q1`은 두 개다.
4. 시스템 문장에 두 목적을 추가한다. 이전 판단을 지우고 처음부터 판단하지 말 것. 이미 답한 질문을 다시 물 때는 그 답으로 확인되지 않은 이유를 쓸 것. 이유가 없으면 그 질문과 그 선택지를 다시 내지 말 것. 판단 문장을 유지하는 것 자체를 실패라고 적힌 문장과 맞출지는 그 변경 안에서 본다.
5. 파서의 `stage_questions_repeated`는 4번 이후에도 이유 없는 반복에만 실패로 둔다. `stage_judgment_copied`는 행 실패에서 뺀다.

예상 파일은 `apps/web/features/business-validation-journey/lib/ai-pm-review.ts`와 `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts`다. 새 테스트는 저장된 3차 본문을 읽어 아이디어, 두 판단, `stagePairs`, `answerLinks`, `q1` 중복, `areaStatus`를 고정한다. 네트워크는 쓰지 않는다.

예상 GPT 호출은 0회다. 금액은 0이다. `packages/ai/src/token/manager.ts`의 `gpt-4o-mini` 요율은 입력 $0.15 / 1M, 출력 $0.60 / 1M이고 청구서가 아니다. 4차를 다시 보내는 호출은 이 조사에 없다.
