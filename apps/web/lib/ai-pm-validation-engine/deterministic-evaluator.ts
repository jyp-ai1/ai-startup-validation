import type { ExtractedFact } from '@repo/types/domain/answer-review';

import type { ConversationStateContract, EvaluationResultContract } from './contracts';
import { isGapPriorityAligned } from './gap-priority-evaluator';
import { detectStateDrift } from './ground-truth-engine';
import { evaluateL5FromFacts } from './l5-reasoning-evaluator';
import { questionIntentForGap, questionTextHintsIntent } from './question-intent';

/** L1–L5 rule-first evaluation (no evaluator LLM). */
export function evaluateTurnDeterministic(input: {
  userAnswer: string;
  extractedFacts: ExtractedFact[];
  behavior: string;
  turn: number;
  groundTruthGap: Record<string, string>;
  aiGapSnapshot: Record<string, string>;
  askedGapId: string;
  nextTargetGap: string | null;
  nextQuestionText?: string | null;
}): EvaluationResultContract {
  const failureType: string[] = [];
  let understanding: EvaluationResultContract['understanding'] = 'PASS';
  let state: EvaluationResultContract['state'] = 'PASS';
  let gap: EvaluationResultContract['gap'] = 'PASS';
  let question: EvaluationResultContract['question'] = 'PASS';

  if (input.behavior === 'multi_fact' && input.extractedFacts.length < 2) {
    understanding = 'FAIL';
    failureType.push('F13_MULTI_FACT_LOSS');
  }

  if (input.behavior === 'sparse' && input.extractedFacts.length > 2) {
    failureType.push('F01_CUSTOMER_POLLUTION');
    understanding = 'FAIL';
  }

  if (input.behavior === 'contradiction' && input.groundTruthGap.customerPersona === 'CONFLICT') {
    const cp = input.aiGapSnapshot.customerPersona;
    const hasConflict = cp === 'CONFLICT' || cp === 'CONTRADICTED';
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

  if (
    (input.behavior === 'uncertainty' || /아마|같아요|불확실/.test(input.userAnswer)) &&
    input.aiGapSnapshot.wtp === 'CLOSED'
  ) {
    failureType.push('F04_FACT_ASSUMPTION_CONFUSION');
    understanding = 'FAIL';
  }

  const priority = isGapPriorityAligned(input.nextTargetGap, input.aiGapSnapshot);
  if (!priority.pass) {
    gap = 'FAIL';
    question = 'FAIL';
    failureType.push('F08_WRONG_GAP_PRIORITY');
  } else if (input.nextTargetGap && input.nextQuestionText) {
    const intent = questionIntentForGap(input.nextTargetGap);
    if (!questionTextHintsIntent(input.nextQuestionText, intent)) {
      question = 'PARTIAL';
      failureType.push('F16_WRONG_NEXT_QUESTION_RATIONALE');
    }
  }

  const l5 = evaluateL5FromFacts({
    userAnswer: input.userAnswer,
    extractedFacts: input.extractedFacts,
  });
  failureType.push(...l5.failureType);

  return {
    understanding,
    state,
    gap,
    question,
    reasoning: l5.reasoning,
    judgment: l5.judgment,
    failureType: [...new Set(failureType)],
    severity: failureType.length ? 'medium' : undefined,
    stateDrift,
    evidenceStrengthMisuse: l5.evidenceStrengthMisuse,
  };
}
