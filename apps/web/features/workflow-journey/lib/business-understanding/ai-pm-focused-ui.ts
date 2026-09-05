/**
 * DAY 8-B Phase 2 — Focused 3-block CEO UI feature flag.
 * Internal 6 Surfaces remain; this toggles the presentation layer only.
 */

export function isAiPmFocusedUiEnabled(): boolean {
  if (typeof process !== 'undefined' && process.env?.AI_PM_FOCUSED_UI === 'true') {
    return true;
  }
  if (
    typeof process !== 'undefined' &&
    process.env?.NEXT_PUBLIC_AI_PM_FOCUSED_UI === 'true'
  ) {
    return true;
  }
  return false;
}

/** Test-only override — do not use in production paths. */
let testOverride: boolean | null = null;

export function setAiPmFocusedUiForTest(enabled: boolean | null): void {
  testOverride = enabled;
}

export function isAiPmFocusedUiActive(): boolean {
  if (testOverride !== null) return testOverride;
  return isAiPmFocusedUiEnabled();
}
