/**
 * DAY 8-I P0 — Judgment Target Binding feature flag.
 */

export function isAiPmJudgmentTargetBindingV1Enabled(): boolean {
  if (
    typeof process !== 'undefined' &&
    process.env?.AI_PM_JUDGMENT_TARGET_BINDING_V1 === 'true'
  ) {
    return true;
  }
  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_AI_PM_JUDGMENT_TARGET_BINDING_V1 === 'true'
  ) {
    return true;
  }
  return true;
}

let testOverride: boolean | null = null;

export function setAiPmJudgmentTargetBindingV1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmJudgmentTargetBindingV1Active(): boolean {
  if (testOverride !== null) return testOverride;
  return isAiPmJudgmentTargetBindingV1Enabled();
}
