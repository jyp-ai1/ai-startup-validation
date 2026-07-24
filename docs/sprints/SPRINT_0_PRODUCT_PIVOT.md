# Sprint 0 — Product Pivot

**Dates:** 2026-07-24 → TBD  
**Status:** **In Progress — documentation only**  
**Epic:** Phase 0 — Product Pivot  
**Goal:** Reposition LaunchLens from **AI Report Generator** to **Workflow Driven AI Strategy Workspace**.

> **PM rule:** 기능 개발 금지. UX / Product Structure만.

---

## Kickoff (4 questions)

| # | Question | Answer (draft — PM to refine) |
|---|----------|-------------------------------|
| 1 | 이번 Sprint에서 사용자가 달라지는 경험은? | (Sprint 0 = 내부 정렬) 사용자는 **메뉴 나열**이 아니라 **단계별 AI 가이드** 제품을 기대하게 됨 |
| 2 | 어떤 Workflow 단계를 완성? | **전체 Workflow Map v1** — Landing → Goal → Workflow → Workspace |
| 3 | PM이 검증할 것? | 산출물 6종이 **서로 모순 없이** 한 장의 여정으로 읽히는가? |
| 4 | Production 배포 가능? | **N/A** — 문서 Sprint; 코드 배포 없음 (L3.4 RC prod 유지) |

---

## Scope

### In scope

- [ ] Product Vision (2.0 wording)
- [ ] Product Principle (decision-first, guide-not-menu)
- [ ] Workflow Map (end-to-end)
- [ ] Information Architecture (workflow-native, not module menu)
- [ ] Navigation model (minimal; progress over sidebar sprawl)
- [ ] UX Flow (Landing, Goal Selection, Workflow creation, Strategy Workspace)
- [ ] Korean-first copy policy
- [ ] AI Guide zone definition (where consultant lives in workflow)
- [ ] Progress UX definition
- [ ] Align / diff vs `LAUNCHLENS_PRODUCT_EXPERIENCE.md` v1.0

### Out of scope (explicit ban)

```text
❌ AI 모델 추가
❌ 분석 기능 추가
❌ 새로운 Tool 개발
❌ Prompt 개선
❌ Export 개발
❌ 라우트/컴포넌트 구현 (Epic 1 Sprint 1부터)
```

---

## Deliverables

| # | Artifact | Output path | Status |
|---|----------|-------------|--------|
| 1 | Product Vision | Section below → then merge to PX Bible §1 | ⏳ |
| 2 | Product Principle | Section below | ⏳ |
| 3 | Workflow Map | Section below | ⏳ |
| 4 | IA | Section below | ⏳ |
| 5 | Navigation | Section below | ⏳ |
| 6 | UX Flow | Section below | ⏳ |

**PM sign-off required** before Epic 1 Sprint 1 code starts.

---

## 1. Product Vision (draft v2.0)

**One line:**

> LaunchLens는 창업·신사업 결정을 **워크플로우로 안내**하는 AI Strategy Workspace다.

**Not:**

- Report factory
- Feature menu dashboard
- Validation checklist app

**Is:**

- Goal → guided steps → decision → evidence → execution
- AI speaks first; user confirms and advances
- Korean-first for launch market; EN as secondary

---

## 2. Product Principle

| # | Principle | Implication |
|---|-----------|-------------|
| P1 | **Guide, not menu** | Primary UI = current step + next action, not 20 sidebar links |
| P2 | **Decision before document** | GO/HOLD/NO GO visible before PDF/PPT |
| P3 | **Evidence or admit assumption** | No number without source or explicit assumption flag |
| P4 | **Progress is the product** | Progress bar / step state = core retention |
| P5 | **한글 우선** | KO copy canonical; other locales follow |
| P6 | **Workflow completes** | Each Epic ends in shippable user journey slice |

---

## 3. Workflow Map (v1)

```text
[Landing] — 5초 가치 전달
    ↓
[Goal Selection] — 무엇을 결정하려는가 (창업 검증 / 신사업 / 투자 검토 …)
    ↓
[Workflow Created] — AI가 단계 플랜 제시
    ↓
[Strategy Workspace] — 현재 단계 + AI Guide + Progress
    ↓
[Quick Assessment] — GO / HOLD / NO GO + Confidence
    ↓
[Evidence Layer] — (Epic 2) citation, why, assumption
    ↓
[Execution] — (Epic 4) PRD, roadmap, spec
    ↓
[Living Strategy] — (Epic 5) monitor, revisit decisions
```

**Legacy modules** (Research, VOC, Competitors, Reports, …) map **under workflow steps**, not top-level siblings.

---

## 4. Information Architecture (target)

### Top level (user mental model)

| Zone | Purpose |
|------|---------|
| **Home / Landing** | Acquire, explain, CTA |
| **Goal & Workflow** | Intent + generated step plan |
| **Strategy Workspace** | Do work — one step at a time |
| **Decision** | Verdict surface (always reachable) |
| **Settings** | Account, locale, billing (minimal) |

### Deprioritize in nav (keep as deep links / step outputs)

- Flat lists: Research, Evidence, VOC, Competitors, Grants, Reports, PRD, Dev Spec as **peer menus**
- Replace with: **Current step outputs** + **Decision trail**

### Migration note

Existing routes remain for beta users; Epic 1 introduces **workflow shell** that wraps or replaces entry paths.

---

## 5. Navigation model

**Primary:** Workflow stepper (horizontal or vertical) + **AI Guide panel**  
**Secondary:** Collapsed “All modules” or search — power users only  
**Header:** Project name · Progress · Decision badge · Locale · Account  

**Remove from primary nav:** 15+ flat strategy links (migrate to step context).

---

## 6. UX Flow (Epic 1 Sprint 1 target)

### 6.1 Landing

- Hero: workflow promise (not feature grid)
- CTA: **시작하기** → Goal Selection (not raw dashboard)
- Demo: **guided demo workflow** (not admin dashboard dump)

### 6.2 Goal Selection (new)

- Cards: e.g. “아이디어 검증”, “신사업 타당성”, “투자 설득 준비”
- Output: `workflowTemplateId` + copy tone

### 6.3 Workflow creation

- AI shows 4–6 steps (names TBD by PM)
- User confirms → Workspace opens on **Step 1**

### 6.4 Strategy Workspace (replaces Dashboard as home)

- **Left / top:** Progress + current step
- **Center:** Step content (empty states OK in Sprint 1)
- **Right:** AI Guide — next action, not chat-first

---

## UX QA (Sprint 0 — document quality)

PM reviews:

- [ ] Vision ↔ Principle ↔ Workflow ↔ IA ↔ Nav ↔ Flow — **no contradictions**
- [ ] A non-technical reader can draw the user journey from docs alone
- [ ] Legacy feature menu explicitly demoted in IA

---

## Cursor prompt (Epic 1 Sprint 1 — do not run until Sprint 0 sign-off)

```text
GOAL: Epic 1 Sprint 1 — Workflow journey shell (NO analysis features)
READ: docs/sprints/SPRINT_0_PRODUCT_PIVOT.md, docs/LAUNCHLENS_2.0_ROADMAP.md
BUILD: Landing CTA → Goal Selection → Workflow create → Strategy Workspace shell
FORBIDDEN: new AI models, new analysis, prompts, export
UX QA: New user understands product in 5 seconds (PM test)
VERIFY: pnpm lint && pnpm build · Preview deploy
```

---

## Completion criteria

- [ ] All 6 deliverables marked ✅ in table above
- [ ] PM sign-off on this document
- [ ] `LAUNCHLENS_PRODUCT_EXPERIENCE.md` updated or superseded section linked
- [ ] ADR in `DECISIONS.md` for 2.0 pivot
- [ ] Epic 1 Sprint 1 kickoff template filled

**No git tag for Sprint 0** (docs-only). Tag starts Epic 1 Sprint 1 production ship.

---

## Retrospective

*(Fill after PM sign-off)*
