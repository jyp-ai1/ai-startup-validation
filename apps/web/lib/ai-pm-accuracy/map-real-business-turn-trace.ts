/**
 * Maps Production sessionStorage loop turn → Phase ② CPO evidence row.
 */

export type Phase2TurnTrace = {
  turn: number;
  userAnswer: string;
  askedGapId: string | null;
  askedQuestionText: string | null;
  answerUnderstanding: {
    extractedFacts: unknown[];
    intent: string | null;
    quality: string | null;
    contradictions: unknown[];
  };
  knowledgeStateDelta: {
    gapVerdicts: Record<string, unknown>;
    understandingDelta: string | null;
  };
  gapSnapshot: Record<string, string>;
  nextQuestion: {
    text: string | null;
    targetGap: string | null;
    action: string | null;
    rationale: string | null;
    causality: unknown;
  };
  layers: {
    L1: 'CAPTURED' | 'MISSING';
    L2: 'CAPTURED' | 'MISSING';
    L3: 'CAPTURED' | 'MISSING';
    L4: 'NOT_IN_PHASE2_INITIAL';
    L5: 'NOT_IN_PHASE2_INITIAL';
  };
  cpoVerdict: 'PENDING_CPO_2PASS';
};

type LoopTurnLike = {
  review?: {
    askedGapId?: string;
    askedQuestionText?: string;
    extractedFacts?: unknown[];
    contradictions?: unknown[];
    gapVerdicts?: Record<string, unknown>;
    recommendedAction?: {
      questionText?: string;
      targetGapId?: string;
      action?: string;
    };
    rationale?: string;
    semanticInterpretationRef?: { intent?: string; quality?: string };
  };
  targetGap?: string;
  askedQuestionText?: string;
  intent?: string;
  understandingDelta?: string;
  causality?: unknown;
};

export function mapLoopTurnToPhase2Trace(input: {
  turn: number;
  userAnswer: string;
  questionBefore: string;
  lastTurn: LoopTurnLike | null;
  gapState: Record<string, string> | null;
}): Phase2TurnTrace {
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
      gapVerdicts: (review?.gapVerdicts as Record<string, unknown>) ?? {},
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
