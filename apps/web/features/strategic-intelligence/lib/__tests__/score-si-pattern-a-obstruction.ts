/**
 * Pattern A obstruction — measure only.
 * Not imported by the analyzer. Not a persist SoT. Not a question generator.
 *
 * Question: after 2/2, next CU = 다음 고객/기간 and spoken ask is generic.
 * Does that generic ask obstruct Founder judgment / validation action?
 */
import type { BatchScore } from './score-si-post-negative-batch';
import { founderFour, isGenericAsk, type PostNegSnap } from './score-si-post-negative-batch';
import { isNextUnresolvedCu } from './score-si-question-alignment-holdout';

export type ObstructionAnswerKind = 'on_cu' | 'generic_literal' | 'wrong_axis' | 'plan_only';

export type ObstructionFailure =
  | 'generic_literal_closes_next_cu'
  | 'on_cu_corrupts_state'
  | 'plan_only_closes_next_cu'
  | 'dead_end_no_next_action'
  | 'leftover_positive_headline';

export type ObstructionSnap = PostNegSnap & {
  whyAsking: string;
};

export function isPatternA(snap: ObstructionSnap): boolean {
  return isNextUnresolvedCu(snap.criticalUnknown) && isGenericAsk(snap);
}

export function recoversNextCuOnSurface(snap: ObstructionSnap): boolean {
  return (
    isNextUnresolvedCu(snap.criticalUnknown) &&
    isNextUnresolvedCu(snap.validationPriority) &&
    isNextUnresolvedCu(snap.whyAsking)
  );
}

export function closedNextCu(before: ObstructionSnap, after: ObstructionSnap): boolean {
  return isNextUnresolvedCu(before.criticalUnknown) && !isNextUnresolvedCu(after.criticalUnknown);
}

export function scoreFollowUp(
  kind: ObstructionAnswerKind,
  before: ObstructionSnap,
  after: ObstructionSnap,
): {
  score: BatchScore;
  failure: ObstructionFailure | null;
  note: string;
} {
  const four = founderFour(after);
  const closed = closedNextCu(before, after);
  const s4 = after.stageId === 'S4';
  const stillNext = isNextUnresolvedCu(after.criticalUnknown);

  if (four.leftoverPositive) {
    return {
      score: 'FAIL',
      failure: 'leftover_positive_headline',
      note: `${kind} leftover positive headline`,
    };
  }

  if (kind === 'generic_literal') {
    if (closed || s4) {
      return {
        score: 'FAIL',
        failure: 'generic_literal_closes_next_cu',
        note: `generic payment closed next CU ${before.stageId}→${after.stageId}`,
      };
    }
    if (stillNext && four.readable) {
      return {
        score: 'PARTIAL',
        failure: null,
        note: 'generic payment wastes a turn; next CU stays honest',
      };
    }
    return {
      score: 'FAIL',
      failure: 'dead_end_no_next_action',
      note: `generic payment left unreadable state ${after.stageId}`,
    };
  }

  if (kind === 'plan_only') {
    if (closed || s4) {
      return {
        score: 'FAIL',
        failure: 'plan_only_closes_next_cu',
        note: `plan-only closed next CU ${before.stageId}→${after.stageId}`,
      };
    }
    if (stillNext && four.readable) {
      return {
        score: 'PARTIAL',
        failure: null,
        note: 'plan-only delays; next CU stays open',
      };
    }
    return {
      score: 'FAIL',
      failure: 'dead_end_no_next_action',
      note: `plan-only left unreadable state ${after.stageId}`,
    };
  }

  if (kind === 'on_cu') {
    if (!four.readable) {
      return {
        score: 'FAIL',
        failure: 'on_cu_corrupts_state',
        note: 'next-period answer made Founder four unreadable',
      };
    }
    if (closed && s4) {
      return {
        score: 'PASS',
        failure: null,
        note: `on-CU next-period evidence advanced ${before.stageId}→${after.stageId}`,
      };
    }
    if (stillNext) {
      return {
        score: 'PARTIAL',
        failure: null,
        note: 'on-CU next-period evidence kept CU open (no dedicated next-period signal)',
      };
    }
    return {
      score: 'PARTIAL',
      failure: null,
      note: `on-CU moved CU without S4 ${before.stageId}→${after.stageId} cu=${after.criticalUnknown.slice(0, 24)}`,
    };
  }

  // wrong_axis: repeat_validation can close S3→S4. That is the engine path,
  // not the generic question asking for 재판매. Record, do not treat as Pattern A FAIL.
  if (s4 && closed) {
    return {
      score: 'PARTIAL',
      failure: null,
      note: `wrong-axis repeat_validation closed next CU ${before.stageId}→S4`,
    };
  }
  if (stillNext && four.readable) {
    return {
      score: 'PARTIAL',
      failure: null,
      note: 'wrong-axis answer did not close next CU',
    };
  }
  return {
    score: 'PARTIAL',
    failure: null,
    note: `wrong-axis ${before.stageId}→${after.stageId}`,
  };
}

/**
 * PASS: generic ask does not block Founder validation; spoken question still names the CU object.
 * PARTIAL: question underspecifies CU, but state stays honest and CU/whyAsking recover the next action.
 * FAIL: answering the spoken question closes the wrong CU, or Founder has no next action.
 */
export function scoreObstruction(input: {
  ask: ObstructionSnap;
  onCu: ReturnType<typeof scoreFollowUp>;
  genericLiteral: ReturnType<typeof scoreFollowUp>;
  wrongAxis: ReturnType<typeof scoreFollowUp>;
  planOnly: ReturnType<typeof scoreFollowUp>;
}): {
  score: BatchScore;
  failure: ObstructionFailure | null;
  note: string;
} {
  const branches = [input.onCu, input.genericLiteral, input.wrongAxis, input.planOnly];
  const fail = branches.find((branch) => branch.score === 'FAIL');
  if (fail) {
    return { score: 'FAIL', failure: fail.failure, note: fail.note };
  }
  if (!isPatternA(input.ask)) {
    return { score: 'FAIL', failure: 'dead_end_no_next_action', note: 'fixture is not Pattern A' };
  }
  if (!recoversNextCuOnSurface(input.ask)) {
    return {
      score: 'FAIL',
      failure: 'dead_end_no_next_action',
      note: 'CU/Priority/whyAsking lost 다음 고객/기간',
    };
  }
  if (!isGenericAsk(input.ask)) {
    return { score: 'PASS', failure: null, note: 'spoken question already names the CU object' };
  }
  return {
    score: 'PARTIAL',
    failure: null,
    note: 'generic ask underspecifies; whyAsking/CU recover next-period action; state stays honest',
  };
}
