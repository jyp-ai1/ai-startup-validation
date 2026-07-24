# LaunchLens Product Constitution

**Version:** 1.0  
**Ratified:** 2026-07-24 (Sprint 0 — PM Sign-Off: PASS WITH REVISIONS)  
**Authority:** This document is the **supreme product law**. Epic이 20개가 되어도 흔들리지 않는 기준.  
**Supersedes:** Ad-hoc feature decisions · menu-first IA · report-generator positioning

> **Read order:** Constitution → [LAUNCHLENS_2.0_ROADMAP.md](./LAUNCHLENS_2.0_ROADMAP.md) → Sprint kickoff → implement

---

## Product North Star

> **LaunchLens는 AI가 보고서를 생성하는 서비스가 아니라, 전략적 의사결정을 완료하도록 프로젝트를 끝까지 이끄는 AI Strategy Workspace이다.**

This sentence is **canonical**. Use identically in:

- README
- Landing hero
- Vision / investor one-pager
- Sprint kickoff documents

Any feature that does not serve **decision completion** is out of constitution.

---

## What LaunchLens is / is not

| Is | Is not |
|----|--------|
| Workflow-driven strategy workspace | AI report generator |
| Goal → guide → decision → completion | Feature menu dashboard |
| AI recommends next action | User hunts menus |
| Evidence-backed confidence | Black-box scores |
| Project **completion** | PDF delivery as end state |

---

## Product Principles (immutable)

### Principle 1 — Goal First

사용자는 기능을 찾지 않는다. **목표를 선택한다.**

### Principle 2 — Workflow First

메뉴보다 **현재 해야 하는 일**을 보여준다.

### Principle 3 — Decision First

모든 Workflow는 **GO / HOLD / NO GO** 판단을 위한 과정이다.

### Principle 4 — Evidence First

모든 AI 결과는 **근거(Evidence)** 와 **Confidence**를 가진다.

### Principle 5 — Completion First

사용자가 보고서를 **받는 것**이 아니라 **프로젝트를 완료**하도록 만든다.

### Principle 6 — Korean First

모든 UI · 라벨 · 설명 · 워크플로우의 **기본 언어는 한국어**. (EN 등은 secondary)

---

## Workflow philosophy

LaunchLens is **workflow-based SaaS**, not feature-based SaaS.

### Legacy (reject)

```text
Dashboard → Function → Report
```

### LaunchLens (mandate)

```text
Goal → Workflow → Decision → Execution → Completion
```

Every screen must answer: **Which step am I in? What is next?**

---

## Information Architecture — Goal-based

Persona tabs (Startup / Corporate / PM / VC) are **deprecated** as primary IA.

### Entry flow

```text
Landing
    ↓
오늘 무엇을 하시겠습니까?
    ○ 사업 가능성 검토
    ○ 신규사업 기획
    ○ MVP 개발
    ○ 투자 준비
    ○ 시장 조사
    ↓
AI
    ↓
Workflow 자동 생성
    ↓
(예) Startup Workflow · PM Workflow · Investor Workflow
    ↓
Strategy Workspace — Step 1
```

**Rule:** User selects **goal**, not **module**. AI composes workflow template.

### Top-level zones (user mental model)

| Zone | Purpose |
|------|---------|
| Landing | 5-second value · CTA |
| Goal Selection | Intent capture |
| Workflow | AI-generated step plan |
| Strategy Workspace | Current step + AI Guide + Progress |
| Decision | GO / HOLD / NO GO + Confidence (always reachable) |
| Settings | Account, locale — minimal |

Legacy modules (Research, VOC, Competitors, Reports, …) exist **under workflow steps**, not as peer primary nav.

---

## UX Laws (every screen)

| Law | Rule |
|-----|------|
| **Law 1** | Primary nav **≤ 7 items** |
| **Law 2** | One screen = **one primary CTA** |
| **Law 3** | AI **always recommends next action** |
| **Law 4** | User must **not wonder what to do** |
| **Law 5** | Every screen understandable in **≤ 30 seconds** |
| **Law 6** | **Workflow before features** in visual hierarchy |

Violations require PM exception or redesign — not “quick ship.”

---

## Out of Scope (LaunchLens 2.0 — Epic 5+ unless PM reopens)

Explicit **not now** list to prevent feature creep:

```text
Pitch Deck Generator
Landing Page Builder
AI Debate / multi-agent argument UI
Multi-language as co-primary (KO remains default)
Enterprise Admin / SSO / Audit (beyond beta)
Slack integration
Jira / Linear sync
White-label / reseller portal
Marketplace / plugin store
Custom LLM fine-tuning UI
Billing / Stripe (until post-open-beta)
Browser crawl as user-facing product (Epic 2 internal only)
MCP connectors as user-facing product (Epic 6+)
```

Revisit only via ADR + PM sign-off.

---

## Epic structure (LaunchLens 2.0)

| Epic | Name | North Star alignment |
|------|------|----------------------|
| **0** | Product Pivot | Constitution ratified |
| **1** | **Goal & Workflow Experience** | Goal select → AI workflow → no menu hunting |
| **2** | **Confidence & Evidence Engine** | Every claim traceable |
| **3** | **Decision Engine** | GO/HOLD/NO GO without reading full report |
| **4** | **Execution Workspace** | Idea → PRD / roadmap / dev handoff |
| **5** | **Living Strategy Platform** | Ongoing monitor + decision log |

---

## Product QA (not bug QA alone)

Every sprint ships with **exactly five** Product QA questions. All must PASS for sprint sign-off.

### Epic 1 — reference set

1. **5초** 안에 서비스 목적을 이해하는가?
2. 다음 행동을 **고민하지 않는가**?
3. 메뉴를 찾지 않고 **Workflow를 따라가는가**?
4. AI 추천이 **자연스러운가**?
5. **계속 진행하고 싶은가**?

Functional QA (login, API, build) is **baseline**, not sufficient.

Template: [templates/UX_QA_TEMPLATE.md](./templates/UX_QA_TEMPLATE.md)

---

## Epic 1 Sprint 1 — success sentence

> **사용자는 Goal 하나만 선택하면, AI가 자신에게 필요한 Workflow를 자동 구성하고, 다음에 무엇을 해야 하는지 고민하지 않아도 된다.**

Feature count is **not** the metric. This sentence is.

Brief: [sprints/EPIC1_SPRINT1_KICKOFF.md](./sprints/EPIC1_SPRINT1_KICKOFF.md)

---

## Governance

| Decision type | Who decides |
|---------------|-------------|
| Product direction, Epic scope, QA PASS | **PM (GPT)** |
| Implementation, architecture within constitution | **Cursor (Senior Engineer roles)** |
| Constitution change | PM + ADR in [DECISIONS.md](./DECISIONS.md) |

**Cursor must not:**

- Add features not mapped to active Epic/Sprint kickoff
- Expand primary nav beyond UX Laws without PM approval
- Ship sprint without 5 Product QA answers documented

---

## Related documents

- [LAUNCHLENS_2.0_ROADMAP.md](./LAUNCHLENS_2.0_ROADMAP.md)
- [SPRINT_PROCESS.md](./SPRINT_PROCESS.md)
- [sprints/SPRINT_0_PRODUCT_PIVOT.md](./sprints/SPRINT_0_PRODUCT_PIVOT.md) — Sprint 0 record
- [LAUNCHLENS_PRODUCT_EXPERIENCE.md](./LAUNCHLENS_PRODUCT_EXPERIENCE.md) — v1.0 bible (align over time; Constitution wins on conflict)

---

## Amendment log

| Date | Change | Approver |
|------|--------|----------|
| 2026-07-24 | v1.0 ratified — North Star, Principles, UX Laws, Goal IA, Out of Scope | PM PASS WITH REVISIONS |
