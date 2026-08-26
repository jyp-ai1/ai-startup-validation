# ALABOM Core v3 — Known Issues

```text
Date: 2026-08-26
Source: CPO Validation Completion
```

## KI-CQ-1 — Form-like / wrong-slot merge

| Field | Value |
|-------|--------|
| **Status** | **FIXED in engine (pending CPO transcript review)** |
| **Fix tip** | See `ALABOM_CORE_V3_CTO_REPORT.md` |
| **Evidence** | `docs/evidence/ALABOM/core-v3/TRANSCRIPT.md` |

Semantic interpretation + claim lifecycle replace slot-dump merge. Explicit conflict cue (`다릅니다` etc.) forces CONFLICT when prior Fact exists. CPO PASS not claimed until transcript review.

## KI-1 — Auth durable (HOLD / Deferred)

Unchanged. Out of scope. Auth untouched.
