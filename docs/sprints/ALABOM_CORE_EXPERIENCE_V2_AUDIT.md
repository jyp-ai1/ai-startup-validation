# ALABOM Core Experience v2 — Audit

```text
Date: 2026-08-26
Base SHA: 29db623 (Core v1 LIVE A–F PASS)
Scope: Phase 1 targeted audit — data flow root causes only
Auth: UNTOUCHED (KI-1 HOLD)
```

## Question

Is business/customer/market a **Living Understanding State** or UI fields?

**Answer: UI fields with partial Memory overlay — not a unified Living State.**

## Data flow (current)

| Layer | Store | Fields | SoT role |
|-------|-------|--------|----------|
| Document | `sessionStorage` via `loadWorkspaceDocumentText` | raw text | intake only |
| BusinessUnderstanding | derived from doc each render | 8 fields + mentions | document parse snapshot |
| ConversationMemory | `sessionStorage` | 7 fact keys | confirmed facts only |
| AiPmLoopState | `sessionStorage` | turns + phase + issueId | conversation cursor |
| UnderstandingSpine | **recomputed** via `buildSharedUnderstanding` | business·customer·problem | display adapter |
| WorkspaceState | `deriveWorkspaceState()` | aggregates above | read facade |
| UnderstandingPhase | `sessionStorage` | pending/accepted/… | UX gate only |
| Domain 01–20 contract | `understanding-contract.ts` | defined, **not stored** | spec only |

## Root causes (v2 must fix)

1. **No Living Understanding State** — claims scattered across Memory (7 keys), BusinessUnderstanding (8 fields), Spine (3 fields), DomainEvidence. Overview/AI PM/Progress each re-derive with overlapping priority chains → drift risk.

2. **Form-adjacent question loop** — 5 fixed `AiPmLoopIssueId`s mapped 1:1 to fact keys; priority uses missing-field boost + diagnosis scores but still walks issue order when gaps tie. Not full Domain 01–20 judgment engine.

3. **Fake processing chrome** — `startProcessing()` uses `setTimeout(THINKING_TOTAL_MS)` (1800ms) after Memory is already written. Stages are cosmetic timers, not tied to pipeline completion.

4. **Coverage % missing** — sidebar hides metrics pre-review; no deterministic "사업 정보 구체화도" from domain coverage. Post-review score is validation success, not specificity.

5. **Domain 01–20 unwired** — contract exists; no claim store with Known/Inferred/Confirmed/Unknown/Contradiction/Evidence.

6. **Step-back partial** — `correction-and-why.ts` + edit flow exist for spine fields; downstream invalidation on edit is not systematic across loop turns + Memory.

7. **Initial understanding confirm** — Document First draft + Shared Understanding card work; but confirm does not mutate a durable claim graph — only phase flag + loop unlock.

## What works (v1 — keep)

- Answer Quality gate (nonsense/contradiction re-ask)
- Memory rebuild from turns (`buildConversationMemoryFromSources`)
- Stage transition sufficiency gate (`evaluateStageTransition` — not turn-count)
- Document First gap-only (`buildDocumentFirstDraft`)
- Overview state board wired to Spine (post-fa18171)
- Why branch (`buildWhyFollowUp`)
- Demo journey parity (auth omitted)

## v2 architecture target

```
Document / one-liner / answer
  → buildLivingUnderstandingState()  ← SINGLE SoT
      claims[Domain01–20]: status + provenance + evidence
      coveragePercent (deterministic)
      gaps[] (priority scored)
  → Readers (no independent derivation):
      Overview · AI PM · Progress · Review · Question engine
  → applyAnswer → sync pipeline → real stage completion → next ONE question
```

## Auth

**Confirm: Auth untouched.** No OAuth/CDP/storageState in scope.
