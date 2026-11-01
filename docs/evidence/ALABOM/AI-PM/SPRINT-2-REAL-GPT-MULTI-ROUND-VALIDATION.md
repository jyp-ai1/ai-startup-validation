# Sprint 2 Real GPT Multi-round Validation

2026-11-01 14:05 KST. PR #226. 호출 코드는 `d69de919`다. 이 문서의 질문 반복 표시와 `revisionTask` 키 유지는 그 호출 뒤에 추가했다. 모델을 다시 호출하지 않았다.

Sprint 2 PASS는 선언하지 않는다. Sprint 3은 시작하지 않았다. Production 배포는 하지 않았다. Founder 프로젝트 행은 읽거나 쓰지 않았다. 3차 상담은 호출하지 않았다.

원본: `docs/evidence/ALABOM/AI-PM/sprint-2-real-gpt-multi-round-validation.json`

비교 원본은 `docs/evidence/ALABOM/AI-PM/sprint-2-quality-fix-2.json`의 `chatcmpl-EfHYns4sWFUvnMlpXMrsijgLkECBO`다. 둘 다 실 GPT다. SIMULATION과 섞지 않는다.

## 1. 기술 수정

요청 생성에서만 바꿨다. 저장 행은 고치지 않았다. 코드는 공급 계약, 마케팅 성과, 다음 질문 문장을 만들지 않는다.

- 최초 분석의 가설은 `unresolvedIssues`로 보내지 않는다. `priorHypotheses`와 `doNotCopy.priorUnresolvedIssues`로 보낸다. 단계 판단이 있는 이전 읽기의 `unresolvedIssues`는 유지한다.
- `product`가 빈 문자열이면 요청에서만 `아직 분석되지 않았다`로 둔다.
- `value`, `product`와 나머지 사업 문장은 strict schema `pattern` `^.+$`다. 빈 문자열은 스키마가 거절한다. 공백은 파서가 `stage_field_blank`로 거절한다.
- `updatedJudgment`가 이전 판단 문장을 포함하면 `stage_judgment_copied`다.
- 수리 호출은 없다.

이번 실요청에는 `"supply":""`, `"marketing":""`, `"product":""`가 없다. `firstAnalysis.unresolvedIssues`는 빈 배열이고, 가설 3개는 `priorHypotheses`에 있다.

## 2. 실제 호출

최초 분석은 저장된 `chatcmpl-EfEyBVVnnFOSMCoCUpQQIs0HlKOde`를 재생했다. 실호출 0회다. 2차 상담 실호출은 1회다. 시작 2026-11-01 14:05:33 KST. 종료 2026-11-01 14:05:41 KST. 답은 `synthetic-test-data`다.

| 항목 | 값 |
| --- | --- |
| 실행 ID | `chatcmpl-EfI35yBhQy3eSaNRomUpJ1EiuwLdJ` |
| 모델 | gpt-4o-mini-2024-07-18 |
| 호출 | 1 |
| 토큰 | 10,009 / 783 / 10,792 |
| 검토 | `f5c12c18-cf3f-432b-a67c-dd6f39a34f22` |
| 부모 | `f4fe3994-b6f7-442a-86ef-7d33c86a9fd7` |
| 행 | succeeded |
| 저장된 오류 | 없음 |
| gitSha | `d69de91964d2ccd194265aba217cafe3fd7435a8` |

3차 상담은 NOT RUN이다.

## 3. 이전 실패와 비교

| 항목 | `chatcmpl-EfHYns4sWFUvnMlpXMrsijgLkECBO` | 이번 응답 |
| --- | --- | --- |
| 요청 supply | `not_analyzed` | `not_analyzed` |
| 요청 product | `""` | `아직 분석되지 않았다` |
| 요청 가설 위치 | `unresolvedIssues` | `priorHypotheses` |
| 응답 supply | 미분석 문장 | 미분석 문장 |
| 응답 value, product | `""` | value는 이전 가치 문장. product는 미분석 문장 |
| 행 | failed `stage_field_blank,stage_judgment_copied,stage_issues_copied` | succeeded |
| 판단 문장 | 최초 판단과 같음 | 다른 문장 |
| 미해결 | 가설 3개와 같음 | 빈 배열 |
| 다음 질문 | 구축하기 위한 구체적인 계획 | 어떻게 구체화할 것인가 |

빈 문자열 복사와 가설 배열 복사는 이번 응답에 없다. 행이 저장된 것은 그 두 거절이 걸리지 않았기 때문이다.

## 4. 실제 요청 사용자 메시지

`revisionTask`의 질문 지시 키는 이 호출에서 `priorQuestionText`로 바뀌어 저장됐다. 출력 키를 피하는 기존 이름 변경이 `revisionTask`까지 적용됐다. 호출 뒤에 그 객체는 이름 변경에서 빼 두었다. 이 원문은 고치지 않았다.

```
{"revisionTask":{"updatedJudgment":"priorJudgmentText와 다른 새 문장으로 적는다. 유지 또는 변경, 이번 답이 준 정보가 사실인지 주장인지, 남은 위험, 새 위험을 포함한다.","unresolvedIssues":"priorHypotheses와 priorUnresolvedIssues를 복사하지 않는다. 이번 답이 남긴 빈칸을 새 문장으로 적는다.","priorQuestionText":"priorQuestionText와 같은 목적을 묻지 않는다. 이번 답이 기대나 선호이면 다음 확인 하나만 묻는다."},"stagePairs":[{"questionId":"q1","question":"양조장과의 협력 관계를 어떻게 구축할 것인가?","offeredChoices":[{"choiceId":"c1","label":"양조장과의 직접 계약 체결"},{"choiceId":"c2","label":"양조장과의 공동 마케팅 전략 수립"},{"choiceId":"c3","label":"양조장과의 체험 프로그램 개발"},{"choiceId":"c4","label":"아직 핵심을 정하지 못했다"},{"choiceId":"other","label":"기타 / 직접 입력"}],"choiceId":null,"choiceLabel":null,"supplement":"양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.","status":"answered"}],"priorStagePairs":[],"stagePartial":false,"answerReading":[{"questionId":"q1","kinds":["claim"]}],"evidenceLedger":{"newFounderInformation":true,"unresolvedStillApplies":false,"verifiedFacts":[],"founderClaims":["양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다."],"unresolved":[],"priorGoals":[],"stillUnknown":[]},"originalInput":"다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.","firstAnalysis":{"summary":"전통주 양조장 체험을 통해 개인별 다양한 경험을 중시하는 관광객을 대상으로 하는 사업으로, 양조장 체험과 온라인 마케팅 지원을 결합한 모델이다. 이 사업은 내국인과 외국인을 모두 포함하며, 관광객의 다양한 경험을 제공하는 것을 목표로 한다.","priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","priorAssumptions":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"priorVerificationText":"양조장과의 초기 협력 가능성을 확인하고, 관광객의 관심도를 조사한다.","priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?","customer":"전통주를 좋아하는 내국인 및 외국인 관광객","problem":"관광객들이 전통주 체험을 통해 개인화된 경험을 찾고 있지만, 적절한 체험 기회가 부족하다.","market":"전통주에 관심이 있는 관광객 시장, 특히 문화 체험을 중시하는 관광객","revenueModel":"체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)","unresolvedIssues":[],"product":"아직 분석되지 않았다","supply":{"state":"not_analyzed","text":"아직 분석되지 않았다"},"marketing":{"state":"not_analyzed","text":"아직 분석되지 않았다"},"priorHypotheses":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."]},"latestAnalysis":{"customer":"전통주를 좋아하는 내국인 및 외국인 관광객","problem":"관광객들이 전통주 체험을 통해 개인화된 경험을 찾고 있지만, 적절한 체험 기회가 부족하다.","market":"전통주에 관심이 있는 관광객 시장, 특히 문화 체험을 중시하는 관광객","revenueModel":"체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)","execution":"양조장과의 제휴를 통해 체험 프로그램을 운영하고, 온라인 마케팅을 통해 고객을 유치한다.","priorRisks":["관광객 수요 변동성","양조장과의 협력 관계 불안정성","경쟁 증가"],"uncertain":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"hypotheses":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"priorJudgmentText":"전통주 양조장 체험을 통해 개인별 다양한 경험을 중시하는 관광객을 대상으로 하는 사업으로, 양조장 체험과 온라인 마케팅 지원을 결합한 모델이다. 이 사업은 내국인과 외국인을 모두 포함하며, 관광객의 다양한 경험을 제공하는 것을 목표로 한다.","priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?","priorReasonText":"양조장과의 협력은 사업의 성공에 중요한 요소이므로, 이를 명확히 할 필요가 있다.","answerHint":"선택하거나 직접 적습니다. 확인된 사실과 계획을 구분합니다.","claimConfirmation":null,"analysis":{"summary":"전통주 양조장 체험을 통해 개인별 다양한 경험을 중시하는 관광객을 대상으로 하는 사업으로, 양조장 체험과 온라인 마케팅 지원을 결합한 모델이다. 이 사업은 내국인과 외국인을 모두 포함하며, 관광객의 다양한 경험을 제공하는 것을 목표로 한다.","value":"양조장에서 직접 전통주를 만들고 마시는 체험을 통해 관광객에게 독특하고 개인화된 경험을 제공한다.","operatingModel":"양조장과의 제휴를 통해 체험 프로그램을 운영하고, 온라인 마케팅을 통해 고객을 유치한다.","payer":"체험에 참여하는 관광객","competition":"기타 전통주 체험 프로그램 및 일반 관광 프로그램","operations":"양조장과의 협력 및 체험 프로그램 운영, 온라인 마케팅 전략 수립","profitability":"체험 참가비와 마케팅 지원을 통한 수익 창출 가능성 (가설)","strengths":["전통주에 대한 관심 증가","개인화된 경험 제공","양조장과의 협력으로 인한 신뢰성"],"priorAssumptions":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."],"priorEvidenceNotes":["관광객들의 전통주 체험에 대한 피드백","양조장과의 초기 협력 성과","온라인 마케팅의 초기 반응"],"founderFacts":["창업자는 관광 및 마케팅 분야에서 경험이 있다.","전통주에 대한 깊은 이해와 관심이 있다."],"priorInferences":["관광객의 개인화된 경험에 대한 수요가 증가하고 있다.","전통주 체험이 관광객에게 매력적인 요소가 될 것이다."],"priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","priorChoices":[{"id":"c1","label":"양조장과의 직접 계약 체결"},{"id":"c2","label":"양조장과의 공동 마케팅 전략 수립"},{"id":"c3","label":"양조장과의 체험 프로그램 개발"},{"id":"c4","label":"아직 핵심을 정하지 못했다"},{"id":"other","label":"기타 / 직접 입력"}],"alternatives":"기존의 관광 프로그램이나 다른 음주 체험 프로그램이 존재하지만, 전통주에 특화된 체험은 부족하다.","differentiation":"전통주 양조장 체험에 중점을 두고, 고객 맞춤형 경험을 제공하여 차별화한다.","priorVerificationText":"양조장과의 초기 협력 가능성을 확인하고, 관광객의 관심도를 조사한다.","supply":{"state":"not_analyzed","text":"아직 분석되지 않았다"},"marketing":{"state":"not_analyzed","text":"아직 분석되지 않았다"},"product":"아직 분석되지 않았다"}},"priorQuestionTexts":["양조장과의 협력 관계를 어떻게 구축할 것인가?"],"answerLinks":[{"sourceReviewId":"f4fe3994-b6f7-442a-86ef-7d33c86a9fd7","questionId":"q1","question":"양조장과의 협력 관계를 어떻게 구축할 것인가?","choiceId":null,"choiceLabel":null,"supplement":"양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다.","submittedAt":"2026-11-01T05:06:33.915Z","status":"answered"}],"priorReadings":[{"reviewId":"f4fe3994-b6f7-442a-86ef-7d33c86a9fd7","priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","judgmentReason":"","impactOnPreviousJudgment":"","resolvedIssues":[],"unresolvedIssues":[],"customer":"전통주를 좋아하는 내국인 및 외국인 관광객","problem":"관광객들이 전통주 체험을 통해 개인화된 경험을 찾고 있지만, 적절한 체험 기회가 부족하다.","revenueModel":"체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)","product":"아직 분석되지 않았다","supply":{"state":"not_analyzed","text":"아직 분석되지 않았다"},"marketing":{"state":"not_analyzed","text":"아직 분석되지 않았다"},"priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?","priorHypotheses":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."]}],"doNotCopy":{"priorJudgmentText":"전통주 양조장 체험 사업은 관광객의 개인화된 경험을 제공할 수 있는 좋은 기회로 보인다. 그러나 양조장과의 협력 및 수요 변동성에 대한 리스크가 존재한다.","priorQuestionText":"양조장과의 협력 관계를 어떻게 구축할 것인가?","priorUnresolvedIssues":["관광객들이 전통주 체험에 높은 관심을 가질 것이다.","양조장과의 협력이 원활하게 이루어질 것이다.","온라인 마케팅이 효과적으로 작용할 것이다."]},"consultingPath":[],"priorAnalyses":[]}
```

## 5. 실제 응답 원문

```
{"answerInterpretation":[{"questionId":"q1","choiceId":"","meaning":"양조장 협력 가능성이 높다고 판단하며, 체험과 시음이 가능한 양조장을 선호한다는 주장을 제시했다.","founderBasis":"창업자는 관광객의 다양한 경험을 중시하는 경향을 반영하여 양조장과의 협력 가능성을 높게 평가하고 있다.","observedEvidence":"확인된 접촉이나 합의가 없다.","judgmentEffect":"이 답변은 양조장과의 협력 가능성을 높게 평가하는 기존 판단을 유지하게 된다. 그러나 구체적인 협력 방안이 제시되지 않아 불확실성이 남아 있다.","openRisk":"양조장과의 협력 관계가 구체화되지 않아 발생할 수 있는 리스크가 남아 있다."}],"verifiedFacts":[],"unverifiedClaims":["양조장 협력 가능성이 높다고 판단한다. 체험과 시음이 가능한 양조장을 선호한다."],"assumptions":[],"resolvedIssues":[],"unresolvedIssues":[],"customer":"전통주를 좋아하는 내국인 및 외국인 관광객","problem":"관광객들이 전통주 체험을 통해 개인화된 경험을 찾고 있지만, 적절한 체험 기회가 부족하다.","value":"양조장에서 직접 전통주를 만들고 마시는 체험을 통해 관광객에게 독특하고 개인화된 경험을 제공한다.","product":"아직 분석되지 않았다","market":"전통주에 관심이 있는 관광객 시장, 특히 문화 체험을 중시하는 관광객","revenueModel":"체험 참가비 및 양조장과의 제휴를 통한 수익 분배 (가설)","operations":"양조장과의 협력 및 체험 프로그램 운영, 온라인 마케팅 전략 수립","supply":"아직 분석되지 않았다","supplyState":"not_analyzed","marketing":"아직 분석되지 않았다","marketingState":"not_analyzed","competition":"기타 전통주 체험 프로그램 및 일반 관광 프로그램","executionNote":"양조장과의 제휴를 통해 체험 프로그램을 운영하고, 온라인 마케팅을 통해 고객을 유치한다.","risks":["관광객 수요 변동성","양조장과의 협력 관계 불안정성","경쟁 증가"],"impactOnPreviousJudgment":"이번 답변은 양조장과의 협력 가능성을 높게 평가하는 기존 판단을 유지하게 된다. 그러나 구체적인 협력 방안이 제시되지 않아 불확실성이 남아 있다.","updatedJudgment":"양조장과의 협력 가능성이 높다고 판단하며, 체험과 시음이 가능한 양조장을 선호한다는 주장을 제시했다. 그러나 구체적인 협력 방안이 제시되지 않아 불확실성이 남아 있다.","judgmentReason":"양조장과의 협력 관계가 구체화되지 않아 발생할 수 있는 리스크가 남아 있다.","nextVerification":"양조장과의 협력 관계를 구체화하기 위한 다음 단계의 확인이 필요하다.","nextQuestions":[{"text":"양조장과의 협력 관계를 어떻게 구체화할 것인가?","verificationPurpose":"양조장과의 협력 관계에 대한 구체적인 계획이 필요하다.","choices":["양조장과의 직접 계약 체결","양조장과의 공동 마케팅 전략 수립","양조장과의 체험 프로그램 개발"]}],"nextQuestionChoices":[["양조장과의 직접 계약 체결","양조장과의 공동 마케팅 전략 수립","양조장과의 체험 프로그램 개발"]]}
```

## 6. AI 품질 관찰

이 표는 CPO 판정이 아니다. 기술 수정과 분리한다.

| 항목 | 이번 원문 |
| --- | --- |
| 사실과 주장 | `verifiedFacts`는 빈 배열이다. 답은 `unverifiedClaims`에 있다. `judgmentEffect`는 이 답이 협력 가능성을 높게 평가하는 기존 판단을 유지하게 한다고 적는다. 이전 판단 문장은 좋은 기회와 협력·수요 리스크이고, 협력 가능성이 높다는 문장은 Founder 주장이다. |
| 이전 판단 | `updatedJudgment`는 이전 문장과 같지 않다. 그 문장은 주장을 인용하고, 구체적 협력 방안이 없다고 덧붙인다. 유지 이유와 남은 위험과 새 위험을 나누어 적지 않았다. |
| 해결 | `resolvedIssues`는 빈 배열이다. |
| 미해결 | `unresolvedIssues`도 빈 배열이다. 가설 3개를 복사하지는 않았다. 후보, 접촉, 협력 의사, 조건의 빈칸도 적지 않았다. |
| 후속 질문 | `양조장과의 협력 관계를 어떻게 구체화할 것인가?` 선택지는 직접 계약, 공동 마케팅, 체험 프로그램이다. 이전 질문은 `양조장과의 협력 관계를 어떻게 구축할 것인가?`다. |
| 공급·마케팅·상품 | 빈 문자열이 아니다. 셋 다 `아직 분석되지 않았다`. 후보와 조건으로 나가지 않았다. |
| 답변 근거 | `founderBasis`는 관광객의 경험 중시 경향을 반영했다고 적는다. 제출된 답에는 그 이유가 없다. |

저장된 행의 오류는 없다. 같은 원문을 호출 뒤의 검사로 다시 읽으면 `stage_questions_repeated`와 `stage_issues_dropped`가 된다. `구축`과 `구체화`를 같은 목적으로 보고, 해결과 미해결이 둘 다 비어 있으면 이전 문제가 빠진 것으로 본다. 이 검사는 저장된 행을 바꾸지 않았고, 모델을 다시 호출하지 않았다.

## 7. 테스트

2026-11-01 14:07 KST. `ai-pm-consulting-stage.test.ts`, `ai-pm-founder-context.test.ts`, `ai-pm-review.test.ts` 104건 통과. 실호출 테스트는 이 환경에서 건너뛰었다. Preview의 실호출은 위 1회다.

## 8. 하지 않은 것

3차 상담, 로그인 브라우저, Founder 프로젝트 수정, 피벗 스키마, Production 배포, Sprint 3, 추가 GPT 호출은 NOT RUN이다.
