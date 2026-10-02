# CPO 2-pass Re-verify #3 — evidence submission (CTO)

**Git SHA:** `7abb07177342f664881b5db8dd1db7df8d41830d`
**Generated:** 2026-10-02T04:43:04.525Z
**CTO Golden self-check:** 8/8 (not CPO acceptance)

CPO: compare **Actual** below to **CPO Expected** and record Verdict. Phase ① CLOSE only after CPO signs all rows.

## Regenerate command

```bash
cd apps/web && pnpm test:cpo-2pass-evidence
```

## C / H Actual snapshots

### golden-c-wrong-slot turn 1

**CPO Expected:**

competitor = FACT, value "배달앱" (explicit 경쟁사)
revenue = FACT, value "월 매출 3천만원" (no competitor clause)
customerPersona = OPEN
revenueModel = PARTIAL (operational revenue snapshot, not full BM)

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

**CPO Verdict:** _pending_

### golden-h-wtp-assumption turn 1

**CPO Expected:**

WTP rhetoric → ASSUMPTION (not FACT)
pricingHint = PARTIAL
revenueModel = OPEN (must not receive WTP assumption)
no customerPersona CLOSED from WTP-only answer

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

**CPO Verdict:** _pending_

