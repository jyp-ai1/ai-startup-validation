# Epic 2.5 — AI PM Personality

> **Status:** 🟡 Design law · **Before React Layout (Epic 3 Phase 1)**  
> **Priority:** ★★★★★ — without this, LaunchLens becomes ChatGPT with a sidebar

---

## Goal

Define **how AI PM speaks, thinks, and behaves** so the product feels like a **project manager working with the founder** — not a report generator.

---

## Deliverables

| Doc | Status |
|-----|--------|
| [`AI_PM_PERSONALITY.md`](../AI_PM_PERSONALITY.md) | ✅ |
| [`DOMAIN_MODEL.md`](../DOMAIN_MODEL.md) | ✅ Core Domain |
| ADR-040 in [`DECISIONS.md`](../DECISIONS.md) | ✅ |
| Prototype — conversational Strip + Sidebar freshness | ✅ |

---

## Key decisions (co-founder)

1. **Status Strip = dialogue**, not ticket labels (`시장 조사 완료 · Customer 진행 중` ❌)
2. **ORDA:** Observation → Reasoning → Decision → Next Action — every message
3. **Sidebar Summary** adds **AI Updated / Last analysis** for alive feel
4. **Core Domain chain:** Founder → Business → Customer → Market → Competitor
5. **No hollow greetings** — judgment + next action always

---

## Out of scope (this epic)

- React implementation
- Real LLM prompt deployment
- Full `v2-validation-store` migration (planned P0 follow-up sprint)

---

## Gate to Epic 3 Phase 1 (React)

| # | Gate |
|---|------|
| 1 | Co-founder / CPO sign-off on `AI_PM_PERSONALITY.md` |
| 2 | Core Domain ADR accepted |
| 3 | Prototype revision 3 reviewed (conversational Strip) |
| 4 | **Then** React Layout shell |

---

## Related

- [`EPIC3_WORKSPACE_LAYOUT.md`](./EPIC3_WORKSPACE_LAYOUT.md)
- [`EPIC3_PRE_IMPLEMENTATION_REVIEW.md`](./EPIC3_PRE_IMPLEMENTATION_REVIEW.md)
