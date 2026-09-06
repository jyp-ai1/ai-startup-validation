/**
 * DAY 8-G — Judgment aggregation feature flag.
 */

export function isAiPmJudgmentAggregationV1Enabled(): boolean {
  if (
    typeof process !== 'undefined' &&
    process.env?.AI_PM_JUDGMENT_AGGREGATION_V1 === 'true'
  ) {
    return true;
  }
  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_AI_PM_JUDGMENT_AGGREGATION_V1 === 'true'
  ) {
    return true;
  }
  return false;
}

let testOverride: boolean | null = null;

export function setAiPmJudgmentAggregationV1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmJudgmentAggregationV1Active(): boolean {
  if (testOverride !== null) return testOverride;
  return isAiPmJudgmentAggregationV1Enabled();
}
