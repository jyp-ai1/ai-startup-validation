# Sprint 1.4 — Continuous Strategy Loop

**Version:** Sprint 1.4 (CPO Final)  
**Goal:** 페이지 이동 없이 **한 Workspace**에서 입력 → 검토 → 질문 → 입력 → 검토 루프  
**Authority:** ADR-026 · [DESIGN_CONSTITUTION.md](../DESIGN_CONSTITUTION.md)

---

## Problem (CPO)

1. `/validation` → `/investigate` → `/conclusion` = 사용자가 *"왜 화면이 또 바뀌지?"*
2. Form SaaS 느낌 (아이디어 → 문제 → 고객 → MVP → 가격 나열)
3. 검토 버튼 = 끝 (LaunchLens는 여기서 **시작**해야 함)
4. Review Board = 보고서 카드 (회의록처럼 한눈에 읽혀야 함)

---

## Deliverables

| # | Item | Priority | Status |
|---|------|----------|--------|
| 1 | `/validation` 단일 `V2StrategyWorkspaceView` | P0 | ✅ |
| 2 | `/investigate`, `/conclusion` → `/validation` redirect | P0 | ✅ |
| 3 | Chip 기반 선택 입력 (+ 문제, + 고객, …) | P0 | ✅ |
| 4 | AI PM 확인 다이얼로그 (입력 → 이해 확인 → 확인/수정) | P1 | ✅ mock |
| 5 | Meeting-notes Review Board (시장/고객/가격/차별성) | P0 | ✅ |
| 6 | 검토 후 follow-up 질문 → Board 자동 갱신 | P0 | ✅ mock |
| 7 | One Screen, One Thought (검토 중·입력 중 단일 초점) | P0 | ✅ |
| 8 | Motion (fade-in, scroll-to-board, toast) | P2 | ✅ baseline |

---

## Loop (immutable)

```text
입력 (아이디어 + chip 추가)
  ↓
AI가 현재 이해한 내용
  ↓
현재 내용으로 검토하기
  ↓
Loading (same screen)
  ↓
Review Board (회의록)
  ↓
AI follow-up 질문
  ↓
입력 → Board 갱신
  ↓
다시 검토
```

---

## Key files

| Path | Role |
|------|------|
| `v2-strategy-workspace.tsx` | Unified workspace + phases |
| `v2-field-ai-dialog.tsx` | AI PM confirm flow |
| `v2-review-meeting-board.tsx` | Meeting-notes board |
| `v2-validation-view.tsx` | Re-exports workspace |
| `investigate/page.tsx`, `conclusion/page.tsx` | Redirect to `/validation` |

---

## Out of scope (Sprint 1.4)

- Real AI pipeline (`use-v2-research-pipeline`) — mock timer retained
- `/my-projects` interview merge
- Context Memory + Decision Log full wiring (P1 next)
- Payment, team, export

---

## QA targets

- [ ] No page transition during full loop
- [ ] Feels like explaining to AI, not filling a form
- [ ] Board scannable in one glance (*"아"*)
- [ ] After review, loop continues with one question
- [ ] One primary focus per moment (One Screen, One Thought)

---

## Ship

Release Rule (all required before CPO PASS):

1. Build · Lint · Type PASS
2. Commit · Push · Preview Deploy · Preview URL
3. **User Scenario** — step-by-step, no breaks
4. QA Checklist · Before/After · Self Review

See [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md) — Principle 12 Demo First.
