# Sprint 1.2 — Adaptive Interview Foundation

**Version:** Sprint 1.2  
**Owner:** CPO  
**Assignee:** Cursor CTO  
**Parent:** [SPRINT_1_FOUNDATION.md](./SPRINT_1_FOUNDATION.md) · ADR-022

---

## Sprint Goal

Sprint 1.1 **Project Foundation** 완료 후, 사용자가 LaunchLens **Thinking Experience**를 처음 경험한다.

> AI Engine은 구현하지 않는다. Mock Interview + Context Memory UI.

---

## Scope

| P | Item | Status |
|---|------|--------|
| P0 | Guided Workspace (empty → interview entry) | ✅ |
| P0 | Project metadata (review type + description) | ✅ |
| P0 | Interview skeleton — 2 mock questions, one at a time | ✅ |
| P1 | Journey progress panel (right) | ✅ |
| P1 | Context Memory mock (left, auto-save UI) | ✅ |
| P2 | Decision placeholder after Q2 | ✅ |

---

## User Flow

```text
Google Login
  ↓
내 프로젝트
  ↓
프로젝트 생성 (이름 · 검토 유형 · 설명)
  ↓
전략 인터뷰 시작
  ↓
Q1 → Q2
  ↓
Context Memory + Journey
  ↓
오늘의 결정 (Mock)
```

---

## Routes

| Route | Purpose |
|-------|---------|
| `/my-projects` | Create project with metadata |
| `/my-projects/[id]` | Guided interview entry |
| `/my-projects/[id]/interview` | Interview workspace |

---

## Data

Interview state stored in `startup_projects.onboarding_context.sprint12` (no AI, no `project_context` repo yet).

---

## NOT in Sprint 1.2

- AI Engine / adaptive questions
- Dashboard · stats · AI score
- Chat UI
- `project_context` repository wiring
- Export · payment · team

---

## Release Rule

build → lint → typecheck → commit → push → Vercel Preview → [SPRINT_1_2_QA.md](./SPRINT_1_2_QA.md)

---

## CPO Review (post-ship)

1. 설명 없이 인터뷰 시작 가능한가?
2. 질문이 부담 없이 이어지는가?
3. 프로젝트 → 인터뷰 → 컨텍스트 흐름이 이해되는가?
4. "ChatGPT가 아니다" 정체성이 느껴지는가?
