# Sprint 3 — Evidence-driven Thinking Engine

**Status:** 🔄 IN PROGRESS (3.1 Foundation)  
**Authority:** [LAUNCHLENS_ROADMAP_V1.md](../LAUNCHLENS_ROADMAP_V1.md) v1.1 · ADR-033  
**Prerequisite:** [EVIDENCE_ENGINE.md](../EVIDENCE_ENGINE.md) · Sprint 2.3 ✅

> ChatGPT를 만들지 않습니다. **Thinking Workspace**를 만듭니다.  
> **LaunchLens never answers first.**

---

## Sprint question

> AI는 어떻게 질문해야 사람을 **더 깊게** 생각하게 만들까?

---

## Sub-phases (CPO order)

| Phase | Focus | Kickoff |
|-------|-------|---------|
| **3.1** | Evidence Engine Foundation | [SPRINT_3_1_EVIDENCE_ENGINE.md](./SPRINT_3_1_EVIDENCE_ENGINE.md) |
| **3.2** | Thinking Engine — questions, not answers | — |
| **3.3** | Decision Engine — explain judgment changes | — |
| **3.4** | Memory Engine — re-entry briefing | — |
| **3.5** | Consulting Mode — evidence-first Q&A | — |

---

## Pipeline (immutable)

```text
Evidence → Interpretation → Decision → Memory
```

| Layer | Role |
|-------|------|
| **Evidence** | Signals · sources · citations — what we know |
| **Thinking** | Questions · reasoning · one next action |
| **Decision** | What we chose + why + affected evidence |
| **Memory** | Decisions the project keeps (Sprint 1.6 ✅) |

---

## Scope

| Capability | Sprint |
|------------|--------|
| Evidence Source interfaces + pipeline | 3.1 |
| Real provider APIs | 3.2+ |
| Adaptive questions | 3.2 |
| Decision change explanation | 3.3 |
| Re-entry briefing | 3.4 |
| Consulting Mode | 3.5 |

---

## Out of scope

- New UI pages/menus (Sprint 3.1)
- Artifact generation (Sprint 4)
- Landing / GTM changes
- Billing (Sprint 6)

---

## Ship

Release Rule · User Scenario: AI feels like **thinking partner**, not form filler. Every recommendation cites **evidence**.
