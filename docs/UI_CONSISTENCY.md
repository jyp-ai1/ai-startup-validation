# UI Consistency Audit

> **Sprint P1 — P2** · CPO sign-off target  
> **Date:** 2026-07-29  
> **Rule:** No UI changes until this audit is approved. Delete/Merge in a dedicated cleanup sprint after Route block is verified.

---

## Executive summary

LaunchLens runs **three parallel UI stacks** in code. Users on the canonical journey see **one**; legacy code still exists and causes confusion during development and partial deploys.

| Stack | Where users see it | Status |
|-------|-------------------|--------|
| **Journey (V2)** | `/`, `/who`, `/workflow`, `/validation` | ✅ **Canonical — KEEP** |
| **AppShell** | `/workspace` (2+ projects), `/settings`, `/admin` | ⚠️ **Secondary — KEEP, align tokens** |
| **Legacy projects / founder** | `/projects/*` (should be blocked) | ❌ **DELETE after redirect QA PASS** |

**Root cause of “옛 UI + 새 UI 혼합”:** Same repo, multiple headers/sidebars/workspaces; middleware not yet live on Production (`458f384` at audit time).

---

## 1. Headers

| UI | File | Used on live routes? | Verdict |
|----|------|---------------------|---------|
| **LandingHeader** | `features/landing/components/landing-header.tsx` | `/` | ✅ KEEP |
| **JourneyLayout header** | `features/workflow-journey/components/journey-layout.tsx` | `/who`, `/workflow`, `/validation` | ✅ KEEP → becomes **Workspace GNB** |
| **JourneyGlobalNav** | `features/workflow-journey/components/journey-global-nav.tsx` | Journey routes | ✅ KEEP (simplify for Workspace) |
| **AppHeader / AppShell** | `components/app-shell.tsx` | `/workspace`, `/settings`, `/admin` | ✅ KEEP (hub/admin only) |
| **V2WorkspaceProjectHeader** | `features/workflow-journey/components/v2/v2-workspace-project-header.tsx` | `/validation` | ✅ KEEP |
| **WorkspaceHeader (generic)** | `components/workspace/workspace-header.tsx` | Legacy `/projects/*` | ❌ DELETE |
| **WorkspaceHeader (polish)** | `features/workspace-polish/components/workspace-header.tsx` | Legacy project home | ❌ DELETE |
| **V2WorkspaceHomeHeader** | `v2/v2-workspace-home-header.tsx` | Orphan | ❌ DELETE |
| **V2WorkspaceDetailHeader** | `v2/v2-workspace-detail-header.tsx` | Orphan | ❌ DELETE |
| **V2ThinkingLoopHeader** | `v2/v2-thinking-loop-header.tsx` | Orphan | ❌ DELETE |

**Inconsistency:** Header heights h-14 (Journey) vs h-16 (Landing) vs AppShell breadcrumb bar. **Target:** one GNB spec in `DESIGN_SYSTEM.md`.

---

## 2. Sidebars

| UI | File | Live routes? | Verdict |
|----|------|--------------|---------|
| **AppSidebar** | `components/app-shell.tsx` + `lib/sidebar-nav.ts` | Hub, settings, admin | ✅ KEEP (not on Project Workspace) |
| **V2JourneyMiniNav** | `v2/v2-journey-mini-nav.tsx` | `/validation` (right rail scroll) | 🔄 **REPLACE** → left **Navigation tree** (IA) |
| **JourneyWorkspaceNav** | `intelligence-workspace/journey-workspace-nav.tsx` | Orphan | ❌ DELETE |
| **V2WorkflowNav** | `v2/v2-workflow-nav.tsx` | Orphan | ❌ DELETE |
| **FounderWorkspaceLayout rails** | `founder-workspace-layout.tsx` | Orphan | ❌ DELETE |
| **WorkspaceInsightPanel** | `components/workspace/workspace-insight-panel.tsx` | Redirected routes | ❌ DELETE |

**CPO rule:** Project Workspace = **left Navigation tree only** (no AppShell sidebar, no right-rail mini-nav long term).

---

## 3. Workspace views

| View | File | Route | Verdict |
|------|------|-------|---------|
| **V2StrategyWorkspaceView** | `v2/v2-strategy-workspace.tsx` | `/validation` | ✅ **CANONICAL** |
| **V2ThinkingWorkspaceMain** | `v2/v2-thinking-workspace-main.tsx` | `/validation` | ✅ KEEP (Main content) |
| **V2DemoExperience** | `v2/v2-demo-experience.tsx` | `/validation?demo=*` | ✅ KEEP |
| **PersonaSelectionView** | `v2/persona-selection-view.tsx` | `/who` | ✅ KEEP |
| **V2WorkflowGuideView** | `v2/v2-workflow-guide-view.tsx` | `/workflow` | ✅ KEEP |
| **MyProjectsHome** | `my-projects/components/my-projects-home.tsx` | `/workspace` | ✅ KEEP (hub list) |
| **V2AuthenticatedWorkspace** | `v2-authenticated-workspace.tsx` | No imports | ❌ DELETE |
| **StrategyWorkspaceShell** | `strategy-workspace-shell.tsx` | Orphan | ❌ DELETE |
| **FounderTodayWorkspace** | `founder-today-workspace.tsx` | Orphan | ❌ DELETE |
| **ExecutionWorkspaceView** | `execution-workspace-view.tsx` | Redirect target only | ❌ DELETE |
| **ProjectWorkspaceHome** | `workspace-home/project-workspace-home.tsx` | `/projects/[id]` | ❌ DELETE |
| **InterviewWorkspace** | `interview/interview-workspace.tsx` | Redirected | ❌ DELETE |
| **V2WorkspaceHome/List/Detail views** | `v2-workspace-*-view.tsx` | Orphan | ❌ DELETE |

---

## 4. Cards (duplicates)

| Pattern | Count | Examples | Verdict |
|---------|-------|----------|---------|
| Entity list cards | 8 | `grant-card`, `report-card`, `project-card`, … | 🔄 MERGE → one `EntityListCard` (post-MVP) |
| Score / stat displays | 6 | `validation-score-hero`, `v2-project-health-card`, … | 🔄 MERGE → `ScoreStatCard` |
| V2 active cards | 4 | `v2-evidence-metadata-card`, `v2-workspace-card` | ✅ KEEP |
| Founder approval cards | many | `founder-ai-pm/*` | ❌ DELETE with founder tree |
| Custom `rounded-2xl border bg-card` | ~80 | founder-ai-pm panels | ❌ DELETE; V2 uses shared token |

---

## 5. Loading

| Component | File | Verdict |
|-----------|------|---------|
| **JourneyPageSkeleton** | `journey-page-skeleton.tsx` | ✅ KEEP (journey + workspace load) |
| **LandingLoading** | `app/[locale]/loading.tsx` | ✅ KEEP |
| **AsyncStatePanel** | `components/async-state-panel.tsx` | ✅ KEEP |
| **ConsultingPageSkeleton** | 9× under `/projects/[id]/loading.tsx` | ❌ DELETE |
| **WorkspaceSkeleton / CoachSkeleton** | workflow-journey | ❌ DELETE |
| **AiThinkingOverlay** | `ai-thinking-overlay.tsx` | 🔄 MERGE into V2 loading steps (Epic 4) |

---

## 6. AI message / chat

| Component | File | Verdict |
|-----------|------|---------|
| **V2AiPmInbox + V2AiPmWorkingExperience** | `v2/v2-ai-pm-inbox.tsx`, `v2-ai-pm-working-experience.tsx` | ✅ **ACTIVE on `/validation`** |
| **AiPmMessage / AiPmConversation** | `ai-state/ai-pm-conversation.tsx` | 🔄 KEEP as primitive; consolidate bubbles |
| **V2AiPmConsultingThread** | `v2-ai-pm-consulting-thread.tsx` | ❌ DELETE (zero imports) |
| **ConsultantChatPanel / ConsultantPanel** | `features/ai-consultant/*` | ❌ DELETE with projects tree |
| **founder-ai-pm/** (~60 files) | panels + chat | ❌ DELETE entire subtree |
| **LandingConsultantDemo** | landing | ✅ KEEP (marketing mock only) |

---

## 7. Duplicate layouts

| Layout | Wraps | Verdict |
|--------|-------|---------|
| `(public)/layout` | Journey, Landing | ✅ KEEP |
| `(shell)/layout` + AppShell | Hub, settings | ✅ KEEP |
| **FounderWorkspaceLayout** (3-col) | Orphan | ❌ DELETE |
| **JourneyLayout** | Journey + validation | ✅ **Freeze as Workspace shell** (see DESIGN_SYSTEM) |

---

## 8. Deletion backlog (estimated ~100+ files)

After **Route QA PASS** on Production:

1. `features/workflow-journey/components/founder-ai-pm/**`
2. `features/workflow-journey/components/intelligence-workspace/**`
3. `features/projects/**` (page tree already redirected)
4. `features/interview/**`
5. Orphan V2 views listed above
6. `app/[locale]/(shell)/projects/**` pages (keep redirect only)

**Do not delete until:** middleware commit `9c3653a+` verified on Production.

---

## 9. What users actually see today (canonical map)

```
/           → LandingHeader
/who        → JourneyLayout + PersonaSelectionView
/workflow   → JourneyLayout + V2WorkflowGuideView
/validation → JourneyLayout + V2StrategyWorkspaceView  ★
/workspace  → AppShell + MyProjectsHome (multi-project only)
/settings   → AppShell
```

---

## Sign-off

| Check | Status |
|-------|--------|
| Legacy UI inventory complete | ✅ |
| DELETE list approved by CPO | ⏳ |
| Cleanup sprint scheduled | ⏳ (after Route QA) |

---

## Related docs

- `docs/SCREEN_MAP.md` — routes
- `docs/WORKSPACE_IA.md` — target structure
- `docs/DESIGN_SYSTEM.md` — layout + components + visual rules
