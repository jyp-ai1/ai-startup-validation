# Fix regression policy (CPO Sprint 2)

Never close a fix with only the failing case green.

```text
Failure discovered
  ↓
Layer-only fix (no scope creep)
  ↓
Original failing case PASS
  ↓
Golden 8 regression (Phase ① lock)
  ↓
Cross-business: 3 other development-set businesses
  ↓
Unseen: 2 businesses (biz-14, biz-15) — no prompt tuning on these
  ↓
Re-run Layer A harness report
  ↓
CPO sample re-verify
```

If development set improves but **unseen minimum drops**, treat as **overfit**, not PASS.
