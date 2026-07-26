# LaunchLens Product Evolution Directive

**Authority:** Single operational law for Cursor — alongside `docs/PRODUCT_CONSTITUTION.md` Part II  
**Vision:** LaunchLens is **not** an AI analysis tool. It is the **AI Strategy Project Manager** Founder works with every day.

> Founder does not ask AI questions. AI researches first, decides first, plans first, proposes the next action first.

---

## Frozen architecture (do not change)

### Core Journey

```text
Landing → Goal → Workflow → Project → Thinking
  → Research → Planner → Strategy → Decision → Execution → Workspace
```

### Agent Pipeline

```text
Research → Planner → Strategy → Decision → Execution
  → Memory · Mentor · Learning · Growth · Knowledge
  → (Real LLM Provider — swap only, engines frozen)
```

### Provider tiers

```text
Mock → OpenRouter → Hybrid → RAG
```

---

## Implementation principles

**Never optimize for:**

- New screens · new menus · new features for their own sake

**Always optimize for:**

```text
Founder experience → behavior change → business success probability
```

---

## Permanent Product Loop

```text
Production check
  → Founder behavior analysis
  → largest friction
  → root cause
  → UX improvement
  → Production deploy
  → Analytics check
  → next friction
```

This loop **never ends**.

---

## Priority order

| # | KPI | Behavior goal |
|---|-----|---------------|
| 1 | **Activation** | Landing → Goal → Project → Decision |
| 2 | **Decision Understanding** | Why HOLD / why GO in **3 seconds**, human language not numbers |
| 3 | **Execution Start** | After GO: today task · ETA · expected effect · Start — no guessing |
| 4 | **Daily Retention** | AI PM greets first every return visit |
| 5 | **Trust** | Every judgment shows why · evidence · missing data · confidence |

---

## Founder AI PM — Workspace order

Workspace is **not** a report. Always:

```text
AI PM → today's task → progress → next action → Decision → Evidence
```

**Do not lead with Decision.** Lead with **action**.

---

## Agent Layer rule

Each agent exists to create **Founder's next action**, not to produce artifacts.

Mock provider only until PM gate. Swap **Provider only** — never change Agent engines or contracts.

---

## Analytics (required on every UX change)

| Event | When |
|-------|------|
| `project_started` | Project registration complete |
| `analysis_started` | Thinking overlay begins |
| `analysis_completed` | Pipeline success |
| `decision_viewed` | Decision section visible |
| `hold_reason_viewed` | HOLD why expanded |
| `next_action_started` | Founder starts today's task |
| `task_completed` | Execution task done |
| `go_reached` | GO verdict |
| `daily_return` | Founder returns same/next day |
| `weekly_return` | Weekly return |
| `agent_pipeline_*` | Pipeline stability |

Product OS reads these events only — proposes next experiment from data.

---

## Forbidden

- Features for features · screens for screens
- KPI-unrelated refactors
- AI PM–unrelated components
- **Agent contract changes**
- **Journey structure changes**
- Real LLM before provider swap gate

---

## Required on every change

UX · Loading · Error · Empty · Retry · Analytics · A11y · Responsive · Performance · Docs · Regression · Production Deploy

**Partial implementation = not done.**

---

## Current loop (post `8898c51`)

### P0 — Stability

- Verify `agent_pipeline_*` completion rate on Production
- Confirm 12s timeout · retry · recovery
- Overlay hang = 0
- Regression: refresh · back · slow network

### P1 — Founder behavior UX

- Today tab = **today's task first** (hero)
- Decision / Evidence = secondary
- Morning → Working → Evening loop flows naturally

### P2 — Agent intelligence (mock)

- Planner dynamic missing-data priority
- Decision links reason → next action
- Execution completion updates confidence

### P3 — Product OS (real data)

- Mock KPI → live Analytics
- Auto hypothesis · Adopt/Rollback from data

---

## State pointers

- Loop focus: [PRODUCT_LOOP_STATE.md](./PRODUCT_LOOP_STATE.md)
- Agent contracts: [AGENT_CONTRACTS.md](./AGENT_CONTRACTS.md)
- KPI registry: [PRODUCT_KPI_REGISTRY.md](./PRODUCT_KPI_REGISTRY.md)
- Cursor rule: `.cursor/rules/product-constitution-operations.mdc`

**Production:** https://ai-startup-validation-tau.vercel.app

---

## Forbidden Cursor output

완료 · 다음 Stage · 승인 · 배포할까요 · 무엇을 만들까요
