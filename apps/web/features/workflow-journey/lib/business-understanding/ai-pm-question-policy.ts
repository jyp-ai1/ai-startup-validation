/**
 * DAY 8-B — Product policy layer on V3 decision output.
 * Bootstrap fix, validationTestability CEO suppression, cluster soft ranking.
 * Does NOT mutate gapState or rewrite decideNextQuestionFromReview.
 */

import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { selectAdaptiveNextGaps } from './adaptive-question-select';
import {
  gapSemanticCluster,
  SAME_CLUSTER_SOFT_PENALTY,
} from './ai-pm-semantic-clusters';
import type { NextQuestionDecision } from './decide-next-question-from-review';
import {
  isStageBGap,
  STAGE_A_REQUIRED_GAPS,
  STAGE_B_REQUIRED_GAPS,
  type StageReadiness,
} from './evaluate-stage-readiness';
import { resolveGapQuestionBinding } from './gap-question-map';
import type { LivingUnderstandingState } from './living-understanding-state';
import { whyNowForGapField } from './living-understanding-state';
import { isGapAskable } from './update-gap-state-from-review';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** Bootstrap order — business understanding before gap checklist. */
export const BOOTSTRAP_GAP_PRIORITY = [
  'businessOneLiner',
  'customerPersona',
  'problemJtbd',
  'payer',
] as const;

/** CEO-facing replacement when validationTestability would surface independently. */
export const VALIDATION_TESTABILITY_BEHAVIORAL_QUESTION =
  '그 차별점이 실제로 드러나는 고객 경험 순간은 언제인가요?';

export type ApplyQuestionPolicyInput = {
  decision: NextQuestionDecision;
  gapState: GapKnowledgeState;
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  stageReadiness: StageReadiness;
  isBootstrap?: boolean;
};

function lastAskedGapId(turns: AiPmLoopTurn[]): string | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const t = turns[i]!;
    if (t.superseded) continue;
    const gap = t.targetGap?.trim();
    if (gap) return gap;
  }
  return null;
}

function closedGapExcludeSet(gapState: GapKnowledgeState): Set<string> {
  const exclude = new Set<string>();
  for (const gapId of Object.keys(gapState.gaps)) {
    if (!isGapAskable(gapId, gapState)) exclude.add(gapId);
  }
  return exclude;
}

/**
 * Bootstrap gap selection — business → customer → problem, never Stage B first.
 * CPO P0: when all spine gaps are CLOSED from document, still ask businessOneLiner
 * rather than jumping to marketChannel.
 */
export function pickBootstrapGapWithPolicy(
  gapState: GapKnowledgeState,
  stageReadiness: StageReadiness,
): string {
  for (const gapId of BOOTSTRAP_GAP_PRIORITY) {
    if (isGapAskable(gapId, gapState)) return gapId;
  }
  for (const gapId of STAGE_A_REQUIRED_GAPS) {
    if (isGapAskable(gapId, gapState)) return gapId;
  }
  if (!stageReadiness.stageBAllowed) {
    return BOOTSTRAP_GAP_PRIORITY[0]!;
  }
  // Stage B allowed but spine gaps document-closed — still start with business understanding
  return BOOTSTRAP_GAP_PRIORITY[0]!;
}

function findAlternativeGap(input: {
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  gapState: GapKnowledgeState;
  stageReadiness: StageReadiness;
  excludeGap: string;
  lastCluster: ReturnType<typeof gapSemanticCluster>;
}): string | null {
  const exclude = closedGapExcludeSet(input.gapState);
  exclude.add(input.excludeGap);
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
    if (!isGapAskable(candidate.fieldKey, input.gapState)) continue;
    const cluster = gapSemanticCluster(candidate.fieldKey);
    if (cluster && cluster === input.lastCluster) continue;
    return candidate.fieldKey;
  }
  return null;
}

function applyValidationTestabilityPolicy(
  decision: NextQuestionDecision,
): NextQuestionDecision {
  if (decision.targetGapId !== 'validationTestability') return decision;

  return {
    ...decision,
    questionText: VALIDATION_TESTABILITY_BEHAVIORAL_QUESTION,
    whyNow:
      '차별점의 고객 관련성을 행동·경험 관점에서 확인합니다. (내부 검증 항목)',
    actionRationale:
      '추상적 중요성 질문 대신 구체적 고객 경험 순간을 확인합니다.',
    reframed: true,
  };
}

function applyClusterSoftRanking(
  decision: NextQuestionDecision,
  input: ApplyQuestionPolicyInput,
): NextQuestionDecision {
  const lastGap = lastAskedGapId(input.turns);
  const lastCluster = gapSemanticCluster(lastGap);
  const nextCluster = gapSemanticCluster(decision.targetGapId);

  if (!lastCluster || !nextCluster || lastCluster !== nextCluster) {
    return decision;
  }

  const alternative = findAlternativeGap({
    living: input.living,
    turns: input.turns,
    gapState: input.gapState,
    stageReadiness: input.stageReadiness,
    excludeGap: decision.targetGapId,
    lastCluster,
  });

  if (!alternative) {
    return {
      ...decision,
      score: Math.max(0, (decision.score ?? 0) - SAME_CLUSTER_SOFT_PENALTY),
      actionRationale: `${decision.actionRationale} (동일 주제 연속 — 필요 시 재확인)`,
    };
  }

  const binding = resolveGapQuestionBinding(alternative);
  return {
    ...decision,
    targetGap: alternative,
    targetGapId: alternative,
    issueId: binding.issueId,
    questionText: binding.questionText,
    whyNow: whyNowForGapField(alternative) || binding.whyNow,
    rationale: binding.whyNow,
    reframed: true,
    actionRationale: '이전 질문과 같은 주제라 다른 불확실성을 먼저 확인합니다.',
  };
}

function rebuildBootstrapDecision(
  targetGapId: string,
  gapState: GapKnowledgeState,
): NextQuestionDecision {
  const binding = resolveGapQuestionBinding(targetGapId);
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
    actionRationale: '사업 이해를 위해 핵심 맥락부터 확인합니다.',
    reason: `bootstrap policy first ask on ${targetGapId}`,
  };
}

/** Build bootstrap decision from policy gap selection. */
export function createBootstrapDecisionWithPolicy(
  gapState: GapKnowledgeState,
  stageReadiness: StageReadiness,
): NextQuestionDecision {
  const targetGapId = pickBootstrapGapWithPolicy(gapState, stageReadiness);
  return rebuildBootstrapDecision(targetGapId, gapState);
}

/**
 * Apply product policy on V3 decision output — presentation-safe mutations only.
 */
export function applyQuestionPolicy(
  input: ApplyQuestionPolicyInput,
): NextQuestionDecision {
  let decision = input.decision;

  if (input.isBootstrap || decision.sourceAnswerId === 'bootstrap') {
    const policyGap = pickBootstrapGapWithPolicy(
      input.gapState,
      input.stageReadiness,
    );
    if (policyGap !== decision.targetGapId) {
      decision = rebuildBootstrapDecision(policyGap, input.gapState);
    }
  } else if (
    !input.stageReadiness.stageBAllowed &&
    isStageBGap(decision.targetGapId)
  ) {
    const stageAGap = pickBootstrapGapWithPolicy(
      input.gapState,
      input.stageReadiness,
    );
    decision = rebuildBootstrapDecision(stageAGap, input.gapState);
  }

  decision = applyValidationTestabilityPolicy(decision);
  decision = applyClusterSoftRanking(decision, input);

  return decision;
}
