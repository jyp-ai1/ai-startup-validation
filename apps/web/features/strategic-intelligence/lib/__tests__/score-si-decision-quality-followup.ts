/**
 * Measure-only referee for the #104 follow-up pack.
 * Not imported by the analyzer. Not a persist SoT.
 */

import type { SiStrategicJudgment } from '@repo/types/domain/strategic-intelligence';

export type FollowupScore = 'PASS' | 'PARTIAL' | 'FAIL';

export type FollowupAxisId =
  | 'currentJudgment'
  | 'unverified'
  | 'changingEvidence'
  | 'nextAction';

export type FollowupAxis = {
  id: FollowupAxisId;
  score: FollowupScore;
  note: string;
};

export type FollowupFailureKind =
  | 'false_s3_promotion'
  | 'partial_as_full_validated'
  | 'resale_drift'
  | 'stale_cu_after_full_dce'
  | 'unclear_judgment'
  | 'unclear_unknown'
  | 'unclear_dce'
  | 'unclear_next_action';

const MUST_NOT_PROMOTE = new Set(['partial_dce', 'unmet_dce', 'additional_evidence', 'ambiguous']);

function rollup(scores: FollowupScore[]): FollowupScore {
  if (scores.includes('FAIL')) return 'FAIL';
  if (scores.includes('PARTIAL')) return 'PARTIAL';
  return 'PASS';
}

export function scoreFounderFourTuple(judgment: SiStrategicJudgment): {
  axes: FollowupAxis[];
  overall: FollowupScore;
} {
  const currentJudgment: FollowupAxis = {
    id: 'currentJudgment',
    score:
      judgment.judgment.startsWith('현재 판단:') && !/\d{1,3}\s*점/.test(judgment.judgment)
        ? 'PASS'
        : 'FAIL',
    note: `${judgment.verdictId}/${judgment.stageId}`,
  };

  const cuWhy = /없으면|확정할 수 없|아니면|아니다|그대로면/.test(judgment.criticalUnknown);
  const unverified: FollowupAxis = {
    id: 'unverified',
    score: judgment.criticalUnknown.length > 12 && cuWhy ? 'PASS' : cuWhy ? 'PARTIAL' : 'FAIL',
    note: cuWhy ? 'CU names what still blocks a decision' : 'CU does not say why a decision is blocked',
  };

  const dceMoves = /올리|내리|유지/.test(judgment.decisionChangingEvidence);
  const changingEvidence: FollowupAxis = {
    id: 'changingEvidence',
    score: dceMoves ? 'PASS' : 'FAIL',
    note: dceMoves ? 'DCE says how the verdict would move' : 'DCE missing a judgment move',
  };

  const nextLen = judgment.validationPriority.length;
  const nextAction: FollowupAxis = {
    id: 'nextAction',
    score: nextLen > 8 && nextLen < 140 ? 'PASS' : nextLen > 8 ? 'PARTIAL' : 'FAIL',
    note: nextLen > 8 ? 'Priority is one next proof' : 'Priority is empty',
  };

  const axes = [currentJudgment, unverified, changingEvidence, nextAction];
  return { axes, overall: rollup(axes.map((axis) => axis.score)) };
}

export function classifyFollowupFailures(input: {
  scenarioId: string;
  verdictId: string;
  stageId: string;
  criticalUnknown: string;
  dcePartialNamed: boolean;
  nextQuestion: string;
  axes: FollowupAxis[];
}): FollowupFailureKind[] {
  const failures: FollowupFailureKind[] = [];
  const promoted = input.stageId === 'S3' || input.stageId === 'S4' || input.verdictId === 'viable';
  if (MUST_NOT_PROMOTE.has(input.scenarioId) && promoted) {
    failures.push('false_s3_promotion');
  }
  if (input.scenarioId === 'partial_dce' && promoted && !input.dcePartialNamed) {
    failures.push('partial_as_full_validated');
  }
  if (/재판매/.test(input.nextQuestion)) {
    failures.push('resale_drift');
  }
  if (
    input.scenarioId === 'full_dce' &&
    promoted &&
    /지불만 있고|실제로 줄었는가/.test(input.criticalUnknown)
  ) {
    failures.push('stale_cu_after_full_dce');
  }
  for (const axis of input.axes) {
    if (axis.score !== 'FAIL') continue;
    if (axis.id === 'currentJudgment') failures.push('unclear_judgment');
    if (axis.id === 'unverified') failures.push('unclear_unknown');
    if (axis.id === 'changingEvidence') failures.push('unclear_dce');
    if (axis.id === 'nextAction') failures.push('unclear_next_action');
  }
  return failures;
}
