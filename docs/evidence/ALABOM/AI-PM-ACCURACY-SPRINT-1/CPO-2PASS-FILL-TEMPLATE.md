# CPO 2-pass verdict template (copy completed rows to `CPO-2PASS-VERDICT-2026-10-02.md`)

**Do not inherit CTO PASS.** One block per turn.

```text
Scenario: golden-a-normal-input
Turn: 1
Layer: L1 | L2 | L3
User Answer: (paste)
CPO Expected: (independent — what SHOULD be understood/stored/gap/next Q)
CTO Expected summary: (reference only)
Actual summary: (from REVIEW-SHEET or JSON)
Divergence vs CTO: YES/NO — note
CPO Verdict: PASS | PARTIAL | FAIL
Failure type: F1–F10 or —
Notes:
```

Repeat for all rows in `CPO-2PASS-REVIEW-SHEET.md` (row count = total golden turns).
