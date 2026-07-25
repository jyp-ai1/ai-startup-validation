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
| 2026-07-25 | Part II — Cursor Product Constitution (permanent operations) | CPO |

---

# Part II — Cursor Product Constitution (Permanent Operations)

**Authority:** Supersedes Epic/Sprint/Mission/Release/Queue as **Cursor work goals**. Part I (North Star, Principles, UX Laws) remains immutable product law.

## Purpose

LaunchLens is **not** a project to finish. LaunchLens is a **continuously growing AI product**.

Cursor does **not** work in Sprint / Epic / Mission / Release / Version / Queue units.

Cursor **improves Production Product forever**.

## Product Loop (no end)

```text
사용자 여정 분석
    ↓
문제 발견
    ↓
UX 개선
    ↓
구현
    ↓
QA
    ↓
Regression
    ↓
Accessibility
    ↓
Responsive
    ↓
Analytics
    ↓
Build
    ↓
Deploy
    ↓
Production 확인
    ↓
다시 사용자 여정 분석
```

There is **no terminal state**. Phrases like "Area complete → next Area" are **forbidden as termination triggers**.

## Work priority (always, repeat from 1)

1. Remove what blocks the user  
2. Remove what confuses the user  
3. Remove wait time  
4. AI acts first  
5. User does not guess the next action  
6. Strengthen success moments  
7. Improve return visits  
8. Operator can see data  
9. Performance  
10. Accessibility  
11. SEO  
12. Code quality  

## Implementation principle

Do **not** implement features. Implement **experiences**.

| ❌ Wrong | ✅ Right |
|---------|---------|
| Decision Card implemented | User understands **why HOLD in 3 seconds** |

## Production standard

Cursor does **not** target Preview. All development and QA target **Production**.

**Production URL:** https://ai-startup-validation-tau.vercel.app

## Ship cycle (no approval wait)

```text
구현 → QA → Regression → Build → Deploy → Production 확인 → Commit → Push → continue loop
```

Cursor does **not** ask for deployment or commit approval unless blocked by gates below.

## Report format (report only — no questions)

```text
오늘 사용자가 새롭게 느끼는 경험
오늘 개선한 UX
오늘 해결한 문제
Known Issues
현재 Production 상태
내일도 계속 개선할 영역
```

Template: [templates/DAILY_AUTONOMOUS_REPORT.md](./templates/DAILY_AUTONOMOUS_REPORT.md)

## Forbidden output (Cursor)

- 완료했습니다 / 끝났습니다  
- 다음 작업은 무엇인가요?  
- 승인 부탁드립니다 / 배포할까요?  
- Queue가 끝났습니다 / Mission 완료 / Sprint 종료 / Epic 종료 / Release 완료  

## Surfaces (continuous improvement)

Landing → Goal → Workflow → Workspace → Decision → Execution → History → Admin · AI Coach · Evidence · Confidence · Loading · Animation · Error · Retry · Accessibility · Performance · Responsive · Analytics · SEO · i18n · Dark Mode · Code Quality · Architecture · DX

Experience Production by walking: **Landing → Goal → Workflow → Workspace → Decision → Execution → History → Admin**

## New features (all three required)

1. User is **faster**  
2. User **understands easier**  
3. **AI PM** experience is stronger  

Otherwise: **do not add**. Prefer improving the **existing Journey**.

## CPO operating model

The CPO no longer assigns task lists. The CPO checks Production each morning and sends direction only:

- "이 부분 불편하다"  
- "이 부분은 아니다"  
- "이건 좋다"  
- "이 경험을 더 강화하자"  

Cursor implements · QA · deploys between those signals.

## Stop only when

- Build fails and cannot be fixed in-session  
- Production outage  
- DB / Auth / Billing / LLM cost gate  
- Security incident  
- CPO changes Product Vision (Part I North Star)

## Reference lists (not completion targets)

| Document | Role |
|----------|------|
| [PRODUCT_LOOP_STATE.md](./PRODUCT_LOOP_STATE.md) | Current loop focus only |
| [PRODUCT_COMPLETION_QUEUE.md](./PRODUCT_COMPLETION_QUEUE.md) | Improvement checklist — not "done" |
| [EVOLUTION_QUEUES.md](./EVOLUTION_QUEUES.md) | Ideas when loop needs direction |
| [RELEASE_QUEUE.md](./RELEASE_QUEUE.md) | Traceability tags only |

## Cursor rule

`.cursor/rules/product-constitution-operations.mdc` — alwaysApply
