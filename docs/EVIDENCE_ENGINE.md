# Evidence Engine

**Status:** Sprint 3.1 Foundation  
**Authority:** CPO · ADR-033 · Rule #1  
**Package:** `@repo/evidence`

> **LaunchLens never answers first.** Evidence → Thinking → Decision.

**Companion:** [SPRINT_3_1_EVIDENCE_ENGINE.md](./sprints/SPRINT_3_1_EVIDENCE_ENGINE.md) · [SPRINT_3_THINKING_ENGINE.md](./sprints/SPRINT_3_THINKING_ENGINE.md)

---

## Pipeline

```text
Evidence Collector  — gather raw signals from providers
        ↓
Evidence Store      — persist with source metadata
        ↓
Evidence Interpreter — LLM adds meaning (never creates evidence)
        ↓
Judgment            — must cite evidenceIds[]
```

GPT = Answer Engine. LaunchLens = Thinking Engine.

---

## Architecture

| Layer | Package | Role |
|-------|---------|------|
| Types | `@repo/types/evidence-engine` | RawEvidenceSignal, JudgmentWithEvidence |
| Sources | `@repo/evidence/sources` | EvidenceSource interface + adapters |
| Collector | `@repo/evidence/collector` | Orchestrates provider collection |
| Store | `@repo/evidence/store` | Persistence (InMemory → Supabase) |
| Interpreter | `@repo/evidence/interpreter` | LLM interpretation only |
| Pipeline | `@repo/evidence/pipeline` | End-to-end orchestration + guards |

---

## Rules

1. **No claim without source** — `assertJudgmentHasEvidence()`
2. **LLM interprets only** — collection is provider/adapter responsibility
3. **Mock → real migration** — same interfaces, swap adapters in Sprint 3.2+
4. **User can see evidence** — Sprint 2 Evidence Library UI consumes store
5. **Evidence ≠ artifact** — SWOT/PRD stays Sprint 4

---

## Providers

| ID | Sprint 3.1 | Sprint 3.2+ |
|----|------------|-------------|
| GOOGLE_TRENDS | Mock | Real API |
| PRODUCT_HUNT | Mock | Scraper/API |
| CRUNCHBASE | Mock | API |
| GITHUB | Mock | API |
| NEWS | Mock | RSS/API |
| REDDIT | Mock | API |
| COMPETITOR | Mock | Browser/MCP |
| YOUTUBE | Mock | API |
| SEARCH_VOLUME | Mock | Trends/SEO API |

---

## Usage

```typescript
import { createMockEvidencePipeline } from '@repo/evidence';

const pipeline = createMockEvidencePipeline();
const { evidence } = await pipeline.collect({
  projectId: 'proj-1',
  idea: 'AI founder workspace',
});
const { interpretations } = await pipeline.interpret(evidence.map((e) => e.id));
```

---

## Sprint gates

| Sprint | Focus |
|--------|-------|
| 3.1 | Pipeline foundation ✅ |
| 3.2 | Thinking Engine — questions |
| 3.3 | Decision Engine — explain changes |
| 3.4 | Memory Engine — re-entry briefing |
| 3.5 | Consulting Mode — evidence-first Q&A |
