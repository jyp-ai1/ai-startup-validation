# LaunchLens Product Constitution

**Version:** 2.3 (CPO Rule #0 — 2026-07-27)  
**Ratified:** 2026-07-24 (Sprint 0 — PM Sign-Off: PASS WITH REVISIONS)  
**Authority:** This document is the **supreme product law**. Epic이 20개가 되어도 흔들리지 않는 기준.  
**Supersedes:** Ad-hoc feature decisions · menu-first IA · report-generator positioning · **AI Startup Validation Tool** framing

> **Read order:** Constitution → [LAUNCHLENS_ROADMAP_V1.md](./LAUNCHLENS_ROADMAP_V1.md) → Sprint kickoff → implement

---

## Product North Star (v2.2 — Thinking Workspace)

> **LaunchLens is a Thinking Workspace for Founders — not an AI Startup Validation Tool.**

**Tagline:** *Think Better. Decide Better.*

**Category:** 창업자의 전략적 사고를 축적하는 AI Workspace

**Sprint success metric:** 기능 개수 ✗ → **대표가 생각하기 얼마나 쉬운가** ✓

**CTO implementation law:**

> 기능을 추가하지 마십시오. 사용자가 "다음에 무엇을 해야 하는지" **3초** 안에 이해하지 못한다면 실패입니다. 디자인보다 **사고 흐름**을 우선하십시오.

---

## Product North Star (v2.1 — Sprint 1 Pivot)

> **LaunchLens는 세션(Session) 기반 AI가 아니라 프로젝트(Project) 기반 AI다.**

Users do not save conversations — they **evolve strategy projects** across days.

**Canonical (ADR-022):**

```text
LaunchLens is Project-Centric AI.

Every conversation belongs to a project.
Every project owns its context.
Every decision belongs to its history.
```

```text
생각 → 결정 → 기억 → 다음날 → 계속
```

**Memory requires login.** MVP ships: Google Login · **내 프로젝트** · Project CRUD · Korean UI.

**Prior North Star (Layer 1 — still valid inside a project):**

> LaunchLens prepares the founder's decision — not a one-shot chat.

---

## Product North Star (v1 — reference)

Every feature must pass one gate:

> **"이 기능이 대표의 의사결정을 대신 준비하는가?"**

Prepares the founder's decision → ship. Does not → do not build.

**Experience North Star (Layer 1):** In 30 seconds — understand **why to keep going** + approve **one decision**.

**Signature morning copy (immutable):**

```text
좋은 아침입니다, 대표님.

밤새 회사를 검토했습니다.

결론은 그대로입니다.

오늘은 이것만 승인해 주시면 됩니다.
```

Same four lines every day. Content **below** the signature varies from real overnight data.

This sentence is **canonical**. Use identically in:

- README
- Landing hero
- Vision / investor one-pager
- Sprint kickoff documents

Any feature that does not serve **decision preparation** is out of constitution.

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

## Rule #0 (supreme — above all features)

> **LaunchLens는 사용자의 생각을 대신하지 않는다. 더 좋은 생각을 하도록 돕는다.**

Every feature, screen, and AI behavior must pass this rule before any other gate.

**One-sentence identity (CPO):**

> 우리는 Startup Validation Tool을 만드는 것이 아니라, **창업자의 Thinking Workspace**를 만드는 것이다.

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

### Principle 12 — Demo First (Product Rule)

매 Sprint마다 아래 질문에 답할 수 있어야 한다.

> **"대표에게 3분 안에 이 기능을 보여주면, 아무 설명 없이도 이해할 수 있는가?"**

| Answer | Action |
|--------|--------|
| **YES** | Ship |
| **NO** | UX 수정 — 기능 추가 금지 |

Ship report must lead with **User Scenario** (step-by-step), not feature list.

### Sprint success gates (Roadmap v1.0 — immutable)

| Horizon | Question |
|---------|----------|
| **Landing** | 30초 안에 서비스 가치를 이해할 수 있는가? |
| **Workspace** | 5분 안에 첫 전략 검토를 완료할 수 있는가? |
| **Project & Context** | 일주일 후에도 이전 의사결정을 이어 쓸 수 있는가? |

**Team identity:** 기능을 만드는 팀이 아니라 **제품 경험**을 만드는 팀.

**Active roadmap:** [LAUNCHLENS_ROADMAP_V1.md](./LAUNCHLENS_ROADMAP_V1.md) — Sprint 0–7 순서 외 개발 금지.

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

## UI Freeze (2026-07-26 — Layer 1 Experience complete)

> **Amended 2026-07-26:** Sprint 0 **V2 UX Reset** supersedes this freeze — full IA delete + rebuild. See [SPRINT_0_V2_UX_RESET.md](./sprints/SPRINT_0_V2_UX_RESET.md).

Layer 1 **Experience** is **FROZEN**. No new UI patterns until intelligence layers ship.

### ❌ Forbidden

- New Dashboard
- New Panel
- New Tab
- New Card
- New Layout
- New IA change

### ✅ Allowed

- Intelligence improvement
- Data quality improvement
- Reasoning improvement
- AI PM memory improvement
- CEO Decision improvement

**Fixed shell (30 / 40 / 30):**

```text
Left 30%   — 회사 진행상황 (8 steps, never hide)
Center 40% — AI PM Office (chat only)
Right 30%  — Executive Decision (conclusion-first)
```

---

## Product Layers

| Layer | Name | Status | Scope |
|-------|------|--------|-------|
| **1** | **Experience** | ✅ Complete | CEO → AI PM Office → Decision → Approve |
| **2** | **Intelligence** | 🟢 Next ~2 months | Market · Competitor · Pricing · Grants · News · VOC · SNS · Investment → Knowledge Graph → Hypothesis → Decision |
| **3** | **Autonomous Company** | 📋 Final | Overnight research → Meeting → Strategy update → CEO report → Approve → Execute |

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
| 2026-07-25 | Part II — Product Loop Level: Behavior + KPI metrics (not screens) | CPO PASS 95→100 |
| 2026-07-26 | v1.1 — AI PM North Star, 3 Layers, UI Freeze, signature morning copy | CPO |
| 2026-07-26 | v2.0 pivot — Sprint 0 UX Reset supersedes UI freeze; Validation → AI PM flow | CPO |
| 2026-07-27 | v2.3 — Rule #0, implementation gate (3 Q), Thinking Workspace identity lock | CPO |

# Part II — Cursor Product Constitution (Permanent Operations)

**Authority:** Supersedes Epic/Sprint/Mission/Release/Queue as **Cursor work goals**. Part I (North Star, Principles, UX Laws) remains immutable product law.

## Purpose

LaunchLens is **not** a project to finish. LaunchLens is a **continuously growing AI product**.

Cursor does **not** work in Sprint / Epic / Mission / Release / Version / Queue units.

Cursor **improves Production Product forever**.

## Product Loop Level — Behavior, not screens

Cursor does **not** improve screens.

Cursor always improves **user behavior**.

| ❌ Screen goal | ✅ Behavior goal |
|---------------|-----------------|
| Landing improved | User **understands the service in 5 seconds** |
| Goal improved | User **selects a Goal in 10 seconds** |
| Workflow improved | User **passes through Workflow without thinking** |
| Workspace improved | User **registers a project in Workspace** |
| Decision improved | User **trusts AI** · **understands GO/HOLD** |
| Execution improved | User **starts the next action immediately** |
| — | User **returns again** |

**Behavior is the Product Loop.** Screens are where behaviors happen — not what Cursor optimizes for.

## Cursor KPIs (mandatory)

Cursor does **not** look at screens. Cursor improves these KPIs:

```text
Service Understanding
    ↓
Goal Selection Rate
    ↓
Workflow Completion
    ↓
Workspace Entry
    ↓
Project Registration
    ↓
AI Trust
    ↓
Decision Understanding
    ↓
Execution Start
    ↓
Return Rate
    ↓
Feedback Score
```

**Every change must improve at least one KPI.** If the answer to "which KPI, by how much?" is missing — **do not implement**.

### Pre-implementation gate

Before any change, Cursor must answer:

```text
이 변경이
사용자를
어느 KPI에서
얼마나 개선하는가?
```

No answer → no implementation.

## Thinking priority

```text
User Behavior  >  Screen  >  Component  >  Code
```

Always.

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

**Sprint focus (CPO — 2026-07-27):**

```text
Sprint 1 — 제품을 만들었다 ✅
Sprint 2 — 브랜드를 만든다
Sprint 3 — 경쟁력을 만든다
```

**절대로 기능을 만들지 않는다.** 모든 구현은 아래 질문을 통과해야 한다:

1. 사용자가 **더 깊게 생각**하게 만드는가?
2. **더 나은 의사결정**을 돕는가?
3. 프로젝트의 **맥락(Context)을 축적**하는가?

**하나라도 아니면 만들지 않는다.**

LaunchLens는 AI Wrapper가 아니다. **Thinking Workspace**다.

**Current priority:** `/validation` Workspace 고도화보다 **Sprint 2 GTM**(Landing · Live Demo)을 먼저. Workspace 방향은 Sprint 1에서 충분히 잡혔음. 병목은 *"왜 이 서비스를 써야 하는가"*.

Do **not** implement features or screens. Implement **behaviors**.

| ❌ Wrong | ✅ Right |
|---------|---------|
| Landing improved | User understands service in **5 seconds** |
| Decision Card implemented | User understands **why HOLD in 3 seconds** |
| Workflow UI polish | User passes Workflow **without thinking** |

## Ship cycle (Release Rule — mandatory)

```text
구현 → Build PASS → Lint PASS → Type PASS → Commit → Push → Preview Deploy → Preview URL → QA Checklist → Before/After → User Scenario → Self Review → CPO Review
```

Cursor reports **only after** Commit · Push · Preview URL are complete. Never ask "커밋할까요?"

**Production URL:** https://ai-startup-validation-tau.vercel.app

## Report format (Release Rule — mandatory)

```text
1. Build / Type / Lint — PASS
2. Commit hash
3. Push — origin/main
4. Preview Deploy — 완료
5. Preview URL
6. User Scenario (step-by-step — 끊김 없이 동작 확인)
7. QA Checklist
8. Before / After screenshots
9. Self Review (UI · UX · Known Issues)
```

Template: [templates/DAILY_AUTONOMOUS_REPORT.md](./templates/DAILY_AUTONOMOUS_REPORT.md)

## Forbidden output (Cursor)

- 완료했습니다 / 끝났습니다  
- 다음 작업은 무엇인가요?  
- 승인 부탁드립니다 / 배포할까요? / **커밋할까요?**
- 구현했습니다 → (승인 대기)
- Queue가 끝났습니다 / Mission 완료 / Sprint 종료 / Epic 종료 / Release 완료  

## Journey walk (Production check — not work goals)

Walk Production to **observe behaviors**, not to "improve screens":

**Landing → Goal → Workflow → Workspace → Decision → Execution → History → Admin**

Supporting surfaces (Loading · Error · Retry · Coach · Evidence · Confidence · Analytics · Admin · SEO · i18n · Dark Mode) exist to **move KPIs** — they are not Cursor work units.

## New features (all three required)

1. User is **faster**  
2. User **understands easier**  
3. **AI PM** experience is stronger  

Otherwise: **do not add**. Prefer improving **existing behaviors** on the Journey.

## CPO operating model

The CPO no longer assigns task lists or evaluates screens. The CPO checks Production each morning and evaluates **behaviors only**:

- **어디서 멈췄는가**
- **왜 멈췄는가**
- **왜 신뢰하지 않았는가**
- **왜 다음 행동을 안 했는가**

Direction signals (examples):

- "이 부분 불편하다"  
- "이 부분은 아니다"  
- "이건 좋다"  
- "이 경험을 더 강화하자"  

Cursor maps each signal to a **KPI + behavior**, then implements · QA · deploys.

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
