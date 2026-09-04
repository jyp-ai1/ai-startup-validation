/**
 * PR5 — gapState → StageReadiness (S15 read-only SoT).
 * Reads gapState only — no semantic re-interpretation.
 * @see docs/architecture/ai-pm-v3/readiness/V3_STAGE_TRANSITION_CONTRACT.md
 */

import type { AnswerReview, GapCompleteness } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import type { ConversationMemory } from './conversation-memory';
import type { LivingUnderstandingState } from './living-understanding-state';
import type { ProductStageId } from './stage-transition';
import type { AiPmLoopState, AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** Stage A Required — S27 / S15 (S27 order for UX). */
export const STAGE_A_REQUIRED_GAPS = [
  'businessOneLiner',
  'customerPersona',
  'payer',
  'problemJtbd',
] as const;

/** Stage B Required — marketChannel is Stage B only (V3-09). */
export const STAGE_B_REQUIRED_GAPS = [
  'marketChannel',
  'alternativesCompetitors',
  'differentiationVsAlternatives',
  'validationTestability',
] as const;

export type StageReadinessGapBlocker = {
  gapId: string;
  reason: GapCompleteness;
};

export type StageReadiness = {
  stageId: ProductStageId;
  status: 'READY' | 'NOT_READY';
  blocker: StageReadinessGapBlocker | null;
  requiredGaps: Array<{ gapId: string; completeness: GapCompleteness }>;
  optionalGaps: Array<{ gapId: string; completeness: GapCompleteness }>;
  /** Informational only — never gates transition (S15). */
  turnCount: number;
  /** All Stage A Required gaps CLOSED — V3-09. */
  stageAReady: boolean;
  /** Stage B entry allowed when Stage A READY — V3-09. */
  stageBAllowed: boolean;
  /** Active stage focus for question selection. */
  currentStageFocus: ProductStageId;
};

export type EvaluateStageReadinessInput = {
  gapState: GapKnowledgeState;
  living?: LivingUnderstandingState;
  memory?: ConversationMemory | null;
  reviews?: AnswerReview[];
  loop?: AiPmLoopState;
  turns?: AiPmLoopTurn[];
};

export function gapCompleteness(
  gapId: string,
  gapState: GapKnowledgeState,
): GapCompleteness {
  return gapState.gaps[gapId]?.completeness ?? 'OPEN';
}

function requiredGapSnapshots(
  gapIds: readonly string[],
  gapState: GapKnowledgeState,
): Array<{ gapId: string; completeness: GapCompleteness }> {
  return gapIds.map((gapId) => ({
    gapId,
    completeness: gapCompleteness(gapId, gapState),
  }));
}

/** Stage A READY when all Required gaps CLOSED and none CONTRADICTED (V3-09). */
export function isStageAReady(gapState: GapKnowledgeState): boolean {
  for (const gapId of STAGE_A_REQUIRED_GAPS) {
    const c = gapCompleteness(gapId, gapState);
    if (c !== 'CLOSED') return false;
  }
  return true;
}

/** Stage B READY when all Stage B Required gaps CLOSED and none CONTRADICTED. */
export function isStageBReady(gapState: GapKnowledgeState): boolean {
  for (const gapId of STAGE_B_REQUIRED_GAPS) {
    const c = gapCompleteness(gapId, gapState);
    if (c !== 'CLOSED') return false;
  }
  return true;
}

function findFirstIncompleteRequired(
  gapIds: readonly string[],
  gapState: GapKnowledgeState,
): StageReadinessGapBlocker | null {
  for (const gapId of gapIds) {
    const c = gapCompleteness(gapId, gapState);
    if (c !== 'CLOSED') {
      return { gapId, reason: c };
    }
  }
  return null;
}

function resolveTurnCount(input: EvaluateStageReadinessInput): number {
  if (input.loop) {
    return input.loop.turns.filter((t) => !t.superseded).length;
  }
  if (input.turns) {
    return input.turns.filter((t) => !t.superseded).length;
  }
  return 0;
}

/**
 * Evaluate stage readiness from authoritative gapState only.
 * Does NOT re-interpret semantics — reads persisted completeness.
 */
export function evaluateStageReadiness(
  input: EvaluateStageReadinessInput,
): StageReadiness {
  const { gapState } = input;
  const turnCount = resolveTurnCount(input);
  const stageAReady = isStageAReady(gapState);
  const stageBAllowed = stageAReady;
  const stageARequired = requiredGapSnapshots(STAGE_A_REQUIRED_GAPS, gapState);
  const stageBRequired = requiredGapSnapshots(STAGE_B_REQUIRED_GAPS, gapState);

  if (!stageAReady) {
    const blocker = findFirstIncompleteRequired(STAGE_A_REQUIRED_GAPS, gapState);
    return {
      stageId: 'A_understanding',
      status: 'NOT_READY',
      blocker,
      requiredGaps: stageARequired,
      optionalGaps: stageBRequired,
      turnCount,
      stageAReady: false,
      stageBAllowed: false,
      currentStageFocus: 'A_understanding',
    };
  }

  const stageBReady = isStageBReady(gapState);
  if (!stageBReady) {
    return {
      stageId: 'A_understanding',
      status: 'READY',
      blocker: null,
      requiredGaps: stageARequired,
      optionalGaps: stageBRequired,
      turnCount,
      stageAReady: true,
      stageBAllowed: true,
      currentStageFocus: 'B_validation',
    };
  }

  return {
    stageId: 'B_validation',
    status: 'READY',
    blocker: null,
    requiredGaps: stageBRequired,
    optionalGaps: stageARequired,
    turnCount,
    stageAReady: true,
    stageBAllowed: true,
    currentStageFocus: 'B_validation',
  };
}

/** True when gap belongs to Stage B Required set. */
export function isStageBGap(gapId: string): boolean {
  return (STAGE_B_REQUIRED_GAPS as readonly string[]).includes(gapId);
}
