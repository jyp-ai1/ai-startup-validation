# ALABOM — AI PM Accuracy Validation Sprint 2

**CPO goal:** Verify AI PM **generalizes across businesses**, not a single optimized scenario.

**Sprint 1 Phase ①:** CLOSED (Golden 8 · 10/10 PASS).  
**Sprint 1 Phase ② Track A:** OPEN (Production longitudinal · auth-blocked).

## Validation model (three pillars)

```text
        ALABOM AI PM Accuracy
                 │
   Layer Accuracy │ Business Diversity │ Longitudinal
   (L1–L5)       │ 15+ types          │ 20–30 turns
                 │
                 └──────► Cross-Business ──► Fix Cycle ──► Unseen regression ──► Production ──► CEO TEST
```

## Test layers (CPO §7)

| Layer | Scope | Tooling |
|-------|--------|---------|
| **A — Fast semantic harness** | 15 biz × perturbations × turns (harness, no browser) | `pnpm test:multi-business-accuracy` |
| **B — Longitudinal conversation** | 5–8 representative biz · 20–30 turns | Harness + evidence JSON |
| **C — Production browser** | Few unseen biz · login → intake → Q&A → judgment | `pnpm evidence:real-business-review` (**Track A**) |

Track A (Phase ②) is **Layer C subset only** — not sufficient alone for accuracy gate.

## Tracks (Sprint 2)

| Track | Content | Status |
|-------|---------|--------|
| **A** | storageState → 12-turn Production trace → CPO L1–3 | OPEN (auth blocked) |
| **B** | Business Scenario Matrix (15) | IN PROGRESS — `business-scenario-matrix.ts` |
| **C** | Input perturbation catalog (10 patterns) | IN PROGRESS — `input-perturbation-types.ts` |
| **D** | Multi-business harness + auto compare | IN PROGRESS — `multi-business-harness.ts` |
| **E** | CPO independent 2-pass sampling | After harness evidence |
| **F** | Fix → golden + cross-biz + unseen regression | Policy in `FIX-REGRESSION-POLICY.md` |
| **G** | Production 5 representative biz | After F |
| **H** | CEO TEST | After all gates |

## Business sets (CPO §11)

| Set | Matrix IDs | Use |
|-----|------------|-----|
| **Development** | biz-01 … biz-10 | Fix iteration |
| **Regression** | biz-11 … biz-13 | Must stay green after fix |
| **Unseen validation** | biz-14 … biz-15 | Never tune to; generalization signal |

## CPO evaluation dimensions (L1–L5)

L1 Understanding · L2 State preservation · L3 Gap · L4 Next question priority · L5 Reasoning/Judgment.

**No single “accuracy %” headline.** Report: per-dimension tallies, **per-business minimum**, failure taxonomy — see `ACCURACY-LAYER-METRICS.md`.

## Parallel execution (auth blocked)

```text
storageState BLOCKED
  ├── Track A / Layer C → BLOCKED
  └── Tracks B–D / Layer A → RUNNABLE (harness)
```

## Open Layer B failures (RCA — fix not started)

| Business | Doc |
|----------|-----|
| biz-01 | `CPO-ROOT-CAUSE-biz-01.md` |
| biz-07 | `CPO-ROOT-CAUSE-biz-07.md` |

Registry: `EVAL/sprint2-open-failures.json` · Taxonomy: `apps/web/lib/ai-pm-accuracy/sprint2-failure-taxonomy.ts`

**Policy:** `UNSEEN-SET-POLICY.md` · `FAILURE-TYPE-REGRESSION.md` · L4: `CPO-L4-QUESTION-RUBRIC.md`

## Key files

- `apps/web/lib/ai-pm-accuracy/business-scenario-matrix.ts`
- `apps/web/lib/ai-pm-accuracy/input-perturbation-types.ts`
- `apps/web/lib/ai-pm-accuracy/multi-business-pilot-scripts.ts`
- `apps/web/lib/ai-pm-accuracy/multi-business-harness.ts`
- `docs/evidence/.../EVAL/multi-business-harness-report.json`
