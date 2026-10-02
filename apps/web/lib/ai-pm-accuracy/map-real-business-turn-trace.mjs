/** @typedef {import('./map-real-business-turn-trace.ts').Phase2TurnTrace} Phase2TurnTrace */

/** Keep in sync with map-real-business-turn-trace.ts */
export function mapLoopTurnToPhase2Trace(input) {
  const last = input.lastTurn;
  const review = last?.review;
  const hasReview = Boolean(review?.extractedFacts || review?.gapVerdicts);

  return {
    turn: input.turn,
    userAnswer: input.userAnswer,
    askedGapId: review?.askedGapId ?? last?.targetGap ?? null,
    askedQuestionText:
      review?.askedQuestionText ?? last?.askedQuestionText ?? input.questionBefore ?? null,
    answerUnderstanding: {
      extractedFacts: review?.extractedFacts ?? [],
      intent: review?.semanticInterpretationRef?.intent ?? last?.intent ?? null,
      quality: review?.semanticInterpretationRef?.quality ?? null,
      contradictions: review?.contradictions ?? [],
    },
    knowledgeStateDelta: {
      gapVerdicts: review?.gapVerdicts ?? {},
      understandingDelta: last?.understandingDelta ?? null,
    },
    gapSnapshot: input.gapState ?? {},
    nextQuestion: {
      text: review?.recommendedAction?.questionText ?? null,
      targetGap: review?.recommendedAction?.targetGapId ?? null,
      action: review?.recommendedAction?.action ?? null,
      rationale: review?.rationale ?? null,
      causality: last?.causality ?? null,
    },
    layers: {
      L1: hasReview || last?.understandingDelta ? 'CAPTURED' : 'MISSING',
      L2: review?.gapVerdicts ? 'CAPTURED' : 'MISSING',
      L3: review?.recommendedAction ? 'CAPTURED' : 'MISSING',
      L4: 'NOT_IN_PHASE2_INITIAL',
      L5: 'NOT_IN_PHASE2_INITIAL',
    },
    cpoVerdict: 'PENDING_CPO_2PASS',
  };
}
