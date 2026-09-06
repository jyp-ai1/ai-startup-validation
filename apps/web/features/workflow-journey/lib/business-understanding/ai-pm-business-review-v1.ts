/**
 * DAY 8-H — Business review loop feature flag.
 * Active when judgment aggregation (DAY 8-G) is active.
 */

import { isAiPmJudgmentAggregationV1Active } from './ai-pm-judgment-aggregation-v1';

let testOverride: boolean | null = null;

export function setAiPmBusinessReviewV1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmBusinessReviewV1Active(): boolean {
  if (testOverride !== null) return testOverride;
  return isAiPmJudgmentAggregationV1Active();
}
