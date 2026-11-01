# Sprint 2 Quality Fix 1

2026-11-01 13:16 KST. PR #226. 실행 커밋은 `b39f505b`다. 컨텍스트 구조 `b412926b`는 유지했다. `quality-2`와 호출 1회 규칙은 유지했다.

Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않았다. Production 배포는 하지 않았다. Founder 프로젝트 행은 읽거나 쓰지 않았다. 2차·3차 후속은 호출하지 않았다.

원본: `docs/evidence/ALABOM/AI-PM/sprint-2-quality-fix-1.json`

실패 기준 원본 `a05298c6-db8b-4c84-9671-e38c02236468`는 `docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-continuity.json`에 그대로 있다. 이번 파일과 섞지 않는다. 그 파일의 응답 모델은 실 GPT다. SIMULATION이 아니다.

## 1. 실패 원인

기준 응답은 `a05298c6`다. 오류는 `stage_fields_missing,stage_questions_missing,stage_choices_missing`이었다.

| 원인 질문 | 확인 |
| --- | --- |
| 모델이 supply, marketing을 비웠는가 | 그렇다. 원문 값이 `""`다. |
| 프롬프트가 요구하지 않았는가 | 그때 프롬프트는 빈 문자열로 두지 말라고 적혀 있었다. 부모 Payload의 product, supply, marketing은 빈 문자열이었다. 모델이 그 빈 값을 복사했다. |
| 스키마가 막지 못했는가 | 키는 required다. 타입은 string이다. OpenAI strict json_schema는 빈 문자열을 허용한다. minLength는 strict 스키마에 넣지 않았다. 요청이 거절될 수 있기 때문이다. |
| 파서가 잘못 읽었는가 | 아니다. `textField`가 공백을 거절하고 `readStageBusinessProfile`이 null을 반환했다. 질문이 있어도 reading이 null이면 질문 없음과 선택 없음이 함께 붙었다. |

같은 응답의 품질 실패는 따로다.

- `meaning`과 `updatedJudgment`가 확인되지 않은 협력 가능성으로 성공 가능성을 높였다. `verifiedFacts`는 빈 배열이었다.
- `updatedJudgment`에서 수요·협력 리스크 문장이 빠졌다. 프롬프트는 `priorJudgmentText를 이어 쓰지 않는다`였다.
- `resolvedIssues`는 빈 배열이고, `unresolvedIssues`는 최초 가설 3개를 복사했다.
- 다음 질문은 `양조장과의 협력 관계를 어떻게 구체적으로 구축할 것인가?`였다.

## 2. 수정

| 커밋 | 내용 |
| --- | --- |
| `b39f505b` | 단계 프롬프트와 스키마 설명. 빈 프로필 때문에 질문 오류가 따라붙지 않게 한 판정. `구체적으로`만 더한 질문의 반복 판정. Preview 훅 1회. |
| 이 문서의 커밋 | 실응답에서 어순이 바뀐 같은 질문을 반복으로 판정. 추가 GPT 호출은 없다. |

파일: `apps/web/features/business-validation-journey/lib/ai-pm-review.ts`, `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-consulting-stage.test.ts`, `apps/web/features/business-validation-journey/lib/__tests__/ai-pm-real-gpt-quality-fix.live.test.ts`, `apps/web/scripts/run-web-build.sh`.

코드는 supply와 marketing을 채우지 않는다. 코드는 긍정 판단이나 다음 질문 문장을 만들지 않는다.

## 3. 프롬프트 비교

이전 4번 문장:

> priorJudgmentText를 이어 쓰지 않는다.

바꾼 4번 문장:

> priorReadings의 priorJudgmentText에서 핵심 판단과 아직 유효한 위험을 남긴다. 이번 답이 그 위험을 해소하지 않으면 위험을 빼지 않는다.

이전 공급 설명:

> 공급. 입력과 답에 없으면 없다고 적는다.

바꾼 공급 설명:

> 공급. 빈 문자열은 실패다. 입력과 답에 없으면 아직 확인되지 않았다라고 적는다. 부모의 빈 문자열을 복사하지 않는다.

추가된 원칙:

> Founder의 가능성 판단, 선호, 기대는 unverifiedClaims로 남긴다. 접촉, 협력 의사, 합의, 공급 조건이 없으면 그 기대를 사업 성과나 성공 가능성의 근거로 쓰지 않는다.
> 답이 기대나 선호뿐이면 후보가 있는지, 접촉했는지, 상대의 의사가 확인됐는지, 조건이 무엇인지를 묻는다.
> unresolvedIssues는 이전 목록을 그대로 복사하지 않고 이번 답으로 확인된 것과 아직 없는 것을 다시 적는다.

`quality-2` 최초 분석 프롬프트는 바꾸지 않았다. 이번 호출의 시스템 프롬프트에 `성공 가능성을 높이지 않는다`와 `빈 문자열이면 실패다`가 있다. `priorJudgmentText를 이어 쓰지 않는다`는 없다.

## 4. 실행

최초 분석은 저장된 원문 `chatcmpl-EfEyBVVnnFOSMCoCUpQQIs0HlKOde`를 재생했다. 실호출 0회다. 재생 검토는 `00ee9930-7484-4521-b1d0-135a40602300`다.

후속 실호출은 1회다. 시작 2026-11-01 13:16:18 KST. 종료 2026-11-01 13:16:26 KST. 수리 호출은 없다. 답은 `synthetic-test-data`다.

> 양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.

| 항목 | 값 |
| --- | --- |
| 실행 ID | `chatcmpl-EfHHQjCqIw3F1DYY0yim1WJybyQao` |
| 요청 모델 | gpt-4o-mini |
| 응답 모델 | gpt-4o-mini-2024-07-18 |
| 호출 | 1 |
| 입력 토큰 | 8,763 |
| 출력 토큰 | 902 |
| 합계 | 9,665 |
| usageKnown | true |
| 온도 | 0.2 |
| maxTokens | 2,400 |
| 검토 | `4e499324-b314-4af8-849e-94d42d3c7ee3` |
| 부모 | `00ee9930-7484-4521-b1d0-135a40602300` |
| 행 상태 | failed |
| 저장된 오류 | `stage_fields_missing` |
| storedCallCount | 1 |
| gitSha | `b39f505b7a7f181ff196a86acdd2929f2a571943` |

요청에는 최초 양조장 원문, `answerLinks` 1개, `priorReadings` 1개, `stagePairs` 1개가 있다. `priorReadings[0].priorJudgmentText`는 수요·협력 리스크가 있는 최초 판단이다.

## 5. 실제 요청 사용자 메시지

```
{"stagePairs":[{"questionId":"q1","question":"양조장과의 협력 관계를 어떻게 구축할 것인가?","offeredChoices":[{"choiceId":"c1","label":"양조장과의 직접 계약 체결"},{"choiceId":"c2","label":"양조장과의 공동 마케팅 전략 수립"},{"choiceId":"c3","label":"양조장과의 체험 프로그램 개발"},{"choiceId":"c4","label":"아직 핵심을 정하지 못했다"},{"choiceId":"other","label":"기타 / 직접 입력"}],"choiceId":null,"choiceLabel":null,"supplement":"양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.","status":"answered"}],"priorStagePairs":[],"stagePartial":false,"answerReading":[{"questionId":"q1","kinds":["claim"]}],"evidenceLedger":{"newFounderInformation":true,"unresolvedStillApplies":false,"verifiedFacts":[],"founderClaims":["양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다."],"unresolved":[],"priorGoals":[],"stillUnknown":[]},"originalInput":"다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.","firstAnalysis":{"summary":"전통주 양조장 체험을 통해 개인별 다양한 경험을 중시하는 관광객을 대상으로 하는 사업으로, 양조장 체험과 온라인 마케팅 지원을 결합한 모델이다. 이 사업은 내국인과 외국인을 모두 포함하며, 관광객의 다양한 경험을 제공하는 것을 목표로 한다.","priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","priorAssumptions":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"priorVerificationText":"양조장과의 초기 협력 가능성을 확인하고, 관광객의 관심도를 조사한다.","priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?","customer":"전통주를 좋아하는 내국인 및 외국인 관광객","problem":"관광객들이 전통주 체험을 통해 개인화된 경험을 찾고 있지만, 적절한 체험 기회가 부족하다.","market":"전통주에 관심이 있는 관광객 시장, 특히 문화 체험을 중시하는 관광객","revenueModel":"체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)","unresolvedIssues":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"product":"","supply":"","marketing":""},"latestAnalysis":{"customer":"전통주를 좋아하는 내국인 및 외국인 관광객","problem":"관광객들이 전통주 체험을 통해 개인화된 경험을 찾고 있지만, 적절한 체험 기회가 부족하다.","market":"전통주에 관심이 있는 관광객 시장, 특히 문화 체험을 중시하는 관광객","revenueModel":"체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)","execution":"양조장과의 제휴를 통해 체험 프로그램을 운영하고, 온라인 마케팅을 통해 고객을 유치한다.","priorRisks":["관광객 수요 변동성","양조장과의 협력 관계 불안정성","경쟁 증가"],"uncertain":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"hypotheses":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"priorJudgmentText":"전통주 양조장 체험을 통해 개인별 다양한 경험을 중시하는 관광객을 대상으로 하는 사업으로, 양조장 체험과 온라인 마케팅 지원을 결합한 모델이다. 이 사업은 내국인과 외국인을 모두 포함하며, 관광객의 다양한 경험을 제공하는 것을 목표로 한다.","priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?","priorReasonText":"양조장과의 협력은 사업의 성공에 중요한 요소이므로, 이를 명확히 할 필요가 있다.","answerHint":"선택하거나 직접 적습니다. 확인된 사실과 계획을 구분합니다.","claimConfirmation":null,"analysis":{"summary":"전통주 양조장 체험을 통해 개인별 다양한 경험을 중시하는 관광객을 대상으로 하는 사업으로, 양조장 체험과 온라인 마케팅 지원을 결합한 모델이다. 이 사업은 내국인과 외국인을 모두 포함하며, 관광객의 다양한 경험을 제공하는 것을 목표로 한다.","value":"양조장에서 직접 전통주를 만들고 마시는 체험을 통해 관광객에게 독특하고 개인화된 경험을 제공한다.","operatingModel":"양조장과의 제휴를 통해 체험 프로그램을 운영하고, 온라인 마케팅을 통해 고객을 유치한다.","payer":"체험에 참여하는 관광객","competition":"기타 전통주 체험 프로그램 및 일반 관광 프로그램","operations":"양조장과의 협력 및 체험 프로그램 운영, 온라인 마케팅 전략 수립","profitability":"체험 참가비와 마케팅 지원을 통한 수익 창출 가능성 (가설)","strengths":["전통주에 대한 관심 증가","개인화된 경험 제공","양조장과의 협력으로 인한 신뢰성"],"priorAssumptions":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"priorEvidenceNotes":["관광객들의 전통주 체험에 대한 피드백","양조장과의 초기 협력 성과","온라인 마케팅의 초기 반응"],"founderFacts":["창업자는 관광 및 마케팅 분야에서 경험이 있다.","전통주에 대한 깊은 이해와 관심이 있다."],"priorInferences":["관광객의 개인화된 경험에 대한 수요가 증가하고 있다.","전통주 체험이 관광객에게 매력적인 요소가 될 것이다."],"priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","priorChoices":[{"id":"c1","label":"양조장과의 직접 계약 체결"},{"id":"c2","label":"양조장과의 공동 마케팅 전략 수립"},{"id":"c3","label":"양조장과의 체험 프로그램 개발"},{"id":"c4","label":"아직 핵심을 정하지 못했다"},{"id":"other","label":"기타 / 직접 입력"}],"alternatives":"기존의 관광 프로그램이나 다른 음주 체험 프로그램이 존재하지만, 전통주에 특화된 체험은 부족하다.","differentiation":"전통주 양조장 체험에 중점을 두고, 고객 맞춤형 경험을 제공하여 차별화한다.","priorVerificationText":"양조장과의 초기 협력 가능성을 확인하고, 관광객의 관심도를 조사한다."}},"priorQuestionTexts":["양조장과의 협력 관계를 어떻게 구축할 것인가?"],"answerLinks":[{"sourceReviewId":"00ee9930-7484-4521-b1d0-135a40602300","questionId":"q1","question":"양조장과의 협력 관계를 어떻게 구축할 것인가?","choiceId":null,"choiceLabel":null,"supplement":"양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.","submittedAt":"2026-11-01T04:17:18.172Z","status":"answered"}],"priorReadings":[{"reviewId":"00ee9930-7484-4521-b1d0-135a40602300","priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","judgmentReason":"","impactOnPreviousJudgment":"","resolvedIssues":[],"unresolvedIssues":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"customer":"전통주를 좋아하는 내국인 및 외국인 관광객","problem":"관광객들이 전통주 체험을 통해 개인화된 경험을 찾고 있지만, 적절한 체험 기회가 부족하다.","revenueModel":"체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)","product":"","supply":"","marketing":"","priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?"}],"doNotCopy":{"priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?"},"consultingPath":[],"priorAnalyses":[]}
```

## 6. 실제 응답 원문

```
{
  "answerInterpretation": [
    {
      "questionId": "q1",
      "choiceId": "",
      "meaning": "양조장과의 협력 가능성이 높다고 판단하며, 체험과 시음이 가능한 양조장을 선호한다는 것은 사업의 성공 가능성을 높일 수 있는 긍정적인 신호이다.",
      "founderBasis": "양조장 협력 가능성이 높다고 판단한다.",
      "observedEvidence": "확인된 접촉이나 합의가 없다.",
      "judgmentEffect": "이 답변은 양조장과의 협력 가능성을 높게 평가하게 하여 이전 판단을 유지하게 한다.",
      "openRisk": "양조장과의 협력 관계가 실제로 어떻게 이루어질지는 여전히 불확실하다."
    }
  ],
  "verifiedFacts": [],
  "unverifiedClaims": [
    "양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다."
  ],
  "assumptions": [],
  "resolvedIssues": [],
  "unresolvedIssues": [
    "관광객들이 전통주 체험에 높은 관심을 가질 것이다.",
    "양조장과의 협력이 원활하게 이루어질 것이다.",
    "온라인 마케팅이 효과적으로 작용할 것이다."
  ],
  "customer": "전통주를 좋아하는 내국인 및 외국인 관광객",
  "problem": "관광객들이 전통주 체험을 통해 개인화된 경험을 찾고 있지만, 적절한 체험 기회가 부족하다.",
  "value": "양조장에서 직접 전통주를 만들고 마시는 체험을 통해 관광객에게 독특하고 개인화된 경험을 제공한다.",
  "product": "전통주 체험 프로그램",
  "market": "전통주에 관심이 있는 관광객 시장, 특히 문화 체험을 중시하는 관광객",
  "revenueModel": "체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)",
  "operations": "양조장과의 협력 및 체험 프로그램 운영, 온라인 마케팅 전략 수립",
  "supply": "",
  "marketing": "",
  "competition": "기타 전통주 체험 프로그램 및 일반 관광 프로그램",
  "executionNote": "양조장과의 제휴를 통해 체험 프로그램을 운영하고, 온라인 마케팅을 통해 고객을 유치한다.",
  "risks": [
    "관광객 수요 변동성",
    "양조장과의 협력 관계 불안정성",
    "경쟁 증가"
  ],
  "impactOnPreviousJudgment": "이전 판단은 여전히 유효하며, 양조장과의 협력 가능성에 대한 긍정적인 평가가 유지된다.",
  "updatedJudgment": "전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.",
  "judgmentReason": "양조장과의 협력 가능성을 높게 평가하고 있으나, 실제 협력 관계가 어떻게 이루어질지는 여전히 불확실하다.",
  "nextVerification": "양조장과의 협력 관계가 실제로 어떻게 이루어질지 확인할 필요가 있다.",
  "nextQuestions": [
    {
      "text": "양조장과의 협력 관계를 구체적으로 어떻게 구축할 계획인가?",
      "verificationPurpose": "양조장과의 협력 관계 구축에 대한 구체적인 계획이 필요하다.",
      "choices": [
        "양조장과의 직접 계약 체결",
        "양조장과의 공동 마케팅 전략 수립",
        "양조장과의 체험 프로그램 개발"
      ]
    }
  ],
  "nextQuestionChoices": [
    [
      "양조장과의 직접 계약 체결",
      "양조장과의 공동 마케팅 전략 수립",
      "양조장과의 체험 프로그램 개발"
    ]
  ]
}
```

## 7. 구조화 결과

저장된 오류는 `stage_fields_missing` 하나다. `stage_questions_missing`과 `stage_choices_missing`은 붙지 않았다. 질문 1개와 선택 3개는 파싱됐다. 빈 `supply`, `marketing` 때문에 사업 프로필이 null이다.

코드는 빈 칸을 채우지 않았다. 섹션은 저장되지 않았다. raw는 행에 남았다.

이 응답을 본 뒤 목적 비교에서 `어떻게`, `할 계획인가`, `할 것인가`를 뺀다. 그 판정은 이 원문에 `stage_questions_repeated`를 덧붙인다. 그 판정은 이번 GPT 호출 뒤에 단위 테스트로 확인했다. 모델을 다시 호출하지 않았다. 저장된 행의 오류 문자열은 그대로 `stage_fields_missing`이다.

## 8. CPO 품질 평가 대상

이 표는 CPO 판정이 아니다.

| 항목 | 이번 실응답에서 보인 것 |
| --- | --- |
| 최초 사업 아이디어 | 요청 `originalInput`과 응답의 고객·상품은 양조장 체험이다. |
| Founder 답변 전달 | `stagePairs`와 `answerLinks`에 합성 답이 있다. `unverifiedClaims`에도 있다. |
| 이전 분석 전달 | `priorReadings` 1개. 최초 판단 문장이 들어 있다. |
| 미확인 주장 구분 | `verifiedFacts`는 빈 배열이다. `meaning`은 그 답을 성공 가능성을 높이는 긍정적 신호라고 적는다. |
| 사실과 전략적 판단 | `judgmentEffect`는 협력 가능성을 높게 평가해 이전 판단을 유지한다고 적는다. |
| 이전 판단 | `updatedJudgment`는 최초 판단 문장을 그대로 둔다. 수요·협력 리스크 문장은 그 복사 안에 있다. `impactOnPreviousJudgment`는 긍정 평가가 유지된다고 적고, 기대와 미검증을 나누지 않는다. |
| 해결·미해결 | `resolvedIssues`는 빈 배열이다. `unresolvedIssues`는 최초 가설 3개와 같다. |
| 후속 질문 | `양조장과의 협력 관계를 구체적으로 어떻게 구축할 계획인가?` 후보, 접촉, 협력 의사, 공급 조건으로 이동하지 않는다. |
| 구조화된 단계 결과 | failed. `supply`와 `marketing`은 빈 문자열이다. |
| 3회 연속 | NOT RUN |

## 9. 잔여 결함

- 프롬프트가 성공 가능성 상향을 금지했는데 `meaning`이 그 문장을 썼다.
- 빈 문자열 금지가 스키마 설명과 시스템 프롬프트에 있었는데 `supply`와 `marketing`이 빈 문자열이다.
- 미해결 목록 복사 금지가 있었는데 최초 가설 3개가 그대로다.
- 다음 질문이 같은 협력 구축 질문이다.
- `updatedJudgment`는 이전 문장을 복사했다. 이번 답이 그 위험을 유지하는 이유를 새로 쓰지는 않았다.
- 저장된 행은 질문 반복 오류를 포함하지 않는다. 반복 판정 보강은 호출 후 단위 테스트다.

2차·3차 연속 분석은 하지 않았다.

## 10. 하지 않은 것

로그인 브라우저, Founder 프로젝트 수정, 피벗 스키마, Production 배포, Sprint 3, 실패 응답 재호출은 NOT RUN이다.
