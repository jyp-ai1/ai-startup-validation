# ALABOM Real Adaptive vNext — FINDINGS (Loop 9e-b)

## Deploy status

| Item | Value |
|------|-------|
| **Loop 9e fix** | Shipped @ `940800ef594768fe82c274b014ec2a81e6c38215` |
| **Prior production SHA** | `cbce25631d453b8f0ae0d4a743957dcca58bf337` (Loop 9d-c live FAIL) |
| Unit tests | **59/59 PASS** (`core-final-stabilization.test.ts` incl. Loop 9e cbce256 shapes) |
| Live capture | @ `940800e` — partial run (harness EPERM on final persist; T1–T21 captured) |

## Loop 9e root cause (@ cbce256 live)

Live localStorage turns stored **`semanticFactKey: customer`** on T12 persona ask + BANK.diffRelevance because interpret used **poisoned `targetGap: problemJtbd`**. Wrong-slot detector treated it as same-slot persona merge → `resolveWrongSlotQuestionOverride` returned **null** → ranked `problemJtbd`/`solution` displayed. reAsk=6 cascaded from premature solution ask while problemJtbd still open.

## Loop 9e fix (shipped @ `940800e`)

| File | Change |
|------|--------|
| `wrong-slot-priority.ts` | Remap stored `customer` + diffRelevance cues on poisoned gaps; `effectiveAskedGapFromTurn` prefers `askedQuestionText` |
| `workspace-ai-pm-loop-panel.tsx` | Canonicalize semantic facts from displayed gap at submit; wrong-slot finish → `phase: answer` (skip ranked issue interstitial) |
| Tests | Loop 9e — `customer` key + `problemJtbd`/`solution` poison without `askedQuestionText` |

## P0 causality verdicts (@ `940800e` live)

| P0 | Transition | Unit @ Loop 9e | Live @ `940800e` |
|----|------------|----------------|------------------|
| **P0-1** | T12→T13 | **PASS** (59/59 incl. poison + no askedQuestionText) | **FAIL** — persona ask + `BANK.diffRelevance` → next Q `problemJtbd` ❌ |
| **P0-2** | T13→T14 | **PASS** | **FAIL** — problem ask + persona merge → next Q `solution` ❌ |
| **P0-3** | T16→T22 adaptive depth | PASS | **PARTIAL** — 16 meaningful · capture aborted before gate probe |
| **P0-4** | Analysis gate @ T21 | PASS | **NOT REACHED** — harness EPERM before gate probe |
| **P0-5** | Final GO @ T22 | PASS | **NOT REACHED** |

**CPO PASS declared:** **No** — P0-1 AND P0-2 remain live FAIL on capture @ `940800e`.

## Loop 9e-b live T11–T14 evidence (@ `940800e`)

### T11→T12 — PASS ✓

| | |
|---|---|
| T11 asked | validation / diff-relevance follow-up (post conflict) |
| T11 answer | `BANK.validation` |
| **T11→T12 next Q** | **"이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?"** → `customerPersona` ✓ |

### P0-1 T12→T13 — FAIL

| | |
|---|---|
| T12 asked | `customerPersona` — "이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?" |
| T12 answer | `BANK.diffRelevance` |
| Delta | `validationTestability` credited (diffRelevance canonicalized) |
| **T12→T13 next Q** | **"지금 가장 크게 해결하려는 불편은 무엇인가요?"** → `problemJtbd` ❌ (expected `customerPersona` re-ask) |

### P0-2 T13→T14 — FAIL

| | |
|---|---|
| T13 asked | `problemJtbd` |
| T13 answer | `BANK.customer` (persona wrong-slot) |
| Delta | `customerPersona` credited on problem ask |
| **T13→T14 next Q** | **"문제를 해결하는 방식(제공 가치)은 무엇인가요?"** → `solution` ❌ (expected `problemJtbd` re-ask) |

## Hard metrics (@ `940800e`)

| Metric | Target | Actual | Verdict |
|--------|--------|--------|---------|
| Same-meaning re-ask | 0 | **6** | **FAIL** (solution Q re-asked T15–T20) |
| Wrong-slot (harness) | 0 | 0 | PASS |
| Padding | 0 | 0 | PASS |
| Meaningful answers | 15–25 | 16 | PASS |
| Duplicate answers | 0 | 0 | PASS |
| P0-1 live | PASS | **FAIL** | ❌ |
| P0-2 live | PASS | **FAIL** | ❌ |
| P0-3/4/5 | PASS | NOT REACHED | — |

## Next step (Loop 9f)

Live @ `940800e` still routes ranked `problemJtbd`/`solution` after wrong-slot merges despite unit PASS on cbce256-shaped turns. Investigate: (1) `askedQuestionText` persistence on demo path, (2) `finishProcessing` wrong-slot override vs `decideNextQuestion` race, (3) same-slot null when `closedGap=validationTestability` + poisoned `targetGap`.

```text
Unit tests: PASS — 59/59 (Loop 9e cbce256 shapes)
Deploy SHA: 940800ef594768fe82c274b014ec2a81e6c38215
Live capture @ 940800e: 16 meaningful · reAsk=6 · P0-1/P0-2 FAIL
CPO PASS: No — P0-1 AND P0-2 live FAIL + reAsk=6
Transcript: docs/evidence/ALABOM/cpo-validation/real-adaptive-vnext/TRANSCRIPT.md
Root cause: docs/evidence/ALABOM/cpo-validation/real-adaptive-vnext/LOOP9_ROOT_CAUSE.md
Poll: docs/evidence/ALABOM/cpo-validation/real-adaptive-vnext/prod-build-info-poll.json
```
