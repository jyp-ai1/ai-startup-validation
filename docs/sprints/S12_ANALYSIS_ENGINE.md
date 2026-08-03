# S12 — Analysis Engine

**Status: ✅ FROZEN (design)** — no further design edits.  
Implementation must validate this baseline; changes require a versioned ADR, not silent doc drift.

**Sprint role:** 판단(Decision)과 설명(Insight). Not analysis UI.

```
S10 Knowledge → S11 Understanding → S12 Decision + Insight → S13 Implementation / Action later
```

---

## Engine Principle

> **Analysis는 Evidence에서만 생성된다. Evidence가 없는 Insight는 생성하지 않는다.**

```
Evidence
    ↓
Decision          (Machine · Rule only)
    ↓
Insight           (Human explanation of Decision)
    ↓
Recommended Action
```

| Layer | Audience | Nature |
|-------|----------|--------|
| **Decision** | Engine | Rule — e.g. `Revenue Validation = Insufficient` |
| **Insight** | Founder | Decision을 사람 말로 |
| **Recommended Action** | Founder | Decision에 따른 다음 행동 |

**Forbidden:** `LLM → Insight`. LLM may explain a Decision; must not invent one.

### Example

```
Evidence: Revenue Unknown · Customer Confirmed · Problem Confirmed
    ↓
Decision: Revenue Validation = Insufficient
    ↓
Insight: 수익 구조 근거가 부족하여 시장성을 판단할 수 없습니다.
    ↓
Action: 수익 구조를 먼저 검증하세요.
```

---

## 1. Analysis Inputs

| Input | From | Role |
|-------|------|------|
| Evidence (Confirmed / Assumed / Unknown) | S10 | Decision의 유일한 재료 |
| Decision Inputs | Stage · Type · Hypothesis · gate | Rule pack 선택 |
| Gate context | S10 Decision Engine | 조사 Incomplete면 Analysis pack 축소 |

Assumed ≠ Confirmed. Unknown → deterministic “시장성 낮음” 금지 → `Insufficient` / `Blocked`만.

---

## 2. Decision Rules

**Evidence → Decision** (기계 · 규칙만). Same Evidence → same Decision.

| Evidence | Decision |
|----------|----------|
| Customer✓ Problem✓ Revenue Unknown | `RevenueValidation = Insufficient` |
| Revenue✓ Customer✓ | `MarketJudgment = Ready` (seed) |
| Required Confirmed missing | `Analysis = Blocked` + which Evidence |
| Assumed-only for hard GO | `Confidence = Fragile` · not `GO` |

---

## 3. Insight Objects

**Decision → Human Explanation**

| Field | Meaning |
|-------|---------|
| `decisionCode` | 설명 대상 |
| `claim` | Founder-facing 한 줄 |
| `basisEvidenceIds` | ≥1 Evidence 필수 |
| `confidence` | `supported` \| `fragile` \| `insufficient` |

Decision 없는 Insight 금지.

---

## 4. Analysis Completion

```
IF all Decisions in the (Stage, Type, Hypothesis) pack are resolved
THEN Analysis Complete for this gate
```

| Decision | Recommended Action (예) |
|----------|-------------------------|
| Insufficient / Blocked on X | 「X를 먼저 검증하세요」 |
| Ready | 「이제 시장성 분석을 이어갈 수 있습니다」 |
| Fragile | 「추정 근거가 큽니다. 확인 후 재판단」 |

Complete ≠ GO.

---

## S12 design must not include

UI · charts · scores · Dashboard · Workshop · Action UI · S10/S11 reopening.

**Next:** Implementation Sprint — `docs/sprints/S13_IMPLEMENTATION.md`
