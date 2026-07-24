# Epic 1 Sprint 2 — Kickoff

**Epic:** Goal & Workflow Experience  
**Sprint:** 2 — Decision Panel + AI Guide  
**Status:** 🟢 In progress — Decision Workspace MVP (Preview only)  
**PM approval:** ✅ Sprint 2 시작 (2026-07-24)  
**Prior QA:** [EPIC1_SPRINT1_QA_REPORT.md](./EPIC1_SPRINT1_QA_REPORT.md)

---

## Success sentence

> **사용자는 Workspace에 들어오면 AI가 먼저 다음 행동을 추천하고, Decision·Confidence·Next Action을 한눈에 보며 "왜 지금 이 작업을 해야 하는지" 이해한다.**

---

## Sprint 1 → Sprint 2 pivot

| Sprint 1 (done) | Sprint 2 (this sprint) |
|-----------------|------------------------|
| Journey shell | **Decision First** fixed panel |
| Workflow checklist | Guide-style step detail |
| AI Guide placeholder | **AI speaks first** + Next Action |
| — | **Confidence** mock score + delta |
| — | Goal loading animation · Hero journey copy |

---

## Kickoff — 4 questions

### 1. 이번 Sprint에서 사용자가 달라지는 경험은?

Workspace 우측에 **고정 Decision Panel**이 생기고, AI가 **먼저** 다음 행동·예상 시간·Confidence 변화를 말한다.  
Workflow는 체크리스트가 아니라 **현재 단계 Guide**(소요 시간, 필요 자료, 완료 예상 %)로 느껴진다.

### 2. Workflow 단계

| Step | Sprint 1 | Sprint 2 |
|------|----------|----------|
| Landing | North Star | Journey Hero (Goal→Workflow→Decision→Execution) |
| Goal | 5 goals | 자연어 Goal + 선택 후 3~5s AI 구성 애니메이션 |
| Workflow | Step list | Guide cards + completion forecast |
| Workspace | Empty shell | **Decision Panel + AI Guide + Confidence + Next Action** |

### 3. PM 검증 — Product QA

**Primary UX question:**

> Workspace에서 AI가 다음 행동을 명확히 알려주고, Decision·Confidence가 보이는가?

**5 questions (Constitution + Sprint 2 focus):**

1. Landing — 5초 안에 **Strategy Workspace** (보고서 아님)인가?
2. Goal — 선택이 직관적이고 AI 구성 중임을 느끼는가?
3. Workflow — Guide(소요·자료·진행률)로 다음 행동 고민이 없는가?
4. Workspace — **Decision Panel** + AI가 먼저 말하는가? (**Sprint 1 FAIL → must PASS**)
5. 전체 — AI가 프로젝트를 **계속 이끄는** 느낌인가?

**UX Laws:** Law3 (AI next action) must **PASS** this sprint.

### 4. Production 배포 가능?

**Conditional** — Preview → Product QA 전체 PASS (incl. Law3) → then Production + tag `epic1-sprint2`.  
Sprint 1 Production remains **HOLD** until Sprint 2 passes or PM merges release.

---

## Scope

### In

- **Workspace right panel (fixed):**
  - Current Decision (HOLD / GO / NO GO mock)
  - Confidence % (+ delta on step complete mock)
  - Next Action (title, ETA minutes, reason)
  - Completion forecast when step done
- **AI Guide block:** AI speaks first — not empty placeholder
- **Workflow view:** current step guide (duration, required inputs, materials list)
- **Workflow progress forecast:** today / tomorrow / this week %
- **Goal:** softer KO labels + post-select loading state (3–5s, mock — no new LLM)
- **Landing Hero:** journey-centric copy; de-emphasize "report" / legacy product name
- i18n KO first · `@repo/ui` · mock/template data OK
- Preview deploy · Product QA · no prod until PM sign-off

### Out

- Real LLM analysis · SWOT/TAM execution · new prompts
- Live Confidence engine (Epic 2) — **mock scores OK**
- Export · new tools · legacy sidebar removal

### Forbidden

Constitution default: new AI models, analysis engines, prompt rewrites, export.

---

## Implementation notes

- Panel component lives in `apps/web/features/workflow-journey/` (or `@repo/ui` composite if reusable)
- Mock confidence/decision from goal + workflow step index — no backend required
- Reuse journey cookies from Sprint 1
- Read [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md) — **Decision First**

---

## Sprint closure format (mandatory)

```text
Sprint 결과

새 기능:
❌ 작성하지 않음

새로운 사용자 경험:
✅ (fill after sprint)

이번에 해결한 문제:
"왜 지금 이 작업을 해야 하지?"

다음 Sprint에서 해결할 문제:
(TBD — Epic 1 Sprint 3 or Epic 2)
```

---

## Completion ritual

```text
Implement → lint/build → Preview → PM Product QA (5 + UX Laws) → fixes → Production → tag epic1-sprint2
```

---

## Cursor prompt (when PM says start)

```text
GOAL: Epic 1 Sprint 2 — Decision Panel + AI Guide + Confidence + Next Action
READ FIRST: docs/PRODUCT_CONSTITUTION.md, EPIC1_SPRINT1_QA_REPORT.md, this file
BUILD: Workspace fixed right panel · AI speaks first · Workflow guide cards · Goal loading · Landing journey hero
FORBIDDEN: new LLM/analysis/export/prompts — mock data OK
UX LAWS: Law3 must PASS (AI next action)
VERIFY: pnpm lint && pnpm build · Preview only until PM prod approval
```
