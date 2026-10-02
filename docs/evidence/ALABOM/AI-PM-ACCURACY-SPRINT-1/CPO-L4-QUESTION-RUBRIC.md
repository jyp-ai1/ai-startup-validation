# CPO Layer 4 — Next question rubric (no fixed questionnaire)

Per turn, given **Knowledge State** + **unresolved gaps** + **actual next question**:

| # | Criterion | Question |
|---|-----------|----------|
| 1 | Relevance | Is this question needed for this business now? |
| 2 | Gap priority | Was a higher-value OPEN/CONFLICT gap skipped? |
| 3 | Information gain | Does this question materially reduce judgment uncertainty? |
| 4 | Timing | Must it be asked now vs later? |
| 5 | Repetition | Does it re-ask a sufficiently CLOSED gap? |

Verdict: PASS | PARTIAL | FAIL — independent of CTO harness `nextTargetGap` asserts (pilots use **no fixed global order**).

Evidence: `actualNextQuestion` + `actualReason` + gap snapshot in trace / harness JSON.
