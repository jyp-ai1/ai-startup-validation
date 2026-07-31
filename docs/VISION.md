# LaunchLens Product Vision

> **Ratified:** 2026-07-30 · CPO Sign-off (Sprint 3)  
> **Authority:** This sentence overrides feature drift. Read before every sprint.

---

> **LaunchLens는 사업을 대신 평가하는 AI가 아니라, 대표가 더 좋은 전략을 선택하도록 돕는 AI PM이다.**

---

## LaunchLens Product Rules

새 기능을 만들기 전에 **둘 다** YES:

| # | Rule |
|---|------|
| 1 | **이 기능이 대표의 사고를 더 명확하게 만드는가?** |
| 2 | **이 기능이 대표의 결정을 더 쉽게 만드는가?** |

| Answer | Action |
|--------|--------|
| **Both YES** | 만든다 |
| **Either NO** | 안 만든다 |

**North-star:** *대표가 지금 무엇을 결정해야 하는가?*

**Core:** *결론을 늦추는 AI* — **Insight → Decision** (Candidate alone → founder *"왜?"*)

Sprint 4: *먼저 중요한 사실을 이해하고, 그다음 무엇을 결정할지 함께 정한다.*

---

## Sprint 4 — Decision Workshop

**P0:** ✅ Shipped — Key Insight (1) → Decision Candidate (1) → Agreement

**Next:** **Sprint 4 P0 Validation** rev. 4 — Observation → **Thinking Shift** → **Product Response**. LaunchLens-specific validation methodology. P1 blocked until CPO consensus.

```
Review → (Debrief) → Insight → Candidate → Agreement → (P1) Workshop → (P2) Simulation
```

**Review Debrief:** Founder asks *"왜 이런 결과?"* before Workshop. P0 Insight may serve this role — **validation decides** whether to split.

Kickoff: [`sprints/SPRINT_4_DECISION_WORKSHOP_KICKOFF.md`](./sprints/SPRINT_4_DECISION_WORKSHOP_KICKOFF.md)  
Validation: [`sprints/SPRINT_4_P0_VALIDATION.md`](./sprints/SPRINT_4_P0_VALIDATION.md)

---

## Product spine

```
Understand Reality → Evaluate → Key Insight → Decision Candidate → Agreement → Explore Options → Decide → Re-review
```

| Phase | Principle | AI |
|-------|-----------|-----|
| — | Unknown | 추측하지 않는다 |
| — | Read Before Speak | 읽고 말한다 |
| Sprint 3 ✅ | Align Before Review | 기준을 맞춘다 |
| Review | Evaluate | 현재 기준으로 평가한다 |
| Sprint 4 P0 | **Key Insight** | Review에서 **가장 중요한 발견** 1개 |
| Sprint 4 P0 | **Decision Candidate** | Insight → therefore · 후보 1개 |
| Sprint 4 P0 | **Decision Agreement** | 대표 확인 후 Workshop |
| Sprint 4 P1+ | Workshop / Options | Trade-off · Simulation |
| — | Decide | **결정은 대표** |

> **AI는 대표 대신 결정하지 않는다.**

---

## One-line test (validation — ask users)

> **"이 AI가 점수를 매기려 하나요, 같이 생각하려 하나요?"**

Pass = **같이 생각하려 한다.** Fail = 평가·채점만 한다.

---

## Product Freeze v1

**Locked:** Architecture · Route · Workspace IA · AI PM Concept · Business Flow · **Sprint 3 Align UX** (no further polish unless regression).

Sprint 4 scope: **대표가 더 좋은 결정을 내리게 하는 경험** only — not feature sprawl.

---

## Implementation law

**Don't Build The Report. Build The Conversation.**

ORDA is internal. Users see PM dialogue — never labeled blocks.

## Product constitution

- [`PRODUCT_PRINCIPLES.md`](./PRODUCT_PRINCIPLES.md)
- [`DOMAIN_MODEL.md`](./DOMAIN_MODEL.md)
- [`AI_PM_PERSONALITY.md`](./AI_PM_PERSONALITY.md)
- [`OBSERVATION_REPORT.md`](./OBSERVATION_REPORT.md) — Sprint 3 sign-off record
