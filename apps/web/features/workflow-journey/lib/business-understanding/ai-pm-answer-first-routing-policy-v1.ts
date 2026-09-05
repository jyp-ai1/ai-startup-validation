/**
 * DAY 8-D Phase B — Answer-first routing policy feature flag.
 * Presentation / semantic layer only; does not mutate V3 SoT.
 */

export function isAiPmAnswerFirstRoutingV1Enabled(): boolean {
  if (
    typeof process !== 'undefined' &&
    process.env?.AI_PM_ANSWER_FIRST_ROUTING_V1 === 'true'
  ) {
    return true;
  }
  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_AI_PM_ANSWER_FIRST_ROUTING_V1 === 'true'
  ) {
    return true;
  }
  return false;
}

let testOverride: boolean | null = null;

export function setAiPmAnswerFirstRoutingV1ForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmAnswerFirstRoutingV1Active(): boolean {
  if (testOverride !== null) return testOverride;
  return isAiPmAnswerFirstRoutingV1Enabled();
}
