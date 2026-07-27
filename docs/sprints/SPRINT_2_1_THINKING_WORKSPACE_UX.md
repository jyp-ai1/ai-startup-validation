# Sprint 2.1 — Thinking Workspace UX

**Version:** Sprint 2.1 (CPO Final)  
**Former name:** Workspace IA  
**Goal:** 대표가 **5초 안에** 현재 상황을 이해하는 Workspace  
**Authority:** [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md) · [DESIGN_LANGUAGE.md](../DESIGN_LANGUAGE.md)

---

## Sprint question

> **대표가 생각하기 쉬운 Workspace를 만드는가?**

---

## Success criteria (3 seconds)

사용자가 3초 안에 다음 세 가지를 알 수 있어야 한다.

1. **지금 어디까지 검토했는가?**
2. **AI는 현재 무엇을 이해하고 있는가?**
3. **다음으로 무엇을 하면 되는가?**

---

## Scope

| In | Out |
|----|-----|
| Workspace Header (프로젝트 · 마지막 검토 · Thinking Map) | Evidence Engine (→ Sprint 3) |
| Workflow → **Thinking Map** rename | Real AI |
| State-first main layout (현재 상태 → AI 이해 → 다음 질문 → Review Board) | New routes |
| AI understanding **editable chips** | Form dialogs as primary UX |
| **One** next question + **one** CTA | Multiple CTAs / button rows |
| Review Board meeting-minutes layout + mock Evidence | Billing / Artifacts |
| Same `max-w-7xl` container as Landing | New data models |

**Rule:** 기능 추가 ✗ — **"대표가 화면을 보는 순간 머릿속이 정리되는 경험"**만.

---

## Main layout (state-first)

```text
┌───────────────────────────────────────┐
│ 프로젝트 · AI SaaS 검토 · 마지막 검토   │
└───────────────────────────────────────┘

이번 검토 (Thinking Map inline)
✔ 문제  ✔ 고객  ○ 시장  ○ 경쟁  ○ 가격

AI가 현재 이해한 내용
[chip] [chip] [chip] +

다음 질문 (항상 하나)
대표님. 다음으로 시장 규모를 함께 볼까요?
[시장 검토 시작]

Review Board
이번 검토에서 확인된 내용
근거 (Evidence) — mock
아직 확인되지 않음
AI Recommendation
```

**Left nav:** Thinking Map (fixed) — click scrolls to section.

---

## Design principles

- 홈과 동일한 `max-w-7xl` · 반응형에서만 축소
- 카드 최소화 · Border 최소화 · 정보 그룹화
- 질문이 맨 위가 **아님** — **현재 상태**가 맨 위
- Form SaaS 느낌 제거 — Chip inline edit only

---

## Key files

| File | Role |
|------|------|
| `v2-strategy-workspace.tsx` | 2-column orchestrator (Thinking Map \| Main) |
| `v2-workflow-nav.tsx` | Thinking Map navigation |
| `v2-thinking-workspace-main.tsx` | State-first main panel |
| `v2-workspace-project-header.tsx` | Project header |
| `v2-thinking-map-status.tsx` | Inline review progress |
| `v2-ai-understanding-chips.tsx` | Editable chips |
| `v2-next-question.tsx` | Single question block |
| `v2-review-board-minutes.tsx` | Meeting minutes + mock evidence |

---

## Ship (Release Rule)

Commit · Push · Preview URL · 3-second test · Before/After · QA
