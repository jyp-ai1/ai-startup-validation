# ALABOM — P0 Authenticated Production E2E Report

**Date:** 2026-09-08  
**CPO Status:** 🔴 PENDING / CEO TEST HOLD  
**Production SHA:** `4bd6b99`

---

## 1. Correction Submit Root Cause

```text
handleApplyEdits / handleEditConfirmYes  (workspace-ai-pm-main.tsx)
        ↓
persistWorkspaceStateDbFirst             (added in P0 sprint)
        ↓
persistWorkspaceSnapshotAction           (server action)
        ↓
requireAuthUser('/workspace')            (server-auth.ts)
        ↓
redirect('/auth/login?next=...')         ← demo guest hit this
```

**Why demo was affected:** `v2-strategy-workspace` already uses `isDemoNoPersist` for other writes, but `WorkspaceAiPmMain` did not receive that flag — DB persist ran unconditionally.

**Policy (CPO-aligned):**
- **Demo:** sessionStorage only (`saveWorkspaceDomain`, conversation memory) — no server persist
- **Authenticated project:** DB persist via `persistWorkspaceStateDbFirst`

**Fix:** `enableDbPersistence={!isDemoNoPersist}` passed to `WorkspaceAiPmMain`. Commit `4bd6b99`.

**Not an OAuth QA task** — it was an unintended server-action call from demo UI.

---

## 2. Actual Journey

| Step | Demo (Production @ 4bd6b99) | Authenticated |
|------|----------------------------|---------------|
| Login | N/A (demo) | 🔴 BLOCKED — no OAuth creds on pod |
| Project Create | N/A | 🔴 BLOCKED |
| Document Upload | ✅ PASS (paste) | 🔴 BLOCKED |
| Understanding | ✅ PASS | 🔴 BLOCKED |
| Correction Open | ✅ PASS | 🔴 BLOCKED |
| Correction Submit | ✅ PASS (no /auth/login) | 🔴 BLOCKED |
| Refresh persistence | 🟡 NOT TESTED (demo sessionStorage) | 🔴 BLOCKED |
| Q&A | ✅ PASS (proceeded to confirm Q) | 🔴 BLOCKED |
| Judgment | 🟡 NOT REACHED | 🔴 BLOCKED |
| Final Review | 🔴 NOT REACHED | 🔴 BLOCKED |

---

## 3. State Evidence (Demo @ 4bd6b99)

**Before correction:**
- 사업: "영세 양조장… B2B SaaS…" (from document)
- 고객: "아직 확인 중"

**After correction submit (step 6):**
- URL: `/workspace?demo=guided&sample=custom&fresh=1` ✅ (not `/auth/login`)
- edit_confirm: "수정 내용을 이렇게 이해했습니다" shown

**After "맞습니다, 다음으로" (step 9):**
- URL: still on workspace ✅
- Next Q references document + "영세 양조장" in confirm text

**After refresh:** NOT RUN (demo uses sessionStorage; G4 requires authenticated DB path)

---

## 4. Repeat Question

Demo sample flow (prior run): Q3 answer referenced in Q4 confirm — **PASS**  
Custom document path after correction: advanced to new confirm Q — **no immediate repeat PASS**

Full custom Q1→Q4 chain: **NOT COMPLETED** in this run.

---

## 5. Production

| | |
|---|---|
| Git SHA | `4bd6b9904bc9d87db0ef6c862bf8206e268a707` |
| Build SHA | `4bd6b99` |
| Production SHA | `4bd6b99` |
| Match | ✅ PASS |

---

## 6. Verdict

**BLOCKED** — Demo correction submit **FIXED** ✅; Authenticated E2E **NOT VERIFIED** 🔴

| Gate | Status |
|------|--------|
| G1 Document → Understanding | 🟢 CLOSED |
| G2 Custom document Q&A | 🟡 Partial (demo only) |
| G3 Correction submit | 🟢 Demo PASS / Auth unverified |
| G4 Refresh persistence | 🔴 Requires authenticated run |
| G5 Final Review | 🔴 Not reached / not in scope |

**Next required:** Authenticated production run with `.qa-auth/storageState.json` or CEO login — Tests 2→3→5 on **real project + PDF/DOCX upload**.

**Autonomous feature work: STOPPED.**
