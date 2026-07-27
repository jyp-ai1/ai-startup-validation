# Sprint 4.1 — Decision Workspace (Morning Brief → Session → Closed)

**Status:** 🔄 IN PROGRESS  
**CPO verdict on 4.0:** HOLD — still information-consumption UI, not Decision Workspace

---

## CPO diagnosis

CEO's first 5 seconds: **"그래서 난 오늘 뭐 하면 되는데?"**

Not: read 6 blocks of AI output.

**Target flow:**

```
Morning Brief (1 decision, 1 CTA)
  → [결정 시작]
Decision Session (activity · 권고 · 진행/보류/재조사)
  → Meeting Closed (오늘 결정 완료 · 다음 회의)
```

---

## P0 (Sprint 4.1)

| # | Deliverable | Status |
|---|-------------|--------|
| 1 | Inbox → **AI PM Approval Queue** — one agenda, one CTA | 🔄 |
| 2 | Activity → high-level PM work; details **collapsed** | 🔄 |
| 3 | "AI 의견" → **AI PM 권고** | 🔄 |
| 4 | Decision → **진행 / 보류 / 재조사** (radio meeting UI) | 🔄 |
| 5 | **Meeting Closed** screen | 🔄 |

---

## Product language (P1)

Replace internal terms globally:

| Remove | Use |
|--------|-----|
| 검토 / Review | 회의 |
| Evidence (user-facing) | 근거 / 권고 이유 |
| — | 업무 · 권고 · 승인 · 결정 · 후속 업무 |

**One Agenda Rule:** one meeting topic per day.

---

## PASS / HOLD

| PASS | HOLD |
|------|------|
| "AI worked today; I reviewed and decided." | "AI shows analysis results." |

---

## Implementation

| File | Role |
|------|------|
| `v2-ai-pm-decision-types.ts` | Brief / session / closed types |
| `v2-ai-pm-work-engine.ts` | `buildAiPmDecisionWorkspace()` |
| `v2-ai-pm-decision-session-store.ts` | brief → session → closed persistence |
| `v2-ai-pm-working-experience.tsx` | 3-phase UI |

---

## Related

- [SPRINT_4_AI_PM_EXPERIENCE.md](./SPRINT_4_AI_PM_EXPERIENCE.md) (4.0 — superseded by 4.1)
- ADR-035 · ADR-036
