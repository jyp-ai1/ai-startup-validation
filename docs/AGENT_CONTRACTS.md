# Agent Layer Type Contracts

**Status:** Frozen — engines consume these types only. Providers swap underneath.

Pipeline:

```text
ResearchOutput → PlannerOutput → StrategyInput → StrategyOutput → DecisionInput → DecisionOutput → ExecutionOutput
```

Source: `packages/agents/src/types/contracts.ts`

---

## ResearchOutput

7-domain research artifact with findings, sources, overall confidence.

| Field | Type |
|-------|------|
| `findings` | `ResearchFinding[]` |
| `sources` | `ResearchSource[]` |
| `overallConfidence` | `number` |
| `completedAt` | `ISO string` |
| `providerId` | `AgentProviderId` |

Alias: `ResearchResult`

---

## PlannerOutput

Sits between Research and Strategy. Decides research order, missing data, agent sequence.

| Field | Type |
|-------|------|
| `researchOrder` | `{ domain, priority, reason }[]` |
| `missingDomains` | `ResearchDomain[]` |
| `agentSequence` | `research \| planner \| strategy \| decision \| execution` |
| `rationale` | `string` |
| `completedAt` | `ISO string` |
| `providerId` | `AgentProviderId` |

---

## StrategyInput / StrategyOutput

**Input:** `{ project, research, plan }`  
**Output:** SWOT, business model, market size, ICP, risks, opportunities

Alias output: `StrategyResult`

---

## DecisionInput / DecisionOutput

**Input:** `{ project, research, strategy, plan }`  
**Output:** verdict (`GO` \| `HOLD` \| `PIVOT` \| `NO_GO`), confidence, reasons, missingData, nextAction

Alias output: `AgentDecisionResult`

---

## ExecutionInput / ExecutionOutput

**Input:** `{ project, decision, plan }`  
**Output:** tasks by horizon (`today` \| `week` \| `month`)

Alias output: `ExecutionPlan`

---

## Provider swap (P2)

Engines **must not change** when swapping providers.

```text
mock → openrouter → rag → hybrid
```

Registry: `packages/agents/src/adapters/registry.ts`

---

## Stability contract (P0)

Client runner: `apps/web/lib/agents/run-strategy-pipeline.ts`

- Timeout: 12s
- Retry: 3 attempts
- Server recovery: `runStrategyPipelineWithRecovery()`
- Analytics: `agent_pipeline_*` events

See also: [AI_AGENT_LAYER.md](./AI_AGENT_LAYER.md)
