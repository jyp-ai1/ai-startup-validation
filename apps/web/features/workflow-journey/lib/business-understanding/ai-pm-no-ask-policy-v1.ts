/**
 * DAY 8-D Phase C — No-Ask policy feature flag.
 * Presentation / selection layer only; does not mutate gapState SoT.
 */

export function isAiPmNoAskPolicyV1Enabled(): boolean {
  if (typeof process !== 'undefined' && process.env?.AI_PM_NO_ASK_POLICY_V1 === 'true') {
    return true;
  }
  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_AI_PM_NO_ASK_POLICY_V1 === 'true'
  ) {
    return true;
  }
  return false;
}

let testOverride: boolean | null = null;

export function setAiPmNoAskPolicyV1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmNoAskPolicyV1Active(): boolean {
  if (testOverride !== null) return testOverride;
  return isAiPmNoAskPolicyV1Enabled();
}
