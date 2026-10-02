# AI PM Improvement Sprint 1 — Final Completion Evidence

**Phase:** 4 Production Final Gate  
**Production URL:** https://ai-startup-validation-tau.vercel.app  
**Generated:** 2026-10-02 (UTC)

---

## Baseline (pre-calibration)

| Metric | Value |
|--------|------:|
| Validation ladder turns | 650 |
| Failed turns | 138 |
| F11 mined | 40 |
| F13 mined | 98 (reference only — **not** AI PM fix target per CPO Phase 3-B) |
| F04 | Under-sampled in baseline mining |

Primary clusters: F13 multi-fact loss, F11 contradiction mishandling, STATE_DRIFT (GT/evaluator).

---

## CPO Calibration (50 cases)

| Cluster | AI PM | Evaluator | GT | CPO confirmed fix (Phase 3-B) |
|---------|------:|----------:|---:|:-----------------------------|
| F11 | 10 | 0 | 0 | **Yes** |
| F04 | 9 | 0 | 0 | **Yes** |
| F13 | 0 | 10 | 0 | **No** |
| STATE_DRIFT | 0 | 0 | 10 | **No** |
| F08 | 0 | 10 | 0 | **No** |

Artifacts: `EVAL/cpo-calibration-confirmed.json`, `EVAL/cpo-calibration-submission.json`, `EVAL/cpo-improvement-calibration-pack.json`.

---

## Structural Fix

### F11 — Contradiction

- **Root cause:** Long persona-reversal utterances failed `answersContradict` token-length heuristic → silent merge.
- **Fix:** `extractDeclaredCustomerSegment`, persona-reversal branch in `interpret-answer-semantics.ts`, gap `CONTRADICTED` in `build-answer-review.ts`.
- **Files:** `understanding-contract.ts`, `interpret-answer-semantics.ts`, `build-answer-review.ts`, `calibration-turn-replay.ts`.

### F04 — Fact vs assumption

- **Root cause:** Hedge / unvalidated WTP treated as FACT when on-slot.
- **Fix:** `hasValidationEvidenceCue`, expanded `isUserAssumptionUtterance`, wired in `evidenceForExtractedFact`.
- **Files:** `semantic-slot-normalization.ts`, `build-answer-review.ts`.

### F13 — Held

- **AI PM `enrichMultiFactSemantic` PAYER_USE expansion reverted / not extended.**
- F13 98→8 (if observed) remains **evaluator/harness reference**, not AI PM accuracy claim.

---

## Regression (main @ production deploy)

| Suite | Result |
|-------|--------|
| F11 all-business + holdout tests | PASS |
| F04 evidence regression | PASS |
| Golden 8 | PASS |
| Seed A–F (validation-engine-completion) | PASS |
| Validation Engine completion | PASS |
| Phase 3 confirm | PASS |
| Local `pnpm --filter web build` on `bf770c2` | PASS |

---

## Before / After (AI PM targets — F11 / F04)

| Cluster | Before (confirmed AI PM defects) | After (engine @ bf770c2) |
|---------|----------------------------------|---------------------------|
| **F11** | 10 cases | Turn-4 contradiction: **CONTRADICTED** on 10/10 mini-sandbox + 2/2 holdout; mined **40→20** |
| **F04** | 9 cases | ASSUMPTION vs FACT wiring + unit tests PASS |
| F13 | (not AI PM target) | mined **98→98** — no AI PM claim |

Source: `EVAL/improvement-before-after.json`.

---

## Holdout (no tuning)

| ID | Turn-4 contradiction `customerPersona` |
|----|----------------------------------------|
| biz-16 | CONTRADICTED |
| biz-17 | CONTRADICTED |

Test: `phase3b-holdout.test.ts`.

---

## Production Gate

| Step | SHA / result |
|------|----------------|
| PR #69 validated head | `3d9e93413f50eddbfe8927debf7a1876ba18ad80` |
| Merge commit (`main`) | `bf770c26cf5cc0c40a07acdb309ce4ac4015c033` |
| Vercel CI (PR) | SUCCESS |
| Production `/api/health` commit | `bf770c26cf5cc0c40a07acdb309ce4ac4015c033` |
| Production `/api/build-info` branch | `main` |
| **SHA match** | **Git main HEAD = Production deploy commit = `bf770c2`** |

PR content (`3d9e934`) is **ancestor** of merge/production SHA (merge commit deploy).

---

## Production Smoke

| Area | Result | Notes |
|------|--------|-------|
| Health / build-info | PASS | bf770c2 |
| Auth gate (`/workspace` → login) | PASS | `production-authenticated-gate-smoke.mjs` |
| Login → Workspace → AI PM journey | **BLOCKED** | Google OAuth requires human credentials |
| **F11 on Production UI** | **NOT RUN** | Blocked at OAuth |
| **F04 on Production UI** | **NOT RUN** | Blocked at OAuth |

Screenshots: `/opt/cursor/artifacts/01-health-check-bf770c2.webp`, `02-login-page.webp`, `03-google-oauth-blocked.webp`  
Report: `/opt/cursor/artifacts/production-smoke-test-oct2.md`

**Unblock:** `QA_AUTH_STORAGE_STATE_PATH` or `.qa-auth/storageState.json` → `pnpm evidence:real-business-review` on production.

---

## Remaining Risks

- F11 mined failures **20** remain (post turn-4 / STATE_DRIFT coupling in evaluator).
- F04: full 9-case calibration replay not all re-adjudicated post-fix.
- F08 / F13 / GT drift: **next sprint** candidates, not fixed here.
- **Authenticated production UI** for F11/F04 not verified in this gate.

---

## Next Candidates (do not start)

1. F08 gap priority (evaluator-side).  
2. F13 evaluator + GT alignment (not AI PM enrich).  
3. STATE_DRIFT harness key alignment.  
4. Production E2E with stored auth for closed-alpha smoke.  
5. Turn-5+ contradiction state preservation.

---

## Sprint completion verdict (CTO)

**Improvement Sprint 1 = NOT COMPLETE** under CPO TASK 6 — Production Smoke (F11/F04 on live authenticated journey) **not satisfied**.

See **[STOP]** report in sprint close message.
