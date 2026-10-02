# P0 Preview Build Failure Recovery

**Incident branch (Vercel):** `cursor/ai-pm-accuracy-sprint1-6423`  
**Failed commit (reported):** `19f6782` — feat(accuracy): Sprint 2 multi-business matrix and Layer A/B harness  

## 1. Commit lineage

| Commit | Role |
|--------|------|
| `19f6782` | First introduction of `multi-business-pilot-scripts.ts` with invalid `AiPmLoopIssueId` (`'differentiation'`) |
| `f6c2f4a` | Current **origin** `cursor/ai-pm-accuracy-sprint1-6423` HEAD (descendant of 19f6782) |
| `106b33a` | Validation Engine completion on `cursor/alabom-validation-engine-p1-6423` (descendant of 19f6782) |
| **Fix commit (PR #66 accuracy)** | `180997d` |
| **Fix commit (PR #67 validation engine)** | `a63f7f9` |
| **Fix commit (PR #68 → main)** | `23f0ce2` |

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

## 6. Local build result

**PASS** — `pnpm --filter web build` (after all TS fixes).

## 7. Validation regression

| Command | Result |
|---------|--------|
| `pnpm test:validation-engine-completion` | PASS (PR #67 branch) |
| `pnpm test:accuracy-golden` | PASS 10/10 |

## 8. Vercel Preview deployment

| PR | Branch HEAD | Vercel check | Status (2026-10-02 ~08:57 UTC) |
|----|-------------|--------------|----------------------------------|
| [#66](https://github.com/jyp-ai1/ai-startup-validation/pull/66) | `180997d` | [Deployment](https://vercel.com/jyp-ai1s-projects/ai-startup-validation/J2zewKJMqKNXRb4oGCVg8zd16z3A) | **SUCCESS — Ready** |
| [#67](https://github.com/jyp-ai1/ai-startup-validation/pull/67) | `a63f7f9` | [Deployment](https://vercel.com/jyp-ai1s-projects/ai-startup-validation/ChmwREwtp78NKs4QD64Vni41feE3) | **SUCCESS — Ready** |

## 9. Preview URLs (vercel[bot])

- PR #66: `https://ai-startup-validation-git-cursor-ai-pm-04cc9f-jyp-ai1s-projects.vercel.app`
- PR #67: `https://ai-startup-validation-git-cursor-alabom-34a38a-jyp-ai1s-projects.vercel.app`

## 10. Preview smoke

- Cloud agent `curl` to preview hosts: blocked / timeout (egress).
- Automated fetch `/api/health` on PR #66 preview: **403** (Vercel/bot protection).
- **Authoritative gate:** GitHub **Vercel check SUCCESS** + vercel[bot] **Ready** on both PRs after fix commits.

## 11. Final gate

```text
Local Build           PASS
Validation Regression PASS (where applicable)
Vercel Preview Build  PASS (#66, #67)
Preview Smoke         PARTIAL (CEO browser spot-check recommended)
```

## 12. Changed files (fix)

Core: `multi-business-pilot-scripts.ts`, `real-business-review-trace.ts`, `validation-lab-runner.ts`; PR #67 also `mini-sandbox-businesses.ts`, `mini-sandbox-runner.ts`, `validation-engine-completion.ts`.
