/**
 * Left-rail stages from V3 readiness — presentation only.
 * Does not write gapState or add required gaps.
 */

import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import {
  evaluateStageReadiness,
  isStageAReady,
  isStageBReady,
} from '../business-understanding/evaluate-stage-readiness';

export type UxJourneyStageId = 'understand' | 'market' | 'viability' | 'result';

export type UxJourneyLifecycle = 'waiting' | 'in_progress' | 'completed';

export type UxJourneyStage = {
  id: UxJourneyStageId;
  lifecycle: UxJourneyLifecycle;
};

const EMPTY_GAP_STATE: GapKnowledgeState = {
  version: 1,
  gaps: {},
  lastReviewByGap: {},
};

export function emptyGapKnowledgeState(): GapKnowledgeState {
  return EMPTY_GAP_STATE;
}

/**
 * ① completes only when Stage A Canonical 4 are CLOSED.
 * Document intake alone never marks ① complete.
 * ③ is synthesis after A+B — not a new C-stage gap.
 */
export function buildUxJourneyStages(input: {
  gapState?: GapKnowledgeState | null;
  resultOpen?: boolean;
}): UxJourneyStage[] {
  const gapState = input.gapState ?? EMPTY_GAP_STATE;
  const readiness = evaluateStageReadiness({ gapState });
  const stageA = readiness.stageAReady && isStageAReady(gapState);
  const stageB = stageA && isStageBReady(gapState);
  const resultOpen = Boolean(input.resultOpen);

  const understand: UxJourneyLifecycle = stageA ? 'completed' : 'in_progress';
  const market: UxJourneyLifecycle = !stageA
    ? 'waiting'
    : stageB
      ? 'completed'
      : 'in_progress';
  const viability: UxJourneyLifecycle = !stageB
    ? 'waiting'
    : resultOpen
      ? 'completed'
      : 'in_progress';
  const result: UxJourneyLifecycle = resultOpen ? 'in_progress' : 'waiting';

  return [
    { id: 'understand', lifecycle: understand },
    { id: 'market', lifecycle: market },
    { id: 'viability', lifecycle: viability },
    { id: 'result', lifecycle: result },
  ];
}
