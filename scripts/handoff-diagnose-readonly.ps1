# READ ONLY — handoff machine state capture for CTO
# Safe: no pull, push, merge, reset, rebase, checkout, commit
# CEO may run once: outputs to .tmp\handoff-diagnose-output.txt

$ErrorActionPreference = "Continue"
$Out = ".tmp\handoff-diagnose-output.txt"
New-Item -ItemType Directory -Force -Path ".tmp" | Out-Null

function W($line) { $line | Tee-Object -FilePath $Out -Append }

"" | Set-Content $Out
W "=== HANDOFF DIAGNOSE (READ ONLY) ==="
W "Timestamp: $(Get-Date -Format o)"
W "Cwd: $(Get-Location)"
W ""

W "--- git status ---"
W (git status 2>&1 | Out-String)

W "--- merge state ---"
$mergeHead = Test-Path .git\MERGE_HEAD
$rebase = Test-Path .git\rebase-merge
$rebaseApply = Test-Path .git\rebase-apply
W "MERGE_HEAD exists: $mergeHead"
W "rebase-merge exists: $rebase"
W "rebase-apply exists: $rebaseApply"

W "--- branch / HEAD ---"
W "current branch: $(git branch --show-current 2>&1)"
W "HEAD SHA: $(git rev-parse HEAD 2>&1)"

W "--- remote ---"
W (git remote -v 2>&1 | Out-String)

W "--- scripts path ---"
W "scripts dir exists: $(Test-Path '.\scripts')"
W "handoff-push script exists: $(Test-Path '.\scripts\handoff-push-v3-baseline.ps1')"

$Required = @(
    "apps/web/features/workflow-journey/lib/business-understanding/build-answer-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/update-gap-state-from-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/decide-next-question-from-review.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/v3-review-pipeline.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/v3-legacy-bypass-guards.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/__tests__/ai-pm-loop-v3.test.ts",
    "apps/web/features/workflow-journey/lib/business-understanding/__tests__/v3-runtime-certification.test.ts"
)

W ""
W "--- V3 branch scan (read-only) ---"
$found = 0
foreach ($b in (git branch -a --format="%(refname:short)" 2>&1)) {
    if (-not $b) { continue }
    $ok = $true
    foreach ($f in $Required) {
        git cat-file -e "${b}:${f}" 2>$null
        if ($LASTEXITCODE -ne 0) { $ok = $false; break }
    }
    if ($ok) {
        $sha = git rev-parse $b 2>&1
        W "V3_COMPLETE: $b @ $sha"
        $found++
    }
}
if ($found -eq 0) { W "V3_COMPLETE: (none found in local refs)" }

W ""
W "--- cbcde821 ---"
W "cbcde821 exists: $(try { git cat-file -t cbcde821 2>$null; $true } catch { $false })"

W ""
W "=== END (no changes made) ==="
Write-Host "Saved: $Out" -ForegroundColor Green
