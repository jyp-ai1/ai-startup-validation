# Long Sprint — AI PM Accuracy Generalization & Failure Cluster

**Mode:** No interim CPO reports. Single delivery: `AI-PM-ACCURACY-SPRINT-2-COMPLETION-EVIDENCE.md`.

## Stop conditions only

- Data/env blocks execution
- Production critical incident
- Unseen set used for fix tuning (policy violation)
- V3 SoT / architecture guard violated

## Phases (one cycle)

1. RCA consolidation → failure clusters  
2. Cross-business failure search (15 × perturbations)  
3. Cluster root cause → layer-only fix (once)  
4. Golden → dev → regression 11–13 → unseen 14–15 (one-shot)  
5. Longitudinal 5–8 × 20–30 turns  
6. L4 + L5 evaluation on representative traces  
7. Production subset (Track A when auth)  
8. Completion evidence + SHAs  

## Parallel

- Track A: `storageState` → Production trace (does not block harness)

## RCA docs

`CPO-ROOT-CAUSE-biz-01.md` / `biz-07` — **frozen** (valid, do not rewrite).
