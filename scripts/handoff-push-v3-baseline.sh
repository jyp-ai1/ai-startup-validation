#!/usr/bin/env bash
# Linux/macOS equivalent — run from handoff clone if not on Windows.
set -euo pipefail

REMOTE_BRANCH="feature/v3-baseline-recovery"
REPORT=".tmp/v3-baseline-handoff-report.txt"
mkdir -p .tmp

REQUIRED=(
  "apps/web/features/workflow-journey/lib/business-understanding/build-answer-review.ts"
  "apps/web/features/workflow-journey/lib/business-understanding/update-gap-state-from-review.ts"
  "apps/web/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness.ts"
  "apps/web/features/workflow-journey/lib/business-understanding/decide-next-question-from-review.ts"
  "apps/web/features/workflow-journey/lib/business-understanding/v3-review-pipeline.ts"
  "apps/web/features/workflow-journey/lib/business-understanding/v3-legacy-bypass-guards.ts"
  "apps/web/features/workflow-journey/lib/business-understanding/__tests__/ai-pm-loop-v3.test.ts"
  "apps/web/features/workflow-journey/lib/business-understanding/__tests__/v3-runtime-certification.test.ts"
)

branch_has_v3() {
  local b="$1"
  for f in "${REQUIRED[@]}"; do
    git cat-file -e "${b}:${f}" 2>/dev/null || return 1
  done
}

echo "=== V3 Baseline Handoff Recovery (CTO) ==="
git remote -v

SOURCE=""
while IFS= read -r b; do
  if branch_has_v3 "$b"; then
    sha=$(git rev-parse "$b")
    echo "V3 COMPLETE: $b @ $sha"
    SOURCE="${SOURCE:-$b}"
    if [[ "$b" == "$(git branch --show-current)" ]]; then SOURCE="$b"; fi
  fi
done < <(git branch -a --format='%(refname:short)')

if [[ -z "$SOURCE" ]]; then
  echo "BLOCKED: No branch with all V3 modules + tests"
  exit 1
fi

SHA=$(git rev-parse "$SOURCE")
echo "Selected: $SOURCE @ $SHA"
git log "$SOURCE" --oneline -15

git push -u origin "${SOURCE}:${REMOTE_BRANCH}" --force-with-lease

{
  echo "V3_BASELINE_RECOVERY_HANDOFF"
  echo "Timestamp: $(date -Iseconds)"
  echo "SourceBranch: $SOURCE"
  echo "SourceSha: $SHA"
  echo "RemoteBranch: origin/$REMOTE_BRANCH"
} > "$REPORT"

echo "Push complete. Report: $REPORT"
echo "Next: cd apps/web && pnpm run verify:v3-baseline"
