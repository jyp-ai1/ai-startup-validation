# ALABOM Long Sprint — CTO QA (CPO Validation)

```text
Date: 2026-08-28 (KST)
Production SHA: 470f5df4662a86e3078d647c2faa54bbae2d2366
Entry: /demo/start (Demo document + one-liner)
Auth: Deferred / EXCLUDED
CPO judgment: HOLD — do NOT declare PASS
Evidence: docs/evidence/ALABOM/cpo-validation/
```

## Production pin

| Check | Result |
|-------|--------|
| `/api/build-info` | `470f5df4662a86e3078d647c2faa54bbae2d2366` |
| git `main` | `470f5df4662a86e3078d647c2faa54bbae2d2366` |
| Match | **YES** |

## QA table (required — honest)

| Area | PASS/FAIL | Notes |
|------|-----------|-------|
| 신규 사용자 | **PASS** | Demo one-liner LIVE — [TRANSCRIPT-NEW-USER.md](../evidence/ALABOM/cpo-validation/TRANSCRIPT-NEW-USER.md) (reused @ 086da4e) |
| 문서 기반 시작 | **PASS** | `/demo/start` thin doc + confirm @ W21 T1–2 |
| 한 줄 입력 | **PASS** | Custom paste one-liner; `upfrontFormFieldCount=0` equivalent |
| AI 최초 판단 | **PASS** | CURRENT JUDGMENT after confirm |
| Q→A→Update | **PASS** | Adaptive T2–30 deltas populated |
| Why | **PASS** | T6 display-only path |
| Mid summary | **PASS** | T7 on-demand mid judgment |
| Prior edit | **PASS** | T8 persona correction supersede |
| Conflict | **PASS** | T9–10 payer resolution |
| Wrong slot | **PASS** | wrongSlotHints=0 |
| Same meaning re-ask | **PASS** | reAskSameQuestionCount=0 |
| Mixed Q | **PASS** | mixedQuestionHints=0 |
| Living Understanding | **PASS** | Panel + judgment blocks update |
| Progress % | **PASS** | Coverage % (not answer-count) |
| Back navigation | **PASS** | W21 T8 — edit picker + delta + downstream Q (reused) |
| Sufficiency | **PASS** | Coverage labels + critical-gap copy |
| Analysis Gate | **PASS** | Blocked early; enabled after gap close |
| Final result | **PARTIAL** | LS-2 fix deployed @470f5df; spot-check no identity HOLD; full T33 final review not re-run |
| Mobile | **PASS** | @470f5df — sidebar hidden on AI PM; Apply answer CTA visible @ 390×844 |
| Regression | **PASS** | re-ask/wrong-slot/mixed-Q=0 |

## Hard metrics (@ 086da4e W21)

| Metric | Value | Target |
|--------|-------|--------|
| Turns | 33 | ≥30 |
| same-meaning re-ask | 0 | 0 |
| wrong-slot | 0 | 0 |
| mixed-Q | 0 | 0 |
| understandingDelta empty | 1 (T31 forced-diff) | 0 |
| finalReviewReachable | true | true |

## Internal QA (post-fix @ 470f5df)

| Check | Result |
|-------|--------|
| `core-final-stabilization.test.ts` | **PASS** (20 tests incl. LS-2) |
| LS-2 unit: solution ≠ business overwrite | **PASS** |
| LS-2 prod spot-check (identity-final) | **PASS** — no identity HOLD copy; businessOneLiner preserved |
| LS-2 prod full T33 final review | **NOT RE-RUN** — reuse W21 @086da4e for regression context |
| Mobile prod @390×844 | **PASS** — `mobileCtaBeforeAnswer=true` |

## Evidence paths

| Artifact | Path |
|----------|------|
| CPO package | [cpo-validation/](../evidence/ALABOM/cpo-validation/) |
| Full 33-turn W21 | [long-sprint-final/TRANSCRIPT.md](../evidence/ALABOM/conversation-validation/long-sprint-final/TRANSCRIPT.md) |
| New User | [TRANSCRIPT-NEW-USER.md](../evidence/ALABOM/cpo-validation/TRANSCRIPT-NEW-USER.md) |
| Back Nav | [TRANSCRIPT-BACK-NAV.md](../evidence/ALABOM/cpo-validation/TRANSCRIPT-BACK-NAV.md) |
| Identity | [TRANSCRIPT-IDENTITY-FINAL.md](../evidence/ALABOM/cpo-validation/TRANSCRIPT-IDENTITY-FINAL.md) |

## Closing statements (required)

- **CPO review: pending — do NOT declare PASS**
- **CEO Walkthrough: NOT READY**
- **CTO 1st QA: complete**
