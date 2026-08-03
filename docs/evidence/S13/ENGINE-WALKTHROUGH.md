# S13 Engine Walkthrough (code path · not UI)

Engine sprint: no Surface video. Trace = `runAnalysis(input)`.

## Pipeline

```text
AnalysisInput { stage, businessType, evidence }
        ↓
decide()          rules.ts · ANALYSIS_RULES (no LLM)
        ↓
Decision[]        { code, value, ruleId, evidenceRefs }
        ↓
buildInsights()   claim + basisEvidenceIds (Problem Fit language folded here)
        ↓
buildRecommendedActions()
        ↓
AnalysisResult
```

## Example (R-01) — see TRACE-SAMPLES.json

```text
Evidence: customer✓ problem✓ revenue Unknown
    ↓
Decision: RevenueValidation = Insufficient · ruleId R-01
          evidenceRefs [customer, problem, revenue]
    ↓
Insight:  「고객·문제에 대한 이해(Problem Fit)는 있으나, 수익 구조에 대한…」
    ↓
Action:   「수익 구조를 먼저 검증하세요.」
```

ProblemFit **Decision 없음** (`problemFitDecisionPresent: false`).

## Files

| Step | File |
|------|------|
| Rules | `apps/web/lib/analysis-engine/rules.ts` |
| Engine | `decide.ts` |
| Insight | `build-insight.ts` |
| Action | `build-recommended-action.ts` |
| Entry | `index.ts` → `runAnalysis` |
