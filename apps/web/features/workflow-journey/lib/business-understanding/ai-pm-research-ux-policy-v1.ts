/**
 * DAY 8-D Phase D — Research UX feature flag.
 */

export function isAiPmResearchUxV1Enabled(): boolean {
  if (typeof process !== 'undefined' && process.env?.AI_PM_RESEARCH_UX_V1 === 'true') {
    return true;
  }
  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_AI_PM_RESEARCH_UX_V1 === 'true'
  ) {
    return true;
  }
  return false;
}

let testOverride: boolean | null = null;

export function setAiPmResearchUxV1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmResearchUxV1Active(): boolean {
  if (testOverride !== null) return testOverride;
  return isAiPmResearchUxV1Enabled();
}
