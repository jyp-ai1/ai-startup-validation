# ALABOM Core — Known Issues

```text
Date: 2026-08-26
Production tip: 7d7e9d7
```

## KI-1 — Auth durable (HOLD / Deferred)

| Field | Value |
|-------|--------|
| **Status** | **OPEN — Deferred** (out of scope this Long Sprint) |
| **Severity** | Does **not** block Core Understanding Demo DoD |
| **Note** | No OAuth / CDP / storageState work in this sprint |

## Notes (non-blocking)

| Note | Detail |
|------|--------|
| Cookie consent | Demo LIVE may show analytics dialog over confirm; tests force-dismiss |
| Locale | Demo may render EN; confirm CTA matches KO+EN |
| Domain 01–20 store | Enum exists; full field store still under-wired (not blocking A–F) |
| Processing stages | Memory stage marked done after real write; remaining stages still timed chrome |

No Auth code changes in Core Long Sprint.
