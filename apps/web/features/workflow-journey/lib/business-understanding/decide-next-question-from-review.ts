/**
 * PR4 — Review + gapState → NextQuestionDecision (S14).
 * V3 decision path SoT when V3_REVIEW_PIPELINE is ON.
 * @see docs/architecture/ai-pm-v3/readiness/V3_DECISION_ENGINE_CONTRACT.md
 */

import type { AnswerReview, RecommendedAction } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { selectAdaptiveNextGaps } from './adaptive-question-select';
import {
  isStageBGap,
  STAGE_A_REQUIRED_GAPS,
  STAGE_B_REQUIRED_GAPS,
  type StageReadiness,
} from './evaluate-stage-readiness';
import type { ConversationFactKey, ConversationMemory } from './conversation-memory';
import { resolveGapQuestionBinding } from './gap-question-map';
import type { LivingUnderstandingState } from './living-understanding-state';
import { whyNowForGapField } from './living-understanding-state';
import {
  countUnclosedGapAsks,
  type QuestionDecision,
} from './question-decision-engine';
import {
  buildConflictClarifyQuestion,
  isSameMeaningQuestion,
  reframeQuestion,
} from './reframe-question';
import { isGapAskable } from './update-gap-state-from-review';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** Re-export stage gap sets — canonical source is evaluate-stage-readiness (PR5). */
export { STAGE_A_REQUIRED_GAPS, STAGE_B_REQUIRED_GAPS } from './evaluate-stage-readiness';

export type NextQuestionDecision = QuestionDecision & {
  drivenByReview: true;
  sourceAnswerId: string;
  sourceReviewId: string;
  targetGapId: string;
  reviewAction: RecommendedAction;
  action: RecommendedAction;
  actionRationale: string;
  reason: string;
  clarifyTarget?: { gapId: string; factKey: ConversationFactKey };
  probeTarget?: { gapId: string; priorAskCount: number };
};

export type DecideNextQuestionFromReviewInput = {
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  memory: ConversationMemory | null;
  lastReview: AnswerReview | null;
  gapState: GapKnowledgeState;
  /** PR5 SoT — decision engine consumes readiness; does not compute it. */
  stageReadiness: StageReadiness;
  previousQuestionText?: string | null;
};

function closedGapExcludeSet(gapState: GapKnowledgeState): Set<string> {
  const exclude = new Set<string>();
  for (const gapId of Object.keys(gapState.gaps)) {
    if (!isGapAskable(gapId, gapState)) exclude.add(gapId);
  }
  return exclude;
}

function mapReviewActionToDecisionAction(
  reviewAction: RecommendedAction,
): RecommendedAction {
  return reviewAction === 'challenge' ? 'clarify' : reviewAction;
}

function actionRationaleForReview(
  review: AnswerReview,
  action: RecommendedAction,
): string {
  const quality = review.semanticInterpretationRef?.quality;
  const askedCompleteness = review.gapVerdicts[review.askedGapId]?.completeness;

  if (action === 'clarify' || review.recommendedAction === 'challenge') {
    if (review.contradictions.length > 0) {
      return '이전에 말씀하신 내용과 다릅니다. 확인이 필요합니다.';
    }
    return '답변이 모호해서 의미를 명확히 확인합니다.';
  }

  if (action === 'probe') {
    if (quality === 'IRRELEVANT') {
      return '답변이 관련 없어 같은 주제를 다시 확인합니다.';
    }
    if (askedCompleteness === 'PARTIAL') {
      return '답변이 부분적이라 같은 주제를 더 구체적으로 확인합니다.';
    }
    return '답변이 부분적이라 같은 주제를 더 구체적으로 확인합니다.';
  }

  const closedCount = Object.values(review.gapVerdicts).filter(
    (v) => v.completeness === 'CLOSED',
  ).length;
  if (closedCount >= 2) {
    return '답변에서 여러 항목이 확인되었습니다. 다음 주제로 넘어갑니다.';
  }
  return '답변이 충분합니다. 다음 주제로 넘어갑니다.';
}

function traceReason(
  action: RecommendedAction,
  targetGapId: string,
  review: AnswerReview | null,
): string {
  if (!review) {
    return `bootstrap first ask on ${targetGapId}`;
  }
  const verdict = review.gapVerdicts[review.askedGapId]?.completeness ?? 'unknown';
  return `${action} after ${review.askedGapId}=${verdict}; target=${targetGapId}`;
}

function lastAskTextForGap(turns: AiPmLoopTurn[], targetGap: string): string | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const t = turns[i]!;
    if (t.superseded) continue;
    if (t.targetGap?.trim() === targetGap && t.askedQuestionText?.trim()) {
      return t.askedQuestionText.trim();
    }
  }
  return null;
}

function pickBootstrapGap(gapState: GapKnowledgeState): string {
  for (const gapId of STAGE_A_REQUIRED_GAPS) {
    if (isGapAskable(gapId, gapState)) return gapId;
  }
  for (const gapId of STAGE_B_REQUIRED_GAPS) {
    if (isGapAskable(gapId, gapState)) return gapId;
  }
  return STAGE_A_REQUIRED_GAPS[0]!;
}

/** First askable Required gap — Stage B blocked until PR5 readiness allows entry. */
function pickNextRequiredGap(
  gapState: GapKnowledgeState,
  stageReadiness: StageReadiness,
): string | null {
  for (const gapId of STAGE_A_REQUIRED_GAPS) {
    if (isGapAskable(gapId, gapState)) return gapId;
  }
  if (stageReadiness.stageBAllowed) {
    for (const gapId of STAGE_B_REQUIRED_GAPS) {
      if (isGapAskable(gapId, gapState)) return gapId;
    }
  }
  return null;
}

function pickAdvanceTargetGap(input: {
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  gapState: GapKnowledgeState;
  stageReadiness: StageReadiness;
}): string | null {
  const requiredNext = pickNextRequiredGap(input.gapState, input.stageReadiness);
  if (requiredNext) return requiredNext;

  const exclude = closedGapExcludeSet(input.gapState);
  const candidates = selectAdaptiveNextGaps(input.living, {
    excludeGaps: exclude,
    turns: input.turns,
  });

  for (const candidate of candidates) {
    if (
      !input.stageReadiness.stageBAllowed &&
      isStageBGap(candidate.fieldKey)
    ) {
      continue;
    }
    if (isGapAskable(candidate.fieldKey, input.gapState)) {
      return candidate.fieldKey;
    }
  }

  return null;
}

function resolveTargetGapId(
  review: AnswerReview,
  action: RecommendedAction,
  gapState: GapKnowledgeState,
  living: LivingUnderstandingState,
  turns: AiPmLoopTurn[],
  stageReadiness: StageReadiness,
): string {
  if (action === 'advance') {
    const next = pickAdvanceTargetGap({ living, turns, gapState, stageReadiness });
    if (next) return next;
  }

  const asked = review.askedGapId?.trim();
  if (asked && isGapAskable(asked, gapState)) return asked;

  const unconfirmed = review.unconfirmed.find((g) => isGapAskable(g, gapState));
  if (unconfirmed) return unconfirmed;

  const unknown = review.unknown.find((g) => isGapAskable(g, gapState));
  if (unknown) return unknown;

  return review.askedGapId;
}

function buildQuestionForDecision(input: {
  action: RecommendedAction;
  targetGapId: string;
  review: AnswerReview | null;
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  previousQuestionText?: string | null;
}): Pick<QuestionDecision, 'questionText' | 'whyNow' | 'reframed'> {
  const { action, targetGapId, review, living, turns, previousQuestionText } = input;
  const binding = resolveGapQuestionBinding(targetGapId);
  const priorAsks = countUnclosedGapAsks(turns, targetGapId);
  const prevText =
    previousQuestionText?.trim() ||
    lastAskTextForGap(turns, targetGapId) ||
    (priorAsks > 0 ? binding.questionText : null);

  if (
    action === 'clarify' &&
    review &&
    review.contradictions.length > 0
  ) {
    const conflict = review.contradictions[0]!;
    const clarify = buildConflictClarifyQuestion({
      factKey: conflict.factKey,
      targetGap: targetGapId,
      priorValue: conflict.priorValue,
      newValue: conflict.newValue,
      living,
    });
    return {
      questionText: clarify.questionText,
      whyNow: clarify.whyNow,
      reframed: clarify.reframed,
    };
  }

  if (action === 'probe' || action === 'clarify') {
    const reframed = reframeQuestion({
      targetGap: targetGapId,
      living,
      reason: action === 'clarify' ? 'adaptive' : 'adaptive',
      previousQuestionText: prevText ?? binding.questionText,
    });
    return {
      questionText: reframed.questionText,
      whyNow: reframed.whyNow,
      reframed: reframed.reframed,
    };
  }

  let questionText = binding.questionText;
  let whyNow = whyNowForGapField(targetGapId) || binding.whyNow;
  let reframed = false;

  if (priorAsks > 0 || (prevText && isSameMeaningQuestion(prevText, binding.questionText))) {
    const reframedQ = reframeQuestion({
      targetGap: targetGapId,
      living,
      reason: 'adaptive',
      previousQuestionText: prevText ?? binding.questionText,
    });
    questionText = reframedQ.questionText;
    whyNow = reframedQ.whyNow;
    reframed = true;
  }

  return { questionText, whyNow, reframed };
}

/**
 * Decide next question from last AnswerReview + authoritative gapState.
 * Bootstrap (lastReview=null): first OPEN Stage A Required gap.
 */
export function decideNextQuestionFromReview(
  input: DecideNextQuestionFromReviewInput,
): NextQuestionDecision | null {
  const { living, turns, gapState, lastReview, previousQuestionText, stageReadiness } =
    input;

  if (!lastReview) {
    const targetGapId = pickBootstrapGap(gapState);
    if (!isGapAskable(targetGapId, gapState) && gapState.gaps[targetGapId]) {
      return null;
    }
    const binding = resolveGapQuestionBinding(targetGapId);
    const actionRationale = '사업 이해를 시작하기 위해 첫 핵심 공백을 확인합니다.';
    const whyNow = whyNowForGapField(targetGapId) || binding.whyNow;
    return {
      targetGap: targetGapId,
      targetGapId,
      issueId: binding.issueId,
      questionText: binding.questionText,
      whyNow,
      rationale: binding.whyNow,
      score: 50_000,
      reframed: false,
      excludedGaps: [...closedGapExcludeSet(gapState)],
      drivenByReview: true,
      sourceAnswerId: 'bootstrap',
      sourceReviewId: 'bootstrap',
      reviewAction: 'advance',
      action: 'advance',
      actionRationale,
      reason: traceReason('advance', targetGapId, null),
    };
  }

  const reviewAction = lastReview.recommendedAction;
  const action = mapReviewActionToDecisionAction(reviewAction);
  const targetGapId = resolveTargetGapId(
    lastReview,
    action,
    gapState,
    living,
    turns,
    stageReadiness,
  );

  if (!isGapAskable(targetGapId, gapState)) {
    if (action !== 'advance') {
      return null;
    }
    const fallback = pickAdvanceTargetGap({
      living,
      turns,
      gapState,
      stageReadiness,
    });
    if (!fallback || !isGapAskable(fallback, gapState)) return null;
  }

  const finalTarget =
    action === 'advance' && !isGapAskable(targetGapId, gapState)
      ? pickAdvanceTargetGap({ living, turns, gapState, stageReadiness }) ??
        targetGapId
      : action === 'advance' &&
          !stageReadiness.stageBAllowed &&
          isStageBGap(targetGapId)
        ? pickNextRequiredGap(gapState, stageReadiness) ?? targetGapId
        : targetGapId;

  if (!isGapAskable(finalTarget, gapState)) return null;

  const binding = resolveGapQuestionBinding(finalTarget);
  const { questionText, whyNow, reframed } = buildQuestionForDecision({
    action,
    targetGapId: finalTarget,
    review: lastReview,
    living,
    turns,
    previousQuestionText,
  });

  const priorAsks = countUnclosedGapAsks(turns, finalTarget);
  const actionRationale = actionRationaleForReview(lastReview, action);

  const decision: NextQuestionDecision = {
    targetGap: finalTarget,
    targetGapId: finalTarget,
    issueId: binding.issueId,
    questionText,
    whyNow,
    rationale: binding.whyNow,
    score: action === 'advance' ? 40_000 : 30_000,
    reframed,
    excludedGaps: [...closedGapExcludeSet(gapState)],
    drivenByReview: true,
    sourceAnswerId: lastReview.turnId,
    sourceReviewId: lastReview.reviewId,
    reviewAction,
    action,
    actionRationale,
    reason: traceReason(action, finalTarget, lastReview),
  };

  if (action === 'probe') {
    decision.probeTarget = { gapId: finalTarget, priorAskCount: priorAsks };
  }
  if (action === 'clarify' && lastReview.contradictions[0]) {
    decision.clarifyTarget = {
      gapId: finalTarget,
      factKey: lastReview.contradictions[0].factKey,
    };
  }

  return decision;
}

export function isNextQuestionDecision(
  decision: QuestionDecision | NextQuestionDecision,
): decision is NextQuestionDecision {
  return 'drivenByReview' in decision && decision.drivenByReview === true;
}
