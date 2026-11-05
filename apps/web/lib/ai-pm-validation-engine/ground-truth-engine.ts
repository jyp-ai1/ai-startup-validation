import type {
  AnswerBehaviorId,
  ConversationStateContract,
  GapCompleteness,
} from './contracts';
import { appendTransition, correctionTransition } from './state-transition-rules';
import { inferEvidenceStrengthFromText } from './evidence-strength';

const DEFAULT_GAPS: Record<string, GapCompleteness> = {
  customerPersona: 'OPEN',
  problemStatement: 'OPEN',
  payerUser: 'OPEN',
  wtp: 'OPEN',
};

export function createInitialGroundTruthState(): ConversationStateContract {
  return {
    gaps: { ...DEFAULT_GAPS },
    facts: {},
    transitionLog: [],
  };
}

/** State(t) + answer(t) → State(t+1) — deterministic, separate from AI PM. */
export function applyGroundTruthAnswer(input: {
  state: ConversationStateContract;
  behavior: AnswerBehaviorId;
  turn: number;
  userAnswer: string;
  askedGapId: string;
}): ConversationStateContract {
  let { gaps, facts, transitionLog } = input.state;
  const strength = inferEvidenceStrengthFromText(input.userAnswer);

  const closeSlot = (slot: string, value: string) => {
    const from = gaps[slot] ?? 'OPEN';
    const to: GapCompleteness =
      input.behavior === 'contradiction' && input.turn >= 4 && slot === 'customerPersona'
        ? 'CONFLICT'
        : strength <= 2 && slot === 'wtp'
          ? 'ASSUMPTION'
          : 'CLOSED';
    transitionLog = appendTransition(transitionLog, {
      slot,
      from,
      to,
      trigger:
        (input.behavior === 'contradiction' && input.turn >= 4) ||
          (input.behavior === 'longitudinal_f11' && input.turn >= 5)
          ? 'contradiction'
          : 'answer',
    });
    gaps = { ...gaps, [slot]: to };
    facts = { ...facts, [slot]: value };
  };

  if (
    (input.behavior === 'contradiction' && input.turn >= 4) ||
    (input.behavior === 'longitudinal_f11' && input.turn >= 5)
  ) {
    for (const tr of correctionTransition('customerPersona')) {
      transitionLog = appendTransition(transitionLog, tr);
    }
    gaps = { ...gaps, customerPersona: 'CONFLICT' };
    facts = {
      ...facts,
      customerPersona: input.userAnswer.slice(0, 120),
    };
    return { gaps, facts, transitionLog };
  }

  if (input.behavior === 'multi_fact') {
    closeSlot('payerUser', input.userAnswer);
    closeSlot('problemStatement', input.userAnswer);
    return { gaps, facts, transitionLog };
  }

  const slot = input.askedGapId || 'customerPersona';
  closeSlot(slot, input.userAnswer.slice(0, 120));
  return { gaps, facts, transitionLog };
}

export function detectStateDrift(
  groundTruth: ConversationStateContract,
  aiGapSnapshot: Record<string, string>,
): boolean {
  for (const [slot, gt] of Object.entries(groundTruth.gaps)) {
    const ai = aiGapSnapshot[slot];
    if (!ai) continue;
    if (gt === 'CONFLICT' && ai !== 'CONFLICT' && ai !== 'CONTRADICTED' && ai !== 'OPEN')
      return true;
    if (gt === 'ASSUMPTION' && ai === 'CLOSED') return true;
  }
  return false;
}
