# Sprint 1.5 — Strategy Workspace IA Rebuild

**Version:** Sprint 1.5 (CPO Final)  
**Goal:** LaunchLens를 **AI 전략회의 Workspace** 골격으로 전환 — 기능 추가 없음  
**Authority:** ADR-027 · [DESIGN_CONSTITUTION.md](../DESIGN_CONSTITUTION.md)

---

## Scope

| In | Out |
|----|-----|
| 3-column IA (Workflow · Main · AI Summary) | Real AI engine |
| Width unification (`max-w-7xl`) | New data models |
| Workflow navigation | Page route changes |
| Meeting summary (not vertical report) | Payment / team |
| Edit · Delete · Re-input | |

---

## Layout

```text
Desktop (xl+):  Workflow | Main | AI Summary
Tablet (lg):    Workflow | Main + Summary below
Mobile:         Main → Workflow → Summary
```

---

## IA rules (immutable)

1. Input lives in **Main** only when step selected — never repeat in a second card
2. **Workflow** = navigation + 3-line AI snippet
3. **AI Summary** = status + opinions + one next CTA
4. **Review** step = meeting bullets only; detail via nav click

---

## Key files

| File | Role |
|------|------|
| `v2-strategy-workspace.tsx` | 3-column orchestrator |
| `v2-workflow-nav.tsx` | Left navigation |
| `v2-main-workspace-panel.tsx` | Center detail |
| `v2-ai-summary-panel.tsx` | Right summary |
| `v2-meeting-summary.tsx` | Compact review bullets |
| `v2-workflow-steps.ts` | Step status helpers |
| `journey-layout.tsx` | `width="workspace"` → max-w-7xl |

---

## Ship (Release Rule)

Commit · Push · Preview URL · User Scenario · Before/After · QA · Self Review
