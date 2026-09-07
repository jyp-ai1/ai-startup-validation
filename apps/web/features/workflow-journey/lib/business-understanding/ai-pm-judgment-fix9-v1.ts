/** DAY 8-I P0 FIX-9 — Canonical state preservation + R-check alignment. */

let testOverride: boolean | null = null;

export function setAiPmJudgmentFix9V1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmJudgmentFix9V1Active(): boolean {
  if (testOverride !== null) return testOverride;
  if (
    typeof process !== 'undefined' &&
    (process.env?.AI_PM_JUDGMENT_FIX9_V1 === 'true' ||
      process.env?.NEXT_PUBLIC_AI_PM_JUDGMENT_FIX9_V1 === 'true')
  ) {
    return true;
  }
  return true;
}
