# ALABOM Core Experience v2 — QA

```text
Date: 2026-08-26
Production tip: 89e34644d7920080890ceb74ba0f31f3288ae45a
Auth: UNTOUCHED
```

## Unit QA

| Check | Result |
|-------|--------|
| Living State 20 claims + coverage | PASS |
| Coverage rises on confirmed facts | PASS |
| Downstream invalidation helper | PASS |
| deriveWorkspaceState regression | PASS |
| Competitor defer / conversational unlock | PASS |
| TypeScript | PASS |

## LIVE Production Demo (serial workers=1)

| ID | Result | Notes |
|----|--------|-------|
| A Document-rich | PASS | Extract visible; no blank-form primacy |
| B Weak PDF | PASS | Honest gap; no filename-as-business |
| C Minimal | PASS | Infer → one clarifying ask |
| D Nonsense | PASS | Quality gate; no fake merge |
| E Why | PASS | Purpose visible on ask |
| F Processing+Overview | PASS | Stages → update; overview board |

Evidence: `docs/evidence/ALABOM/core-v2/scenarios-af-live.json` · `media/`

## Conversational DoD honesty

- Processing tied to real Memory/Living pipeline (not 1800ms fake wait)
- Overview coverage = deterministic specificity %
- Post-answer judgment block from Living SoT
- Stage transition remains sufficiency-based (not question count)

## Auth

**Confirm: Auth untouched.**
