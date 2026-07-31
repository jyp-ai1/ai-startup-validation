# LaunchLens Core Domain Model

> **Status:** 🔴 P0 — Core Domain (not optional ADR detail)  
> **Authority:** All AI PM prompts, evidence storage, interview flows, and Overview generation must align.  
> **Companion:** [`AI_PM_PERSONALITY.md`](./AI_PM_PERSONALITY.md)

---

## One sentence

**LaunchLens validates a Business for a Founder by reasoning about Customer, Market, and Competitor — never collapsing them into one field.**

---

## Domain chain (AI PM thinking order)

```text
Founder
    ↓
Business
    ↓
Customer
    ↓
Market
    ↓
Competitor
```

AI PM **always** progresses in this order. Skip only when upstream entity is already complete.

---

## Entities

### Founder

**Who:** The authenticated user running LaunchLens (addressed as "대표님").

| Attribute | Storage (target) | Notes |
|-----------|------------------|-------|
| `userId`, profile | Auth / Supabase | |
| `situation` | Rename from `V2PersonaId` — `/who` selection | 예비창업, 사업 운영, etc. |
| Preferences, memory | `ll_founder_*` stores | Decisions, style — **not** business ICP |

**Never:** Store founder segment in `customer` unless Business explicitly sells to founders.

---

### Business

**What:** The venture under validation (one `StartupProject`).

| Attribute | Storage (today → target) |
|-----------|--------------------------|
| Name / idea | `evidence.idea`, DB `title` |
| Problem, solution | `evidence.problem`, DB columns |
| Model | **New:** `business.model`: `B2B` \| `B2C` \| `B2G` |
| Pricing, MVP | `evidence.pricing`, `evidence.mvp` |
| Industry | DB `industry` |

**Rule:** `idea` describes the **Business**, not the Founder or Customer.

---

### Customer

**Who:** Pays for or uses the **Business's** product.

| Attribute | Storage (target) |
|-----------|------------------|
| Segment description | Split from `evidence.customer` → `customer.segment` |
| Persona | PRD `USER_PERSONA` — product end-user |
| Segment type | Align with `VOCCustomerSegment` |

**Hard rule:** For B2C, **Founder ≠ Customer**. Prompt must say so explicitly.

**Valid founder-as-customer only when:** `business.model === B2B' && sellsToFounders`.

---

### Market

**What:** External market context for the Business.

| Attribute | Notes |
|-----------|-------|
| TAM/SAM, growth | Research / Insights — drawer |
| Timing risk | Overview Risk block |

Reached after Business + Customer **defined enough** to scope market.

---

### Competitor

**What:** Alternatives and differentiation.

| Attribute | Notes |
|-----------|-------|
| Competitor set | Insights, investigation engine |
| Differentiation | Overview Recommendation |

---

## Relationship diagram

```text
┌──────────┐     owns      ┌──────────┐     serves     ┌──────────┐
│ Founder  │──────────────▶│ Business │──────────────▶│ Customer │
└──────────┘               └────┬─────┘               └──────────┘
                                │
                    ┌───────────┴───────────┐
                    ▼                       ▼
               ┌─────────┐           ┌───────────┐
               │ Market  │           │ Competitor│
               └─────────┘           └───────────┘
```

---

## Current vs target (P0 migration)

| Problem today | Target |
|---------------|--------|
| `evidence.customer` holds founder archetypes | `customer.segment` only — business buyers |
| `/who` "persona" name collision | `founder.situation` |
| `v2-smart-intake-engine` infers customer from 창업/대표 | Infer only after `business.model` known |
| `founder-information-store` field `customer` | Move to Business/Customer stores |
| AI treats 대표 = 고객 | ORDA + domain envelope in every prompt |

---

## Interview sequence (canonical)

| Step | Route / surface | Entity | Example question |
|------|-----------------|--------|------------------|
| 1 | `/who` | Founder.situation | 어떤 상황이신가요? |
| 2 | Workflow / AI PM | Business.idea | 무엇을 만드나요? |
| 3 | AI PM | Business.model | B2B인가요, B2C인가요? |
| 4 | AI PM | Customer.segment | **누가 돈을 내나요?** (founder 제외) |
| 5 | AI PM | Market | 시장 규모 검토 (Insights) |
| 6 | AI PM | Competitor | 경쟁사 / 차별점 |

---

## Type sketch (implementation reference)

```typescript
// packages/types — future export
interface FounderContext {
  userId: string;
  situation: FounderSituationId;
  locale: string;
}

interface BusinessContext {
  projectId: string;
  name: string;
  idea: string;
  model: 'B2B' | 'B2C' | 'B2G' | null;
  problem?: string;
  pricing?: string;
}

interface CustomerContext {
  segment: string | null;
  persona?: string;
  defined: boolean;
}

interface LaunchLensDomainContext {
  founder: FounderContext;
  business: BusinessContext;
  customer: CustomerContext;
  market: { researched: boolean };
  competitor: { researched: boolean };
}
```

---

## Files to migrate (priority order)

1. `packages/types` — domain types  
2. `v2-validation-store.ts` — split evidence  
3. `v2-smart-intake-engine.ts` — remove founder→customer default  
4. `packages/ai/src/prompts/*` — domain envelope + ORDA  
5. `v2-ai-pm-inbox-data.ts`, personality engines  
6. i18n `ko.json` / `en.json` — interview copy  
7. `persona-selection-view.tsx` — rename to founder situation  

Full audit: [`sprints/EPIC3_PRE_IMPLEMENTATION_REVIEW.md`](./sprints/EPIC3_PRE_IMPLEMENTATION_REVIEW.md) § P0-2.

---

## Related

- ADR-040 in [`DECISIONS.md`](./DECISIONS.md)
- [`AI_PM_PERSONALITY.md`](./AI_PM_PERSONALITY.md)
