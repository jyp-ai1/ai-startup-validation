# V3 Baseline Recovery Plan

> **Date:** 2026-09-03 UTC  
> **Sprint:** V3 Baseline Recovery & PR8.5 Browser Gate Closure — **Day 2**  
> **Status:** P0 BLOCKED — awaiting CEO/handoff machine push  
> **Prior art:** [V3-BASELINE-FORENSICS.md](./V3-BASELINE-FORENSICS.md)

---

## Executive summary

Day 2 does **not** recover or rewrite V3 code in the cloud agent environment.

Day 2 delivers:

1. Exact handoff-machine discovery commands  
2. Pre-push integrity checklist  
3. Recovery method (direct push, provenance preserved)  
4. CEO push command template  
5. Post-push remote verification procedure  

**Until CEO pushes from handoff machine, Sprint remains RED / P0 BLOCKED.**

---

## 1. Recovery source (handoff machine)

### 1.1 Where to run

Local path from handoff:

```text
C:\Users\김성길\Documents\GitHub\cursor-project
```

Remote target:

```text
https://github.com/jyp-ai1/ai-startup-validation
```

> Folder name `cursor-project` ≠ separate GitHub repo. Push goes to `ai-startup-validation`.

### 1.2 Discovery commands (CEO / handoff machine)

Run in PowerShell from repo root:

```powershell
Set-Location "C:\Users\김성길\Documents\GitHub\cursor-project"

git branch -a
git log --all --oneline -30
git status
git rev-parse HEAD
git remote -v
```

### 1.3 Identify the V3 branch

Find the branch whose tip contains **all** core files:

```powershell
$files = @(
  "apps/web/features/workflow-journey/lib/business-understanding/build-answer-review.ts",
  "apps/web/features/workflow-journey/lib/business-understanding/update-gap-state-from-review.ts",
  "apps/web/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness.ts",
  "apps/web/features/workflow-journey/lib/business-understanding/decide-next-question-from-review.ts",
  "apps/web/features/workflow-journey/lib/business-understanding/v3-review-pipeline.ts",
  "apps/web/features/workflow-journey/lib/business-understanding/__tests__/ai-pm-loop-v3.test.ts",
  "apps/web/features/workflow-journey/lib/business-understanding/__tests__/v3-runtime-certification.test.ts"
)

foreach ($b in (git branch -a --format="%(refname:short)")) {
  $missing = @()
  foreach ($f in $files) {
    git cat-file -e "${b}:${f}" 2>$null
    if ($LASTEXITCODE -ne 0) { $missing += $f }
  }
  if ($missing.Count -eq 0) {
    Write-Host "V3 COMPLETE BRANCH: $b"
    git rev-parse $b
  }
}
```

**Record output:**

```text
V3_SOURCE_BRANCH=<actual branch name>
V3_SOURCE_SHA=<40-char SHA>
```

Do **not** guess branch names. Use only branches that pass the file check above.

### 1.4 Handoff SHA cross-check

If `cbcde821` exists locally:

```powershell
git cat-file -t cbcde821
git log -1 --oneline cbcde821
```

If it does not exist, use the branch tip SHA from §1.3 as canonical baseline.

---

## 2. Pre-push integrity checklist

**No code changes before push.**

```text
[ ] V3 core 8 modules exist on source branch
[ ] ai-pm-loop-v3.test.ts exists
[ ] v3-runtime-certification.test.ts exists
[ ] PR1–PR8 commit history visible (git log — not squashed away)
[ ] git status clean OR only documented local-only files (not V3 logic edits)
[ ] HEAD SHA recorded
[ ] remote = origin → github.com/jyp-ai1/ai-startup-validation
[ ] Target remote branch = feature/v3-baseline-recovery
```

### Core modules (8)

| # | File |
|---|------|
| 1 | `build-answer-review.ts` |
| 2 | `update-gap-state-from-review.ts` |
| 3 | `evaluate-stage-readiness.ts` |
| 4 | `decide-next-question-from-review.ts` |
| 5 | `v3-review-pipeline.ts` |
| 6 | `v3-legacy-bypass-guards.ts` |
| 7 | hydrate/remount integration (PR6 — in panel/store) |
| 8 | CEO 6 surfaces UI wiring (PR6 — components) |

### Test suites (2)

| File | Expected count |
|------|----------------|
| `ai-pm-loop-v3.test.ts` | 72 scenarios (PR1–PR7) |
| `v3-runtime-certification.test.ts` | 15 (incl. V3-01~V3-12) |

### Explicitly NOT acceptable as baseline

| Artifact | Reason |
|----------|--------|
| `core-v3-conversation-engine.test.ts` | ALABOM Core v3 — different architecture |
| `main` @ current origin | ALABOM v2 loop only |
| Cloud agent re-implementation | Would diverge from PR1–PR8 provenance |

---

## 3. Recovery method

### Selected strategy: **direct push (provenance preserved)**

```text
handoff V3 branch (unchanged)
        ↓
git push -u origin <V3-SOURCE-BRANCH>:feature/v3-baseline-recovery
        ↓
remote feature/v3-baseline-recovery
```

### Do NOT (Day 2)

```text
❌ rebase onto main
❌ squash PR1–PR8 history
❌ cherry-pick individual PRs
❌ rewrite modules from handoff docs
❌ merge infra branch before V3 baseline lands
❌ semantic refactor / naming cleanup
```

### After V3 baseline is on remote (Day 3+)

```text
feature/v3-baseline-recovery
        +
cursor/pr8-5-infra-unblock-6423 (infra only)
        ↓
integration branch (Day 3)
```

Merge order: **V3 baseline first**, infra second. Never replace V3 logic with v2.

---

## 4. Remote push (CEO action)

Replace `<V3-SOURCE-BRANCH>` with branch confirmed in §1.3.

```powershell
Set-Location "C:\Users\김성길\Documents\GitHub\cursor-project"

# Record before push
git rev-parse <V3-SOURCE-BRANCH> | Tee-Object -FilePath .tmp\v3-baseline-sha.txt

# Push — preserves full history
git push -u origin <V3-SOURCE-BRANCH>:feature/v3-baseline-recovery
```

If branch already exists on remote (currently docs-only @ `fb06515`), use force only if CEO confirms local V3 is authoritative:

```powershell
# ⚠️ Only if remote feature/v3-baseline-recovery has NO V3 code (current state)
git push -u origin <V3-SOURCE-BRANCH>:feature/v3-baseline-recovery --force-with-lease
```

**Current remote `feature/v3-baseline-recovery`:** forensics doc only — `--force-with-lease` acceptable after CEO confirms.

---

## 5. Post-push verification (CTO — cloud agent)

After CEO push, CTO runs:

```bash
cd apps/web
git fetch origin
node scripts/verify-v3-baseline-recovery.mjs --branch feature/v3-baseline-recovery
```

Manual cross-check:

```bash
git rev-parse origin/feature/v3-baseline-recovery
# Must match V3_SOURCE_SHA from handoff machine

git ls-tree -r --name-only origin/feature/v3-baseline-recovery | \
  grep -E 'build-answer-review|v3-runtime-certification|ai-pm-loop-v3'
```

### Day 2 PASS criteria

```text
[ ] Actual V3 source branch confirmed (handoff machine)
[ ] Original HEAD SHA recorded
[ ] V3 core modules on remote
[ ] PR1–PR8 provenance in git log
[ ] feature/v3-baseline-recovery pushed
[ ] Remote SHA + files match handoff
[ ] V3 Logic changes during recovery = 0
```

---

## 6. Current remote state (pre-push)

| Item | Value |
|------|-------|
| Branch | `origin/feature/v3-baseline-recovery` |
| SHA | `fb06515` |
| Contents | Day 1 forensics doc only |
| V3 modules | ❌ absent |
| Action needed | CEO push overwrites/extends with real V3 baseline |

---

## 7. Role split

| Role | Action |
|------|--------|
| **CEO / handoff machine** | §1 discovery → §2 checklist → §4 push |
| **CTO / cloud agent** | §5 verification → Day 3 gate unlock |
| **CPO** | 2차 검증 after §5 PASS |

CTO **cannot** complete Day 2 PASS without CEO push.

---

## 8. Day 2 completion status

```text
Day 2
Status: YELLOW (plan complete — push pending)
Completed: Recovery plan, CEO push procedure, post-push verify script
Evidence: docs/evidence/V3-BASELINE-RECOVERY-PLAN.md, apps/web/scripts/verify-v3-baseline-recovery.mjs
Blocker: P0 — CEO must push V3 baseline from handoff machine
```

### Day 2 checklist (live)

| # | Criterion | Status |
|---|-----------|--------|
| 1 | Actual V3 source branch confirmed | ⏸ CEO handoff machine |
| 2 | Original HEAD SHA recorded | ⏸ |
| 3 | V3 core modules confirmed | ⏸ |
| 4 | PR1–PR8 provenance confirmed | ⏸ |
| 5 | Remote push | ⏸ |
| 6 | Remote/local SHA + file parity | ⏸ |
| — | V3 Logic changes | ✅ 0 (no recovery attempted) |

**Overall Day 2: NOT PASS until rows 1–6 complete.**

---

## 9. Day 3 unlock condition

Proceed to Day 3 **only when**:

```text
node scripts/verify-v3-baseline-recovery.mjs
→ exit 0
→ CPO 2차 검증 PASS
```

Then: V3 runtime validation, 12/12, Browser infra on V3 branch.

---

## 10. CEO one-page action card

```text
1. Open cursor-project in PowerShell
2. Run discovery (§1.2)
3. Find branch with all 7 core files (§1.3 script)
4. Record SHA
5. git push -u origin <that-branch>:feature/v3-baseline-recovery --force-with-lease
6. Notify CTO — verification will run automatically
```

**Do not modify V3 code before push.**
