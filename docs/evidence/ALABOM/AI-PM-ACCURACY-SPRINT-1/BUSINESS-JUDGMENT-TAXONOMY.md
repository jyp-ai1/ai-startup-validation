# Business Judgment Knowledge Taxonomy (26)

**Source of truth (code):** `apps/web/lib/ai-pm-accuracy/business-judgment-taxonomy.ts`  
**V3 mapping:** `ConversationFactKey` + `gapId` — not a fixed question order.

| # | Category | Label (KO) | primaryGapId | factKeys |
|---|----------|------------|--------------|----------|
| 1–6 | A Business Understanding | 사업/제품 … JTBD | businessOneLiner, customerPersona, payer, problemJtbd | business, customer, buyer, problem |
| 7–12 | B Market / Alternatives | 시장 … 차별성 | marketChannel, alternativesCompetitors, differentiationVsAlternatives | market, competitor, differentiation |
| 13–19 | C Business Model | 지불 이유 … 진입 | revenueModel, pricingHint, marketChannel | revenue, buyer, market |
| 20–26 | D Validation | 가정 … 성공 기준 | validationTestability, pricingHint | differentiation, customer, market |

Status per item at runtime: `CLOSED | PARTIAL | OPEN | CONTRADICTED` (V3 `GapCompleteness`; CPO **CONFLICT** = `CONTRADICTED`).
