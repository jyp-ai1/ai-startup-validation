# Phase ② — Real Business Review (Production)

**Updated:** 2026-10-02 UTC  
**PR:** #66  
**Status:** **OPEN** — awaiting authenticated Production session trace

**Prerequisite:** Phase ① **CLOSED** (CPO Re-verify #3 · 10/10 PASS @ `7abb071`)

## Goal

Validate **longitudinal accuracy** (10–30 turns): Business Understanding → taxonomy gaps → knowledge state → next question, on **real logged-in Production**, not Golden 8 alone.

## Layers (this phase)

1. Layer 1 — Understanding  
2. Layer 2 — Gap  
3. Layer 3 — Next Question  

(Layers 4–5 Reasoning/Judgment follow after trace + CPO 2-pass on real session.)

## Blocker

| Item | Status |
|------|--------|
| `apps/web/.qa-auth/storageState.json` | **NOT PRESENT** on agent pod |
| `QA_AUTH_STORAGE_STATE_PATH` | unset |

Without valid Google OAuth cookies, Production workspace loop cannot run.

## Operator — obtain storageState

**Option A — persistent profile (CTO machine):**

```bash
cd apps/web && pnpm exec node scripts/production-flow-qa.mjs
```

Complete Google login in headed Chrome; script writes `apps/web/.qa-auth/storageState.json` (gitignored).

**Option B — CDP export from existing CEO session:** see `docs/evidence/ALABOM/phase1b/KNOWN_ISSUES.md`.

**Option C — env override:**

```bash
export QA_AUTH_STORAGE_STATE_PATH=/path/to/storageState.json
```

## Capture command

```bash
cd apps/web && pnpm evidence:real-business-review
```

**Output:** `PRODUCTION/real-business-review-trace.json`

When auth is missing → `status: BLOCKED` with reason. When auth present → browser capture runs (longitudinal Q→A, sessionStorage loop snapshot per turn).

## Production merge

**HOLD** until Phase ② CPO 2-pass on real trace (+ later ladder gates).
