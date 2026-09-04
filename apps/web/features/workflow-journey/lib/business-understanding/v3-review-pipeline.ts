/**
 * PR1 — V3 review pipeline feature flag.
 * OFF = legacy panel canonicalization path; ON = buildAnswerReview → turn.review.
 */

export function isV3ReviewPipelineEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env?.V3_REVIEW_PIPELINE === 'true') {
    return true;
  }
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_V3_REVIEW_PIPELINE === 'true') {
    return true;
  }
  return false;
}

/** Test-only override — do not use in production paths. */
let testOverride: boolean | null = null;

export function setV3ReviewPipelineForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isV3ReviewPipelineActive(): boolean {
  if (testOverride !== null) return testOverride;
  return isV3ReviewPipelineEnabled();
}
