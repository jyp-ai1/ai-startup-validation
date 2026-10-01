# Phase 0 — AI PM Evaluation Matrix (internal)

CEO-facing scores are **never** shown. CPO/CTO use this for harness design.

| # | Dimension | Pass criteria (summary) |
|---|-----------|-------------------------|
| ① | Grounding | Facts trace to user_input, document, or labeled ai_inference only |
| ② | Slot accuracy | Customer / Problem / Payer / Business in correct gap fields |
| ③ | Completeness | Long input retains material facts (parity across 100–10k chars) |
| ④ | Gap accuracy | OPEN only for missing/ambiguous/unverified/conflict; not false OPEN |
| ⑤ | Question quality | One question maximizes decision impact; no generic repeat |
| ⑥ | Reasoning | Answer → gapVerdict → readiness chain is coherent |
| ⑦ | Actionability | Judgment links to known / unknown / next validation |

**Regression scorecard targets (internal):** no-repeat 100%, correction preservation 100%, cross-project contamination 0, unsupported fact 0, judgment traceability 100%.

**Harness:** scenario packs with `known facts`, `expected slots`, `expected next question`, `expected judgment basis` — see LS-5.
