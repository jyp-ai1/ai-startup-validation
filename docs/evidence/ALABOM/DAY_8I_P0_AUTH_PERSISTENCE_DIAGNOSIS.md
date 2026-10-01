# ALABOM — P0 Authenticated Persistence Diagnosis

**Date:** 2026-09-08  
**Type:** Verification preparation / code-path diagnosis only  
**Code changes:** None  
**CPO Gate:** P0 Authenticated Persistence Verification — diagnosis phase

---

## Executive Summary

Authenticated workspace **is wired** for DB persistence (`enableDbPersistence=true`), and project scope **is enforced** (`userId + projectId`). However, **understanding-phase corrections and conversation memory do not round-trip through the DB snapshot**, and **loop Q&A is not persisted after each answer**. Refresh is therefore **predicted to lose CEO corrections** unless/until loop turns exist in `aiPmLoop` and downstream memory is rebuilt.

This is a **code-path gap**, not an OAuth-environment gap.

---

## A. `enableDbPersistence` Policy

| Mode | `isDemoNoPersist` | `enableDbPersistence` | DB writes |
|------|-------------------|----------------------|-----------|
| `demo-guided` | `true` | `false` | sessionStorage only |
| `demo-readonly` | `true` | `false` | sessionStorage only |
| **`default` (authenticated)** | **`false`** | **`true`** | server action enabled |

**Source:**

```151:152:apps/web/features/workflow-journey/components/v2/v2-strategy-workspace.tsx
  const isDemoNoPersist = isDemoReadonly || isDemoGuided;
  const storageProjectId = isDemoGuided ? DEMO_SESSION_PROJECT_ID : projectId;
```

```892:892:apps/web/features/workflow-journey/components/v2/v2-strategy-workspace.tsx
          enableDbPersistence={!isDemoNoPersist}
```

```365:367:apps/web/features/workflow-journey/components/project-workspace-shell/workspace-ai-pm-main.tsx
    if (projectId && enableDbPersistence) {
      void persistWorkspaceStateDbFirst({ projectId });
    }
```

**Verdict:** Authenticated path **should** call DB persist on correction apply/confirm. ✅ Policy correct.

---

## B. End-to-End Persistence Flow (Authenticated)

```text
Login (requireAuthUser on server routes)
  ↓
createMyProjectAction
  → onboardingContext.v2Demo.pastedContent  (document seed)
  → NOT v2Workspace yet
  ↓
/workspace?project={id}
  → getOwnedProject(user.id, projectId)     (ownership gate)
  → parseWorkspacePersistedSnapshot(owned)    (v2Workspace from DB)
  → extractProjectSeedDocument(owned)         (v2Demo fallback)
  ↓
WorkspacePersistedHydrator
  → applyWorkspaceSnapshotToCache(projectId, snapshot)
  ↓
V2StrategyWorkspaceView (mode=default)
  → bootstrapWorkspaceFromDb(projectId, initialWorkspaceSnapshot)
  → seedDocument → saveWorkspaceDocumentText (client cache)
  ↓
User: Understanding → Correction → Apply/Confirm
  → handleDomainChange → saveWorkspaceDomain (sessionStorage)
  → handleEditConfirmYes → saveConversationMemory (sessionStorage)
  → persistWorkspaceStateDbFirst({ projectId })
        ↓
      buildWorkspacePersistedSnapshot(projectId)
        ↓
      persistWorkspaceSnapshotAction
        → requireAuthUser
        → assertProjectOwner(user.id, projectId)
        → repo.update(onboardingContext.v2Workspace = snapshot)
  ↓
Refresh / reopen same ?project=
  → Server loads v2Workspace from DB
  → WorkspacePersistedHydrator re-applies snapshot to sessionStorage cache
```

---

## C. What `buildWorkspacePersistedSnapshot` Actually Saves

```19:41:apps/web/features/workspace/lib/sync-workspace-persistence.ts
export function buildWorkspacePersistedSnapshot(projectId: string): WorkspacePersistedSnapshot {
  const documentText = loadWorkspaceDocumentText(projectId) ?? undefined;
  const aiPmLoop = loadAiPmLoopState(projectId);
  // ...
  return {
    documentText,
    aiPmLoop,
    workspaceFacts,
    understandingPhase: loadUnderstandingPhase(projectId),
    reviewCount,
    projectConsulting,
    updatedAt: new Date().toISOString(),
  };
}
```

| Field | Storage on write | Survives refresh? |
|-------|------------------|-------------------|
| `documentText` | DB `v2Workspace` | ✅ Yes (via hydrator) |
| `aiPmLoop` (turns, gapState, lastDecision) | DB | ✅ Yes (if written) |
| `understandingPhase` | DB | ✅ Yes |
| `reviewCount` | DB | ✅ Yes |
| `workspaceFacts` (phase history only) | DB | ✅ Yes |
| `projectConsulting` | DB | ✅ Yes (if populated) |
| **`domain` (business/customer/market…)** | **sessionStorage only** | 🔴 **No** |
| **`entities` (LaunchLensDomainContext)** | **sessionStorage only** | 🔴 **No** |
| **`conversationMemory` (USER_CORRECTED facts)** | **sessionStorage only** | 🔴 **No** |

**Domain key:** `launchlens.domain.{projectId}.workspace`  
**Memory key:** `launchlens.conversationMemory.{projectId}`

Neither is included in `WorkspacePersistedSnapshot` (`workspace-persisted-state.ts`).

---

## D. Correction Path Detail

### Step 1 — User edits domain (UI)

`handleDomainChange` → `saveWorkspaceDomain` + `saveWorkspaceEntities` → **sessionStorage**

### Step 2 — "수정 반영" (apply)

`handleApplyEdits` → `understandingPhase = edit_confirm` → `persistWorkspaceStateDbFirst`

Snapshot at this point includes `understandingPhase` but **not** corrected customer text.

### Step 3 — "맞습니다, 다음으로" (confirm)

`handleEditConfirmYes`:

1. `applyUserCorrection` → updates `conversationMemory` facts (USER_CORRECTED)
2. `saveConversationMemory` → **sessionStorage**
3. `persistWorkspaceStateDbFirst` → DB gets `understandingPhase`, `documentText`, possibly empty `aiPmLoop.turns`
4. **Does NOT** write domain or memory to DB

### Predicted refresh behavior (G4)

```text
Before refresh: customer = "영세 양조장" (sessionStorage memory + domain)
After refresh:
  - documentText restored from DB (original upload) ✅
  - memory empty (not in snapshot) 🔴
  - domain re-inferred from document OR empty 🔴
  → customer likely reverts to document inference or "아직 확인 중"
```

**Verdict:** G4 **predicted FAIL** for understanding-phase correction without code change.

---

## E. Loop Q&A Persistence

`applyWorkspaceLoopAnswer` (each answer submit) writes:

- `aiPmLoop` turns → sessionStorage
- `conversationMemory` → sessionStorage
- `domain/entities` → sessionStorage

**DB persist triggers (authenticated only):**

| Trigger | File |
|---------|------|
| Document intake | `v2-strategy-workspace.handleDocumentIntake` |
| Loop document updated | `handleLoopDocumentUpdated` |
| **Correction apply/confirm** | `workspace-ai-pm-main.handleApplyEdits/Confirm` |
| Session pause | `handleSessionPause` |
| Loop complete | `handleLoopComplete` |
| Review start | `runReview` |

**Not triggered:** after each loop answer submit.

So mid-conversation Q&A survives **soft navigation** (same tab, sessionStorage intact) but **hard refresh** loses turns until loop complete / session pause / review persist runs.

---

## F. Project Scope (user + projectId)

```27:28:apps/web/features/workspace/actions/workspace-persistence-actions.ts
  const user = await requireAuthUser('/workspace');
  // ...
  const project = await assertProjectOwner(user.id, projectId);
```

```70:77:apps/web/features/projects/services/project-service.ts
export async function getOwnedProject(userId, projectId) {
  if (project.isDemo || project.userId !== userId) return null;
  return project;
}
```

**Verdict:** Writes are scoped to authenticated owner. ✅

---

## G. Refresh / Reopen Restore Path

1. **Server:** `workspace/page.tsx` loads `owned` project → `parseWorkspacePersistedSnapshot`
2. **Client:** `WorkspacePersistedHydrator` → `applyWorkspaceSnapshotToCache`
3. **Client:** `bootstrapWorkspaceFromDb` → sets UI bootstrap from snapshot
4. **Client init:** `loadWorkspaceDomain` / `loadConversationMemory` from sessionStorage

If sessionStorage is empty (hard refresh):

- Domain falls back to `inferDomainFromPaste(seedDocument)` — **original document**, not CEO correction
- Memory starts empty unless rebuilt from `aiPmLoop.turns` via `buildConversationMemoryFromSources`

---

## H. Demo vs Authenticated Policy (Confirmed)

| | Demo | Authenticated |
|---|------|---------------|
| Persist trigger | Blocked (`enableDbPersistence=false`) | Enabled |
| Correction UI | sessionStorage | sessionStorage + DB snapshot (partial) |
| Auth redirect on persist | N/A (skipped) | Requires login session |
| Demo regression @ 4bd6b99 | **CLOSED** | — |

---

## I. Diagnosis Verdict

| Check | Status |
|-------|--------|
| A. enableDbPersistence on auth | ✅ Code correct |
| B. projectId + user scope | ✅ Code correct |
| C. Refresh restores correction | 🔴 **Gap — domain/memory not in snapshot** |
| D. Loop Q&A survives refresh | 🟡 Only after loop-complete/pause/review persist |
| OAuth required for diagnosis | ❌ Not the blocker — code path gap is |

---

## J. Recommended Next Step (when CPO authorizes fix)

**Minimal fix scope** (not implemented in this diagnosis turn):

1. Extend `WorkspacePersistedSnapshot` with `domain`, `entities`, `conversationMemory`
2. Include in `buildWorkspacePersistedSnapshot` / `applyWorkspaceSnapshotToCache`
3. Optionally: persist after each loop answer (or debounced) for mid-conversation refresh

**Until then:** Authenticated E2E Tests 2→3 (correction + refresh) are **predicted FAIL** regardless of OAuth session availability.

---

## K. What Was NOT Done (per CPO)

- No code changes
- No push/deploy beyond this doc commit
- No OAuth credential hunting
- No P0-11 / Final Review / UI polish
- No CEO TEST GO

**Gate remains:** 🔴 PENDING / CEO TEST HOLD
