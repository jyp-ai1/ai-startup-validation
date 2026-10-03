import type {
  AnswerBehaviorId,
  ConversationStateContract,
  GapCompleteness,
} from './contracts';
import { appendTransition } from './state-transition-rules';
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

const PERSONA_REVERSAL_RE = /이전에\s*말한\s*고객\s*정의는|초기\s*가설이었/;
const REFINEMENT_RE = /정정합니다|도\s*포함/;

/** Persona reversal utterance — an explicit reversal cue, or a late contradiction-behavior turn that is not a refinement. */
function isPersonaReversal(input: {
  behavior: AnswerBehaviorId;
  turn: number;
  userAnswer: string;
}): boolean {
  if (input.behavior !== 'contradiction') return false;
  if (PERSONA_REVERSAL_RE.test(input.userAnswer)) return true;
  return input.turn >= 4 && !REFINEMENT_RE.test(input.userAnswer);
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
    const to: GapCompleteness = strength <= 2 && slot === 'wtp' ? 'ASSUMPTION' : 'CLOSED';
    transitionLog = appendTransition(transitionLog, {
      slot,
      from,
      to,
      trigger: 'answer',
    });
    gaps = { ...gaps, [slot]: to };
    facts = { ...facts, [slot]: value };
  };

  if (isPersonaReversal(input)) {
    const value = input.userAnswer.slice(0, 120);
    const from = gaps.customerPersona ?? 'OPEN';
    // Restating the pending new definition is the user's explicit resolution of the A/B conflict.
    const restated = facts.customerPersona === value && (from === 'CONFLICT' || from === 'CLOSED');
    const to: GapCompleteness = restated ? 'CLOSED' : 'CONFLICT';
    transitionLog = appendTransition(transitionLog, {
      slot: 'customerPersona',
      from,
      to,
      trigger: restated ? 'correction' : 'contradiction',
    });
    gaps = { ...gaps, customerPersona: to };
    facts = { ...facts, customerPersona: value };
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
