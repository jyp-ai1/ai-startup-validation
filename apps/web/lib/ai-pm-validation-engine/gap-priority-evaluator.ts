import { ADAPTIVE_CRITICAL_GAP_KEYS } from '@/features/workflow-journey/lib/business-understanding/adaptive-question-select';

/** Deterministic priority: first OPEN/PARTIAL critical gap in canonical order. */
export function highestPriorityOpenGap(
  aiGapSnapshot: Record<string, string>,
): string | null {
  for (const key of ADAPTIVE_CRITICAL_GAP_KEYS) {
    const c = aiGapSnapshot[key];
    if (c === 'OPEN' || c === 'PARTIAL' || c === 'UNKNOWN' || c === 'ASSUMPTION') {
      return key;
    }
  }
  for (const [key, c] of Object.entries(aiGapSnapshot)) {
    if (c === 'OPEN' || c === 'PARTIAL') return key;
  }
  return null;
}

export function isGapPriorityAligned(
  nextTargetGap: string | null,
  aiGapSnapshot: Record<string, string>,
): { pass: boolean; expectedGap: string | null } {
  const expected = highestPriorityOpenGap(aiGapSnapshot);
  if (!expected) return { pass: true, expectedGap: null };
  if (!nextTargetGap) return { pass: false, expectedGap: expected };
  if (nextTargetGap === expected) return { pass: true, expectedGap: expected };
  const nextClosed = aiGapSnapshot[nextTargetGap] === 'CLOSED';
  if (nextClosed) return { pass: false, expectedGap: expected };
  return { pass: true, expectedGap: expected };
}
