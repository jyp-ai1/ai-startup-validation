/**
 * PR #197 Phase 1 — thin turn orchestrator.
 * Replaces the linear pickNextRequiredGap walk with constraint filters
 * + judgment-impact ranking. Does not add a new conversation engine.
 */

import type { AnswerReview } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { selectAdaptiveNextGaps } from './adaptive-question-select';
import { shouldHoldOpenStageAPayer } from './ai-pm-judgment-next-question-binding';
import { SHARED_UNDERSTANDING_PENDING } from './build-shared-understanding';
import {
  isStageBGap,
  STAGE_A_REQUIRED_GAPS,
  STAGE_B_REQUIRED_GAPS,
  type StageReadiness,
} from './evaluate-stage-readiness';
import type { LivingUnderstandingState } from './living-understanding-state';
import { siInsightPrefersGap, type SiTurnInsight } from './si-turn-insight';
import { isGapAskable } from './update-gap-state-from-review';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

const STAGE_A_IMPACT: Partial<Record<string, number>> = {
  customerPersona: 10,
  problemJtbd: 10,
  payer: 8,
  businessOneLiner: 6,
};

const STAGE_B_IMPACT: Partial<Record<string, number>> = {
  alternativesCompetitors: 6,
  validationTestability: 7,
  differentiationVsAlternatives: 6,
  marketChannel: 5,
  revenueModel: 7,
  pricingHint: 3,
};

export type ResolveTurnDecisionInput = {
  living: LivingUnderstandingState;
  gapState: GapKnowledgeState;
  stageReadiness: StageReadiness;
  turns: AiPmLoopTurn[];
  lastReview?: AnswerReview | null;
  siInsight?: SiTurnInsight | null;
};

export type ResolveTurnDecisionResult = {
  targetGapId: string | null;
  reason: string;
  mode: 'contradiction' | 't7-payer' | 'coverage' | 'ranked' | 'none';
};

function isPendingSpine(value: string | null | undefined): boolean {
  const t = value?.trim() ?? '';
  return !t || t === SHARED_UNDERSTANDING_PENDING || t.includes('아직 확인');
}

function closedGapExcludeSet(gapState: GapKnowledgeState): Set<string> {
  const exclude = new Set<string>();
  for (const gapId of Object.keys(gapState.gaps)) {
    if (!isGapAskable(gapId, gapState)) exclude.add(gapId);
  }
  return exclude;
}

function pickContradictedGap(gapState: GapKnowledgeState): string | null {
  const priority = ['customerPersona', 'problemJtbd', 'payer', 'businessOneLiner'];
  for (const gapId of priority) {
    if (gapState.gaps[gapId]?.completeness === 'CONTRADICTED') return gapId;
  }
  for (const [gapId, record] of Object.entries(gapState.gaps)) {
    if (record.completeness === 'CONTRADICTED') return gapId;
  }
  return null;
}

/** D7 — document spine is already a draft understanding, not an empty one-liner gap. */
export function shouldSkipDocumentOneLiner(
  gapState: GapKnowledgeState,
  living?: LivingUnderstandingState,
): boolean {
  if (!isGapAskable('businessOneLiner', gapState)) return false;
  if (living && !isPendingSpine(living.spine.business)) return true;
  return (
    gapState.gaps.customerPersona?.completeness === 'CLOSED' ||
    gapState.gaps.problemJtbd?.completeness === 'CLOSED'
  );
}

/** D4 — solution is forbidden while customer or problem understanding is still open. */
export function shouldBlockSolutionBeforeIdentity(
  gapState: GapKnowledgeState,
): boolean {
  return (
    isGapAskable('customerPersona', gapState) ||
    isGapAskable('problemJtbd', gapState)
  );
}

function remainingStageAGaps(
  gapState: GapKnowledgeState,
  skipOneLiner: boolean,
): string[] {
  return STAGE_A_REQUIRED_GAPS.filter((gapId) => {
    if (skipOneLiner && gapId === 'businessOneLiner') return false;
    return isGapAskable(gapId, gapState);
  });
}

function lastAskedGapId(turns: AiPmLoopTurn[]): string | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const t = turns[i]!;
    if (t.superseded) continue;
    const gap = t.targetGap?.trim();
    if (gap) return gap;
  }
  return null;
}

function lastReviewWasUnknownYield(
  lastReview: AnswerReview | null | undefined,
  gapId: string,
): boolean {
  if (!lastReview) return false;
  if (lastReview.askedGapId !== gapId) return false;
  const verdict = lastReview.gapVerdicts[gapId]?.completeness;
  const quality = lastReview.semanticInterpretationRef?.quality;
  return verdict === 'OPEN' && (quality === 'UNKNOWN' || quality === 'AMBIGUOUS');
}

function scoreCandidate(input: {
  gapId: string;
  adaptiveScore: number;
  siInsight?: SiTurnInsight | null;
  lastReview?: AnswerReview | null;
  inStageACoverage: boolean;
}): number {
  const impact = input.inStageACoverage
    ? (STAGE_A_IMPACT[input.gapId] ?? 5)
    : (STAGE_B_IMPACT[input.gapId] ?? 4);
  let score = impact * 1_000 + Math.min(input.adaptiveScore, 20_000) / 100;
  if (siInsightPrefersGap(input.siInsight, input.gapId)) {
    score += 800;
  }
  if (lastReviewWasUnknownYield(input.lastReview, input.gapId)) {
    score -= 20_000;
  }
  return score;
}

function rankAskableGaps(input: {
  gapIds: string[];
  living: LivingUnderstandingState;
  gapState: GapKnowledgeState;
  turns: AiPmLoopTurn[];
  siInsight?: SiTurnInsight | null;
  lastReview?: AnswerReview | null;
  inStageACoverage: boolean;
  blockSolution: boolean;
}): string | null {
  const exclude = closedGapExcludeSet(input.gapState);
  const adaptive = selectAdaptiveNextGaps(input.living, {
    excludeGaps: exclude,
    turns: input.turns,
  });
  const adaptiveScore = new Map(adaptive.map((c) => [c.fieldKey, c.score]));

  const ranked = input.gapIds
    .filter((gapId) => {
      if (!isGapAskable(gapId, input.gapState)) return false;
      if (input.blockSolution && gapId === 'solution') return false;
      return true;
    })
    .map((gapId, index) => ({
      gapId,
      index,
      score: scoreCandidate({
        gapId,
        adaptiveScore: adaptiveScore.get(gapId) ?? 0,
        siInsight: input.siInsight,
        lastReview: input.lastReview,
        inStageACoverage: input.inStageACoverage,
      }),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  return ranked[0]?.gapId ?? null;
}

/**
 * Next gap under D1–D7 constraints.
 * Completeness CLOSED vs evidence class is decided elsewhere; this only ranks.
 */
export function resolveTurnDecision(
  input: ResolveTurnDecisionInput,
): ResolveTurnDecisionResult {
  const skipOneLiner = shouldSkipDocumentOneLiner(input.gapState, input.living);
  const blockSolution = shouldBlockSolutionBeforeIdentity(input.gapState);

  const contradicted = pickContradictedGap(input.gapState);
  if (contradicted && isGapAskable(contradicted, input.gapState)) {
    return {
      targetGapId: contradicted,
      reason: `turn-decision contradiction ${contradicted}`,
      mode: 'contradiction',
    };
  }

  if (shouldHoldOpenStageAPayer(input.gapState)) {
    return {
      targetGapId: 'payer',
      reason: 'turn-decision T7 hold open Stage A payer',
      mode: 't7-payer',
    };
  }

  const stageAOpen = remainingStageAGaps(input.gapState, skipOneLiner);
  if (stageAOpen.length > 0) {
    const picked = rankAskableGaps({
      gapIds: stageAOpen,
      living: input.living,
      gapState: input.gapState,
      turns: input.turns,
      siInsight: input.siInsight,
      lastReview: input.lastReview,
      inStageACoverage: true,
      blockSolution,
    });
    return {
      targetGapId: picked,
      reason: picked
        ? `turn-decision Stage A coverage ${picked}`
        : 'turn-decision Stage A coverage empty',
      mode: picked ? 'coverage' : 'none',
    };
  }

  const stageBUnlocked = input.stageReadiness.stageBAllowed || skipOneLiner;
  if (!stageBUnlocked) {
    return {
      targetGapId: null,
      reason: 'turn-decision Stage B blocked',
      mode: 'none',
    };
  }

  const exclude = closedGapExcludeSet(input.gapState);
  const lastGap = lastAskedGapId(input.turns);
  if (lastGap) exclude.add(lastGap);

  const adaptive = selectAdaptiveNextGaps(input.living, {
    excludeGaps: exclude,
    turns: input.turns,
  });
  const adaptiveIds = adaptive
    .map((c) => c.fieldKey)
    .filter((gapId) => {
      if (!isGapAskable(gapId, input.gapState)) return false;
      if (blockSolution && gapId === 'solution') return false;
      if (!input.stageReadiness.stageBAllowed && isStageBGap(gapId) && !skipOneLiner) {
        return false;
      }
      return true;
    });

  const stageBIds = STAGE_B_REQUIRED_GAPS.filter(
    (gapId) => isGapAskable(gapId, input.gapState) && !(blockSolution && gapId === 'solution'),
  );
  const rankedPool = [...new Set([...adaptiveIds, ...stageBIds])];
  const picked = rankAskableGaps({
    gapIds: rankedPool,
    living: input.living,
    gapState: input.gapState,
    turns: input.turns,
    siInsight: input.siInsight,
    lastReview: input.lastReview,
    inStageACoverage: false,
    blockSolution,
  });

  return {
    targetGapId: picked,
    reason: picked ? `turn-decision ranked ${picked}` : 'turn-decision no askable gap',
    mode: picked ? 'ranked' : 'none',
  };
}
