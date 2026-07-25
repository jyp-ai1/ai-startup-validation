# Release Queue — Unbounded Evolution (v8)

**Directive:** `docs/PRODUCT_COMPLETION_DIRECTIVE.md`  
**Pointer:** `docs/QUEUE_STATE.md`

Releases do not end at v1.0. **R1 → R2 → … → R999+** with Feedback Queues between milestones.

## Active stack

| Release | Focus | Status |
|---------|-------|--------|
| **R1** | Closed Beta | **active** — consume T001–T300 |
| R2 | Open Beta | queued → auto-start at T301 |
| R3+ | RC · v1.0 · v1.1 · … | queued — **no final release** |

After each milestone: **Feedback Queue** → next release tasks.

## Version line

`2.14.0 → 2.15.0 → … → 3.0 → …` (unbounded)

## Queue empty rule

Generate evolution queue (UX → Animation → … → Polish → repeat). Vision guard required.

## Priority

P0 outage → P1 Journey → … → P12 DX → P1 again

## Stop (5 only)

Build fail · Prod outage · DB/LLM/Billing/Auth · Security · Vision change

Production: https://ai-startup-validation-tau.vercel.app
