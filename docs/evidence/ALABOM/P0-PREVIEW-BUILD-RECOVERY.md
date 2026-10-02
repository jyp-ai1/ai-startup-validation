# P0 Preview Build Failure Recovery

**Incident branch (Vercel):** `cursor/ai-pm-accuracy-sprint1-6423`  
**Failed commit (reported):** `19f6782` — feat(accuracy): Sprint 2 multi-business matrix and Layer A/B harness  

## 1. Commit lineage

| Commit | Role |
|--------|------|
| `19f6782` | First introduction of `multi-business-pilot-scripts.ts` with invalid `AiPmLoopIssueId` (`'differentiation'`) |
| `f6c2f4a` | Current **origin** `cursor/ai-pm-accuracy-sprint1-6423` HEAD (descendant of 19f6782) |
| `106b33a` | Validation Engine completion on `cursor/alabom-validation-engine-p1-6423` (descendant of 19f6782) |
| **Fix commit** | See §7 after push |

Relationship:

```text
19f6782 → … → f6c2f4a (PR #66 accuracy sprint)
19f6782 → … → 106b33a (PR #67 validation engine)
```

- `19f6782` is **ancestor** of `106b33a`, not superseded as history — but **build was broken from 19f6782 onward** until TS fixes.
- Vercel failure at `19f6782` is **still valid** for that SHA; newer SHAs added **additional** TS errors (real-business trace, holdoutPolicy literal, validation-engine types).

## 2. First application error (local = Vercel class)

**Classification:** TypeScript error (Next.js `lint and typecheck` phase)

**First error at 19f6782 lineage (still present at HEAD before fix):**

```text
./lib/ai-pm-accuracy/multi-business-pilot-scripts.ts:93:66
Type error: Argument of type '"differentiation"' is not assignable to parameter of type 'AiPmLoopIssueId'.
```

**Additional errors surfaced at HEAD after fixing the above:**

1. `real-business-review-trace.ts` — re-export alias not in scope for local type reference  
2. `validation-lab-runner.ts` — `holdoutPolicy` string literal mismatch vs `validation-lab-types.ts`  
3. `mini-sandbox-businesses.ts` — `certainty: 'KNOWN'` vs `GapCompleteness`  
4. `mini-sandbox-runner.ts` — invalid `semanticInterpretationRef.factKey` access  

## 3. Root cause

Harness/test TypeScript drift: pilot scripts used **`'differentiation'`** as `AiPmLoopIssueId`, but V3 contract only allows  
`customer_definition | competitor_analysis | bm_design | market_validation | problem_definition`.

Production build runs full `apps/web` typecheck → **exit 1**.

## 4. Fix (minimal)

| File | Change |
|------|--------|
| `multi-business-pilot-scripts.ts` | `'differentiation'` → `'competitor_analysis'` |
| `real-business-review-trace.ts` | import + export `RealBusinessReviewTurnTrace` |
| `validation-lab-runner.ts` | align `holdoutPolicy` literal with type |
| `mini-sandbox-businesses.ts` | `KNOWN` → `CLOSED` for `GapCompleteness` |
| `mini-sandbox-runner.ts` | use `semantic.factKey` from `buildAnswerReview` |
| `validation-engine-completion.ts` | remove unused import (lint) |

No AI PM logic, V3 SoT, or cluster fixes.

## 5. Local verification

```bash
pnpm install --frozen-lockfile
pnpm --filter web build          # PASS
pnpm test:validation-engine-completion  # PASS
pnpm test:accuracy-golden        # PASS (10/10)
```

## 6. Vercel Preview

Updated after fix push — see §10–12 in final commit message / CI comment.

## 7–12. Post-push fields

Filled in commit footer: Fix SHA, Preview URL, smoke result.
