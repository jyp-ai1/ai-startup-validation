# Failure-type regression (Sprint 2)

After a fix targeting Sprint 2 code **F0x**:

```text
Original failing turn(s) PASS
  ↓
Golden 8 (Phase ① lock)
  ↓
All turns with same F0x across DEV biz-01–10
  ↓
REGRESSION biz-11–13 (full Layer A + any pilot touching type)
  ↓
UNSEEN biz-14–15 (one-shot — not used to design fix)
```

Track in `EVAL/failure-type-regression-log.json` (append-only).

| Field | Meaning |
|-------|---------|
| `failureType` | F01–F16 |
| `originBusiness` | e.g. biz-01 T3 |
| `fixCommit` | SHA |
| `devRecheck` | pass/fail per biz |
| `regressionRecheck` | pass/fail |
| `unseenRecheck` | pass/fail (CPO run) |

**One business PASS alone does not close the improvement.**
