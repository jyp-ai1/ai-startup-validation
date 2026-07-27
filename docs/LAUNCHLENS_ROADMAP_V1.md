# LaunchLens Roadmap v1.1

**Authority:** CPO Final · ADR-028 · ADR-029 (v1.1 reorder)  
**Ratified:** 2026-07-27  
**Rule:** 이 순서 외 개발 금지

> **Companion:** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) · [TASKS.md](./TASKS.md)

---

## Identity

LaunchLens is **not** an AI Startup Validation Tool.

> **Thinking Workspace for Founders**

**Tagline:** *Think Better. Decide Better.*

**Sprint 기준:** 기능을 얼마나 만들었는가 ✗ → **대표가 생각하기 얼마나 쉬운가** ✓

**Team identity:** 기능을 만드는 팀이 아니라 **제품 경험**을 만드는 팀.

---

## Canonical product flow

```text
Landing

↓

"아 이거 내가 필요했던 서비스인데?"

↓

Demo (Live — readonly)

↓

Login

↓

Workspace

↓

Question

↓

Evidence

↓

Decision

↓

Memory

↓

Artifact (last — AI proposes, never menu)
```

**Competitive moat:** Evidence → Thinking → Decision → Memory — not "AI writes well."

**CTO principle (immutable):**

> 이번 Sprint에서는 기능을 추가하지 마십시오. 사용자가 "다음에 무엇을 해야 하는지" 3초 안에 이해하지 못한다면 실패입니다. LaunchLens는 기능이 많은 서비스가 아니라, 생각이 자연스럽게 이어지는 서비스여야 합니다.

**Implementation gate:** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) Rule #0 + 3 questions — 하나라도 아니면 만들지 않는다.

---

## Sprint question (one per sprint)

| Sprint | Question |
|--------|----------|
| **1** | 어떻게 하면 사용자가 **생각**하게 만들까? |
| **2** | **왜** LaunchLens를 써야 하는지 이해하는가? (GTM Foundation) |
| **3** | Evidence-driven — AI는 **근거**와 함께 어떻게 생각을 깊게 할까? |
| **4** | **언제** 문서를 생성해주는 것이 가장 자연스러울까? |
| **5** | 혼자 쓰던 Thinking을 어떻게 **팀 자산**으로 만들까? |
| **6** | **언제** 돈을 낼 만큼 가치가 생길까? |
| **7** | 운영자는 **무엇을 매일** 확인해야 할까? |

---

## Product success criteria (cross-sprint)

| # | Question | Horizon |
|---|----------|---------|
| 1 | **30초** — 서비스 가치 이해 | GTM Foundation (Sprint 2) |
| 2 | **North Star** — 로그인 전 "나도 써봐야겠다" | GTM Foundation (Sprint 2) |
| 3 | **5분** — 첫 전략 검토 완료 | Workspace (Sprint 1) ✅ |
| 4 | **1주** — 이전 의사결정 이어쓰기 | Decision Memory (Sprint 1.6) ✅ |

---

## Sprint 0 — Foundation ✅

로그인 · 프로젝트 · DB · **Design Language**

| Item | Status |
|------|--------|
| Google Login | ✅ |
| Project | ✅ |
| Context / DB | ✅ partial |
| Workspace entry | ✅ |
| **Design Language** | ✅ [DESIGN_LANGUAGE.md](./DESIGN_LANGUAGE.md) |

---

## Sprint 1 — Thinking Workspace ✅ SHIPPED

### Sprint question

> 어떻게 하면 사용자가 생각하게 만들까?

### Exit (must ship — AI 고도화 아님)

| Capability | Status |
|------------|--------|
| **Thinking Flow** (loop · nav · no page hop) | ✅ 1.4–1.5 |
| **Review Board** (회의 요약 · vocabulary) | ✅ 1.3–1.5 |
| **Summary Navigation** | ✅ 1.5 |
| **Continuous Strategy Loop** | ✅ 1.4 |
| **Decision Memory** | ✅ 1.6 |

```text
Sprint 1
──────────────
✅ Thinking Workspace
✅ Review Board
✅ Summary Navigation
✅ Continuous Strategy Loop
✅ Decision Memory
──────────────
Status: SHIPPED
```

Mock AI PM / mock review timer = OK for Sprint 1. Real AI → **Sprint 3**.

**Kickoff:** [SPRINT_1_6_DECISION_MEMORY.md](./sprints/SPRINT_1_6_DECISION_MEMORY.md)

---

## Sprint 2 — Go To Market Foundation 📋 NEXT

**Former name:** Landing · **Nature:** 브랜드를 만드는 Sprint

Landing은 회원가입 페이지가 아니다. **생각을 팔아야 한다.**

### Sprint question

> **"처음 보는 사람이 왜 LaunchLens를 써야 하는지 이해하는가?"**

### Single goal (30초)

Landing을 본 사람이 이 말을 하게 만드는 것:

> **"이거 그냥 AI가 문서 써주는 게 아니네."**

**Unsolved gap:** Sprint 1 ✅ — *"처음 보는 사람이 10초 안에 이해하는가?"* → Sprint 2

**Tagline:** *Think Better. Decide Better.*

**Principles:** [SPRINT_2_PRINCIPLES.md](./SPRINT_2_PRINCIPLES.md) · **Design:** [DESIGN_LANGUAGE.md](./DESIGN_LANGUAGE.md)

### User journey (not generic SaaS)

```text
Landing → "아 이거 내가 필요했던 서비스인데?" → Demo → Login → Workspace
```

**NOT:** Landing → Login → Product (회원가입 페이지)

### Must ship

| Item | Priority |
|------|----------|
| **Why LaunchLens** narrative | P0 |
| **Live Demo** — 로그인 없이 실제 Workspace (readonly) | P0 |
| Hero · How it Works · CTA | P0 |
| Header IA (Why LaunchLens nav) | P0 |

**Do NOT prioritize:** `/validation` Workspace feature work — Demo readonly wiring only.

**Kickoff:** [SPRINT_2_LANDING.md](./sprints/SPRINT_2_LANDING.md)

### Auth IA

| State | Header |
|-------|--------|
| 비로그인 | Product · **Why LaunchLens** · Pricing · Resources · Login · Start Free |
| 로그인 | **Workspace · Projects · Profile** — GTM 메뉴 **제거** · Dashboard ✗ · Analytics ✗ · Settings ✗ |

Workspace = Home.

---

## Sprint 3 — Evidence-driven Thinking Engine

**Former name:** Real AI · **Nature:** 경쟁력을 만드는 Sprint

### Sprint question

> AI는 **근거(Evidence)**와 함께 어떻게 질문해야 사람을 더 깊게 생각하게 만들까?

**Prerequisite:** [EVIDENCE_ENGINE.md](./EVIDENCE_ENGINE.md) — AI보다 Evidence 먼저

- Evidence Search (first)
- Adaptive Question
- Reasoning (transparent)
- Recommendation (one next action)

**Kickoff:** [SPRINT_3_THINKING_ENGINE.md](./sprints/SPRINT_3_THINKING_ENGINE.md)

---

## Sprint 4 — Artifacts

### Sprint question

> 언제 문서를 생성해주는 것이 가장 자연스러울까?

PRD · SWOT · Pitch Deck · Business Model — AI가 **"지금 생성하시겠습니까?"** 로 제안.

```text
대표님. 지금 정보면 투자자용 One Pager를 만들 수 있습니다. [생성하기]
```

**절대 메뉴에 넣지 않는다.** 사용자가 PRD · SWOT · Pitch 찾으러 다니면 실패.

**Kickoff:** [SPRINT_4_ARTIFACTS.md](./sprints/SPRINT_4_ARTIFACTS.md)

---

## Sprint 5 — Collaboration

### Sprint question

> 혼자 쓰던 Thinking을 어떻게 팀 자산으로 만들까?

팀 · 공동 편집 · Decision Timeline

---

## Sprint 6 — Billing

### Sprint question

> 언제 돈을 낼 만큼 가치가 생길까?

Free · Pro · Business

---

## Sprint 7 — Admin (Operations only)

### Sprint question

> 운영자는 무엇을 매일 확인해야 할까?

**제품 기능 아님** — 운영툴. Workspace UI 복제 **금지**. 일반 사용자 IA와 **절대 섞지 않음**.

```text
Dashboard · Users · Projects · Analytics · Feedback · Settings
```

---

## Information Architecture (fixed)

### 비로그인

```text
Product · Why LaunchLens · Pricing · Resources · Login · Start Free
```

### 로그인

```text
Workspace · Projects · Profile
```

Dashboard ✗ · Analytics ✗ · Settings ✗ — **Workspace가 Home**

### 관리자 (별도 — 사용자 IA와 분리)

```text
Dashboard · Users · Projects · Analytics · Feedback · Settings
```

### Product flow (end-to-end)

```text
Landing → Demo → Login → Workspace → Question → Evidence → Decision → Memory → Artifact
```

---

## Release Rule (immutable)

1. Commit · Push · Vercel Deploy · Preview URL
2. Before / After screenshots · QA Checklist
3. CPO Preview QA 가능

미충족 시 **"작업 완료" 보고 금지**.

---

## Legacy tracks (frozen)

- [MASTER_PLAN.md](./MASTER_PLAN.md) · [LAUNCHLENS_2.0_ROADMAP.md](./LAUNCHLENS_2.0_ROADMAP.md)

**Active track:** this document only.
