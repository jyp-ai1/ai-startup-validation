# ALABOM Core Experience v2 — Internal QA

```text
Date: 2026-08-26
Scope: Phase 2 core — Living State + real processing
Auth: UNTOUCHED
```

## Unit QA

| Check | Result |
|-------|--------|
| Living State builds 20 claims | PASS |
| Coverage increases on confirmed facts | PASS |
| Downstream turn invalidation helper | PASS |
| deriveWorkspaceState regression | PASS (11/11) |
| TypeScript | PASS |

## Manual (local, pending)

- [ ] Document upload → initial understanding → confirm → ONE gap question
- [ ] Answer → processing stages complete ≤400ms after real write
- [ ] Overview shows 구체화도 %
- [ ] Overview / AI PM spine match (same `livingState.spine`)
- [ ] Nonsense answer re-ask (unchanged v1 behavior)
- [ ] Why branch on ask (unchanged v1 behavior)

## LIVE Production

**Not run** — awaiting deploy of v2 tip.

Prior v1 baseline: Scenarios A–F PASS @ `29db623`.
