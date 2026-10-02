# Validation Engine Architecture (P1)

## Boundary

```text
┌─────────────────────┐     ┌──────────────────────┐
│ Ground Truth Engine │     │ AI PM (V3 pipeline)  │
│ User Agent (det.)   │ ──► │ buildAnswerReview    │
└─────────────────────┘     │ decideNextQuestion   │
         │                  └──────────────────────┘
         │                            │
         └──────────► Evaluation ◄────┘
                    (L1–L3 rules, L4 intent, L5 pending/CPO)
```

- **No rewrite** of AI PM core for harness convenience.
- **No evaluator LLM** as source of truth for L1–L3.

## Modules

| Path | Role |
|------|------|
| `apps/web/lib/ai-pm-validation-engine/contracts/` | TS mirror of JSON schemas |
| `state-transition-rules.ts` | Gap completeness transitions + correction |
| `ground-truth-engine.ts` | `State(t)+A(t)→State(t+1)` |
| `deterministic-user-agent.ts` | Behavior policies |
| `deterministic-evaluator.ts` | Rule-based turn eval + drift flag |
| `mini-sandbox-runner.ts` | 10×3×5 POC orchestration |
| `docs/.../schemas/*.json` | Schema freeze |
| `EVAL/seed-failure-set.json` | Regression seeds A–F |

## Design constraints

1. **State drift** — compare `groundTruthGapAfter` vs `aiGapAfter` each turn.
2. **User agent quality** — scripted answers from truth + behavior + memory (turn index).
3. **Deterministic state** — transition rules + append-only log.
4. **Cost** — POC capped at 150 turns; scale ladder documented in sprint doc.

## L5 Evidence Strength

Implemented in `evidence-strength.ts` — consumed inside L5 reasoning/judgment evaluation (future phase), not L6.

## Data sets

| Set | Content |
|-----|---------|
| Development | `sb-*` mini sandbox + biz-01..10 |
| Regression | Seed A–F + biz-11..15 |
| Holdout | biz-16, biz-17 (no dev tuning) |
| Calibration | CPO manual (Phase 5) |

## First gate command

```bash
cd apps/web && pnpm test:mini-sandbox
```

Evidence JSON: `EVAL/mini-sandbox-evidence.json`
