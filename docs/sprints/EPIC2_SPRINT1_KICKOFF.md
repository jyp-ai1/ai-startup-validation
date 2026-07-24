# Epic 2 Sprint 1 — Kickoff

**Epic:** Intelligence Engine *(formerly Confidence & Evidence Engine)*  
**Sprint:** 1 — Mock → Real Intelligence (design + first surfaces)  
**Status:** ⏳ Awaiting PM **"Epic 2 시작"** for implementation  
**PM approval:** ✅ Epic 2 direction ratified (2026-07-24)  
**Prior:** [EPIC1_CLOSE_REPORT.md](./EPIC1_CLOSE_REPORT.md)

---

## Mission

```text
Mock → Real Intelligence
```

Connect **Why → Evidence → Citation → Confidence** without becoming a report generator.

---

## Success sentence

> **사용자가 Why를 펼치면 Evidence Card와 Citation을 보고, Confidence가 왜 그 값인지 Rule Engine으로 이해한다.**

---

## Kickoff — 4 questions

### 1. 이번 Sprint에서 사용자가 달라지는 경험은?

Why Drawer의 placeholder가 **Evidence Card**로 바뀌고, 출처·신뢰도·Citation이 항상 보인다. Confidence는 mock 숫자가 아니라 **규칙 기반 계산(1차 Rule Engine)** + Missing Data 안내.

### 2. Workflow 단계

| Area | Epic 1 (Alpha) | Epic 2 Sprint 1 |
|------|----------------|-----------------|
| Why | Placeholder text | Linked Evidence list |
| Confidence | Mock timeline | Rule Engine v0 + missing-data reasons |
| Citation | 없음 | Always visible on evidence |
| Research | Legacy modules | Intelligence surfaces in Coach/Workspace |

### 3. PM 검증 — Product QA (draft)

1. Evidence Card — 출처·수치·신뢰도가 한눈에?
2. Why → Evidence 연결이 자연스러운가?
3. Confidence가 **규칙**으로 설명되는가?
4. Missing Data가 다음 행동을 제안하는가?
5. 여전히 **보고서가 아니라 Workspace**인가?

### 4. Production?

⛔ **Preview Only** until Epic 2 Product QA gate. Alpha prod (`alpha-v2.0.0`) stays on Epic 1 scope until PM promotes.

---

## Scope

### In

- **Evidence Card** — e.g. 시장 규모 2.3조 · Statista · 92%
- **Why → Evidence** — replace placeholder in Coach drawer
- **Confidence Rule Engine v0** — deterministic rules, no LLM
- **Citation** — always shown on evidence items
- **Missing Data** — "Confidence가 낮은 이유" bullet list + suggested actions
- Architecture doc slice in `docs/` · types in `@repo/types` · UI in workflow-journey
- Preview deploy · lint/build

### Out / Forbidden

PRD · Cursor integration · Export · Pitch · Landing Builder · AI Debate · new LLM prompts · full Research execution

---

## Epic 2 pillars (Intelligence Engine)

| Pillar | Sprint 1 |
|--------|-----------|
| Evidence | Card + link from Why |
| Citation | Inline on cards |
| Confidence | Rule Engine v0 |
| Source | Static/seed datasets OK |
| Why | Drawer → evidence list |
| Research | Hook points only |

**Future:** Health Engine · proactive Coach copy · Decision stability label (Epic 2 Sprint 2+)

---

## Architecture notes

- Repository pattern: `EvidenceRepository` interface in `@repo/core`, adapter later
- No Supabase SDK in apps — per Constitution
- Rule engine pure functions in `@repo/utils` or `@repo/core`
- Read [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md) · [BACKEND_ARCHITECTURE.md](../BACKEND_ARCHITECTURE.md)

---

## Completion ritual

```text
Design → Implement (Preview) → PM Product QA → Revision → Epic 2 release gate
```

Release note first line:

> **이번 Sprint에서 사용자가 새롭게 얻게 되는 경험:**

---

## Cursor prompt (when PM says start)

```text
GOAL: Epic 2 Sprint 1 — Intelligence Engine first surfaces
READ: EPIC1_CLOSE_REPORT.md, PRODUCT_CONSTITUTION.md, BACKEND_ARCHITECTURE.md, this file
BUILD: Evidence Card, Why→Evidence, Confidence Rule Engine v0, Citation, Missing Data
FORBIDDEN: LLM, export, PRD, report flows
VERIFY: pnpm lint && pnpm build · Preview only
```
