# AI Agent Layer

**Purpose:** Founder 대신 AI가 실제 전략 일을 수행하는 Engine Layer.  
**Rule:** UI 수정보다 Engine · Service · Domain · Interface 우선.

---

## Architecture

```text
Application (apps/web API + thin wiring)
        ↓
StrategyPlatform (orchestrator)
        ↓
Engines (Research · Planner · Strategy · Decision · Execution)
        ↓
Provider Ports (interfaces)
        ↓
Adapters (mock → openrouter → RAG/DB)
```

Package: `@repo/agents`

---

## Phases

| Phase | Engine | Status |
|-------|--------|--------|
| 1 | **Research** — market, customer, competitor, trend, pricing, government, investment | Mock ✅ |
| 1.5 | **Planner** — research order, missing data, agent sequence | Mock ✅ |
| 2 | **Strategy** — SWOT, BM, market size, ICP, risk, opportunity | Mock ✅ |
| 3 | **Decision** — GO/HOLD/PIVOT/NO_GO + confidence + next action | Mock ✅ |
| 4 | **Execution** — today / week / month tasks | Mock ✅ |
| 5 | **Learning** — behavior signals | Mock ✅ |
| 6 | **Knowledge** — frameworks, VC, grants, cases | Mock ✅ |
| 7 | **Memory** — project decision history snapshot | Mock ✅ |
| 8 | **Mentor** — founder coaching | Mock ✅ |
| 9 | **Growth** — post-GO roadmap (MVP, IR, grants) | Mock ✅ |
| 10 | **Real Intelligence** — swap mock → openrouter → rag → hybrid | Ports ready (engines frozen) |

---

## Pipeline

```text
POST /api/agents/strategy-run
  → StrategyPlatform.run()
  → Research → Planner → Strategy → Decision → Execution
  → Growth + Memory + Mentor + Knowledge + Learning
```

Type contracts: [AGENT_CONTRACTS.md](./AGENT_CONTRACTS.md)

Client resilience: `runStrategyPipeline()` — timeout 12s, retry 3×, server recovery.

Workspace analysis overlay calls this API on project start. Result stored in `sessionStorage` via `agent-run-store.ts`.

---

## Swapping mock → real

1. Implement `OpenRouterResearchProvider` implementing `ResearchProviderPort`
2. Register in `adapters/registry.ts`
3. Set `OPENROUTER_API_KEY` — `resolveAgentProviderId()` returns `openrouter`

No engine or UI changes required.

---

## Split from Product OS

| Layer | Audience | Package |
|-------|----------|---------|
| **Founder AI PM** | Founder daily ops | `@repo/agents` + journey wiring |
| **Product OS** | CPO/ops KPI loop | `product-os-engine.ts` |

---

See `docs/DECISIONS.md` ADR for agent layer pivot.
