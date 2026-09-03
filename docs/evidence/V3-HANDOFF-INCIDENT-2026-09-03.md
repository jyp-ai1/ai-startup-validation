# Handoff Incident — CEO git pull failure (2026-09-03)

## What happened

CEO ran on handoff machine:

```powershell
git pull origin feature/v3-baseline-recovery
.\scripts\handoff-push-v3-baseline.ps1
```

Results:

1. `Merge with strategy ort failed`
2. Script not recognized (file absent in working tree)

## Root cause (CTO analysis)

| Factor | Explanation |
|--------|-------------|
| Script location | `handoff-push-v3-baseline.ps1` exists on **`origin/feature/v3-baseline-recovery` @ `8b37b78`** — confirmed on Cloud VM |
| CEO likely branch | Local V3 branch (not `feature/v3-baseline-recovery`) with divergent history |
| `git pull` | Attempted **merge** remote recovery branch into local tree → **ort merge failed** |
| Script missing | Pull did not complete; script never landed in working tree |
| Operational error | CTO instructed CEO to run Git ops — **violation of CTO-owned recovery principle** |

## Original preservation status

**UNKNOWN until read-only diagnose runs.**

Possible states:

- Clean working tree, pull rejected → likely **safe**
- Merge in progress (`MERGE_HEAD`) → **needs CTO on handoff — no CEO reset**

Run (CEO one-time, read-only):

```powershell
Set-Location "C:\Users\김성길\Documents\GitHub\cursor-project"
.\scripts\handoff-diagnose-readonly.ps1
```

If script absent (pull failed), paste output of section 4 commands manually OR open Cursor local agent on handoff clone.

## Correct recovery path (redesigned)

```text
CTO session ON handoff machine (Cursor local / self-hosted worker)
        ↓
Read-only: git status, V3 branch scan
        ↓
Identify V3-complete branch (8 modules + 2 tests)
        ↓
Direct push ONLY (no pull, no merge):
  git push -u origin <V3-SOURCE>:feature/v3-baseline-recovery --force-with-lease
        ↓
Cloud CTO: pnpm run verify:v3-baseline
```

**CEO: no further Git commands.**

## Script delivery without merge

Option A — CTO local agent on handoff (preferred): clone already has V3; push script optional.

Option B — Single-file fetch (CTO only, not CEO):

```powershell
git fetch origin feature/v3-baseline-recovery
git show origin/feature/v3-baseline-recovery:scripts/handoff-push-v3-baseline.ps1 |
  Out-File -Encoding utf8 scripts\handoff-push-v3-baseline.ps1
```

This does **not** merge branches; writes one file only. **CTO executes, not CEO.**
