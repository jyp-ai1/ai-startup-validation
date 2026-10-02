# Accuracy layer metrics (schema only)

**Rule (CPO §14):** No invented percentages until sufficient labeled sample. Report **per-dimension**, **per-business minimum**, and **failure taxonomy** — not a single blended “AI Accuracy %”.

| Layer | Metric key | Sample source | Current value |
|-------|------------|---------------|---------------|
| L1 | `answer_understanding` | Golden 8 **CLOSED** + Real Review (Phase ②) | Golden labeled **10/10 PASS**; Real **NOT_ENOUGH_SAMPLES** |
| L2 | `state_accuracy` | Same | **NOT_ENOUGH_SAMPLES** |
| L2 | `gap_accuracy` | Same | **NOT_ENOUGH_SAMPLES** |
| L3 | `question_accuracy` | Same | **NOT_ENOUGH_SAMPLES** |
| L3 | `question_priority` | Same | **NOT_ENOUGH_SAMPLES** |
| Gate | `bad_answer_handling` | Golden C + Real | **NOT_ENOUGH_SAMPLES** |
| Gate | `contradiction_handling` | Golden D + Real | **NOT_ENOUGH_SAMPLES** |
| L4 | `reasoning_accuracy` | RJ Golden A–H (future) | **NOT_WIRED** |
| L5 | `judgment_accuracy` | RJ Golden A–H (future) | **NOT_WIRED** |

After CPO 2-pass: update denominators = rows with CPO Verdict PASS|PARTIAL|FAIL.

## Sprint 2 harness (Layer A — fast)

Source: `EVAL/multi-business-harness-report.json` from `pnpm test:multi-business-accuracy`.

| Slice | Current |
|-------|---------|
| Layer A probes (15 biz × 1 turn) | See report `layerA` — **CTO self-check only** |
| Layer B pilots (3 biz × multi-turn) | See report `layerB` |
| Unseen set (biz-14, biz-15) | Included in Layer A — **do not tune fixes to these** |
| CPO-labeled multi-business | **NOT_ENOUGH_SAMPLES** |
