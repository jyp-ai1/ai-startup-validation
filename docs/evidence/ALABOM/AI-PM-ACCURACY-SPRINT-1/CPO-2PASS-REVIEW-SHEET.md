# CPO 2-pass — Review Sheet (Golden 8 turns)

**Generated:** 2026-10-02T04:43:04.525Z
**Git SHA:** `7abb07177342f664881b5db8dd1db7df8d41830d`
**Branch:** `cursor/ai-pm-accuracy-sprint1-6423`
**Re-verify:** REVERIFY_3_AWAITING_CPO_VERDICT · Fix Cycle 2
**Rows:** 10 · CTO self-check 8/8 (not CPO acceptance)

CPO: fill **CPO Expected** and **Verdict** per row. Full Actual JSON: `EVAL/cpo-2pass-evidence-pack.json`.

| # | Scenario | Turn | Actual facts | Gap state | CPO Re-verify #3 Expected | CPO Verdict |
|---|----------|------|--------------|-----------|----------------------------|-------------|
| 1 | A golden-a-normal-input | 1 | customer=FACT:"동네 음식점 사장님"; problem=FACT:"SNS 홍보할 시간이 없습니다" | customerPersona:CLOSED, problemJtbd:CLOSED | [CPO independent — use rubric questions below; do not inherit CTO PASS automatically] | _PENDING_CPO_ |
| 2 | B golden-b-sparse | 1 | (none) | customerPersona:PARTIAL | [CPO independent — use rubric questions below; do not inherit CTO PASS automatically] | _PENDING_CPO_ |
| 3 | C golden-c-wrong-slot | 1 | competitor=FACT:"배달앱"; revenue=FACT:"월 매출 3천만원" | customerPersona:OPEN, alternativesCompetitors:CLOSED, revenueModel:PARTIAL | competitor = FACT, value "배달앱" (explicit 경쟁사) revenue = FACT, value "월 매출 3천만원" (no competitor clause) customerPersona =… | _PENDING_CPO_ |
| 4 | D golden-d-contradiction | 1 | customer=FACT:"소상공인 카페 사장님" | customerPersona:CLOSED | [CPO independent — use rubric questions below; do not inherit CTO PASS automatically] | _PENDING_CPO_ |
| 5 | D golden-d-contradiction | 2 | (none) | customerPersona:CONTRADICTED | [CPO independent — use rubric questions below; do not inherit CTO PASS automatically] | _PENDING_CPO_ |
| 6 | E golden-e-no-repeat | 1 | customer=FACT:"소규모 양조장" | customerPersona:CLOSED | [CPO independent — use rubric questions below; do not inherit CTO PASS automatically] | _PENDING_CPO_ |
| 7 | E golden-e-no-repeat | 2 | problem=FACT:"온라인 홍보가 어렵습니다" | customerPersona:CLOSED, problemJtbd:CLOSED | [CPO independent — use rubric questions below; do not inherit CTO PASS automatically] | _PENDING_CPO_ |
| 8 | F golden-f-multi-slot | 1 | problem=FACT:"온라인 홍보 어려움"; customer=FACT:"소규모 양조장"; revenue=FACT:"월 10만원" | customerPersona:CLOSED, problemJtbd:CLOSED, revenueModel:CLOSED | [CPO independent — use rubric questions below; do not inherit CTO PASS automatically] | _PENDING_CPO_ |
| 9 | G golden-g-overclaim | 1 | differentiation=ASSUMPTION:"분명히 시장 1위가 될 수 있는 압도적 기술입니다." | differentiationVsAlternatives:PARTIAL | [CPO independent — use rubric questions below; do not inherit CTO PASS automatically] | _PENDING_CPO_ |
| 10 | H golden-h-wtp-assumption | 1 | revenue=ASSUMPTION:"아마 고객들이 이 서비스에 돈을 낼 것 같아요." | pricingHint:PARTIAL | WTP rhetoric → ASSUMPTION (not FACT) pricingHint = PARTIAL revenueModel = OPEN (must not receive WTP assumption) no cust… | _PENDING_CPO_ |

## Re-verify #3 focus — C / H (Fix Cycle 2)

### golden-c-wrong-slot T1

**CPO Expected (independent checklist):**

competitor = FACT, value "배달앱" (explicit 경쟁사)
revenue = FACT, value "월 매출 3천만원" (no competitor clause)
customerPersona = OPEN
revenueModel = PARTIAL (operational revenue snapshot, not full BM)

**Actual @ SHA:**

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

**CPO Verdict:** `[ PASS | PARTIAL | FAIL ]`

### golden-h-wtp-assumption T1

**CPO Expected (independent checklist):**

WTP rhetoric → ASSUMPTION (not FACT)
pricingHint = PARTIAL
revenueModel = OPEN (must not receive WTP assumption)
no customerPersona CLOSED from WTP-only answer

**Actual @ SHA:**

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

**CPO Verdict:** `[ PASS | PARTIAL | FAIL ]`


## Per-turn rubric (CPO independent questions)

### golden-a-normal-input T1
- customer에 “유입 부족” 등 사용자가 말하지 않은 문제 확대가 없는가?
- problem은 “SNS·홍보·시간”에 grounded 되었는가?
- customerPersona gap이 WHO 정보로 CLOSED 되었는가?
- *CTO/CPO divergence risk:* CTO는 substring match; CPO는 raw 전체 문장을 customer value로 저장한 것 자체를 PARTIAL로 볼 수 있음.

### golden-b-sparse T1
- “사람들”은 PARTIAL/OPEN이 맞는가?
- 다음 질문이 customerPersona에 probe인가, 더 중요한 gap을 우회하지 않았는가?

### golden-c-wrong-slot T1
- customer slot에 매출/경쟁이 저장되지 않았는가?
- 매출·경쟁은 적절 taxonomy/slot에만 반영되었는가?
- customerPersona는 OPEN 유지 + 재질문인가?

### golden-d-contradiction T1
- 소상공인 카페가 CLOSED 수준인가?

### golden-d-contradiction T2
- customer CONTRADICTED(또는 CONFLICT) 처리되었는가?
- 모순 해결 clarify/challenge 질문인가?

### golden-e-no-repeat T2
- customerPersona CLOSED 후 다음 질문이 customer를 반복하지 않는가?
- problem 처리 후 customer state 보존되었는가?

### golden-f-multi-slot T1
- 한 utterance에서 customer/problem/revenue가 분리 추출되었는가 (전체 blob만 3번 저장 아님)?
- *CTO/CPO divergence risk:* CTO는 substring; CPO는 value normalization 엄격 적용 가능.

### golden-g-overclaim T1
- 과장 주장이 FACT가 아닌 ASSUMPTION/INFERENCE인가?

### golden-h-wtp-assumption T1
- “아마 낼 것 같다”가 validated WTP(FACT)로 저장되지 않았는가?

