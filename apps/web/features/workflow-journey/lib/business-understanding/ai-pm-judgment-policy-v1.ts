/**
 * DAY 8-D Phase A — Dynamic Judgment policy feature flag.
 * Presentation layer only; does not mutate V3 SoT.
 */

export function isAiPmJudgmentPolicyV1Enabled(): boolean {
  if (
    typeof process !== 'undefined' &&
    process.env?.AI_PM_JUDGMENT_POLICY_V1 === 'true'
  ) {
    return true;
  }
  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_AI_PM_JUDGMENT_POLICY_V1 === 'true'
  ) {
    return true;
  }
  return false;
}

let testOverride: boolean | null = null;

export function setAiPmJudgmentPolicyV1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmJudgmentPolicyV1Active(): boolean {
  if (testOverride !== null) return testOverride;
  return isAiPmJudgmentPolicyV1Enabled();
}
