# Founder Success Loop

**Mode:** AI Strategy Company — grow intelligence, not features.  
**Authority:** [PRODUCT_EVOLUTION_DIRECTIVE.md](./PRODUCT_EVOLUTION_DIRECTIVE.md)

---

## The loop

```text
Founder 행동 → AI 관찰 → 문제 발견 → AI 해결책 → Production
  → 실사용 측정 → AI 학습 → Founder 경험 향상 → 반복
```

Work unit = **Founder Success**, not screen · menu · KPI card · sprint.

---

## Eight Intelligence layers

### 1. Founder Intelligence

**Goal:** AI understands *this* Founder.

| Signal | Source (today) | Growth path |
|--------|------------------|-------------|
| Industry, goal | Project registration, Agent context | Memory Agent + persistence |
| Temperament, procrastination | Learning signals from task completion | Learning Agent |
| Explanation style | hold_reason_viewed, coach clicks | Founder Memory snapshot |

**Founder sees:** AI speaks in their language, proposes what they will actually do.

---

### 2. Business Intelligence

**Goal:** Research never ends — daily external delta.

| Track | Agent domain |
|-------|----------------|
| Competitor | Research (competitor) |
| Investment | Research (investment) |
| Government | Research (government) |
| Market | Research (market) |

**Founder sees:** "어제 이후 바뀐 것" in Morning Brief before any dashboard.

**Engine:** Research Agent + Business delta provider (Mock → RAG).

---

### 3. Strategic Intelligence

**Goal:** Decision beyond GO/HOLD — time horizons.

```text
현재 → 3개월 → 6개월 → 1년
```

**Engine:** Strategy Agent + Decision Agent + Growth roadmap.  
**Founder sees:** Where the business is going, not just today's verdict.

---

### 4. Execution Intelligence

**Goal:** AI operates the project, not a task list.

```text
오늘 → 이번주 → 이번달 → 분기 → 투자 → MVP → PMF → Scale
```

**Engine:** Execution Agent + Planner + Growth Agent.  
**Founder sees:** One clear action with ETA, effect, GO delta, completion criteria.

---

### 5. Learning Intelligence

**Goal:** Adapt recommendations from Founder behavior.

| Pattern | Metric |
|---------|--------|
| VOC completion rate | task_completed / next_action_started |
| Market research rate | workflow + research events |
| Competitor analysis rate | coach + task events |
| Grant exploration rate | research (government) engagement |

**Engine:** Learning Agent — updates next Planner/Strategy inputs.

---

### 6. Product Intelligence

**Goal:** Admin is AI Product Director, not analytics dashboard.

Auto-generates: KPI · cause · experiment · impact · Adopt/Rollback · next experiment.

**Engine:** `product-os-engine.ts` + live ops store + Experiment tracker.  
**Growth:** Replace static mock trends with live delta detection.

---

### 7. Knowledge Intelligence

**Goal:** Industry-specific strategy accumulation.

| Vertical | Decision differs by |
|----------|---------------------|
| AI SaaS | PLG, churn, API moat |
| B2B | Sales cycle, ICP depth |
| Commerce | Unit economics, supply |
| Healthcare | Regulation, evidence |
| Education | Distribution, trust |

**Engine:** Knowledge Agent + RAG corpus per vertical (Provider swap).

---

### 8. Network Intelligence (long-term)

**Goal:** Anonymous cohort wisdom.

Example: "AI SaaS Founders who complete VOC first → +18% GO probability."

**Engine:** Learning + Network layer (post-beta, privacy-safe aggregates).  
**Not in scope until:** Founder + Business + Learning stable on Production.

---

## Implementation map (existing code)

| Intelligence | Package / module |
|--------------|------------------|
| Founder | `founder-ai-pm-engine.ts`, Memory Agent |
| Business | Research Agent, Morning alerts |
| Strategic | Strategy + Decision + Growth Agents |
| Execution | Execution Agent, Today Hero |
| Learning | Learning Agent, analytics events |
| Product | `product-os-engine.ts`, Admin panels |
| Knowledge | Knowledge Agent, `@repo/agents` |
| Network | Future — Learning aggregates |

Type contracts: `packages/agents/src/types/intelligence.ts`

---

## Current growth focus

1. **Founder Intelligence** — Memory accumulates industry, goal, behavior  
2. **Business Intelligence** — "since yesterday" delta in Morning Brief  
3. **Product Intelligence** — live KPI delta → auto hypothesis (reduce mock)

Provider swap (Real LLM) **after** Founder + Business intelligence prove value on Mock.

---

## Gate (every change)

```text
Founder 사업 성공 확률 ↑ ?
```

No → do not ship.
