# ALABOM Core Understanding Experience — Progress (checkpoint)

```text
Status: EXECUTING
Date: 2026-08-26
Auth: UNTOUCHED (KI-1 HOLD / Deferred)
```

## Root causes (confirmed)

1. **Stuck `AI 검토 중`:** `appendAiPmLoopTurn` wrote durable `phase=reanalyze` before Memory merge; Thinking UI had no mount recovery → infinite spinner.
2. **SoT split:** Progress lifecycle used document mentions as `in_progress` (“고객 확인 중”) while AI PM Spine/Memory already showed MZ/FIT.
3. **Title drop:** create path seeded `pastedContent` from description only; title never entered Understanding document.
4. **Overview empty menu:** `WorkspaceProgressiveOverview` showed empty/static i18n until review — not a live Understanding board.
5. **Labels:** Spine provenance copy was short (“문서” / “AI 추론”) vs CEO vocabulary.

## Shipped this session (batch)

**SHA:** `fa18171` (pushed `main`)

- Loop: apply-then-process; no orphan `reanalyze`; mount recovery; idempotent finish; ThinkingStages `onComplete`
- Answer quality harden (mash / punct-only); keep draft on reject
- Progress lifecycle aligned to Memory + document-known customer
- Spine business prefers Memory; Summary shows provenance badges
- Overview = Understanding state board + next gap
- Project create: textarea 1000 + count + question placeholder; title always in seed
- CEO provenance labels (KO/EN)

## Auth

No OAuth / CDP / storageState changes.

## Remaining P0 (resume)

- Full Evidence package `docs/evidence/ALABOM/core/01–16`
- Scenarios A–F LIVE on Production after deploy
- Why surface always visible in ask (not only Detail) — partial
- Processing stages tied to real Memory write events (labels improved; still timed chrome)
- Domain 01–20 field store (enum exists; still under-wired)
- Auth ConversationMemory in `v2Workspace` (deferred with Auth)

## Next

Commit → push → Production → Demo LIVE smoke A–F → Evidence + CTO/QA reports.
