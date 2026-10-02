# Phase ② — Real Business Review (Production) · Track A

**Updated:** 2026-10-02 UTC  
**PR:** #66  
**Status:** **OPEN** — Track A auth-blocked · **Sprint 2 Tracks B–D runnable in parallel**

**Prerequisite:** Phase ① **CLOSED** (CPO Re-verify #3 · 10/10 PASS @ `7abb071`)

**Full accuracy gate:** see `ALABOM-AI-PM-ACCURACY-SPRINT-2.md` (multi-business + cross-business + unseen — Track A alone is **INCOMPLETE** for CPO).

## Goal

Validate **longitudinal accuracy** (12 → 20–30 turns): whether AI PM **preserves knowledge** across a real Business Review — not single-turn Golden 8 accuracy alone.

**CPO rubric:** `CPO-PHASE2-RUBRIC.md` (9 dimensions per turn; L4–5 after initial pass).

## Gate ladder (CPO-fixed)

```text
storageState
  → Production 12-turn trace (CAPTURED)
  → CPO Layer 1–3 independent 2-pass
  → fix layer-only + regression + re-trace
  → 20–30 turn extension
  → Layer 4 Reasoning → Layer 5 Judgment
  → CPO final → Production SHA → CEO TEST (not before CPO pass)
```

**CEO TEST:** not requested until Phase ② CPO longitudinal pass.

## Layers (initial capture)

1. Layer 1 — Understanding  
2. Layer 2 — Gap + state preservation  
3. Layer 3 — Next question choice + why  

(Layers 4–5 in trace rows marked `NOT_IN_PHASE2_INITIAL` until wired.)

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
cd apps/web && pnpm evidence:phase2-cpo-pack   # also runs automatically after CAPTURED trace
```

**Output:**

| File | Role |
|------|------|
| `PRODUCTION/real-business-review-trace.json` | Raw session + turns |
| `CPO-PHASE2-REVIEW-SHEET.md` | CPO Layer 1–3 table |
| `EVAL/phase2-cpo-review-pack.json` | Machine rows |

When auth is missing → `status: BLOCKED` (real login path **unverified** — not a QA convenience issue). When auth present → 12 scripted turns, each row shaped for CPO checklist (`answerUnderstanding`, `gapSnapshot`, `nextQuestion`, `layers`).

## Sprint 2 parallel (auth not required)

```bash
cd apps/web && pnpm test:multi-business-accuracy
```

→ `EVAL/multi-business-harness-report.json` · matrix `BUSINESS-SCENARIO-MATRIX.md`

## CTO priority

Evidence first — expand matrix + perturbations + harness (Layer A/B) while Track A waits on `storageState`.

## Production merge

**HOLD** until Phase ② CPO 2-pass on real longitudinal trace (+ ladder gates).
