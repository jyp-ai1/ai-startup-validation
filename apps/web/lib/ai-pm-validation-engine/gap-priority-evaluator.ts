import {
  STAGE_A_REQUIRED_GAPS,
  STAGE_B_REQUIRED_GAPS,
} from '@/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness';

const STAGES: readonly (readonly string[])[] = [STAGE_A_REQUIRED_GAPS, STAGE_B_REQUIRED_GAPS];

/** Absent (never asked) and CONTRADICTED gaps are still askable — only CLOSED is done. */
function isAskable(state: string | undefined): boolean {
  return state !== 'CLOSED';
}

function firstAskableStage(aiGapSnapshot: Record<string, string>): readonly string[] | null {
  return STAGES.find((stage) => stage.some((gap) => isAskable(aiGapSnapshot[gap]))) ?? null;
}

/**
 * V3 stage SoT priority: within the first unfinished stage, a CONTRADICTED gap first,
 * then the first gap that is not CLOSED (including never-asked gaps).
 */
export function highestPriorityOpenGap(
  aiGapSnapshot: Record<string, string>,
): string | null {
  const stage = firstAskableStage(aiGapSnapshot);
  if (stage) {
    return (
      stage.find((gap) => aiGapSnapshot[gap] === 'CONTRADICTED') ??
      stage.find((gap) => isAskable(aiGapSnapshot[gap])) ??
      null
    );
  }
  for (const [key, c] of Object.entries(aiGapSnapshot)) {
    if (c === 'CONTRADICTED' || c === 'OPEN' || c === 'PARTIAL') return key;
  }
  return null;
}

/**
 * Aligned when the next target is not CLOSED and does not skip an unfinished stage
 * (a CONTRADICTED gap may be resolved from any stage).
 */
export function isGapPriorityAligned(
  nextTargetGap: string | null,
  aiGapSnapshot: Record<string, string>,
): { pass: boolean; expectedGap: string | null } {
  const expected = highestPriorityOpenGap(aiGapSnapshot);
  if (!expected) return { pass: true, expectedGap: null };
  if (!nextTargetGap) return { pass: false, expectedGap: expected };
  const nextState = aiGapSnapshot[nextTargetGap];
  if (nextState === 'CLOSED') return { pass: false, expectedGap: expected };
  if (nextState === 'CONTRADICTED') return { pass: true, expectedGap: expected };
  const stage = firstAskableStage(aiGapSnapshot);
  if (stage && !stage.includes(nextTargetGap)) return { pass: false, expectedGap: expected };
  return { pass: true, expectedGap: expected };
}
