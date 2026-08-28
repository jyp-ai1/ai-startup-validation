# ALABOM Long Sprint — CTO Known Issues (CPO Validation)

```text
Date: 2026-08-28 (KST)
Production SHA (baseline): bc7923937d342364214beb559b5d14693090c4c5
CPO judgment: FIX — T17–T30 harness padding invalidated T33 GO credibility
Auth / KI-1: Deferred
CEO Walkthrough: NOT READY
```

## Open — CPO FIX batch (real adaptive)

| ID | Issue | Severity | Status |
|----|-------|----------|--------|
| RA-1 | Harness T17–T30 identical padding (14× same answer) | **P0** | **FIXED** — new `_cpo-real-adaptive-prod-capture.spec.ts`; no extendToMinTurns / forced-diff |
| RA-2 | T33 GO 75 not credible on padded journey | **P0** | Re-capture required — 15–25 meaningful unique turns only |
| RA-3 | Why meta must explain why-now (not re-ask only) | P0 | **FIXED** — `buildWhyFollowUp` includes asked question + targetGap |
| RA-4 | B2B vs tourist payer conflict explicit Q | P0 | Engine OK — conflict UI + priority; verify in capture |
| RA-5 | Analysis gate score-only GO | P0 | Engine OK — `evaluateFinalIntegrityGate` + `presentAnalysisScreen` HOLD |

## Resolved prior batch (@ bc792393 T33)

| ID | Issue | Resolution |
|----|-------|------------|
| LS-2-prod | Full T33 re-capture | DONE @ bc792393 — **credibility voided by padding** |
| LS-7 | Mobile Submit CTA | FIXED |
| LS-1 | New User Demo | DONE @ 086da4e |

## Explicitly deferred

- **Auth / KI-1**
- **CPO PASS** — pending real-adaptive LIVE capture
- **CEO Walkthrough**

## Regression watch (real adaptive targets)

| Metric | Target | Prior T33 (padded) |
|--------|--------|---------------------|
| Identical answer repeats | 0 | 14 (T17–T30) |
| Padding turns | 0 | 14+ |
| Meaningful answers | 15–25 | 33 (inflated) |
| Same-meaning re-ask | 0 | 0 |

## Closing statements (required)

- **CPO review: pending — do NOT declare PASS**
- **CEO Walkthrough: NOT READY**
- **CTO QA: real-adaptive capture in progress**
