/** DAY 8-I P0 FIX-8 — Canonical current judgment state (not sentence storage). */

let testOverride: boolean | null = null;

export function setAiPmJudgmentFix8V1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmJudgmentFix8V1Active(): boolean {
  if (testOverride !== null) return testOverride;
  if (
    typeof process !== 'undefined' &&
    (process.env?.AI_PM_JUDGMENT_FIX8_V1 === 'true' ||
      process.env?.NEXT_PUBLIC_AI_PM_JUDGMENT_FIX8_V1 === 'true')
  ) {
    return true;
  }
  return true;
}
