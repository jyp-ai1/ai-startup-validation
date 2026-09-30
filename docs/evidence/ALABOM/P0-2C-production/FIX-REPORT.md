# P0-2C Fix — CTO Report (code)

## 1. Root cause

Pain answers on **`problemJtbd`** (“양조장은 … 부족/어렵”) were routed to **`customer`** because problem cues omitted Korean pain tokens; semantic extract treated “양조장” as persona; judgment merge applied customer hit over document-confirmed **소규모 양조장**.

## 2. Wrong-slot code path

```text
interpretAnswerSemantics (askedGap=problemJtbd, problemCue false)
  → factKey customer
extractAnswerSemanticEvidences → customer + problem hits
dimensionsFromAnswerText → mergeDimension customer
mergeCanonicalCustomer → overwrites clear customer summary
```

## 3. Minimal fix (Git `232a1f5`)

| Area | Change |
| --- | --- |
| `interpret-answer-semantics.ts` / `build-answer-review.ts` | Pain cues: `부족|어렵|인력|홍보가 어렵` on problemJtbd |
| `ai-pm-answer-semantic-sot.ts` | `isProblemDescriptionClause` for `양조장은 …`; skip customer when pain |
| `ai-pm-judgment-target-binding.ts` | `isProblemPainAnswer()` |
| `ai-pm-judgment-canonical-state.ts` | Block pain → customer overwrite |
| `ai-pm-judgment-aggregation.ts` | Strip wrong-slot customer; seed spine from living doc |

## 4. Target tests

`pnpm exec vitest run …/p0-2c-wrong-slot-merge.test.ts` — **7/7 PASS**  
Regression: `p0-2a`, `p0-2b`, `day8i-fix10-problem-extract` — **PASS**

## 5. Build

`pnpm build` — **PASS**

## 6–8. Production

**Pending PR #45 merge + deploy.** Re-run:

`cd apps/web && node scripts/production-p0-2c-judgment-final-review.mjs`

DoD: SHA match + customer preserved + problem merged + Final Review reached.

## 9. Regression

P0-2A / P0-2B tests unchanged PASS.
