# CPO — AI PM Accuracy Sprint 1 report pack

| # | Document | Role |
|---|----------|------|
| 0 | `CPO-1PASS-VERDICT-ACCURACY-SLICE1-2026-10-02.md` | CPO 1차 판정 (Slice PASS / Sprint OPEN) |
| 1 | `ALABOM-AI-PM-ACCURACY-VALIDATION-REPORT.md` | CTO Slice 1 report |
| 1b | `CPO-ACCURACY-2PASS.md` | **CPO independent 2-pass (fill Verdict)** |
| 1c | `EVAL/cpo-2pass-evidence-pack.json` | Machine-readable 2-pass rows |
| 2 | `BUSINESS-JUDGMENT-TAXONOMY.md` | 26-item taxonomy |
| 3 | `CPO-WORK-ORDER-ACK-2026-10-02.md` | Sprint pivot ack |
| 4 | `EVAL/golden-scenarios-turn-evidence.json` | Turn-level PASS/FAIL evidence |
| 5 | `apps/web/lib/ai-pm-accuracy/golden-scenarios.ts` | Golden 8 definitions |
| 6 | `apps/web/lib/ai-pm-accuracy/failure-taxonomy.ts` | F1–F10 |

**Verify locally:** `cd apps/web && pnpm test:accuracy-golden`
