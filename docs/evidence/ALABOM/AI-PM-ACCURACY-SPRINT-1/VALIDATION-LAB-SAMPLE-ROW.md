# Validation Lab — sample row

```json
{
  "businessId": "biz-01",
  "businessSet": "development",
  "scenario": "biz-01:normal",
  "perturbation": "normal",
  "turn": 1,
  "userInput": "핵심 고객은 중소기업 업무관리을(를) 위한 사용자이며, 구체 페르소나를 정의 중입니다.",
  "aiVisibleResponse": "customer=FACT: 중소기업 업무관리을(를) 위한 사용자",
  "answerUnderstanding": {
    "extractedFacts": [
      {
        "key": "customer",
        "value": "중소기업 업무관리을(를) 위한 사용자",
        "evidenceClass": "FACT",
        "confidence": "high",
        "targetGap": "customerPersona",
        "source": "explicit"
      }
    ],
    "intent": "business_fact",
    "quality": "VALID",
    "contradictions": []
  },
  "stateBefore": {},
  "stateAfter": {
    "customer": "중소기업 업무관리을(를) 위한 사용자"
  },
  "gapBefore": {},
  "gapAfter": {
    "businessOneLiner": "CLOSED",
    "customerPersona": "CLOSED"
  },
  "askedGapId": "businessOneLiner",
  "askedQuestionText": "이 사업은 누구에게 무엇을 제공하나요?",
  "actualNextQuestion": "서비스 비용은 누가 지불하나요?",
  "actualNextQuestionTargetGap": "payer",
  "nextQuestionReason": "답변에서 여러 항목이 확인되었습니다. 다음 주제로 넘어갑니다.",
  "expectedInterpretation": null,
  "expectedState": null,
  "expectedGap": null,
  "expectedQuestionFamily": null,
  "ctoStructuralPass": null,
  "cpoVerdict": "PENDING_CPO_2PASS",
  "failureType": [],
  "gitSha": "42dce7beac9a8a91f19a30d2325cf9089533521b"
}
```
