/**
 * DAY 8-I P0 FIX-3 — Answer Semantic SoT feature flag.
 */

let testOverride: boolean | null = null;

export function setAiPmAnswerSemanticSotV1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmAnswerSemanticSotV1Active(): boolean {
  if (testOverride !== null) return testOverride;
  if (
    typeof process !== 'undefined' &&
    (process.env?.AI_PM_ANSWER_SEMANTIC_SOT_V1 === 'true' ||
      process.env?.NEXT_PUBLIC_AI_PM_ANSWER_SEMANTIC_SOT_V1 === 'true')
  ) {
    return true;
  }
  return true;
}
