/** DAY 8-I P0 FIX-6 — Evidence-grounded judgment structure feature flag. */

let testOverride: boolean | null = null;

export function setAiPmJudgmentFix6V1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmJudgmentFix6V1Active(): boolean {
  if (testOverride !== null) return testOverride;
  if (
    typeof process !== 'undefined' &&
    (process.env?.AI_PM_JUDGMENT_FIX6_V1 === 'true' ||
      process.env?.NEXT_PUBLIC_AI_PM_JUDGMENT_FIX6_V1 === 'true')
  ) {
    return true;
  }
  return true;
}
