import type { ConversationStateContract, EvaluationResultContract } from './contracts';
import { detectStateDrift } from './ground-truth-engine';

/** L1–L3 rule-first evaluation (no evaluator LLM). */
export function evaluateTurnDeterministic(input: {
  userAnswer: string;
  extractedFactCount: number;
  behavior: string;
  turn: number;
  groundTruthGap: Record<string, string>;
  aiGapSnapshot: Record<string, string>;
  askedGapId: string;
  nextTargetGap: string | null;
}): EvaluationResultContract {
  const failureType: string[] = [];
  let understanding: EvaluationResultContract['understanding'] = 'PASS';
  let state: EvaluationResultContract['state'] = 'PASS';
  let gap: EvaluationResultContract['gap'] = 'PENDING';
  let question: EvaluationResultContract['question'] = 'PENDING';

  if (input.behavior === 'multi_fact' && input.extractedFactCount < 2) {
    understanding = 'FAIL';
    failureType.push('F13_MULTI_FACT_LOSS');
  }

  if (input.behavior === 'contradiction' && input.turn >= 4) {
    const hasConflict = input.aiGapSnapshot.customerPersona === 'CONFLICT';
    if (!hasConflict) {
      state = 'FAIL';
      failureType.push('F11_CONTRADICTION_MISHANDLING');
    }
  }

  const gtState: ConversationStateContract = {
    gaps: input.groundTruthGap as ConversationStateContract['gaps'],
    facts: {},
    transitionLog: [],
  };
  const stateDrift = detectStateDrift(gtState, input.aiGapSnapshot);
  if (stateDrift) {
    state = 'FAIL';
    failureType.push('STATE_DRIFT');
  }

  if (/아마|같아요|불확실/.test(input.userAnswer) && input.aiGapSnapshot.wtp === 'CLOSED') {
    failureType.push('F04_FACT_ASSUMPTION_CONFUSION');
    understanding = 'FAIL';
  }

  return {
    understanding,
    state,
    gap,
    question,
    reasoning: 'PENDING',
    judgment: 'PENDING',
    failureType,
    severity: failureType.length ? 'medium' : undefined,
    stateDrift,
  };
}
