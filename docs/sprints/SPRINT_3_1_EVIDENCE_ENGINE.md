# Sprint 3.1 — Evidence Engine Foundation

**Status:** ✅ SHIPPED (Sprint 3.1 Foundation)  
**Authority:** CPO Sprint 3 Kickoff · ADR-033 · Rule #1  
**Prerequisite:** Sprint 2.3 ✅ SHIPPED

---

## Goal

Evidence Collector → Evidence Store → Evidence Interpreter 파이프라인 구축.

모든 AI 판단에 **Evidence ID** 연결. UI 변경 최소.

---

## Deliverables

| # | Item | Status |
|---|------|--------|
| 1 | `@repo/types` — Evidence Engine types | ✅ |
| 2 | `@repo/evidence` — Source / Collector / Store / Interpreter interfaces | ✅ |
| 3 | Mock providers (Google Trends, Product Hunt, …) | ✅ |
| 4 | `EvidencePipeline` orchestrator | ✅ |
| 5 | Rule #1 guard — `assertJudgmentHasEvidence` | ✅ |
| 6 | Vitest pipeline tests | ✅ |

---

## Pipeline

```text
EvidenceSource (providers)
    ↓ collect()
EvidenceCollectorService
    ↓ saveFromSignals()
EvidenceStore
    ↓ findById()
EvidenceInterpreter (LLM — interpret only)
    ↓
EvidenceInterpretation
```

**Forbidden:** LLM creating evidence signals.  
**Required:** Every `JudgmentWithEvidence` has `evidenceIds.length >= 1`.

---

## Providers (Sprint 3.1 mock → 3.2 real APIs)

| Provider | Category |
|----------|----------|
| GOOGLE_TRENDS | MARKET |
| PRODUCT_HUNT | COMPETITOR |
| CRUNCHBASE | MARKET |
| GITHUB | TECHNOLOGY |
| NEWS | TREND |
| REDDIT | CUSTOMER |
| COMPETITOR | COMPETITOR |
| YOUTUBE | TREND |
| SEARCH_VOLUME | MARKET |

---

## Out of scope (Sprint 3.1)

- New UI pages or menus
- Real external API keys
- Thinking Engine (3.2)
- Decision Engine (3.3)
- Memory Engine (3.4)
- Consulting Mode (3.5)

---

## Ship

Release Rule · Build/Lint/Type PASS · Commit · Push · Preview URL · QA

**Package:** `@repo/evidence` · `createMockEvidencePipeline()`

---

## Next

- **Sprint 3.2** — Thinking Engine (questions, not answers)
- **Sprint 3.3** — Decision Engine (explain judgment changes)
- **Sprint 3.4** — Memory Engine (re-entry briefing)
- **Sprint 3.5** — Consulting Mode (evidence-first Q&A)
