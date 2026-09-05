/**
 * DAY 8-B — AI Understanding Gate.
 * Compares before/after living state to produce judgment update for CEO UI.
 */

import type { ConversationFactKey } from './conversation-memory';
import { founderFieldLabel } from './founder-field-labels';
import type { LivingUnderstandingState } from './living-understanding-state';
import {
  buildUnderstandingDelta,
  type UnderstandingDelta,
} from './question-causality';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

export type UnderstandingGateResult = {
  delta: UnderstandingDelta;
  whatChanged: string | null;
  judgmentUpdate: string;
  remainingUncertainty: string | null;
  aiCanResolve: boolean;
};

function formatWhatChanged(delta: UnderstandingDelta): string | null {
  if (delta.changed.length > 0) {
    return delta.changed.slice(0, 2).join(' · ');
  }
  if (delta.newlyUnderstood.length > 0) {
    return delta.newlyUnderstood.slice(0, 2).join(' · ');
  }
  return null;
}

function formatRemainingUncertainty(living: LivingUnderstandingState): string | null {
  const topGap = living.gaps[0];
  if (!topGap) return null;
  return `${founderFieldLabel(topGap.fieldKey)} 확인이 필요합니다.`;
}

/**
 * Run understanding gate after CEO answer merge.
 * Does not mutate engine state — presentation/policy only.
 */
export function runUnderstandingGate(input: {
  before: LivingUnderstandingState;
  after: LivingUnderstandingState;
  lastTurn?: AiPmLoopTurn | null;
  factKeys?: ConversationFactKey[];
}): UnderstandingGateResult {
  const delta = buildUnderstandingDelta({
    before: input.before,
    after: input.after,
    factKeys: input.factKeys,
  });

  const whatChanged = formatWhatChanged(delta);
  const remainingUncertainty = formatRemainingUncertainty(input.after);

  let judgmentUpdate: string;
  if (whatChanged) {
    judgmentUpdate = whatChanged;
  } else if (input.after.judgmentSummary.trim()) {
    judgmentUpdate = input.after.judgmentSummary
      .replace(/\s*이해 상태 커버리지\s*\d+%[^.]*\./, '')
      .trim();
  } else {
    judgmentUpdate = '답변을 반영해 이해를 갱신했습니다.';
  }

  return {
    delta,
    whatChanged,
    judgmentUpdate,
    remainingUncertainty,
    aiCanResolve: false,
  };
}
