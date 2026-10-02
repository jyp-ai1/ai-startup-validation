import { describe, expect, it } from 'vitest';

import { mapLoopTurnToPhase2Trace } from '../map-real-business-turn-trace';

describe('mapLoopTurnToPhase2Trace', () => {
  it('maps AnswerReview fields for CPO Layer 1–3', () => {
    const row = mapLoopTurnToPhase2Trace({
      turn: 1,
      userAnswer: 'test',
      questionBefore: 'Who is the customer?',
      lastTurn: {
        review: {
          askedGapId: 'customerPersona',
          askedQuestionText: 'Who is the customer?',
          extractedFacts: [{ key: 'customer', evidenceClass: 'FACT' }],
          gapVerdicts: { customerPersona: 'CLOSED' },
          recommendedAction: {
            targetGapId: 'problemJtbd',
            action: 'probe',
            questionText: 'What problem?',
          },
          rationale: 'probe next gap',
          semanticInterpretationRef: { intent: 'business_fact', quality: 'VALID' },
        },
        understandingDelta: 'Customer identified',
      },
      gapState: { customerPersona: 'CLOSED' },
    });

    expect(row.askedGapId).toBe('customerPersona');
    expect(row.answerUnderstanding.quality).toBe('VALID');
    expect(row.gapSnapshot.customerPersona).toBe('CLOSED');
    expect(row.nextQuestion.targetGap).toBe('problemJtbd');
    expect(row.layers.L1).toBe('CAPTURED');
    expect(row.cpoVerdict).toBe('PENDING_CPO_2PASS');
  });
});
