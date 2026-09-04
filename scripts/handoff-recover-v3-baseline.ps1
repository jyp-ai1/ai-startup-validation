# CTO ONLY — handoff machine V3 baseline preservation + direct push
# Run from: C:\Users\김성길\Documents\GitHub\cursor-project
#
# Prerequisites: read-only diagnose already done; MERGE_HEAD must NOT exist
# Does NOT: pull, merge, rebase, reset --hard, cherry-pick
# MAY: git add + single recovery commit for untracked/modified V3 assets (preservation)

$ErrorActionPreference = "Stop"

if (Test-Path .git\MERGE_HEAD) {
    Write-Host "BLOCKED: merge in progress — stop; report to CPO before any action" -ForegroundColor Red
    exit 1
}

$RemoteBranch = "feature/v3-baseline-recovery"
$Report = ".tmp\v3-baseline-recovery-cto.log"
New-Item -ItemType Directory -Force -Path ".tmp" | Out-Null

$HeadBefore = git rev-parse HEAD
$BranchBefore = git branch --show-current

@(
    "=== V3 BASELINE RECOVERY (CTO) ===",
    "Started: $(Get-Date -Format o)",
    "Branch: $BranchBefore",
    "HEAD before: $HeadBefore"
) | Set-Content $Report

# --- V3 asset paths (explicit — no broad git add .) ---
$V3Paths = @(
    "apps/web/features/workflow-journey/lib/business-understanding/build-answer-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/update-gap-state-from-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/decide-next-question-from-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/v3-review-pipeline.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/v3-legacy-bypass-guards.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/hydrate-ai-pm-loop-state.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/build-ceo-six-surfaces.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/resolve-next-question-decision.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/resolve-remount-ask-surface.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/__tests__/ai-pm-loop-v3.test.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/__tests__/v3-runtime-certification.test.ts",
    "apps/web/features/workflow-journey/components/project-workspace-shell/workspace-ceo-six-surfaces.tsx",
    "packages/types/src/domain/answer-review.ts",
    "packages/types/src/domain/gap-knowledge-state.ts",
    "packages/types/src/index.ts",
    "packages/types/package.json",
    "apps/web/features/workflow-journey/lib/business-understanding/process-loop-answer.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/build-conversation-memory.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/resolve-ai-pm-priority-issue.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/resolve-asked-target-gap.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/resolve-missing-field-priority.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/workspace-state-update.ts",
    "apps/web/features/workflow-journey/components/project-workspace-shell/workspace-ai-pm-loop-panel.tsx",
    "apps/web/features/workflow-journey/components/demo/demo-start-view.tsx",
    "apps/web/app/[locale]/(shell)/workspace/layout.tsx",
    "apps/web/middleware.ts",
    "apps/web/features/workspace/lib/apply-workspace-snapshot.ts",
    "apps/web/e2e/_helpers/v3-p0-e2e-helpers.ts",
    "apps/web/e2e/v3-p0-production-readiness.spec.ts",
    "apps/web/e2e/v3-p0-infra-smoke.spec.ts",
    "apps/web/playwright.v3-p0.config.ts",
    "apps/web/scripts/run-v3-p0-e2e.mjs",
    "apps/web/scripts/verify-v3-baseline-recovery.mjs",
    "docs/architecture/ai-pm-v3"
)

$RequiredCheck = @(
    "apps/web/features/workflow-journey/lib/business-understanding/build-answer-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/update-gap-state-from-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/decide-next-question-from-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/v3-review-pipeline.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/v3-legacy-bypass-guards.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/__tests__/ai-pm-loop-v3.test.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/__tests__/v3-runtime-certification.test.ts"
)

foreach ($f in $RequiredCheck) {
    if (-not (Test-Path $f)) {
        "BLOCKED: missing $f" | Add-Content $Report
        Write-Host "BLOCKED: missing $f" -ForegroundColor Red
        exit 1
    }
}

# Stage only V3 recovery paths that exist
$Staged = @()
foreach ($p in $V3Paths) {
    if (Test-Path $p) {
        git add -- "$p"
        $Staged += $p
    }
}

"Staged paths: $($Staged.Count)" | Add-Content $Report
$Staged | ForEach-Object { "  + $_" } | Add-Content $Report

# Recovery commit only if index differs from HEAD for staged paths
$Status = git status --porcelain
if ($Status -match '^[AMDRU]') {
    git commit -m "recovery: preserve V3 PR1-PR8 handoff baseline (asset capture, no logic rewrite)"
    "Recovery commit: $(git rev-parse HEAD)" | Add-Content $Report
} else {
    "No new commit — HEAD already contains staged V3 assets" | Add-Content $Report
}

$HeadAfter = git rev-parse HEAD
"HEAD after: $HeadAfter" | Add-Content $Report

# Direct push — provenance: main/handoff tip -> remote recovery branch
git push -u origin "HEAD:${RemoteBranch}" --force-with-lease

"Pushed HEAD -> origin/${RemoteBranch}" | Add-Content $Report
"Pushed SHA: $HeadAfter" | Add-Content $Report

Write-Host ""
Write-Host "Recovery push complete." -ForegroundColor Green
Write-Host "Original baseline SHA (handoff): $HeadBefore"
Write-Host "Pushed SHA: $HeadAfter"
Write-Host "Log: $Report"
Write-Host "Next: Cloud CTO runs pnpm run verify:v3-baseline"
