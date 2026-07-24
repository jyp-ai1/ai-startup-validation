# Epic 3 Kickoff — Project Intelligence Workspace

**Status:** 🟢 **IN PROGRESS** (Autonomous)  
**Started:** 2026-07-25  
**Tag:** `alpha-v2.0.5`  
**Constitution:** [PRODUCT_CONSTITUTION.md](../PRODUCT_CONSTITUTION.md)

---

## Goal

> 분석 → **프로젝트를 AI와 같이 진행한다**

Workspace opens with AI speaking first:

```
좋은 아침입니다.
오늘은 VOC 2건만 추가하면 Confidence가 82% 됩니다.
예상 시간 15분
```

On exit:

```
오늘 8% 향상되었습니다.
내일은 Pricing을 추천합니다.
```

---

## Phase plan

| Phase | Scope | Status |
|-------|-------|--------|
| **1** | Multi-project mock, switcher, archive, favorite | ✅ Journey `/workspace` |
| **2** | Today, AI Daily Coach, focus, progress | ✅ Today tab |
| **3** | Decision Timeline, activity, confidence history | ✅ History tab |
| **4** | AI Memory (mock) | ✅ Today + History |
| **5** | Smart nav — Today / Workflow / Decision / History / Settings | ✅ Replaces journey phase bar in workspace |
| **6** | Gamification — badges, progress bars | ✅ Achievements panel |
| **7** | Workspace polish (Notion + Linear + Cursor feel) | 🔄 Ongoing |

---

## Implementation (v2.0.5)

**Route:** `/workspace` (journey alpha path)

**Module:**

- `apps/web/features/workflow-journey/components/intelligence-workspace/*`
- `apps/web/features/project-intelligence/constants/*` (mock data)
- `workflow.epic3.*` i18n (ko/en)

**Not in scope:** Real DB projects, auth changes, LLM calls.

---

## QA gates (Epic 3)

| Gate | Target | v2.0.5 |
|------|--------|--------|
| Build / Lint / Type | PASS | ✅ |
| Smoke `/goal` → `/workspace` | PASS | ✅ |
| Accessibility | 95+ | ✅ 96 |
| Performance | 90+ | ⚠️ ~80 (landing) |

---

## Next (autonomous)

- Phase 7 polish: shared card tokens with logged-in `ProjectWorkspaceHome`
- Bridge journey mock → authenticated dashboard project
- Epic 4: Performance + real intelligence wiring
