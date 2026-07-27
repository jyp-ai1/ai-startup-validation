# Evidence Engine

**Status:** Foundation (pre-Sprint 3)  
**Authority:** CPO · ADR-031  
**Rule:** AI는 **근거 없이** 판단하지 않습니다.

> **Purpose:** LaunchLens는 ChatGPT가 아닙니다. Thinking Workspace입니다.

**Companion:** [SPRINT_3_THINKING_ENGINE.md](./sprints/SPRINT_3_THINKING_ENGINE.md) · Decision Memory (Sprint 1.6)

---

## Why before AI

많은 팀은 AI부터 붙입니다. LaunchLens는 **Workspace → Memory → Evidence → AI** 순서입니다.

```text
Evidence  — what we know (signals · sources)
Thinking  — questions · reasoning
Decision  — what we chose
Memory    — why we chose it (Sprint 1.6 ✅)
```

AI without Evidence = generic chat.  
AI with Evidence = **Evidence-driven Thinking Engine**.

---

## Evidence structure

| Field | Role |
|-------|------|
| **Source** | Where it came from (market · interview · competitor · doc) |
| **Signal** | What it tells us |
| **Confidence** | How strong (not a black-box score) |
| **Linked step** | Which workflow step it supports |

---

## Rules

1. **No claim without source** — recommendations cite evidence
2. **Mock → real migration path** — Sprint 1 mock keys map to evidence types
3. **User can see evidence** — transparent, not hidden in prompt
4. **Evidence ≠ artifact** — SWOT/PRD generation stays Sprint 4

---

## Sprint 3 gate

Thinking Engine ships only when Evidence layer is defined and wired — not "LLM wrapper on textarea."
