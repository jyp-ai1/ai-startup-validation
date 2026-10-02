# Holdout / regression policy (CPO Sprint 2A)

| Set | IDs | Fix cycle |
|-----|-----|-----------|
| **Development** | biz-01 … biz-10 | Allowed for RCA + fix validation |
| **Regression** | biz-11 … biz-15 | Must stay green; 14–15 had Layer A probe (not strict holdout) |
| **Holdout** | **biz-16 … biz-17** | **Forbidden** — no tuning from failures; evaluate once after cycle |

## Forbidden

Using biz-16/17 Actual rows to choose code changes before final holdout run.

## Allowed

Generating validation-lab evidence for 16–17 in Phase 1 **without** using results in fix commits (CPO 2-pass at end only).
