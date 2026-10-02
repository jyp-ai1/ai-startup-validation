# CPO 2-pass — Review Sheet (Golden 8 turns)
**Generated:** 2026-10-02T04:23:58.811Z
**Git SHA:** `6dfd69c96fea8c4dbdab041ec0c1b5850e9a9f10`
**Rows:** 10 · CTO self-check 8/8 (not CPO acceptance)
CPO: fill **CPO Expected** and **Verdict** per row. Full Actual JSON: `EVAL/cpo-2pass-evidence-pack.json`.
| # | Scenario | Turn | Asked gap | User answer (trim) | Actual facts | Gap state | Next Q | CTO self | CPO Expected | CPO Verdict |
|---|----------|------|-----------|-------------------|--------------|-----------|--------|----------|--------------|-------------|
| 1 | A-normal-input | 1 | customerPersona | 우리 고객은 동네 음식점 사장님이고 SNS 홍보할 시간이 없습니다.… | customer=FACT:"우리 고객은 동네 음식점 사장님이고 SNS 홍보할 시간이 없습니다."; problem=FACT:"우리 고객은 동네 음식점 사장님이고 SNS 홍보할 시간이 없습니다." | customerPersona:CLOSED, problemJtbd:CLOSED | businessOneLiner/advance — 이 사업은 누구에게 무엇을 제공하나요? | PASS | _CPO fill_ | _PENDING_ |
| 2 | B-den-b-sparse | 1 | customerPersona | 사람들… | (none) | customerPersona:PARTIAL | customerPersona/probe — 이 서비스를 가장 필요로 하는 구체 고객은 누구인가요? | PASS | _CPO fill_ | _PENDING_ |
| 3 | C-c-wrong-slot | 1 | customerPersona | 현재 월 매출은 3천만원이고 경쟁사는 배달앱입니다.… | competitor=INFERENCE:"현재 월 매출은 3천만원이고 경쟁사는 배달앱입니다."; revenue=FACT:"매출은 3천만원이고 경쟁사는 배달앱입니다" | customerPersona:OPEN, alternativesCompetitors:OPEN, revenueModel:CLOSED | customerPersona/probe — 이 서비스를 가장 필요로 하는 구체 고객은 누구인가요? | PASS | _CPO fill_ | _PENDING_ |
| 4 | D-ontradiction | 1 | customerPersona | 소상공인 카페 사장님입니다.… | customer=FACT:"소상공인 카페 사장님입니다." | customerPersona:CLOSED | businessOneLiner/advance — 이 사업은 누구에게 무엇을 제공하나요? | PASS | _CPO fill_ | _PENDING_ |
| 5 | D-ontradiction | 2 | customerPersona | 실제로는 대기업 IT 팀이 핵심 고객입니다.… | (none) | customerPersona:CONTRADICTED | customerPersona/clarify — 「고객」에 두 가지 답이 있습니다. A) 소상공인 카페 사장님입니다. · B) 실제로는 대기업 IT 팀이 핵 | PASS | _CPO fill_ | _PENDING_ |
| 6 | E--e-no-repeat | 1 | customerPersona | 소규모 양조장입니다.… | customer=FACT:"소규모 양조장입니다." | customerPersona:CLOSED | businessOneLiner/advance — 이 사업은 누구에게 무엇을 제공하나요? | PASS | _CPO fill_ | _PENDING_ |
| 7 | E--e-no-repeat | 2 | problemJtbd | 온라인 홍보가 어렵습니다.… | problem=FACT:"온라인 홍보가 어렵습니다." | customerPersona:CLOSED, problemJtbd:CLOSED | businessOneLiner/advance — 이 사업은 누구에게 무엇을 제공하나요? | PASS | _CPO fill_ | _PENDING_ |
| 8 | F-f-multi-slot | 1 | customerPersona | 고객은 소규모 양조장이고, 문제는 온라인 홍보 어려움이며, 가격은 월 1… | problem=FACT:"고객은 소규모 양조장이고, 문제는 온라인 홍보 어려움이며, 가격은 월 10만원입니다."; customer=FACT:"고객은 소규모 양조장이고, 문제는 온라인 홍보 어려움이며, 가격은 월 10만원입니다."; revenue=FACT:"월 10만원입니다" | customerPersona:CLOSED, problemJtbd:CLOSED, revenueModel:CLOSED | businessOneLiner/advance — 이 사업은 누구에게 무엇을 제공하나요? | PASS | _CPO fill_ | _PENDING_ |
| 9 | G--g-overclaim | 1 | differentiationVsAlternatives | 분명히 시장 1위가 될 수 있는 압도적 기술입니다.… | market=FACT:"분명히 시장 1위가 될 수 있는 압도적 기술입니다." | differentiationVsAlternatives:CLOSED, marketChannel:CLOSED | businessOneLiner/advance — 이 사업은 누구에게 무엇을 제공하나요? | PASS | _CPO fill_ | _PENDING_ |
| 10 | H-p-assumption | 1 | pricingHint | 아마 고객들이 이 서비스에 돈을 낼 것 같아요.… | customer=FACT:"아마 고객들이 이 서비스에 돈을 낼 것 같아요." | pricingHint:CLOSED, customerPersona:CLOSED | businessOneLiner/advance — 이 사업은 누구에게 무엇을 제공하나요? | PASS | _CPO fill_ | _PENDING_ |

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

