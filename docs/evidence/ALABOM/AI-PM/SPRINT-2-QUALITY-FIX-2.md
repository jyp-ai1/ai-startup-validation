# Sprint 2 Quality Fix 2

2026-11-01 13:34 KST. PR #226. 기술 수정 커밋은 `e6cf8861`다. 기준 실패는 `b39f505b`의 `chatcmpl-EfHHQjCqIw3F1DYY0yim1WJybyQao`다.

Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않았다. Production 배포는 하지 않았다. Founder 프로젝트 행은 읽거나 쓰지 않았다. 2차·3차 후속은 호출하지 않았다.

원본: `docs/evidence/ALABOM/AI-PM/sprint-2-quality-fix-2.json`

비교 원본은 `docs/evidence/ALABOM/AI-PM/sprint-2-quality-fix-1.json`이다. 그 파일의 응답도 실 GPT다. SIMULATION과 섞지 않는다.

## 1. 기술 수정

저장된 행의 `supply`와 `marketing`이 `""`이면 요청 생성에서만 다음 객체로 바꾼다.

```json
{"state":"not_analyzed","text":"아직 분석되지 않았다"}
```

문장이 `아직 확인되지 않았다`이면 `unconfirmed`다. 그 외의 비어 있지 않은 문장은 `confirmed`다. 코드는 공급 계약이나 마케팅 문장을 만들지 않는다. 저장 행은 고치지 않는다.

Strict schema의 `minLength`는 이 모델의 strict 모드가 받지 않는다. `supply`와 `marketing`에는 지원되는 `pattern` `^.+$`를 넣었다. 빈 문자열은 스키마가 거절한다. 공백만 있는 문자열은 파서가 `stage_field_blank`로 거절한다. 키 자체가 없으면 `stage_fields_missing`이다. 상태와 문장이 어긋나면 `stage_content_insufficient`다. 형식 실패는 원문을 남기고 수리 호출을 하지 않는다.

단위 테스트에서 저장 값 `""`와 공백은 요청 뒤에 그대로였다. 요청 직렬화에는 `"supply":""`와 `"marketing":""`가 없었다.

회귀: `ai-pm-consulting-stage.test.ts`, `ai-pm-founder-context.test.ts`, `ai-pm-review.test.ts` 103건 통과. 2026-11-01 13:36 KST. 호출 횟수 1회, 답변 저장 0회, 수리 호출 없음은 유지됐다.

## 2. 실제 호출

최초 분석은 저장된 `chatcmpl-EfEyBVVnnFOSMCoCUpQQIs0HlKOde`를 재생했다. 실호출 0회다. 후속 실호출은 1회다. 시작 2026-11-01 13:34:15 KST. 종료 2026-11-01 13:34:23 KST. 답은 `synthetic-test-data`다.

| 항목 | 값 |
| --- | --- |
| 실행 ID | `chatcmpl-EfHYns4sWFUvnMlpXMrsijgLkECBO` |
| 모델 | gpt-4o-mini-2024-07-18 |
| 호출 | 1 |
| 토큰 | 9,195 / 884 / 10,079 |
| 검토 | `7249826b-0056-4d3c-a315-d75e3cb15282`의 자식 |
| 행 | failed |
| 저장된 오류 | `stage_field_blank,stage_judgment_copied,stage_issues_copied` |
| gitSha | `e6cf886187c23eadb24c271911ee705954d0287b` |

검토 ID는 `9d5a0019-f083-4f89-8838-6494a8b9ba4a`다. 부모는 `7249826b-0056-4d3c-a315-d75e3cb15282`다.

요청의 `firstAnalysis.supply`, `firstAnalysis.marketing`, `priorReadings[0].supply`, `latestAnalysis.analysis.supply`는 모두 `not_analyzed`다. `"supply":""`는 요청에 없다.

`firstAnalysis.product`는 여전히 `""`다. 이번 정규화 대상은 supply와 marketing이다.

## 3. 기술 결과와 이전 실패 비교

| 항목 | `b39f505b` 응답 | 이번 응답 |
| --- | --- | --- |
| 요청 supply | `""` | `not_analyzed` / 아직 분석되지 않았다 |
| 응답 supply | `""` | `아직 분석되지 않았다`, state `not_analyzed` |
| 응답 marketing | `""` | 같은 미분석 상태 |
| 파서 | `stage_fields_missing` | supply는 빈 문자열이 아니다. `value`와 `product`가 `""`라 `stage_field_blank` |
| 수리 호출 | 없음 | 없음 |
| 저장 행 수정 | 없음 | 없음 |

supply와 marketing의 빈 문자열 복사는 요청과 응답에서 멈췄다. `value`와 `product`의 빈 문자열은 남았다. `product`는 부모 요청에 `""`로 남아 있었다.

## 4. 실제 요청 사용자 메시지

```
{"stagePairs":[{"questionId":"q1","question":"양조장과의 협력 관계를 어떻게 구축할 것인가?","offeredChoices":[{"choiceId":"c1","label":"양조장과의 직접 계약 체결"},{"choiceId":"c2","label":"양조장과의 공동 마케팅 전략 수립"},{"choiceId":"c3","label":"양조장과의 체험 프로그램 개발"},{"choiceId":"c4","label":"아직 핵심을 정하지 못했다"},{"choiceId":"other","label":"기타 / 직접 입력"}],"choiceId":null,"choiceLabel":null,"supplement":"양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.","status":"answered"}],"priorStagePairs":[],"stagePartial":false,"answerReading":[{"questionId":"q1","kinds":["claim"]}],"evidenceLedger":{"newFounderInformation":true,"unresolvedStillApplies":false,"verifiedFacts":[],"founderClaims":["양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다."],"unresolved":[],"priorGoals":[],"stillUnknown":[]},"originalInput":"다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.","firstAnalysis":{"summary":"전통주 양조장 체험을 통해 개인별 다양한 경험을 중시하는 관광객을 대상으로 하는 사업으로, 양조장 체험과 온라인 마케팅 지원을 결합한 모델이다. 이 사업은 내국인과 외국인을 모두 포함하며, 관광객의 다양한 경험을 제공하는 것을 목표로 한다.","priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","priorAssumptions":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"priorVerificationText":"양조장과의 초기 협력 가능성을 확인하고, 관광객의 관심도를 조사한다.","priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?","customer":"전통주를 좋아하는 내국인 및 외국인 관광객","problem":"관광객들이 전통주 체험을 통해 개인화된 경험을 찾고 있지만, 적절한 체험 기회가 부족하다.","market":"전통주에 관심이 있는 관광객 시장, 특히 문화 체험을 중시하는 관광객","revenueModel":"체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)","unresolvedIssues":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"product":"","supply":{"state":"not_analyzed","text":"아직 분석되지 않았다"},"marketing":{"state":"not_analyzed","text":"아직 분석되지 않았다"}},"latestAnalysis":{"customer":"전통주를 좋아하는 내국인 및 외국인 관광객","problem":"관광객들이 전통주 체험을 통해 개인화된 경험을 찾고 있지만, 적절한 체험 기회가 부족하다.","market":"전통주에 관심이 있는 관광객 시장, 특히 문화 체험을 중시하는 관광객","revenueModel":"체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)","execution":"양조장과의 제휴를 통해 체험 프로그램을 운영하고, 온라인 마케팅을 통해 고객을 유치한다.","priorRisks":["관광객 수요 변동성","양조장과의 협력 관계 불안정성","경쟁 증가"],"uncertain":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"hypotheses":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"priorJudgmentText":"전통주 양조장 체험을 통해 개인별 다양한 경험을 중시하는 관광객을 대상으로 하는 사업으로, 양조장 체험과 온라인 마케팅 지원을 결합한 모델이다. 이 사업은 내국인과 외국인을 모두 포함하며, 관광객의 다양한 경험을 제공하는 것을 목표로 한다.","priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?","priorReasonText":"양조장과의 협력은 사업의 성공에 중요한 요소이므로, 이를 명확히 할 필요가 있다.","answerHint":"선택하거나 직접 적습니다. 확인된 사실과 계획을 구분합니다.","claimConfirmation":null,"analysis":{"summary":"전통주 양조장 체험을 통해 개인별 다양한 경험을 중시하는 관광객을 대상으로 하는 사업으로, 양조장 체험과 온라인 마케팅 지원을 결합한 모델이다. 이 사업은 내국인과 외국인을 모두 포함하며, 관광객의 다양한 경험을 제공하는 것을 목표로 한다.","value":"양조장에서 직접 전통주를 만들고 마시는 체험을 통해 관광객에게 독특하고 개인화된 경험을 제공한다.","operatingModel":"양조장과의 제휴를 통해 체험 프로그램을 운영하고, 온라인 마케팅을 통해 고객을 유치한다.","payer":"체험에 참여하는 관광객","competition":"기타 전통주 체험 프로그램 및 일반 관광 프로그램","operations":"양조장과의 협력 및 체험 프로그램 운영, 온라인 마케팅 전략 수립","profitability":"체험 참가비와 마케팅 지원을 통한 수익 창출 가능성 (가설)","strengths":["전통주에 대한 관심 증가","개인화된 경험 제공","양조장과의 협력으로 인한 신뢰성"],"priorAssumptions":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"priorEvidenceNotes":["관광객들의 전통주 체험에 대한 피드백","양조장과의 초기 협력 성과","온라인 마케팅의 초기 반응"],"founderFacts":["창업자는 관광 및 마케팅 분야에서 경험이 있다.","전통주에 대한 깊은 이해와 관심이 있다."],"priorInferences":["관광객의 개인화된 경험에 대한 수요가 증가하고 있다.","전통주 체험이 관광객에게 매력적인 요소가 될 것이다."],"priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","priorChoices":[{"id":"c1","label":"양조장과의 직접 계약 체결"},{"id":"c2","label":"양조장과의 공동 마케팅 전략 수립"},{"id":"c3","label":"양조장과의 체험 프로그램 개발"},{"id":"c4","label":"아직 핵심을 정하지 못했다"},{"id":"other","label":"기타 / 직접 입력"}],"alternatives":"기존의 관광 프로그램이나 다른 음주 체험 프로그램이 존재하지만, 전통주에 특화된 체험은 부족하다.","differentiation":"전통주 양조장 체험에 중점을 두고, 고객 맞춤형 경험을 제공하여 차별화한다.","priorVerificationText":"양조장과의 초기 협력 가능성을 확인하고, 관광객의 관심도를 조사한다.","supply":{"state":"not_analyzed","text":"아직 분석되지 않았다"},"marketing":{"state":"not_analyzed","text":"아직 분석되지 않았다"}}},"priorQuestionTexts":["양조장과의 협력 관계를 어떻게 구축할 것인가?"],"answerLinks":[{"sourceReviewId":"7249826b-0056-4d3c-a315-d75e3cb15282","questionId":"q1","question":"양조장과의 협력 관계를 어떻게 구축할 것인가?","choiceId":null,"choiceLabel":null,"supplement":"양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.","submittedAt":"2026-11-01T04:35:15.240Z","status":"answered"}],"priorReadings":[{"reviewId":"7249826b-0056-4d3c-a315-d75e3cb15282","priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","judgmentReason":"","impactOnPreviousJudgment":"","resolvedIssues":[],"unresolvedIssues":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"customer":"전통주를 좋아하는 내국인 및 외국인 관광객","problem":"관광객들이 전통주 체험을 통해 개인화된 경험을 찾고 있지만, 적절한 체험 기회가 부족하다.","revenueModel":"체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)","product":"","supply":{"state":"not_analyzed","text":"아직 분석되지 않았다"},"marketing":{"state":"not_analyzed","text":"아직 분석되지 않았다"},"priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?"}],"doNotCopy":{"priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?"},"consultingPath":[],"priorAnalyses":[]}
```

## 5. 실제 응답 원문

```
{
  "answerInterpretation": [
    {
      "questionId": "q1",
      "choiceId": "",
      "meaning": "양조장과의 협력 가능성이 높다고 판단하며, 체험과 시음이 가능한 양조장을 선호한다는 것은 사업의 방향성을 제시한다.",
      "founderBasis": "양조장 협력 가능성이 높다고 판단한다.",
      "observedEvidence": "확인된 접촉이나 합의가 없다.",
      "judgmentEffect": "이 답변은 양조장과의 협력 관계 구축에 대한 긍정적인 전망을 유지하게 한다.",
      "openRisk": "양조장과의 협력 관계가 실제로 이루어질지에 대한 불확실성이 남아 있다."
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
  "value": "",
  "product": "",
  "market": "전통주에 관심이 있는 관광객 시장, 특히 문화 체험을 중시하는 관광객",
  "revenueModel": "체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)",
  "operations": "양조장과의 협력 및 체험 프로그램 운영, 온라인 마케팅 전략 수립",
  "supply": "아직 분석되지 않았다",
  "supplyState": "not_analyzed",
  "marketing": "아직 분석되지 않았다",
  "marketingState": "not_analyzed",
  "competition": "기타 전통주 체험 프로그램 및 일반 관광 프로그램",
  "executionNote": "양조장과의 제휴를 통해 체험 프로그램을 운영하고, 온라인 마케팅을 통해 고객을 유치한다.",
  "risks": [
    "관광객 수요 변동성",
    "양조장과의 협력 관계 불안정성",
    "경쟁 증가"
  ],
  "impactOnPreviousJudgment": "이 답변은 양조장과의 협력 가능성에 대한 긍정적인 전망을 유지하게 한다.",
  "updatedJudgment": "전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.",
  "judgmentReason": "양조장과의 협력 관계 구축이 사업의 성공에 중요한 요소이므로, 이를 명확히 할 필요가 있다.",
  "nextVerification": "양조장과의 협력 관계가 실제로 이루어질 수 있는지 확인할 필요가 있다.",
  "nextQuestions": [
    {
      "text": "양조장과의 협력 관계를 구축하기 위한 구체적인 계획은 무엇인가?",
      "verificationPurpose": "양조장과의 협력 관계 구축을 위한 구체적인 실행 계획이 필요하다.",
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

## 6. AI 품질 관찰

이 표는 CPO 판정이 아니다. 기술 수정과 분리한다.

| 항목 | 이번 원문 |
| --- | --- |
| 사실과 주장 | `verifiedFacts`는 빈 배열이다. 답은 `unverifiedClaims`에 있다. `meaning`은 그 답이 사업 방향성을 제시한다고 적고, `judgmentEffect`는 긍정적인 전망을 유지한다고 적는다. |
| 이전 판단 | `updatedJudgment`는 최초 판단 문장과 같다. 저장 오류에 `stage_judgment_copied`가 있다. |
| 해결 | `resolvedIssues`는 빈 배열이다. |
| 미해결 | 최초 가설 3개와 같다. 저장 오류에 `stage_issues_copied`가 있다. |
| 후속 질문 | `양조장과의 협력 관계를 구축하기 위한 구체적인 계획은 무엇인가?` 저장된 오류에는 질문 반복이 없다. 물음표를 무시한 목적 비교는 이 호출 뒤에 단위 테스트로 반복을 표시한다. 모델을 다시 호출하지 않았다. |
| 공급·마케팅 | 빈 문자열이 아니다. 둘 다 미분석 상태 문장이다. 후보, 접촉, 협력 의사, 공급 조건으로 나가지 않았다. |

## 7. 잔여 결함

- `value`와 `product`가 빈 문자열이라 행은 실패다.
- 부모 `product: ""`는 이번 정규화에 포함되지 않았다.
- 이전 판단 문장을 그대로 복사했다.
- 미해결 가설 3개를 그대로 복사했다.
- 다음 질문은 협력 구축 계획이다.
- 미확인 주장을 긍정 전망의 이유로 적었다.

2차·3차 연속 분석은 하지 않았다.

## 8. 하지 않은 것

로그인 브라우저, Founder 프로젝트 수정, 피벗 스키마, Production 배포, Sprint 3, 추가 GPT 호출은 NOT RUN이다.
