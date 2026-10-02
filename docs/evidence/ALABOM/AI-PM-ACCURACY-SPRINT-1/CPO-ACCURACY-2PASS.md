# CPO Accuracy — Golden 8 Independent 2-pass

**Generated:** 2026-10-02T04:47:25.508Z
**Slice 1:** PASS_CONDITIONAL · **Sprint 1:** OPEN
**CTO Golden (self-check):** 8/8 — *not CPO acceptance*

CPO fills **CPO Expected** and **CPO Verdict** per row. Divergence from CTO Expected is a valid finding.

---

## golden-a-normal-input · Turn 1 (A)

**Asked gap:** `customerPersona`

**User answer:**
```text
우리 고객은 동네 음식점 사장님이고 SNS 홍보할 시간이 없습니다.
```

**CTO Expected:**
```json
{
  "interpretation": {
    "factChecks": [
      {
        "key": "customer",
        "valueIncludes": [
          "음식점",
          "사장"
        ],
        "valueExcludes": [
          "유입",
          "SNS",
          "홍보할"
        ]
      },
      {
        "key": "problem",
        "valueIncludes": [
          "SNS",
          "홍보",
          "시간"
        ],
        "valueExcludes": [
          "유입 부족",
          "음식점 사장"
        ]
      }
    ]
  },
  "state": {
    "preserveFacts": {}
  },
  "gap": {
    "customerPersona": "CLOSED"
  },
  "nextQuestion": null,
  "reason": null
}
```

**CPO Expected (independent):**
[CPO independent — use rubric questions below; do not inherit CTO PASS automatically]

CPO review questions:
- customer에 “유입 부족” 등 사용자가 말하지 않은 문제 확대가 없는가?
- problem은 “SNS·홍보·시간”에 grounded 되었는가?
- customerPersona gap이 WHO 정보로 CLOSED 되었는가?

*Divergence note:* CTO는 substring match; CPO는 raw 전체 문장을 customer value로 저장한 것 자체를 PARTIAL로 볼 수 있음.

**Actual:**
```json
{
  "interpretation": {
    "extractedFacts": [
      {
        "key": "customer",
        "value": "동네 음식점 사장님",
        "evidenceClass": "FACT",
        "targetGap": "customerPersona"
      },
      {
        "key": "problem",
        "value": "SNS 홍보할 시간이 없습니다",
        "evidenceClass": "FACT",
        "targetGap": "problemJtbd"
      }
    ],
    "intent": "business_fact",
    "quality": "VALID"
  },
  "state": {
    "customer": "동네 음식점 사장님",
    "problem": "SNS 홍보할 시간이 없습니다"
  },
  "gap": {
    "customerPersona": "CLOSED",
    "problemJtbd": "CLOSED"
  },
  "nextQuestion": {
    "targetGapId": "businessOneLiner",
    "action": "advance",
    "questionText": "이 사업은 누구에게 무엇을 제공하나요?"
  },
  "reason": "답변에서 여러 항목이 확인되었습니다. 다음 주제로 넘어갑니다."
}
```

**CTO self-check:** PASS 

**CPO Verdict:** `[PENDING — PASS | PARTIAL | FAIL]`

**Failure type (CPO):** `[F1–F10 if FAIL]`

---

## golden-b-sparse · Turn 1 (B)

**Asked gap:** `customerPersona`

**User answer:**
```text
사람들
```

**CTO Expected:**
```json
{
  "interpretation": {
    "factChecks": []
  },
  "state": {
    "preserveFacts": {}
  },
  "gap": {
    "customerPersona": "PARTIAL"
  },
  "nextQuestion": {
    "targetGapId": "customerPersona",
    "action": "probe"
  },
  "reason": null
}
```

**CPO Expected (independent):**
[CPO independent — use rubric questions below; do not inherit CTO PASS automatically]

CPO review questions:
- “사람들”은 PARTIAL/OPEN이 맞는가?
- 다음 질문이 customerPersona에 probe인가, 더 중요한 gap을 우회하지 않았는가?

**Actual:**
```json
{
  "interpretation": {
    "extractedFacts": [],
    "intent": "nonsense",
    "quality": "IRRELEVANT"
  },
  "state": {},
  "gap": {
    "customerPersona": "PARTIAL"
  },
  "nextQuestion": {
    "targetGapId": "customerPersona",
    "action": "probe",
    "questionText": "이 서비스를 가장 필요로 하는 구체 고객은 누구인가요?"
  },
  "reason": "답변이 관련 없어 같은 주제를 다시 확인합니다."
}
```

**CTO self-check:** PASS 

**CPO Verdict:** `[PENDING — PASS | PARTIAL | FAIL]`

**Failure type (CPO):** `[F1–F10 if FAIL]`

---

## golden-c-wrong-slot · Turn 1 (C)

**Asked gap:** `customerPersona`

**User answer:**
```text
현재 월 매출은 3천만원이고 경쟁사는 배달앱입니다.
```

**CTO Expected:**
```json
{
  "interpretation": {
    "factChecks": [
      {
        "key": "customer",
        "valueExcludes": [
          "3천",
          "배달"
        ]
      },
      {
        "key": "competitor",
        "valueIncludes": [
          "배달"
        ],
        "valueExcludes": [
          "3천",
          "매출"
        ],
        "evidenceClass": "FACT"
      },
      {
        "key": "revenue",
        "valueIncludes": [
          "3천"
        ],
        "valueExcludes": [
          "배달",
          "경쟁"
        ],
        "evidenceClass": "FACT"
      }
    ]
  },
  "state": {
    "preserveFacts": {}
  },
  "gap": {
    "customerPersona": "OPEN",
    "revenueModel": "PARTIAL"
  },
  "nextQuestion": {
    "targetGapId": "customerPersona"
  },
  "reason": "관련 없"
}
```

**CPO Expected (independent):**
competitor = FACT, value "배달앱" (explicit 경쟁사)
revenue = FACT, value "월 매출 3천만원" (no competitor clause)
customerPersona = OPEN
revenueModel = PARTIAL (operational revenue snapshot, not full BM)

CPO review questions:
- customer slot에 매출/경쟁이 저장되지 않았는가?
- 매출·경쟁은 적절 taxonomy/slot에만 반영되었는가?
- customerPersona는 OPEN 유지 + 재질문인가?

**Actual:**
```json
{
  "interpretation": {
    "extractedFacts": [
      {
        "key": "competitor",
        "value": "배달앱",
        "evidenceClass": "FACT",
        "targetGap": "alternativesCompetitors"
      },
      {
        "key": "revenue",
        "value": "월 매출 3천만원",
        "evidenceClass": "FACT",
        "targetGap": "revenueModel"
      }
    ],
    "intent": "business_fact",
    "quality": "IRRELEVANT"
  },
  "state": {
    "competitor": "배달앱",
    "revenue": "월 매출 3천만원"
  },
  "gap": {
    "customerPersona": "OPEN",
    "alternativesCompetitors": "CLOSED",
    "revenueModel": "PARTIAL"
  },
  "nextQuestion": {
    "targetGapId": "customerPersona",
    "action": "probe",
    "questionText": "이 서비스를 가장 필요로 하는 구체 고객은 누구인가요?"
  },
  "reason": "답변이 관련 없어 같은 주제를 다시 확인합니다."
}
```

**CTO self-check:** PASS 

**CPO Verdict:** `[PENDING — PASS | PARTIAL | FAIL]`

**Failure type (CPO):** `[F1–F10 if FAIL]`

---

## golden-d-contradiction · Turn 1 (D)

**Asked gap:** `customerPersona`

**User answer:**
```text
소상공인 카페 사장님입니다.
```

**CTO Expected:**
```json
{
  "interpretation": {
    "factChecks": []
  },
  "state": {
    "preserveFacts": {
      "customer": "소상공인"
    }
  },
  "gap": {
    "customerPersona": "CLOSED"
  },
  "nextQuestion": null,
  "reason": null
}
```

**CPO Expected (independent):**
[CPO independent — use rubric questions below; do not inherit CTO PASS automatically]

CPO review questions:
- 소상공인 카페가 CLOSED 수준인가?

**Actual:**
```json
{
  "interpretation": {
    "extractedFacts": [
      {
        "key": "customer",
        "value": "소상공인 카페 사장님",
        "evidenceClass": "FACT",
        "targetGap": "customerPersona"
      }
    ],
    "intent": "business_fact",
    "quality": "VALID"
  },
  "state": {
    "customer": "소상공인 카페 사장님"
  },
  "gap": {
    "customerPersona": "CLOSED"
  },
  "nextQuestion": {
    "targetGapId": "businessOneLiner",
    "action": "advance",
    "questionText": "이 사업은 누구에게 무엇을 제공하나요?"
  },
  "reason": "답변이 충분합니다. 다음 주제로 넘어갑니다."
}
```

**CTO self-check:** PASS 

**CPO Verdict:** `[PENDING — PASS | PARTIAL | FAIL]`

**Failure type (CPO):** `[F1–F10 if FAIL]`

---

## golden-d-contradiction · Turn 2 (D)

**Asked gap:** `customerPersona`

**User answer:**
```text
실제로는 대기업 IT 팀이 핵심 고객입니다.
```

**CTO Expected:**
```json
{
  "interpretation": {
    "factChecks": []
  },
  "state": {
    "preserveFacts": {}
  },
  "gap": {
    "customerPersona": "CONTRADICTED"
  },
  "nextQuestion": null,
  "reason": null
}
```

**CPO Expected (independent):**
[CPO independent — use rubric questions below; do not inherit CTO PASS automatically]

CPO review questions:
- customer CONTRADICTED(또는 CONFLICT) 처리되었는가?
- 모순 해결 clarify/challenge 질문인가?

**Actual:**
```json
{
  "interpretation": {
    "extractedFacts": [],
    "intent": "business_fact",
    "quality": "CONTRADICTORY"
  },
  "state": {},
  "gap": {
    "customerPersona": "CONTRADICTED"
  },
  "nextQuestion": {
    "targetGapId": "customerPersona",
    "action": "clarify",
    "questionText": "「고객」에 두 가지 답이 있습니다. A) 소상공인 카페 사장님 · B) 실제로는 대기업 IT 팀이 핵심 고객입니다. — 어느 쪽이 맞나요?"
  },
  "reason": "이전에 말씀하신 내용과 다릅니다. 확인이 필요합니다."
}
```

**CTO self-check:** PASS 

**CPO Verdict:** `[PENDING — PASS | PARTIAL | FAIL]`

**Failure type (CPO):** `[F1–F10 if FAIL]`

---

## golden-e-no-repeat · Turn 1 (E)

**Asked gap:** `customerPersona`

**User answer:**
```text
소규모 양조장입니다.
```

**CTO Expected:**
```json
{
  "interpretation": {
    "factChecks": []
  },
  "state": {
    "preserveFacts": {}
  },
  "gap": {
    "customerPersona": "CLOSED"
  },
  "nextQuestion": null,
  "reason": null
}
```

**CPO Expected (independent):**
[CPO independent — use rubric questions below; do not inherit CTO PASS automatically]

**Actual:**
```json
{
  "interpretation": {
    "extractedFacts": [
      {
        "key": "customer",
        "value": "소규모 양조장",
        "evidenceClass": "FACT",
        "targetGap": "customerPersona"
      }
    ],
    "intent": "business_fact",
    "quality": "PARTIAL"
  },
  "state": {
    "customer": "소규모 양조장"
  },
  "gap": {
    "customerPersona": "CLOSED"
  },
  "nextQuestion": {
    "targetGapId": "businessOneLiner",
    "action": "advance",
    "questionText": "이 사업은 누구에게 무엇을 제공하나요?"
  },
  "reason": "답변이 충분합니다. 다음 주제로 넘어갑니다."
}
```

**CTO self-check:** PASS 

**CPO Verdict:** `[PENDING — PASS | PARTIAL | FAIL]`

**Failure type (CPO):** `[F1–F10 if FAIL]`

---

## golden-e-no-repeat · Turn 2 (E)

**Asked gap:** `problemJtbd`

**User answer:**
```text
온라인 홍보가 어렵습니다.
```

**CTO Expected:**
```json
{
  "interpretation": {
    "factChecks": []
  },
  "state": {
    "preserveFacts": {
      "customer": "양조장"
    }
  },
  "gap": {
    "problemJtbd": "CLOSED"
  },
  "nextQuestion": {
    "mustNotTargetGap": "customerPersona"
  },
  "reason": null
}
```

**CPO Expected (independent):**
[CPO independent — use rubric questions below; do not inherit CTO PASS automatically]

CPO review questions:
- customerPersona CLOSED 후 다음 질문이 customer를 반복하지 않는가?
- problem 처리 후 customer state 보존되었는가?

**Actual:**
```json
{
  "interpretation": {
    "extractedFacts": [
      {
        "key": "problem",
        "value": "온라인 홍보가 어렵습니다",
        "evidenceClass": "FACT",
        "targetGap": "problemJtbd"
      }
    ],
    "intent": "business_fact",
    "quality": "VALID"
  },
  "state": {
    "customer": "소규모 양조장",
    "problem": "온라인 홍보가 어렵습니다"
  },
  "gap": {
    "customerPersona": "CLOSED",
    "problemJtbd": "CLOSED"
  },
  "nextQuestion": {
    "targetGapId": "businessOneLiner",
    "action": "advance",
    "questionText": "이 사업은 누구에게 무엇을 제공하나요?"
  },
  "reason": "답변에서 여러 항목이 확인되었습니다. 다음 주제로 넘어갑니다."
}
```

**CTO self-check:** PASS 

**CPO Verdict:** `[PENDING — PASS | PARTIAL | FAIL]`

**Failure type (CPO):** `[F1–F10 if FAIL]`

---

## golden-f-multi-slot · Turn 1 (F)

**Asked gap:** `customerPersona`

**User answer:**
```text
고객은 소규모 양조장이고, 문제는 온라인 홍보 어려움이며, 가격은 월 10만원입니다.
```

**CTO Expected:**
```json
{
  "interpretation": {
    "factChecks": [
      {
        "key": "customer",
        "valueIncludes": [
          "양조장"
        ],
        "valueExcludes": [
          "가격",
          "10만"
        ]
      },
      {
        "key": "problem",
        "valueIncludes": [
          "홍보"
        ],
        "valueExcludes": [
          "10만",
          "가격은"
        ]
      },
      {
        "key": "revenue",
        "valueIncludes": [
          "10"
        ]
      }
    ]
  },
  "state": {
    "preserveFacts": {}
  },
  "gap": {},
  "nextQuestion": null,
  "reason": null
}
```

**CPO Expected (independent):**
[CPO independent — use rubric questions below; do not inherit CTO PASS automatically]

CPO review questions:
- 한 utterance에서 customer/problem/revenue가 분리 추출되었는가 (전체 blob만 3번 저장 아님)?

*Divergence note:* CTO는 substring; CPO는 value normalization 엄격 적용 가능.

**Actual:**
```json
{
  "interpretation": {
    "extractedFacts": [
      {
        "key": "problem",
        "value": "온라인 홍보 어려움",
        "evidenceClass": "FACT",
        "targetGap": "problemJtbd"
      },
      {
        "key": "customer",
        "value": "소규모 양조장",
        "evidenceClass": "FACT",
        "targetGap": "customerPersona"
      },
      {
        "key": "revenue",
        "value": "월 10만원",
        "evidenceClass": "FACT",
        "targetGap": "revenueModel"
      }
    ],
    "intent": "business_fact",
    "quality": "VALID"
  },
  "state": {
    "customer": "소규모 양조장",
    "problem": "온라인 홍보 어려움",
    "revenue": "월 10만원"
  },
  "gap": {
    "customerPersona": "CLOSED",
    "problemJtbd": "CLOSED",
    "revenueModel": "CLOSED"
  },
  "nextQuestion": {
    "targetGapId": "businessOneLiner",
    "action": "advance",
    "questionText": "이 사업은 누구에게 무엇을 제공하나요?"
  },
  "reason": "답변에서 여러 항목이 확인되었습니다. 다음 주제로 넘어갑니다."
}
```

**CTO self-check:** PASS 

**CPO Verdict:** `[PENDING — PASS | PARTIAL | FAIL]`

**Failure type (CPO):** `[F1–F10 if FAIL]`

---

## golden-g-overclaim · Turn 1 (G)

**Asked gap:** `differentiationVsAlternatives`

**User answer:**
```text
분명히 시장 1위가 될 수 있는 압도적 기술입니다.
```

**CTO Expected:**
```json
{
  "interpretation": {
    "factChecks": [
      {
        "key": "differentiation",
        "evidenceClassNot": "FACT"
      }
    ]
  },
  "state": {
    "preserveFacts": {}
  },
  "gap": {
    "differentiationVsAlternatives": "PARTIAL"
  },
  "nextQuestion": null,
  "reason": null
}
```

**CPO Expected (independent):**
[CPO independent — use rubric questions below; do not inherit CTO PASS automatically]

CPO review questions:
- 과장 주장이 FACT가 아닌 ASSUMPTION/INFERENCE인가?

**Actual:**
```json
{
  "interpretation": {
    "extractedFacts": [
      {
        "key": "differentiation",
        "value": "분명히 시장 1위가 될 수 있는 압도적 기술입니다.",
        "evidenceClass": "ASSUMPTION",
        "targetGap": "differentiationVsAlternatives"
      }
    ],
    "intent": "business_fact",
    "quality": "VALID"
  },
  "state": {
    "differentiation": "분명히 시장 1위가 될 수 있는 압도적 기술입니다."
  },
  "gap": {
    "differentiationVsAlternatives": "PARTIAL"
  },
  "nextQuestion": {
    "targetGapId": "differentiationVsAlternatives",
    "action": "probe",
    "questionText": "「아직 문서에서 사업 내용을 충분히 이해하지 못했습니다」가 대안과 갈리는 핵심 한 가지는 무엇인가요?"
  },
  "reason": "답변이 부분적이라 같은 주제를 더 구체적으로 확인합니다."
}
```

**CTO self-check:** PASS 

**CPO Verdict:** `[PENDING — PASS | PARTIAL | FAIL]`

**Failure type (CPO):** `[F1–F10 if FAIL]`

---

## golden-h-wtp-assumption · Turn 1 (H)

**Asked gap:** `pricingHint`

**User answer:**
```text
아마 고객들이 이 서비스에 돈을 낼 것 같아요.
```

**CTO Expected:**
```json
{
  "interpretation": {
    "factChecks": [
      {
        "key": "revenue",
        "evidenceClassNot": "FACT"
      }
    ]
  },
  "state": {
    "preserveFacts": {}
  },
  "gap": {
    "pricingHint": "PARTIAL",
    "revenueModel": "OPEN"
  },
  "nextQuestion": null,
  "reason": null
}
```

**CPO Expected (independent):**
WTP rhetoric → ASSUMPTION (not FACT)
pricingHint = PARTIAL
revenueModel = OPEN (must not receive WTP assumption)
no customerPersona CLOSED from WTP-only answer

CPO review questions:
- “아마 낼 것 같다”가 validated WTP(FACT)로 저장되지 않았는가?

**Actual:**
```json
{
  "interpretation": {
    "extractedFacts": [
      {
        "key": "revenue",
        "value": "아마 고객들이 이 서비스에 돈을 낼 것 같아요.",
        "evidenceClass": "ASSUMPTION",
        "targetGap": "pricingHint"
      }
    ],
    "intent": "business_fact",
    "quality": "VALID"
  },
  "state": {
    "revenue": "아마 고객들이 이 서비스에 돈을 낼 것 같아요."
  },
  "gap": {
    "pricingHint": "PARTIAL"
  },
  "nextQuestion": {
    "targetGapId": "pricingHint",
    "action": "probe",
    "questionText": "현재 이해(아직 문서에서 사업 내용을 충분히 이해하지 못했습니다)를 기준으로 다시 묻습니다 — 가격·요금에 대한 가설이나 신호가 있나요?"
  },
  "reason": "답변이 부분적이라 같은 주제를 더 구체적으로 확인합니다."
}
```

**CTO self-check:** PASS 

**CPO Verdict:** `[PENDING — PASS | PARTIAL | FAIL]`

**Failure type (CPO):** `[F1–F10 if FAIL]`

---

