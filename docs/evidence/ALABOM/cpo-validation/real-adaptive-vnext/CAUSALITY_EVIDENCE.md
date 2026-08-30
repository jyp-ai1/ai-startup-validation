# Real Adaptive vNext — Causality Evidence (Loop 5 → Loop 8b)

| Meta | Value |
|---|---|
| **Loop 8b production SHA** | `a9ebd639caf7f29d6945af6c9e8e7c5c09172c60` (Loop 8 deploy + live capture) |
| Loop 8 fix commits | `4769f4f` (wrong-slot override) + `a9ebd63` (PERSONA_WRONG_SLOT_BOOST build fix) |
| Loop 8b live capture | 2026-08-29T21:30:27Z @ `a9ebd63` — P0-1/P0-2 **FAIL live** (same as 9fa5248) |
| **Loop 7c production SHA** | `9fa5248494b8ebe0dc461dd887db0ee797232976` (Loop 7b deploy-unblock + live capture) |
| **Loop 7b unblock SHA** | `9fa5248` — remove duplicate `unresolvedGap`; Vercel **SUCCESS** @ 2026-08-29T19:49:18Z |
| **Loop 7 fix SHA** | `3b2519c7…` — persist `targetGap` on adaptive append (pushed 2026-08-29) |
| **Loop 7 Vercel deploy** | **FAILED** — duplicate `unresolvedGap` TS key @ `workspace-ai-pm-loop-panel.tsx:908` |
| **Loop 7c live capture** | 2026-08-29T19:50:13Z @ `9fa5248` — P0-1/P0-2 still **FIX** |
| **Loop 6b production SHA** | `9046a6ed26f2e5659246cb5256f5db2d57c63d01` (Loop 6b live re-capture) |
| Loop 6f target | `510219747bc7fb7a4d3666d65e0361be169e5425` — Vercel build **FAILED** (TS); never served |
| Loop 6g ship fix | `9046a6e` — TS guard only; includes Loop 6f runtime |
| Captured (Loop 6b) | 2026-08-29T13:57:16Z @ `9046a6e` |
| Evidence | [TRANSCRIPT.md](./TRANSCRIPT.md) · [transcript-raw.json](./transcript-raw.json) |
| Engine SoT | `resolve-asked-target-gap.ts` · `interpret-answer-semantics.ts` · `wrong-slot-priority.ts` · `getWhyThisQuestionNow()` |

---

## Loop 8b executive summary (@ `a9ebd63` live capture)

| Item | Status |
|------|--------|
| Push + deploy | `a9ebd63` pushed → Vercel **SUCCESS** @ 2026-08-29T21:30:18Z |
| Build + unit | `pnpm build` PASS · **45/45 PASS** |
| Live capture | **PASS** harness — 15 meaningful · 22 turns · 3.4min |
| P0-1 T12→T13 | **FAIL** — persona ask + diffRelevance → next Q `problemJtbd` (not `customerPersona` re-ask) |
| P0-2 T13→T14 | **FAIL** — problem ask + persona wrong-slot → next Q `solution` (not `problemJtbd` re-ask) |
| P0-3/4/5 + regression | P0-3/4/5 **PASS** · reAsk=2 · wrong-slot harness=0 · padding=0 |
| **CPO PASS** | **No** — unit PASS / live FAIL gap persists post Loop 8 deploy |

### Loop 8b live T12–T14 (@ `a9ebd63`)

**P0-1 T12→T13 — FAIL**

| | |
|---|---|
| T12 asked | `customerPersona` — "이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?" |
| T12 answer | `BANK.diffRelevance` |
| Delta | `신규: validationTestability` · `미확인: problemJtbd, solution, customerPersona` · `다음 공백: problemJtbd` |
| **T12→T13 next Q** | **"지금 가장 크게 해결하려는 불편은 무엇인가요?"** → `problemJtbd` ❌ |

**P0-2 T13→T14 — FAIL**

| | |
|---|---|
| T13 asked | `problemJtbd` |
| T13 answer | `BANK.customer` (persona wrong-slot) |
| Judgment | "풀려는 문제가 확인되지 않았습니다." |
| **T13→T14 next Q** | **"문제를 해결하는 방식(제공 가치)은 무엇인가요?"** → `solution` ❌ |

---

## Loop 7c executive summary (deploy-unblock + live capture @ `9fa5248`)

| Item | Status |
|------|--------|
| Loop 7b shipped | Commit `9fa5248` — remove duplicate `unresolvedGap: askedGap`; retain `targetGap: askedGap` |
| Deploy | **SUCCESS** @ 2026-08-29T19:49:18.526Z |
| Build + unit | `pnpm build` PASS · **43/43 PASS** |
| Live capture | **PASS** — 16 meaningful · 23 turns · 4.8min |
| P0-1 T12→T13 | **FIX** — persona ask + diffRelevance wrong-slot → next Q `problemJtbd` (not persona re-ask) |
| P0-2 T13→T14 | **FIX** — problem ask + persona wrong-slot → next Q `solution` (not problem re-ask) |
| P0-3/4/5 + regression | **PASS** — adaptive depth · Analysis gate · GO score 75 |
| **CPO PASS** | **No** — targetGap persist shipped but wrong-slot override still ineffective live |

### Loop 7c live T12–T14 (@ `9fa5248`)

**P0-1 T12→T13 — FIX**

| | |
|---|---|
| T12 asked | `customerPersona` — "이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?" |
| T12 answer | `BANK.diffRelevance` |
| Delta | `신규: validationTestability` · `미확인: problemJtbd, solution, customerPersona` · `다음 공백: problemJtbd` |
| **T12→T13 next Q** | **"지금 가장 크게 해결하려는 불편은 무엇인가요?"** → `problemJtbd` ❌ |

**P0-2 T13→T14 — FIX**

| | |
|---|---|
| T13 asked | `problemJtbd` |
| T13 answer | `BANK.customer` (persona wrong-slot) |
| Judgment | "풀려는 문제가 확인되지 않았습니다." |
| **T13→T14 next Q** | **"문제를 해결하는 방식(제공 가치)은 무엇인가요?"** → `solution` ❌ |

---

## Loop 7b executive summary (deploy poll + diagnosis) — superseded by Loop 7c

| Item | Status |
|------|--------|
| Root cause confirmed | Adaptive append used `whyThisQuestionNow?.targetGap ?? 'unknown'` — turns persisted without valid `targetGap` → `detectWrongSlotMergeContext` null → `resolveWrongSlotQuestionOverride` never fired |
| Loop 7 fix | `resolveAskedTargetGapForAppend()` — why/override/questionText/topGap/issue fallback; persist `targetGap: askedGap` on every mergeable turn; `inferAskedTargetGapFromTurn()` for legacy turns |
| Deploy blocker | Loop 7 added `unresolvedGap: askedGap` alongside existing `unresolvedGap: causality.unresolvedGap` → Vercel TS build failed @ 2026-08-29T14:08:47Z |
| Loop 7b unblock | Shipped `9fa5248` — build PASS · **43/43 unit PASS** · deploy SUCCESS |
| Live P0-1 / P0-2 | **FIX** @ `9fa5248` — override still not re-anchoring asked gap |

### Loop 7 code path (minimal)

| File | Change |
|------|--------|
| `resolve-asked-target-gap.ts` | New — append + infer helpers |
| `workspace-ai-pm-loop-panel.tsx` | `resolveAskedTargetGapForAppend` before interpret + append; never `'unknown'` |
| `wrong-slot-priority.ts` | `inferAskedTargetGapFromTurn` in `detectWrongSlotMergeContext` |
| `build-conversation-memory.ts` | Rebuild uses inferred asked gap for interpret |
| `gap-question-map.ts` | `inferTargetGapFromQuestionText` fallback |

---

## Loop 6b executive summary (@ `9046a6e` live capture)

| P0 | Transition | Verdict | Headline |
|----|------------|---------|----------|
| P0-1 | T12→T13 | **FIX** | Persona ask + `BANK.diffRelevance` wrong-slot → next Q still `problemJtbd` (not `customerPersona`) |
| P0-2 | T13→T14 | **FIX** | Problem ask + persona merge → next Q still `solution` (not `problemJtbd`) |
| P0-3 | T16→T22 | **PASS** | Adaptive revenue → demand → refinement; no fixed spine |
| P0-4 | Analysis gate @ T22 | **PASS** | Start Analysis enabled @ meaningful≥15 |
| P0-5 | Final GO @ T23 | **PASS** | GO score 75 · Problem Fit rationale |

**Deploy note:** Polled 30min @ `73e413d`; `5102197` Vercel deploy failed (TS `turn.targetGap` possibly undefined). Shipped `9046a6e` (Loop 6g TS guard). Live T12–T14 **unchanged** vs `73e413d` — Loop 6f SoT override not effective on production panel path.

**Hypothesis (Loop 6b):** `detectWrongSlotMergeContext` requires `last.targetGap` on stored turns; adaptive UI path may omit `targetGap` on append → override returns null despite visible persona/problem ask text.

### Loop 6b live T12–T14 (@ `9046a6e`)

**P0-1 T12→T13 — FIX**

| | |
|---|---|
| T12 asked | `customerPersona` — "이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?" |
| T12 answer | `BANK.diffRelevance` |
| Delta | `신규: validationTestability` · `미확인: customerPersona, problemJtbd, solution` · `다음 공백: problemJtbd` |
| **T12→T13 next Q** | **"지금 가장 크게 해결하려는 불편은 무엇인가요?"** → `problemJtbd` ❌ |

**P0-2 T13→T14 — FIX**

| | |
|---|---|
| T13 asked | `problemJtbd` |
| T13 answer | `BANK.customer` (persona wrong-slot) |
| Judgment | "남은 핵심 공백은 「problemJtbd」" · decision: "풀려는 문제가 확인되지 않았습니다." |
| **T13→T14 next Q** | **"문제를 해결하는 방식(제공 가치)은 무엇인가요?"** → `solution` ❌ |

### Regression @ `9046a6e`

| Metric | Result |
|--------|--------|
| Meaningful turns | 16 |
| reAsk | 0 |
| wrong-slot (harness) | 0 |
| mixed-Q | 0 |
| padding | 0 |
| Analysis gate @ T22 | PASS |
| GO @ T23 | PASS |

---

## Loop 6 executive summary (@ `73e413d` — superseded by Loop 6b)

| P0 | Transition | Verdict | Headline |
|----|------------|---------|----------|
| P0-1 | T12→T13 | **FIX** | Persona ask + `BANK.diffRelevance` wrong-slot → next Q still `problemJtbd` (not `customerPersona`) |
| P0-2 | T13→T14 | **FIX** | Problem ask + persona merge → next Q still `solution` (not `problemJtbd`) |
| P0-3 | T16→T22 | **PASS** | Adaptive revenue → demand → refinement; no fixed spine |
| P0-4 | Analysis gate | **PASS** | Start Analysis enabled @ meaningful≥15 |
| P0-5 | Final GO | **PASS** | GO with living evidence |

**Unit tests:** **40/40 PASS** (`core-final-stabilization.test.ts` incl. interpret-path T12/T13 integration).

**Minimal fix status:** Loop 6 commits `74527fe`→`5102197` shipped engine + panel + interpret fixes; **live P0-1/P0-2 remain FIX @ `73e413d` and `9046a6e`**. Loop 6f SoT override deployed but ineffective on live panel path.

---

## Loop 6 root cause (why unit tests passed, live failed)

| Layer | Finding |
|-------|---------|
| **Interpret** | `BANK.diffRelevance` contains generic 「고객」→ mis-routed to `customer` fact on `customerPersona` ask → `detectWrongSlotMergeContext` returned **null** (same-slot, not wrong-slot) |
| **Interpret** | `problemJtbd` ask + persona answer forced `problem` fact, stripping `customer` → P0-2 wrong-slot undetected |
| **Ranking** | `getWhyThisQuestionNow` skipped `customerPersona` when prior edit (T8) credited gap in `answeredGaps` despite still unconfirmed in living |
| **Panel** | `getWhyThisQuestionNow` used stale `conversationMemory` vs fresh store turns after `appendAiPmLoopTurn` |
| **Production path** | UI reads `getWhyThisQuestionNow` → `resolveMissingFieldPriorities`, not `decideNextQuestion` alone |

### Loop 6 commits (engine + tests)

| SHA | Fix |
|-----|-----|
| `74527fe` | `living.gaps` solution block + ranking guards in `resolveMissingFieldPriorities` |
| `4912ace` | `wrong-slot-priority` interpret fallback + final ranking guard |
| `2c2c05b`/`4d2501e` | Panel: fresh store turns + `syncState` after append |
| `e2066e0` | Interpret: relevance-dominant vs persona-segment cues (T12/T13 live BANK strings) |
| `73e413d` | `getWhyThisQuestionNow` wrong-slot override before `answeredGaps` skip; prior-edit integration test |
| `5102197` | `resolveWrongSlotQuestionOverride` bypasses ranked[] entirely; stored-key re-classify |
| `9046a6e` | Loop 6g — TS guard for `askedTargetGap` (unblocks Vercel deploy) |

---

## Loop 6 live T12–T14 evidence (@ `73e413d`)

### P0-1 T12→T13 — **FIX**

| | |
|---|---|
| T12 asked | `customerPersona` — "이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?" |
| T12 answer | `BANK.diffRelevance` (wrong-slot) |
| Delta | `신규: validationTestability` · `미확인: customerPersona, problemJtbd, solution` |
| **T12→T13 next Q** | **"지금 가장 크게 해결하려는 불편은 무엇인가요?"** → `problemJtbd` ❌ expected `customerPersona` |

### P0-2 T13→T14 — **FIX**

| | |
|---|---|
| T13 asked | `problemJtbd` |
| T13 answer | `BANK.customer` (persona wrong-slot) |
| Judgment | "남은 핵심 공백은 「problemJtbd」" |
| **T13→T14 next Q** | **"문제를 해결하는 방식(제공 가치)은 무엇인가요?"** → `solution` ❌ expected `problemJtbd` |

### Regression @ `73e413d`

| Metric | Result |
|--------|--------|
| Meaningful turns | 16 |
| reAsk | 0 |
| wrong-slot (harness) | 0 |
| padding | 0 |
| Analysis gate | PASS |
| GO | PASS |

---

## Loop 5 executive summary (@ `f633733` — superseded by Loop 6 re-capture)

---

## Loop 5 post-fix production check (@ `f633733`)

| Check | Unit tests | Live capture T12–T14 |
|-------|------------|----------------------|
| Persona priority after wrong-slot relevance on persona ask | **PASS** | **FAIL** — T12→T13 next Q = `problemJtbd` |
| Block solution while `problemJtbd` open | **PASS** | **FAIL** — T13→T14 next Q = `solution` |
| Delta-aware whyNow | **PASS** (engine string) | **PARTIAL** — generic problem copy in UI `purpose` |
| P0-3/4/5 + regression metrics | **PASS** | **PASS** — 16 meaningful · reAsk=0 · wrong-slot=0 · padding=0 · gate @ T22 · GO @ T23 |

---

## P0-1 — T12→T13 persona causality

### Verdict: **FIX** (adaptive bypass + weak whyNow; **not** fixed spine)

### BEFORE living state (end of T11)

| Field | Status | Value (truncated) |
|-------|--------|-------------------|
| `validationTestability` | **open** | diff relevance not user-confirmed with evidence |
| `customerPersona` | **open** | doc inference "방한 외국인" — not USER_CONFIRMED |
| `problemJtbd` | **open** | — |
| `payer` | confirmed | tourist direct pay (T10) |
| Judgment top gap | `problemJtbd` | coverage 40% |

**T11 answer:** validation plan (harness facet `validation`) → did **not** close `validationTestability` (no `hasDiffRelevanceEvidence`).

**T11→T12 next Q:** `customerPersona` — "이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?"  
**whyNow:** generic `whyNowForGapField('customerPersona')` — not tied to T11 validation-plan delta.

### T12 turn

| | |
|---|---|
| **Asked gap** | `customerPersona` |
| **User answer** | "맞춤 일정이 없으면 첫날부터 동선 낭비…" (`BANK.diffRelevance`) |
| **Semantic route** | `interpretAnswerSemantics`: no `customerCue` → strong diff-relevance cue → **`validationTestability` closed** |
| **Delta** | `신규: validationTestability` · `미확인: problemJtbd, solution, customerPersona` |
| **Judgment** | "남은 핵심 공백은 「problemJtbd」" |
| **Gap change** | `changed` |

**Code path:** `interpret-answer-semantics.ts` — when `askedGap === 'customerPersona'` without customer cue, semantic top wins; relevance evidence closes `validationTestability` via `hasDiffRelevanceEvidence()`. `getAnsweredTargetGaps()` credits gap only when semantic fact matches (`resolve-missing-field-priority.ts` L165–168).

### AFTER living state → T12→T13 next Q

| Field | Status after T12 |
|-------|------------------|
| `validationTestability` | **closed** (USER_CONFIRMED + relevance evidence) |
| `customerPersona` | **still open** (never re-asked after wrong-slot fill) |
| `problemJtbd` | **open** |
| **Next gap selected** | `problemJtbd` |
| **Next Q** | "지금 가장 크게 해결하려는 불편은 무엇인가요?" |

### Causality analysis

1. **Did T12 answer cause `customerPersona` to (re)open?** **No.** Persona was already open since T8 prior-edit (document-only customer). T12 answer **closed** `validationTestability`, not persona.
2. **Fixed spine?** **No.** Fixed spine would be persona → problem in binding order regardless of open gaps. Engine **skipped** unanswered `customerPersona` and ranked `problemJtbd` via `selectAdaptiveNextGaps()` tourism boost (+2k on problem/customer; problem selected at equal/higher living score).
3. **Causality gap (FIX):** T12 delta was relevance closure on a persona-shaped ask, but T12→T13 `whyNow` is stock problem copy — **does not reference** T12 relevance delta or explain why persona is deferred. Open `customerPersona` bypassed without explicit rationale.

### Proof excerpts

- `transcript-raw.json` T12: `"다음 공백: problemJtbd"`, `"미확인: problemJtbd, solution, customerPersona"`
- `transcript-raw.json` T13 `aiQuestion`: problem JTBD text (not persona)
- `adaptive-question-select.ts` L211–214: tourism archetype boosts `problemJtbd` / `customerPersona` equally — tie-break + living.gaps merge decides winner

---

## P0-2 — T13→T14 persona → problem causality

### Verdict: **FIX** (persona merge did not cause problem gap selection)

### T13 turn

| | |
|---|---|
| **Asked gap** | `problemJtbd` |
| **User answer** | persona (`BANK.customer`) — harness adaptive pool, no facet force |
| **Semantic route** | `problemJtbd` asked + no problem cue → answer lacks problemCue → **`customerPersona` confirmed** (customerCue match) |
| **Delta** | `변경: customerPersona: … → 초기 타깃은 서울을 3~7일…` · `미확인: problemJtbd, solution` |
| **Decision** | "풀려는 문제가 확인되지 않았습니다." |
| **Judgment top gap** | **`problemJtbd`** (still open) |

### T13→T14 next Q

| | |
|---|---|
| **Next gap** | `solution` |
| **Next Q** | "문제를 해결하는 방식(제공 가치)은 무엇인가요?" |
| **whyNow** | generic / empty in capture |

### Causality analysis

- **Did persona update cause `problemJtbd` gap?** **No.** Persona merge **did not** select or close problem. Engine jumped to **`solution`** while `problemJtbd` remained blocking per judgment and decision text.
- **Expected adaptive behavior:** `selectAdaptiveNextGaps()` demotes `solution` to 45k until `problemJtbd` USER_CONFIRMED (L207–209). Live run violated this — **solution asked with open problem**.
- **T14 closure:** User supplied `BANK.problem` to the solution-shaped Q → `problemJtbd` closed opportunistically (wrong-slot recovery, not causal chain).

### Proof

- T13 `judgmentBlock`: "남은 핵심 공백은 「problemJtbd」"
- T13 `nextQuestion`: solution gap text
- T14 delta: `신규: problemJtbd` · `다음 공백: solution`

---

## P0-3 — T16→T22 causal map (revenue → demand → execution → Analysis Ready)

### Verdict: **PASS — adaptive ranking + refinement depth, not fixed spine**

| Turn | Prior answer (semantic) | Gap change | whyNow / rationale | Next Q gap |
|------|-------------------------|------------|-------------------|------------|
| **T15** | solution content → business conflict | `solution` still unconfirmed; business conflict | defensibility whyNow (asked gap `executionConstraints`) | `revenueModel` |
| **T16** | defensibility (`executionConstraints` closed) | `executionConstraints` confirmed; top gap → `marketChannel` | revenue whyNow — **payer confirmed → revenue chain** (`adaptive-question-select.ts` L251–263) | `marketSizeEvidence` (demand) |
| **T17** | revenue (`revenueModel`/`pricingHint` closed) | revenue confirmed; gap unchanged | demand whyNow — market evidence score 22k | *(textarea drained — continue-refining)* |
| **T18** | demand (`marketSizeEvidence` + `marketChannel`) | market evidence closed; coverage 80% | refinement / partial gaps | *(no surface Q — drain mode)* |
| **T19** | scope/MVP fallback | market conflict partial | `selectRefinementGapAfterAnalysisReady` | — |
| **T20** | payer re-statement | buyer conflict surfaced | conflict on `payer` vs T10 confirm | — |
| **T21** | MVP scope | phase handoff → Ready for review | analysis-ready handoff | — |
| **T22** | gate probe | **`evaluateAnalysisReady().analysisReady === true`** | critical gaps empty | Start Analysis **enabled** |
| **T23** | start analysis | GO emitted | living-evidence-based rationale | — |

**Adaptive signals (not fixed order):**

- T16 revenue ask triggered because **`payer` USER_CONFIRMED** (T10), not turn index.
- T17–T18 demand/market follow **score 22k** market keys, after defensibility/revenue closed.
- T18+ **`continue-refining reopen @meaningful=13`** + `selectRefinementGapAfterAnalysisReady()` — depth after viability closed (Loop 4 engine change @ `4c4792e`).
- Harness wrong-slot noise (T15–T17 Q/A facet mismatch) did not block gate — facts landed via semantic interpreter.

**Not fixed spine proof:** `resolve-missing-field-priority.ts` L355 comment + L626: "adaptive top gap is always SoT (no issue stickiness / fixed spine)".

---

## P0-4 — Analysis gate evidence @ T22

### Verdict: **PASS**

### Critical viability dimensions @ gate

| Dimension | fieldKey | USER_CONFIRMED @ T22 | Evidence turn |
|-----------|----------|----------------------|---------------|
| Customer | `customerPersona` | ✓ | T13 (wrong-slot merge) |
| Problem | `problemJtbd` | ✓ | T14 |
| Payer | `payer` | ✓ | T10 (+ T20 re-state, non-blocking) |
| Solution | `solution` | ✓ | T15 (partial conflict on businessOneLiner only) |
| Competition | `alternativesCompetitors` | ✓ | T3 |
| Differentiation | `differentiationVsAlternatives` | ✓ | T4 |
| Diff relevance | `validationTestability` | ✓ | T12 (relevance evidence) |

### Analysis-blocking check (`listAnalysisBlockingGaps`)

| Check | @ T22 |
|-------|-------|
| Unconfirmed critical viability | **none** |
| `validationTestability` with diff confirmed | **closed** |
| Open contradiction blocking | **none** (T20 buyer conflict superseded by T10 confirm in gate state) |
| `criticalGapBlockedStartAnalysis` | `false` |
| Start Analysis button | visible=true, disabled=false |

### Remaining non-blocking gaps @ T22

| Gap | Status | Blocks analysis? |
|-----|--------|------------------|
| `pricingHint` | partial / inferred | No |
| `categoryScope` | uncertain | No |
| `topRisks` | open (depth) | No |
| `marketSizeEvidence` | confirmed T18 | No |

### Sufficiency vs Analysis Ready

- Sufficiency ~80% @ T21–T22 — **explicitly separate** from Analysis Ready per `evaluateAnalysisReady()` / `explainSufficiency()` (P0-1 gate design).

---

## P0-5 — Final GO evidence @ T23

### Verdict: **PASS** — Living Understanding drives judgment; score auxiliary

| Signal | Evidence |
|--------|----------|
| Verdict | "GO 방향 — MarketJudgment" |
| Primary rationale | "고객·문제에 대한 이해(Problem Fit)와 함께, 고객과 수익 근거가 확인되어 시장성 판단을 시작할 수 있습니다." |
| Score | 75 — labeled "점수는 보조" in UI copy |
| Progress dimensions | Business ✓ · Customer ✓ · Market ✓ · Competition ✓ |
| Code intent | `build-conversational-final-output.ts` — structured Confirmed/Inferred/Evidence, not score-only GO |

GO is **not** score-threshold alone: narrative cites confirmed customer, problem fit, and revenue/market evidence from living state.

---

## Minimal fix

### Needed? **Yes** (engine-only; no harness / UI overhaul)

**Trigger:** P0-1 FIX + P0-2 FIX — not classic fixed spine, but **open-gap bypass** and **solution-before-problem** violate CPO causality bar.

### Smallest engine fix (proposed — **not deployed** @ `4c4792e`)

1. **`resolveMissingFieldPriorities` / `selectAdaptiveNextGaps`:** When `customerPersona` is unconfirmed and last merge closed a *different* gap on a `customerPersona` ask (wrong-slot relevance), **re-rank `customerPersona` above `problemJtbd`** unless T12-class answer explicitly narrows segment (`customerCue` + correction).
2. **`selectAdaptiveNextGaps`:** Hard-block `solution` candidate when `problemJtbd` ∈ `listUnconfirmedCriticalGaps(living)` (enforce existing L207–209 demotion at selection time).
3. **`buildQuestionCausality` / reframe:** Append prior-turn delta snippet to `whyNow` when gap switch follows wrong-slot closure (e.g. "方금 확인한 고객 관련성 → 다음은 핵심 불편").

### Unit tests only

- Wrong-slot relevance on `customerPersona` ask → next top gap stays `customerPersona`.
- Persona confirmed with open `problemJtbd` → next gap is `problemJtbd`, not `solution`.
- `evaluateAnalysisReady` unchanged (regression guard).

### Re-capture?

**No** at current SHA — evidence valid for causality audit. Re-capture only if minimal fix is merged and deployed.

---

## Code references

```207:214:apps/web/features/workflow-journey/lib/business-understanding/adaptive-question-select.ts
    if (key === 'solution') {
      const problem = byKey('problemJtbd');
      score = isUserConfirmed(problem) ? 52_000 : 45_000;
    }
    // Tourism: problem/customer slightly ahead of generic BM
    if (archetype === 'tourism' && (key === 'problemJtbd' || key === 'customerPersona')) {
      score += 2_000;
    }
```

```441:484:apps/web/features/workflow-journey/lib/business-understanding/interpret-answer-semantics.ts
  } else if (askedGap === 'customerPersona') {
    const customerCue = /(고객|타깃|...)/i.test(trimmed);
    if (customerCue || isCorrection) { /* customer fact */ }
  } else if (askedGap === 'validationTestability') {
    // ... hasDiffRelevanceEvidence closes relevance
  }
```

```320:334:apps/web/features/workflow-journey/lib/business-understanding/question-causality.ts
export function evaluateAnalysisReady(...) {
  const blockedGaps = listAnalysisBlockingGaps(living);
  const analysisReady = blockedGaps.length === 0 && !hasContradiction;
  // ...
}
```
