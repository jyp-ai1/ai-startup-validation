# ALABOM Long Sprint — Architecture

```text
Date: 2026-08-28 (KST)
Baseline: 048b38e → delta-visibility fix (this sprint)
Scope: Core Conversation → Business Validation (single Long Sprint)
Auth: Deferred
```

## North star loop

Every turn follows:

```text
Answer → Processing → Understanding Δ → Judgment → Next Q (one) → … → Sufficiency → Analysis → Final
```

Not a fixed Problem→Payer→Competition spine. Gap selection is **adaptive** via `selectTopAdaptiveGap` / `getTopGapPriority`.

## Layer map

| Layer | Location | Role |
|-------|----------|------|
| Semantic interpretation | `interpret-answer-semantics.ts` | why/mid/nonsense/contradiction/correction; mergeable gate |
| Living state | `living-understanding-state.ts` | claims, gaps, coverage %, judgment summary |
| Question causality | `question-causality.ts` | whyNow, understandingDelta, analysis-ready gate |
| Adaptive selection | `adaptive-question-select.ts` | gap priority by business importance + certainty |
| Memory | `build-conversation-memory.ts` | Facts with provenance; doc-confirmed never re-asked |
| Processing pipeline | `process-loop-answer.ts` | sync Memory + Living rebuild after each answer |
| UI loop | `workspace-ai-pm-loop-panel.tsx` | one Q, judgment block, delta, processing stages |
| Presenter | `build-s11-surface-presenter.ts` | single-question surface contract |
| Final output | `build-conversational-final-output.ts` | provenance-tagged sections |

## Key decisions (this sprint)

### D1 — Understanding Δ always visible

**Problem:** E2E captured empty `understanding-delta` on mergeable turns when phase=`issue` (recognition skipped) or during `reanalyze` processing.

**Fix:**

- Issue-phase ask surface now renders the same judgment + `data-testid="understanding-delta"` block as answer phase.
- `WorkspaceAiPmThinkingStages` renders pending delta during processing.
- E2E snap waits for attached delta + judgment fallback parse.

### D2 — Sufficiency ≠ Analysis Ready

`explainSufficiency()` vs `evaluateAnalysisReady()` — Start Analysis blocked when critical gaps or open contradictions remain (`criticalGapsBlockAnalysis`).

### D3 — Why / mid-summary are display-only

`interpretAnswerSemantics` → `why_meta` / `mid_judgment` never append Facts; reframe on return.

### D4 — Contradiction path

Old → Superseded → New with explicit confirm UI; conflict delta persisted on turn record.

### D5 — Long journey depth

`reopenAiPmLoopForRefinement` + continue-refining CTA after Analysis Ready panel allows 30+ turn captures without premature analysis exit.

## UI/UX contracts

| Item | Implementation |
|------|----------------|
| New project textarea | `my-projects-home.tsx` — 6 rows, 0/1000 counter |
| Placeholder copy | `ko.json` `myProjects.descriptionPlaceholder` |
| AI PM panel | ✓/△/? understanding, one Q, answer box, judgment, gaps |
| Processing UX | `workspace-ai-pm-thinking-stages.tsx` — staged steps + delta |
| Review CTA | Contextual copy + disabled when not analysis-ready |

## Test surfaces

- Unit: `core-final-stabilization.test.ts`, `core-v4-conversation-engine.test.ts`
- Production E2E: `e2e/_cpo-long-sprint-final-prod-capture.spec.ts` (Demo `/demo/start`, 30+ turns)

## Out of scope

- Auth / KI-1 / Google OAuth new-user one-liner capture (Deferred)
- Real LLM provider swap
- Journey contract changes

## Cross-links

- Evidence: [docs/evidence/ALABOM/long-sprint/](../evidence/ALABOM/long-sprint/EVIDENCE_INDEX.md)
- Prior baseline: [long-sprint-final](../evidence/ALABOM/conversation-validation/long-sprint-final/FINAL_REPORT.md)
