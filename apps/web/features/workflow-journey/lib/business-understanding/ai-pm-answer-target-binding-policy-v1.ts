/**
 * DAY 8-F F-1 — Answer Target Binding feature flag.
 */

export function isAiPmAnswerTargetBindingV1Enabled(): boolean {
  if (
    typeof process !== 'undefined' &&
    process.env?.AI_PM_ANSWER_TARGET_BINDING_V1 === 'true'
  ) {
    return true;
  }
  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_AI_PM_ANSWER_TARGET_BINDING_V1 === 'true'
  ) {
    return true;
  }
  return false;
}

let testOverride: boolean | null = null;

export function setAiPmAnswerTargetBindingV1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmAnswerTargetBindingV1Active(): boolean {
  if (testOverride !== null) return testOverride;
  return isAiPmAnswerTargetBindingV1Enabled();
}
