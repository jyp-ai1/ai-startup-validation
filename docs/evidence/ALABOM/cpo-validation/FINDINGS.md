# ALABOM CPO Validation — FINDINGS

```text
Date: 2026-08-28 (KST)
Production SHA: 086da4eb0468c69a7ab10976092172e1ba49dfa2
Entry: /demo/start (Demo — Journey B proxy)
Auth: Deferred / EXCLUDED
CPO judgment: HOLD @ 086da4e — CTO does NOT declare PASS
Code fix: LS-2 identity drift — local batch (pending deploy)
```

## Production pin

| Check | Result |
|-------|--------|
| `/api/build-info` commit | `086da4eb0468c69a7ab10976092172e1ba49dfa2` |
| git `main` tip | `086da4eb0468c69a7ab10976092172e1ba49dfa2` |
| Alignment | **MATCH** |

## Hard metrics (@ 086da4e, 33-turn LIVE — reused)

| Metric | LIVE | Target |
|--------|------|--------|
| Turns | **33** | ≥30 |
| same-meaning re-ask | **0** | 0 |
| wrong-slot hints | **0** | 0 |
| mixed-Q hints | **0** | 0 |
| understandingDelta empty (mergeable) | **1** | 0 |
| criticalGapBlockedStartAnalysis | true (early) → enabled after gap close | true when gaps |
| finalReviewReachable | **true** | when Analysis Ready |

## Area verdicts (CTO 1st QA — honest)

| Area | Verdict | Evidence |
|------|---------|----------|
| Document journey | **PASS** | Turns 1–2 seed + confirm |
| 30+ adaptive conversation | **PASS** | 33 turns W21 |
| Q→A→Understanding causality | **PASS** | reAsk=0; adaptive T2–30 deltas populated |
| Why / mid-summary / prior edit / conflict | **PASS** | Turns 5–10 |
| Competition / differentiation / revenue / validation | **PASS** | Turns 3–4, 11–16 |
| Form-like regression | **PASS** | re-ask=0, wrong-slot=0, mixed-Q=0 |
| Living Understanding | **PASS** | Panel + judgment blocks update |
| Progress % = understanding | **PASS** | Coverage % labels |
| Sufficiency vs Analysis Gate | **PASS** | Blocked early; enabled after gap close |
| **New user Demo one-liner** | **PASS** | [TRANSCRIPT-NEW-USER.md](./TRANSCRIPT-NEW-USER.md) — 5 turns LIVE; no 10-field form |
| **Back navigation** | **PASS** | [TRANSCRIPT-BACK-NAV.md](./TRANSCRIPT-BACK-NAV.md) — W21 T8 supersede + delta |
| **Mobile** | **FAIL** | [TRANSCRIPT-MOBILE.md](./TRANSCRIPT-MOBILE.md) — Q/judgment visible; Submit CTA + back nav not visible @ 390×844 |
| **Final result (LS-2)** | **FIX BATCHED** | BEFORE: HOLD @ T33; AFTER: unit PASS — [TRANSCRIPT-IDENTITY-FINAL.md](./TRANSCRIPT-IDENTITY-FINAL.md) |
| Regression (Demo/document) | **PASS** | Preserved @ 086da4e |

## LS-2 identity drift — before/after

| | BEFORE @ 086da4e | AFTER (local fix) |
|--|------------------|-------------------|
| Symptom | `HOLD — 확정된 사업 한 줄이 시작 의도와 맞지 않습니다` @ T33 | Unit: `identityIntegrity=true` |
| Root cause | Solution answer overwrote `business` memory → businessOneLiner drift | Solution turns skip business memory write |
| Template pollution | None (tourism seed, no B2B SaaS) | N/A |
| Production verify | Captured | **Pending deploy** |

## Supplemental captures

| Capture | Status | Path |
|---------|--------|------|
| New User Demo one-liner | **DONE** @ 086da4e | [transcript-raw-new-user.json](./transcript-raw-new-user.json) |
| Back navigation | **DONE** (W21 T8 reuse) | [TRANSCRIPT-BACK-NAV.md](./TRANSCRIPT-BACK-NAV.md) |
| Mobile 390×844 | **DONE** — FAIL (CTA) | [transcript-raw-mobile.json](./transcript-raw-mobile.json) |
| Identity final | **DONE** (before + fix) | [TRANSCRIPT-IDENTITY-FINAL.md](./TRANSCRIPT-IDENTITY-FINAL.md) |
| W21 33-turn main | **REUSED** | [../conversation-validation/long-sprint-final/](../conversation-validation/long-sprint-final/) |

## Known observations

| ID | Observation |
|----|-------------|
| LS-2 | Final HOLD @ T33 — **fix batched locally**, Production re-capture pending deploy |
| T31 | Delta empty = harness forced-diff only |
| LS-6 | Dedicated back-nav harness timed out on edit CTA @ 3 turns — W21 T8 evidence used |
| T12 | businessOneLiner polluted by solution answer — fix target |

## Regression summary

| Metric | @ 086da4e | Preserve |
|--------|-----------|----------|
| re-ask | 0 | yes |
| wrong-slot | 0 | yes |
| mixed-Q | 0 | yes |
| Demo flow | intact | yes |

## CTO judgment

**CTO 1st QA: complete** with honest area table. LS-2 fix implemented and unit-verified; Production identity re-capture blocked on deploy. **CPO review: pending — do NOT declare PASS. CEO Walkthrough: NOT READY.**
