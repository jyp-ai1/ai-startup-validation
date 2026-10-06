/**
 * S.I. V1 Accuracy Closure — taxonomy scorer.
 * Not imported by the analyzer. Not a persist SoT. Not a question generator.
 */
import type { BatchScore } from './score-si-post-negative-batch';
import {
  declined,
  founderFour,
  isGenericAsk,
  rose,
  type PostNegSnap,
} from './score-si-post-negative-batch';
import {
  isNextUnresolvedCu,
  isRepeatabilityCu,
  scoreSpokenAlignment,
  stakeWeavedOffCu,
} from './score-si-question-alignment-holdout';

export type ClosureAxisId =
  | 'judgment'
  | 'evidence'
  | 'state'
  | 'negative'
  | 'conflict'
  | 'cu'
  | 'priority'
  | 'question'
  | 'founder_outcome';

export type ClosureFailure =
  | 'missed_upgrade'
  | 'missed_downgrade'
  | 'payment_only_promoted'
  | 'ignored_direct_conflict'
  | 'false_conflict_on_repeat_zero'
  | 'repeat_zero_promoted'
  | 'stale_cu'
  | 'stale_priority'
  | 'leftover_positive_headline'
  | 'wrong_axis_question'
  | 'stake_weave_off_cu'
  | 'closed_cu_reasked'
  | 'founder_dead_end';

export type ClosureAxis = {
  id: ClosureAxisId;
  score: BatchScore;
  note: string;
  failure: ClosureFailure | null;
};

export type ClosureSnap = PostNegSnap & { whyAsking: string };

export function hopLabel(from: ClosureSnap, to: ClosureSnap): string {
  return `${from.stageId}→${to.stageId}`;
}

function axis(id: ClosureAxisId, score: BatchScore, note: string, failure: ClosureFailure | null = null): ClosureAxis {
  return { id, score, note, failure };
}

export function scoreQuestionAxis(snaps: ClosureSnap[]): ClosureAxis {
  const spoken = snaps.map((snap) => scoreSpokenAlignment(snap));
  const weave = snaps.find((snap) => stakeWeavedOffCu(snap));
  const fail = spoken.find((row) => row.score === 'FAIL');
  if (weave || fail?.failure === 'stake_weave_off_cu') {
    return axis('question', 'FAIL', fail?.note ?? 'DCE boilerplate overwrote CU', 'stake_weave_off_cu');
  }
  if (fail) {
    return axis('question', 'FAIL', fail.note, 'wrong_axis_question');
  }
  const genericNext = snaps.some((snap) => isNextUnresolvedCu(snap.criticalUnknown) && isGenericAsk(snap));
  if (genericNext) {
    return axis('question', 'PARTIAL', 'Pattern A generic next-CU ask (obstruction FAIL 0)');
  }
  return axis('question', 'PASS', 'spoken question stays on the CU axis');
}

export function scoreFounderOutcomeAxis(snaps: ClosureSnap[]): ClosureAxis {
  for (const snap of snaps) {
    const four = founderFour(snap);
    if (four.leftoverPositive) {
      return axis('founder_outcome', 'FAIL', 'leftover positive headline after negative', 'leftover_positive_headline');
    }
    if (!four.readable) {
      return axis('founder_outcome', 'FAIL', 'Founder four unreadable', 'founder_dead_end');
    }
  }
  const ask = snaps[0];
  if (ask && isNextUnresolvedCu(ask.criticalUnknown) && isGenericAsk(ask)) {
    const recovers = /다음 고객|다음 기간/.test(`${ask.whyAsking} ${ask.validationPriority}`);
    return axis(
      'founder_outcome',
      recovers ? 'PARTIAL' : 'FAIL',
      recovers ? 'generic ask; CU/whyAsking still name next period' : 'generic ask with no next-period recover',
      recovers ? null : 'founder_dead_end',
    );
  }
  return axis('founder_outcome', 'PASS', 'Founder can read judgment, CU, and next action');
}

export function scoreClosureAxes(input: {
  t0: ClosureSnap;
  paidOnly: ClosureSnap;
  upgraded: ClosureSnap;
  s4: ClosureSnap;
  downgraded: ClosureSnap;
  conflicted: ClosureSnap;
  notConflicted: ClosureSnap;
  dceTwoTwo: boolean;
}): { axes: ClosureAxis[]; failures: ClosureFailure[] } {
  const {
    t0,
    paidOnly,
    upgraded,
    s4,
    downgraded,
    conflicted,
    notConflicted,
    dceTwoTwo,
  } = input;

  const upgradedOk = rose(t0, upgraded) || t0.stageId === 'S3' || t0.stageId === 'S4';
  const downOk = declined(upgraded, downgraded);
  const cuMoved = upgraded.criticalUnknown !== t0.criticalUnknown;
  const priorityMoved = upgraded.validationPriority !== t0.validationPriority;
  const staleCu = rose(t0, upgraded) && !cuMoved;
  const stalePriority = rose(t0, upgraded) && !priorityMoved;
  const paidPromoted =
    dceTwoTwo && (paidOnly.stageId === 'S3' || paidOnly.stageId === 'S4' || paidOnly.verdictId === 'viable');
  const conflictLabeled = conflicted.evidenceClass === 'CONFLICT';
  const conflictRejudged = declined(upgraded, conflicted) || declined(s4, conflicted);
  const conflictCuMoved = conflicted.criticalUnknown !== upgraded.criticalUnknown;
  const conflictPriorityMoved = conflicted.validationPriority !== upgraded.validationPriority;
  const falseConflict = notConflicted.evidenceClass === 'CONFLICT';
  const repeatZeroPromoted = rose(upgraded, notConflicted) || rose(s4, notConflicted);
  const fourDown = founderFour(downgraded);
  const s4Ok = s4.stageId === 'S4' || upgraded.stageId === 'S4' || t0.stageId === 'S4';

  const judgment = axis(
    'judgment',
    upgradedOk && downOk ? 'PASS' : 'FAIL',
    `${hopLabel(t0, upgraded)} / down ${hopLabel(upgraded, downgraded)} s4=${s4.stageId}`,
    upgradedOk ? (downOk ? null : 'missed_downgrade') : 'missed_upgrade',
  );

  const evidence = axis(
    'evidence',
    conflictLabeled && !falseConflict && !paidPromoted && !repeatZeroPromoted ? 'PASS' : 'FAIL',
    `conflict=${conflicted.evidenceClass} repeat0=${notConflicted.evidenceClass} paidOnly=${paidOnly.stageId}`,
    paidPromoted
      ? 'payment_only_promoted'
      : conflictLabeled
        ? falseConflict
          ? 'false_conflict_on_repeat_zero'
          : repeatZeroPromoted
            ? 'repeat_zero_promoted'
            : null
        : 'ignored_direct_conflict',
  );

  const state = axis(
    'state',
    staleCu || stalePriority ? 'FAIL' : 'PASS',
    staleCu ? 'stale CU after promotion' : 'CU/Priority moved or t0 already promoted',
    staleCu ? 'stale_cu' : stalePriority ? 'stale_priority' : null,
  );

  const negative = axis(
    'negative',
    downOk && !fourDown.leftoverPositive ? 'PASS' : 'FAIL',
    `down ${hopLabel(upgraded, downgraded)} leftover=${fourDown.leftoverPositive}`,
    downOk ? (fourDown.leftoverPositive ? 'leftover_positive_headline' : null) : 'missed_downgrade',
  );

  const conflict = axis(
    'conflict',
    conflictLabeled && conflictRejudged && conflictCuMoved && conflictPriorityMoved && !falseConflict
      ? 'PASS'
      : conflictLabeled && conflictRejudged && !falseConflict
        ? 'PARTIAL'
        : 'FAIL',
    `class=${conflicted.evidenceClass} ${hopLabel(upgraded, conflicted)} cuMoved=${conflictCuMoved}`,
    conflictLabeled ? (falseConflict ? 'false_conflict_on_repeat_zero' : null) : 'ignored_direct_conflict',
  );

  const nextCuAfterPromo =
    isNextUnresolvedCu(upgraded.criticalUnknown) || isRepeatabilityCu(upgraded.criticalUnknown) || s4Ok;
  const cu = axis(
    'cu',
    staleCu || !nextCuAfterPromo ? 'FAIL' : 'PASS',
    nextCuAfterPromo ? 'next unresolved CU after promotion' : 'next CU missing',
    staleCu ? 'stale_cu' : null,
  );

  const priority = axis(
    'priority',
    stalePriority ? 'FAIL' : upgraded.validationPriority.length > 8 ? 'PASS' : 'FAIL',
    stalePriority ? 'stale Priority after promotion' : 'Priority recomputed',
    stalePriority ? 'stale_priority' : null,
  );

  const question = scoreQuestionAxis([t0, upgraded, s4, downgraded, conflicted]);
  const founderOutcome = scoreFounderOutcomeAxis([upgraded, downgraded, conflicted]);

  const axes = [judgment, evidence, state, negative, conflict, cu, priority, question, founderOutcome];
  const failures = [...new Set(axes.map((row) => row.failure).filter((id): id is ClosureFailure => Boolean(id)))];
  return { axes, failures };
}

export function rollupAxis(scores: BatchScore[]): BatchScore {
  if (scores.includes('FAIL')) return 'FAIL';
  if (scores.includes('PARTIAL')) return 'PARTIAL';
  return 'PASS';
}
