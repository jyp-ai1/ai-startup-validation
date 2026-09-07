/** DAY 8-I P0 FIX-7 — Structured final review + strict evidence gates. */

let testOverride: boolean | null = null;

export function setAiPmJudgmentFix7V1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmJudgmentFix7V1Active(): boolean {
  if (testOverride !== null) return testOverride;
  if (
    typeof process !== 'undefined' &&
    (process.env?.AI_PM_JUDGMENT_FIX7_V1 === 'true' ||
      process.env?.NEXT_PUBLIC_AI_PM_JUDGMENT_FIX7_V1 === 'true')
  ) {
    return true;
  }
  return true;
}
