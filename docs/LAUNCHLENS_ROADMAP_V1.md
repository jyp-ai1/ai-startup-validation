# LaunchLens Roadmap v1.1

**Authority:** CPO Final · ADR-028 · ADR-029 (v1.1 reorder)  
**Ratified:** 2026-07-27  
**Rule:** 이 순서 외 개발 금지

> **Companion:** [PRODUCT_CONSTITUTION.md](./PRODUCT_CONSTITUTION.md) · [TASKS.md](./TASKS.md)

---

## Identity

LaunchLens is **not** an AI Startup Validation Tool.

> **Thinking Workspace for Founders**

**Sprint 기준:** 기능을 얼마나 만들었는가 ✗ → **대표가 생각하기 얼마나 쉬운가** ✓

**Team identity:** 기능을 만드는 팀이 아니라 **제품 경험**을 만드는 팀.

**CTO principle (immutable):**

> 이번 Sprint에서는 기능을 추가하지 마십시오. 사용자가 "다음에 무엇을 해야 하는지" 3초 안에 이해하지 못한다면 실패입니다. LaunchLens는 기능이 많은 서비스가 아니라, 생각이 자연스럽게 이어지는 서비스여야 합니다.

---

## Sprint question (one per sprint)

| Sprint | Question |
|--------|----------|
| **1** | 어떻게 하면 사용자가 **생각**하게 만들까? |
| **2** | 처음 보는 사람도 **30초** 안에 서비스를 이해할까? |
| **3** | AI는 어떻게 질문해야 사람을 **더 깊게** 생각하게 만들까? |
| **4** | **언제** 문서를 생성해주는 것이 가장 자연스러울까? |
| **5** | 혼자 쓰던 Thinking을 어떻게 **팀 자산**으로 만들까? |
| **6** | **언제** 돈을 낼 만큼 가치가 생길까? |
| **7** | 운영자는 **무엇을 매일** 확인해야 할까? |

---

## Product success criteria (cross-sprint)

| # | Question | Horizon |
|---|----------|---------|
| 1 | **30초** — 서비스 가치 이해 | Landing (Sprint 2) |
| 2 | **5분** — 첫 전략 검토 완료 | Workspace (Sprint 1) |
| 3 | **1주** — 이전 의사결정 이어쓰기 | Decision Memory (Sprint 1.6) |

---

## Sprint 0 — Foundation ✅

로그인 · 프로젝트 · DB

| Item | Status |
|------|--------|
| Google Login | ✅ |
| Project | ✅ |
| Context / DB | ✅ partial |
| Workspace entry | ✅ |

---

## Sprint 1 — Thinking Workspace 📋 ACTIVE

### Sprint question

> 어떻게 하면 사용자가 생각하게 만들까?

### Exit (must ship — AI 고도화 아님)

| Capability | Status |
|------------|--------|
| **Thinking Flow** (loop · nav · no page hop) | ✅ 1.4–1.5 |
| **Review Board** (회의 요약 · vocabulary) | ✅ 1.3–1.5 |
| **Decision Memory** | ⬜ **1.6 only remaining** |

Mock AI PM / mock review timer = OK for Sprint 1. Real AI → **Sprint 3**.

**Kickoff:** [SPRINT_1_6_DECISION_MEMORY.md](./sprints/SPRINT_1_6_DECISION_MEMORY.md)

---

## Sprint 2 — Landing (Product begins)

### Sprint question

> 처음 보는 사람도 30초 안에 서비스를 이해할까?

### User journey

```text
Landing → 서비스 이해 → Demo → 로그인 → Workspace
```

**NOT:** 회원가입 → 뭐하는 서비스인지 모름

### Sections (order)

Hero → Product → How it Works → Demo → Pricing → FAQ → Footer

**Kickoff:** [SPRINT_2_LANDING.md](./sprints/SPRINT_2_LANDING.md)

### Auth IA

| State | Header |
|-------|--------|
| 비로그인 | Product · Pricing · Resources · Login · Start Free |
| 로그인 | **Workspace · Projects · Profile** — Landing 메뉴 **제거** |

---

## Sprint 3 — Thinking Engine (Real AI)

### Sprint question

> AI는 어떻게 질문해야 사람을 더 깊게 생각하게 만들까?

- Adaptive Question
- Evidence Search
- Reasoning
- Recommendation

**Kickoff:** [SPRINT_3_THINKING_ENGINE.md](./sprints/SPRINT_3_THINKING_ENGINE.md)

---

## Sprint 4 — Artifacts

### Sprint question

> 언제 문서를 생성해주는 것이 가장 자연스러울까?

PRD · SWOT · Pitch Deck · Business Model — AI가 **"지금 생성하시겠습니까?"** 로 제안.

**절대 메뉴에 넣지 않는다.**

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

**제품 기능 아님** — 운영툴. Workspace UI 복제 **금지**.

```
Users · Projects · Validation 수 · Workspace 생성 수
Retention · DAU · AI 사용량 · Feedback · 문의 · 에러 · Logs
```

---

## Information Architecture (fixed)

### 비로그인

```text
Landing · Product · Pricing · Resources · Login · Start Free
```

### 로그인

```text
Workspace · Projects · Profile
```

### 관리자

```text
Dashboard · Users · Projects · Analytics · Feedback · Settings
```

### Product flow (logged in)

```text
Project → Workspace → Review Board → Decision Memory
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
