# Sprint 3 — Evidence-driven Thinking Engine

**Former name:** Thinking Engine (Real AI)  
**Status:** ⬜ PLANNED  
**Authority:** [LAUNCHLENS_ROADMAP_V1.md](../LAUNCHLENS_ROADMAP_V1.md) v1.1 · ADR-031  
**Prerequisite:** [EVIDENCE_ENGINE.md](../EVIDENCE_ENGINE.md)

> ChatGPT를 만들지 않습니다. **Thinking Workspace**를 만듭니다.  
> AI는 **근거 없이** 판단하면 안 됩니다.

---

## Sprint question

> AI는 어떻게 질문해야 사람을 **더 깊게** 생각하게 만들까?

---

## Evidence Engine (before AI)

AI보다 먼저 **Evidence**가 있어야 합니다.

| Layer | Role |
|-------|------|
| **Evidence** | Signals · sources · citations — what we know |
| **Thinking** | Questions · reasoning · recommendations |
| **Memory** | Decisions the project keeps (Sprint 1.6 ✅) |

See [EVIDENCE_ENGINE.md](../EVIDENCE_ENGINE.md) for foundation rules.

---

## Scope

| Capability | Notes |
|------------|-------|
| **Evidence Search** | Real signals, not mock timer — **first** |
| Adaptive Question | Context-aware follow-ups |
| Reasoning | Transparent, not black-box score |
| Recommendation | One next action — not report dump |

---

## Builds on

Sprint 1 Workspace IA — **connect engine inside existing shell**, do not rebuild layout.

Sprint 2 GTM — users already understand *why* before engine ships.

---

## Out of scope

- Artifact generation (Sprint 4)
- Landing / GTM changes (Sprint 2)
- Billing (Sprint 6)

---

## Ship

Release Rule · User Scenario: AI question feels like **thinking partner**, not form filler. Every recommendation cites **evidence**.
