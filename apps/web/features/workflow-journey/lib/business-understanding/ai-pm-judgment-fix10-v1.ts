/** DAY 8-I P0 FIX-10 — CEO trust journey: no judgment without evidence, no inference as fact. */

let testOverride: boolean | null = null;

export function setAiPmJudgmentFix10V1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmJudgmentFix10V1Active(): boolean {
  if (testOverride !== null) return testOverride;
  if (
    typeof process !== 'undefined' &&
    (process.env?.AI_PM_JUDGMENT_FIX10_V1 === 'true' ||
      process.env?.NEXT_PUBLIC_AI_PM_JUDGMENT_FIX10_V1 === 'true')
  ) {
    return true;
  }
  return true;
}
