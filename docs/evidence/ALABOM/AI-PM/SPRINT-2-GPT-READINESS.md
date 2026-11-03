# Sprint 2 실제 GPT 3차 준비 자료

**시각:** 2026-11-03 12:10 KST

**판정:** Sprint 2 PARTIAL. 이 문서는 PR #241 요청을 제품 함수로 다시 만든 자료다. 실제 GPT 호출은 0회다.

**생성 경로:** 증거 파일의 1차·2차 원문을 `parseSections`와 `judgeStageContract`로 복원하고, 임시 sqlite에서 `submitConsultingStage`를 호출했다. `chat`은 `not-json`을 반환했다. provider 호출은 없다. 저장소는 `openAiPmReviewStore`다. `durable` false, `productionDatabase` false. 확인 뒤 그 sqlite는 삭제했다. Supabase에는 쓰지 않았다.

부모는 `5f6d705d-fe2a-468f-97be-da16482abd32`다. 이번 답은 저장된 선택이다.

| questionId | choiceId | choiceLabel |
| --- | --- | --- |
| q1 | c1 | 설문조사 실시 |
| q2 | c1 | 비용 분석 |

## 1. objectiveContinuity

```json
{
  "order": "이번 답이 미해결 objective를 닫았는지 먼저 본다. 닫지 못했거나 일부만 닫았으면 unresolved의 remainingTask를 그 objectiveId로 잇는다. 열린 remainder가 있으면 __new__보다 먼저 잇는다. __new__는 그 remainingTask도 아니고 resolved.originalPurpose도 아닌 새 검증 과제에만 쓴다. 해결된 목적을 표현만 바꿔 __new__로 만들지 않는다.",
  "resolved": [
    {
      "objectiveId": "5f6d705d-fe2a-468f-97be-da16482abd32:q1",
      "questionKey": "5f6d705d-fe2a-468f-97be-da16482abd32:q1",
      "originalPurpose": "전통주 체험 프로그램의 고객층을 명확히 정의하기 위해 어떤 조사를 해야 할까?",
      "resolutionGrounds": "방법으로 선택함: 설문조사 실시"
    },
    {
      "objectiveId": "5f6d705d-fe2a-468f-97be-da16482abd32:q2",
      "questionKey": "5f6d705d-fe2a-468f-97be-da16482abd32:q2",
      "originalPurpose": "체험 프로그램의 구체적인 내용 및 가격을 설정하기 위해 어떤 요소를 고려해야 할까?",
      "resolutionGrounds": "방법으로 선택함: 비용 분석"
    }
  ],
  "unresolved": [
    {
      "objectiveId": "48d06eaa-ad74-4851-a919-fbd8ecefdc1a:q1",
      "originalPurpose": "양조장과의 협업을 위한 초기 미팅에서 어떤 사항을 논의해야 할까?",
      "remainingTask": "Founder가 아직 확인하지 못했다고 적었다. 없는 결과를 있는 것처럼 두지 않는다.",
      "parentObjectiveId": null,
      "relation": "still_open"
    },
    {
      "objectiveId": "5f6d705d-fe2a-468f-97be-da16482abd32:q1:remainder",
      "originalPurpose": "전통주 체험 프로그램의 고객층을 명확히 정의하기 위해 어떤 조사를 해야 할까?",
      "remainingTask": "실행 대상, 실행 여부, 응답 결과는 이 답에 없다.",
      "parentObjectiveId": "5f6d705d-fe2a-468f-97be-da16482abd32:q1",
      "relation": "remainder_of_partial_answer"
    },
    {
      "objectiveId": "5f6d705d-fe2a-468f-97be-da16482abd32:q2:remainder",
      "originalPurpose": "체험 프로그램의 구체적인 내용 및 가격을 설정하기 위해 어떤 요소를 고려해야 할까?",
      "remainingTask": "실행 대상, 실행 여부, 응답 결과는 이 답에 없다.",
      "parentObjectiveId": "5f6d705d-fe2a-468f-97be-da16482abd32:q2",
      "relation": "remainder_of_partial_answer"
    }
  ],
  "thisRoundAnswers": [
    {
      "questionKey": "5f6d705d-fe2a-468f-97be-da16482abd32:q1",
      "answerText": "설문조사 실시",
      "provenance": "FOUNDER_INPUT",
      "epistemicStatus": "FOUNDER_CLAIM",
      "newlyConfirmed": "방법으로 선택함: 설문조사 실시",
      "stillUnconfirmed": "실행 대상, 실행 여부, 응답 결과는 이 답에 없다.",
      "closedObjectiveId": "5f6d705d-fe2a-468f-97be-da16482abd32:q1",
      "openedRemainderId": "5f6d705d-fe2a-468f-97be-da16482abd32:q1:remainder"
    },
    {
      "questionKey": "5f6d705d-fe2a-468f-97be-da16482abd32:q2",
      "answerText": "비용 분석",
      "provenance": "FOUNDER_INPUT",
      "epistemicStatus": "FOUNDER_CLAIM",
      "newlyConfirmed": "방법으로 선택함: 비용 분석",
      "stillUnconfirmed": "실행 대상, 실행 여부, 응답 결과는 이 답에 없다.",
      "closedObjectiveId": "5f6d705d-fe2a-468f-97be-da16482abd32:q2",
      "openedRemainderId": "5f6d705d-fe2a-468f-97be-da16482abd32:q2:remainder"
    }
  ]
}
```

요청 enum은 미해결 id 세 개와 `__new__`다. 해결된 `…:q1`, `…:q2`는 enum에 없다.

`answerLevel`은 두 답 모두 `menu_choice`다. 확인된 내용은 `방법으로 선택함`과 선택 원문이다. 두 remainder의 `remainingTask`는 같은 문장이다. `실행 대상, 실행 여부, 응답 결과는 이 답에 없다.` 코드는 설문이나 비용 항목을 따로 적지 않는다. `epistemicStatus`는 `FOUNDER_CLAIM`이고 `verified`는 false다.

## 2. judgmentReason 검증

이번 단계의 답마다 `judgmentReason`의 공백을 뺀 문장이 `answerText`를 포함해야 한다. 하나라도 없으면 `stage_judgment_ungrounded`다. `설문조사와 비용 분석`은 `설문조사 실시`를 포함하지 않는다.

`answerEvidence`는 각 답의 `questionKey`, 그 `answerText`, `FOUNDER_INPUT`, `FOUNDER_CLAIM`과 같아야 한다. 원문, questionKey, provenance가 다르거나 epistemic 값이 `VERIFIED_FACT`면 `stage_answer_evidence_mismatch`다.

`verifiedFacts`에 선택 원문을 넣으면 `stage_claim_promoted`다. `verifiedFacts`가 비어 있는데 `updatedJudgment`, `judgmentReason`, `meaning`, `judgmentEffect` 중 하나가 성공 가능성이 높아졌다고 하면 `stage_claim_as_positive`다. 답 원문을 인용해도 그 상향 문장은 거절된다.

판단 문장을 유지하는 것은 가능하다. 그 경우에도 두 원문, 방법 이름만 확인됐다는 점, 남은 과제, 상향하지 않은 이유가 있어야 한다.

## 3. 저장될 데이터와 경로

성공한 3차는 부모를 수정하지 않는다. 새 행이 생긴다.

| 필드 | 값 |
| --- | --- |
| parentReviewId | `5f6d705d-fe2a-468f-97be-da16482abd32` |
| status | succeeded일 때만 다음 단계로 쓴다 |
| sections | 판단, 다음 질문 |
| stageAnswers | q1 `설문조사 실시`, q2 `비용 분석` |
| stageReading | `judgmentReason`, `answerEvidence`가 들어간 읽기 |
| evidence | `live_network` |
| callCount | 1 |

실패하면 같은 부모 아래 failed 행이 생기고 sections는 null이다. 같은 답으로 다시 호출하지 않는다. 부모 status는 succeeded로 남는다.

두 저장 경로는 다르다.

| 경로 | 저장소 | 이번 준비에서의 사용 |
| --- | --- | --- |
| 직전 실제 GPT | `openAiPmReviewStore` 임시 sqlite. `productionDatabase` false. 재조회 뒤 파일 삭제 | 1·2차 원문이 여기에만 있었다. Supabase에는 그 행이 없다 |
| 제품 HTTP `POST /api/ai-pm-review/follow-up` | `openReviewBackend`. 이 환경은 Supabase admin이 설정되어 있어 `kind: supabase`, `durable: true`, `productionDatabase: true` | 이번 준비에서 호출하지 않았다 |

`e2e-live-user`는 uuid가 아니라 Supabase `auth.users` 외래키에 넣을 수 없다. Founder 사용자 `37d541c8-fda7-4788-8ac2-1a449b00425c`와 Founder 프로젝트 `3a5fc4a0-2e90-45e6-8370-350beda67342`에는 쓰지 않는다. Supabase에 쓰려면 격리 사용자와 격리 프로젝트에 복사본을 넣는 별도 절차다. 그 복사는 이번 자료에 포함되지 않았다.

## 4. 호출 횟수, 비용, 중단

| 항목 | 값 |
| --- | --- |
| 이번 준비의 GPT 호출 | 0 |
| 승인 후 3차 | 1회, 재시도 0 |
| 4차 | 이번 승인 범위가 아니다. 3차 succeeded 저장 전에 하지 않는다 |
| 3차 실패 | 4차 없음. 실패 행은 succeeded로 바꾸지 않는다 |
| 추가 호출 | 없다 |

직전 3차는 입력 23,567, 출력 1,645, 합계 25,212 토큰이었다. 공개된 `gpt-4o-mini` 단가 입력 100만 토큰당 0.15달러, 출력 100만 토큰당 0.60달러로 한 호출은 약 0.005달러다. 청구서가 아니다.

## 5. 무결성

`docs/evidence/ALABOM/AI-PM/sprint-2-e2e-live-gpt.json` SHA-256은 `6c21acd7fde676712f879ec4737f620e5c2e9c7f4905b0fafc4d5d52d4244bbd`다.

보존 행은 `48d06eaa-ad74-4851-a919-fbd8ecefdc1a`, `5f6d705d-fe2a-468f-97be-da16482abd32`, `0e75ff46-88fd-4ce2-b567-bdc3f3048531`, `9d51935d-891e-424c-b3f1-9b1c5e529c2f`, `8ec32bae-461b-449a-99b7-db95a92fb2c0`, `a4e3455e-1043-403b-acd5-500c1c81bed4`다.

Production 배포는 하지 않았다. Sprint 3는 시작하지 않았다.
