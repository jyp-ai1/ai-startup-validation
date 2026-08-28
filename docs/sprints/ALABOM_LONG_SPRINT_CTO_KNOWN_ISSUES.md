# ALABOM Long Sprint — CTO Known Issues (CPO Validation)

```text
Date: 2026-08-28 (KST)
Production SHA: 470f5df4662a86e3078d647c2faa54bbae2d2366
CPO judgment: HOLD — do NOT declare PASS
Auth / KI-1: Deferred
CEO Walkthrough: NOT READY
```

## Open — CPO / evidence gap

| ID | Issue | Severity | QA impact | Status |
|----|-------|----------|-----------|--------|
| LS-2-prod | Full T33 final-review re-capture @470f5df | **Medium** | Final result PARTIAL | Spot-check PASS; 33-turn final not re-run this batch |
| LS-6 | Delta empty T31 forced-diff | **Low** | Metric 1/0 | Harness only; not adaptive regression |

## Resolved this batch (@ 470f5df)

| ID | Issue | Resolution |
|----|-------|------------|
| LS-2 | Final HOLD identity drift @ T33 | **FIXED + DEPLOYED** — memory + spine + gate @470f5df; spot-check no HOLD |
| LS-7 | Mobile Submit CTA not visible @ 390×844 | **FIXED** — hide sidebar on AI PM mobile; sticky submit + testid |
| LS-1 | New User not captured | **DONE** — Demo one-liner LIVE @ 086da4e |
| LS-8 | Back navigation not exercised | **DONE** — W21 T8 prior-edit evidence |

## Open — UX polish (non-blocking)

| ID | Issue | Severity |
|----|-------|----------|
| LS-3 | Generic delta fallback `이해 상태 갱신됨` | Low |
| LS-4 | B2B(확인이 필요) linger after conflict | Low |
| LS-7b | Mobile progress testid not detected (`mobileProgressVisible=false`) | Low — coverage text visible in judgment |

## Explicitly deferred

- **Auth / KI-1** — `/who` path untested
- **CPO PASS** — CTO does not override HOLD
- **CEO Walkthrough** — blocked until CPO turn-by-turn validation

## Regression watch

| Metric | @ 086da4e | Preserve |
|--------|-----------|----------|
| re-ask | 0 | yes |
| wrong-slot | 0 | yes |
| mixed-Q | 0 | yes |

## Closing statements (required)

- **CPO review: pending — do NOT declare PASS**
- **CEO Walkthrough: NOT READY**
- **CTO 1st QA: complete**
