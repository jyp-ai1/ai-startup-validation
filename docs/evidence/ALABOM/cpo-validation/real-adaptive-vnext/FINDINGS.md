# ALABOM Real Adaptive vNext — FINDINGS (Loop 9g-b)

## Deploy status

| Item | Value |
|------|-------|
| **Loop 9g fix** | Shipped @ `7df4764591bc76e7bd208412bef91f355bc366f7` |
| **Prior production SHA** | `b2fc5d9` (Loop 9f-b live FAIL — delayed persona re-ask) |
| Unit tests | **68/68 PASS** (`core-final-stabilization.test.ts` incl. Loop 9g applyLoopProcessingTransition + immediate T12/T13) |
| `pnpm build` | **PASS** |
| Deploy poll | **SUCCESS** @ 2026-08-30T00:20:03Z (~2min after push) |
| Live capture | @ `7df4764` — harness PASS · 16 meaningful · 23 turns · ~4.9min |

## Loop 9g fix (shipped @ `7df4764`)

| File | Change |
|------|--------|
| `process-loop-answer.ts` | `applyLoopProcessingTransition` blocks `phase: issue` when `hasPendingWrongSlotReask(turns)` |
| `workspace-ai-pm-loop-panel.tsx` | `flushSync` wrong-slot pin at submit; `wrongSlotSubmitPinRef`; `displayPhase` skips issue UI |
| `core-final-stabilization.test.ts` | Loop 9g — 4 tests: never issue when pending; immediate T12→persona / T13→problem |
| `_cpo-real-adaptive-prod-capture.spec.ts` | Storage dump + immediate P0-1/P0-2 assertions @ T12/T13 shapes |

## P0 causality verdicts (@ `7df4764` live)

| P0 | Transition | Unit @ Loop 9g | Live @ `7df4764` |
|----|------------|----------------|------------------|
| **P0-1** | T12→T13 immediate | **PASS** (68/68) | **FAIL** — persona ask + diffRelevance → next Q `problemJtbd` ❌ |
| **P0-2** | T13→T14 immediate | **PASS** | **FAIL** — problem ask + persona merge → next Q `solution` ❌ |
| **P0-3** | T16→T22 adaptive depth | PASS | **PASS** — 16 meaningful · natural adaptive loop |
| **P0-4** | Analysis gate @ T21 | PASS | **PASS** — Start Analysis enabled @ gate probe |
| **P0-5** | Final GO @ T22 | PASS | **PASS** — GO score 75 @ final review |

**CPO PASS declared:** **No** — P0-1 AND P0-2 immediate transitions remain live FAIL on capture @ `7df4764`.

## Loop 9g-b live T11–T15 evidence (@ `7df4764`)

### T11→T12 — PASS ✓

| | |
|---|---|
| T11 asked | validationTestability follow-up (post conflict) |
| T11 answer | `BANK.validation` |
| **T11→T12 next Q** | **"이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?"** → `customerPersona` ✓ |

### P0-1 T12→T13 — FAIL (immediate)

| | |
|---|---|
| T12 asked | `customerPersona` — "이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?" |
| T12 answer | `BANK.diffRelevance` (wrong-slot) |
| Delta | `validationTestability` credited |
| **T12→T13 next Q** | **"지금 가장 크게 해결하려는 불편은 무엇인가요?"** → `problemJtbd` ❌ (expected immediate `customerPersona` re-ask) |

### P0-2 T13→T14 — FAIL (immediate)

| | |
|---|---|
| T13 asked | `problemJtbd` |
| T13 answer | `BANK.customer` (persona wrong-slot) |
| Delta | `customerPersona` credited on problem ask |
| **T13→T14 next Q** | **"문제를 해결하는 방식(제공 가치)은 무엇인가요?"** → `solution` ❌ (expected immediate `problemJtbd` re-ask) |

### Delayed re-ask @ T14→T15

| | |
|---|---|
| T14 asked | `solution` |
| T14 answer | `BANK.problem` (correct slot for problem ask, but asked on solution Q) |
| **T14→T15 next Q** | **"이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?"** → delayed persona re-ask (same pattern as `b2fc5d9`) |

## Hard metrics (@ `7df4764`)

| Metric | Target | Actual | Verdict |
|--------|--------|--------|---------|
| Same-meaning re-ask | 0 | **0** | **PASS** |
| Wrong-slot (harness immediate) | 0 | 0 | PASS (harness gap — see note) |
| Padding | 0 | 0 | PASS |
| Meaningful answers | 15–25 | 16 | PASS |
| Duplicate answers | 0 | 0 | PASS |
| Gate probe | enabled | enabled @ T17 | PASS |
| P0-1 live immediate | PASS | **FAIL** | ❌ |
| P0-2 live immediate | PASS | **FAIL** | ❌ |
| P0-3/4/5 | PASS | PASS | ✓ |

**Harness note:** `wrongSlotHints=0` because P0-1/P0-2 assertions require `facet=diffRelevance` / `forced=BANK.customer`; adaptive loop used `facet=adaptive` with same BANK strings. Transcript nextQuestion chain confirms live FAIL.

## Next step (Loop 9h)

Live @ `7df4764` still routes ranked `problemJtbd`/`solution` on first paint after wrong-slot merges despite `flushSync` pin + `applyLoopProcessingTransition` guard. Unit/live gap persists — investigate: (1) demo path `hasPendingWrongSlotReask` false at transition time, (2) nuclear bypass not firing before ranked display on production bundle, (3) harness should assert on qBefore shape regardless of facet.

## Evidence artifacts

- `transcript-raw.json` — full 23-turn capture @ `7df4764`
- `TRANSCRIPT.md` — human-readable turn bodies
- `prod-build-info.json` / `prod-build-info-poll.json`
- `loop9g-b-capture-run.log`
- `LOOP9_ROOT_CAUSE.md` — causality chain + verdict table
