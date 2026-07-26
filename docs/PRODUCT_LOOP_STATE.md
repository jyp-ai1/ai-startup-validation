# Product Loop State

**Mode:** AI Agent Layer — Stability & Contracts first  
Production: https://ai-startup-validation-tau.vercel.app/workspace

---

## CPO pivot (frozen direction)

**UI Frozen · UX Never Frozen**

- No new Landing/Goal/Workflow screens
- UX bugs (Thinking hang, registration, trust) **always in scope**
- Real LLM **not connected yet** — provider swap only after contracts are fixed

---

## Priority order

1. **P0 — Stability:** Thinking → Agent → Decision 100% success (timeout, retry, recovery, analytics)
2. **P1 — Contracts:** `ResearchOutput` → `PlannerOutput` → `StrategyOutput` → `DecisionOutput` → `ExecutionOutput`
3. **P2 — Provider swap:** mock → openrouter → rag → hybrid (engines unchanged)
4. **P3 — Founder Daily Loop:** Morning → Working → Evening → Weekly → Monthly
5. **P4 — Beta instrumentation:** Google Form, feedback, session replay → Product OS

---

## Active pipeline

```text
Research → Planner → Strategy → Decision → Execution → Growth/Memory/Mentor/Knowledge/Learning
```

API: `POST /api/agents/strategy-run`  
Client: `runStrategyPipeline()` with retry/recovery  
Trigger: Workspace project registration → analysis overlay

Docs: [AGENT_CONTRACTS.md](./AGENT_CONTRACTS.md) · [AI_AGENT_LAYER.md](./AI_AGENT_LAYER.md)

---

## Engine status

| Engine | Mock | Real LLM |
|--------|------|----------|
| Research (7 domains) | ✅ | P2 provider swap |
| Planner (order/missing/next) | ✅ | P2 provider swap |
| Strategy (SWOT/BM/ICP) | ✅ | P2 provider swap |
| Decision (GO/HOLD/PIVOT) | ✅ | P2 provider swap |
| Execution (today/week/month) | ✅ | P2 provider swap |

---

## Gate

> "Founder가 AI PM을 신뢰하고 매일 돌아오는가?" — Stability + UX first, intelligence via provider swap only.
