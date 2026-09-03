# Handoff machine — V3 baseline discovery + direct push (CTO execution)
# Run from: C:\Users\김성길\Documents\GitHub\cursor-project
#
# Usage:
#   Set-Location "C:\Users\김성길\Documents\GitHub\cursor-project"
#   .\scripts\handoff-push-v3-baseline.ps1
#
# No rebase / squash / cherry-pick / code changes.

$ErrorActionPreference = "Stop"

$RequiredFiles = @(
    "apps/web/features/workflow-journey/lib/business-understanding/build-answer-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/update-gap-state-from-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/decide-next-question-from-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/v3-review-pipeline.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/v3-legacy-bypass-guards.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/__tests__/ai-pm-loop-v3.test.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/__tests__/v3-runtime-certification.test.ts"
)

$RemoteBranch = "feature/v3-baseline-recovery"
$ReportDir = ".tmp"
$ReportFile = Join-Path $ReportDir "v3-baseline-handoff-report.txt"

New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null

function Test-BranchHasV3([string]$Branch) {
    foreach ($f in $RequiredFiles) {
        git cat-file -e "${Branch}:${f}" 2>$null
        if ($LASTEXITCODE -ne 0) { return $false }
    }
    return $true
}

Write-Host "=== V3 Baseline Handoff Recovery (CTO) ===" -ForegroundColor Cyan
Write-Host "Repo: $(Get-Location)"
Write-Host "Remote:"
git remote -v
Write-Host ""

# 1. Identify V3 source branch
$Candidates = @()
foreach ($b in (git branch -a --format="%(refname:short)")) {
    if (Test-BranchHasV3 $b) {
        $sha = git rev-parse $b
        $Candidates += [PSCustomObject]@{ Branch = $b; Sha = $sha }
        Write-Host "V3 COMPLETE: $b @ $sha" -ForegroundColor Green
    }
}

if ($Candidates.Count -eq 0) {
    Write-Host "BLOCKED: No branch contains all 8 V3 modules + 2 test suites." -ForegroundColor Red
    exit 1
}

# Prefer current branch if complete, else handoff SHA branch, else first match
$Source = $Candidates[0]
$Current = git branch --show-current
foreach ($c in $Candidates) {
    if ($c.Branch -eq $Current) { $Source = $c; break }
}
if (git cat-file -t cbcde821 2>$null) {
    foreach ($c in $Candidates) {
        if ($c.Sha.StartsWith("cbcde821")) { $Source = $c; break }
    }
}

Write-Host ""
Write-Host "Selected source: $($Source.Branch)" -ForegroundColor Yellow
Write-Host "HEAD SHA:      $($Source.Sha)"

# 2. Pre-push integrity (read-only)
$status = git status --porcelain
if ($status) {
    Write-Host "WARNING: Working tree not clean:" -ForegroundColor Yellow
    Write-Host $status
    Write-Host "Proceeding with push of committed tip only (no local edits included)."
}

Write-Host ""
Write-Host "Recent history on source branch:"
git log $Source.Branch --oneline -15

# 3. Direct push (provenance preserved)
Write-Host ""
Write-Host "Pushing $($Source.Branch) -> origin/$RemoteBranch ..." -ForegroundColor Cyan
git push -u origin "${Source.Branch}:${RemoteBranch}" --force-with-lease

if ($LASTEXITCODE -ne 0) {
    Write-Host "Push failed. Try: git fetch origin && retry" -ForegroundColor Red
    exit 1
}

$PushedSha = git rev-parse "origin/$RemoteBranch" 2>$null
if (-not $PushedSha) { $PushedSha = $Source.Sha }

@(
    "V3_BASELINE_RECOVERY_HANDOFF",
    "Timestamp: $(Get-Date -Format o)",
    "SourceBranch: $($Source.Branch)",
    "SourceSha: $($Source.Sha)",
    "RemoteBranch: origin/$RemoteBranch",
    "PushedSha: $PushedSha",
    "RequiredFiles: $($RequiredFiles.Count) verified on source"
) | Set-Content -Path $ReportFile -Encoding UTF8

Write-Host ""
Write-Host "Push complete. Report: $ReportFile" -ForegroundColor Green
Write-Host "Next (cloud CTO): cd apps/web && pnpm run verify:v3-baseline"
