/** DAY 8-I P0 FIX-4 — Judgment meaning model feature flag. */

let testOverride: boolean | null = null;

export function setAiPmJudgmentMeaningModelV1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmJudgmentMeaningModelV1Active(): boolean {
  if (testOverride !== null) return testOverride;
  if (
    typeof process !== 'undefined' &&
    (process.env?.AI_PM_JUDGMENT_MEANING_MODEL_V1 === 'true' ||
      process.env?.NEXT_PUBLIC_AI_PM_JUDGMENT_MEANING_MODEL_V1 === 'true')
  ) {
    return true;
  }
  return true;
}
