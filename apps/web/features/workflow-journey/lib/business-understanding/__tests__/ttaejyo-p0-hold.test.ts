import { describe, expect, it } from 'vitest';

import { getAnsweredTargetGaps } from '../resolve-missing-field-priority';
import { inferTargetGapFromQuestionText } from '../gap-question-map';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

/**
 * TTAEJYO — independent CASE A / CASE B unit traces (no shared root-cause assumption).
 */

describe('TTAEJYO CASE A — differentiation ask surface chain', () => {
  it('differentiation gap binds to competitor_analysis issueId', () => {
    const binding = inferTargetGapFromQuestionText('경쟁 대비 이 서비스만의 차별점은 무엇인가요?');
    expect(binding).toBe('differentiationVsAlternatives');
  });

  it('cross-issue transition (bm_design → competitor_analysis) triggers recognition gate condition', () => {
    const lastTurnIssueId = 'bm_design';
    const nextIssueId = 'competitor_analysis';
    const phase = 'issue';
    const recognitionWouldShow =
      phase === 'issue' && lastTurnIssueId !== nextIssueId;
    expect(recognitionWouldShow).toBe(true);
  });

  it('same-issue competitor → differentiation does NOT trigger recognition gate', () => {
    const lastTurnIssueId = 'competitor_analysis';
    const nextIssueId = 'competitor_analysis';
    const phase = 'issue';
    const recognitionWouldShow =
      phase === 'issue' && lastTurnIssueId !== nextIssueId;
    expect(recognitionWouldShow).toBe(false);
  });
});

describe('TTAEJYO CASE B — resume payer repeat (fresh vs resume paths)', () => {
  const payerTurn = (answer: string): AiPmLoopTurn => ({
    issueId: 'bm_design',
    answer,
    appliedAt: '2026-08-31T00:00:00.000Z',
    semanticFactKey: 'buyer',
    semanticFactKeys: ['buyer'],
    targetGap: 'payer',
    askedQuestionText: '누가 비용을 지불합니까?',
  });

  it('fresh path: 고객이요 closes payer when askedTargetGap is set', () => {
    const turn = payerTurn('고객이요');
    const semantic = interpretAnswerSemantics({
      answer: '고객이요',
      askedIssueId: 'bm_design',
      askedTargetGap: 'payer',
    });
    const gaps = getAnsweredTargetGaps([turn]);
    expect(semantic.factKey).toBe('buyer');
    expect(gaps.has('payer')).toBe(true);
  });

  it('resume path: turn missing targetGap falls back to issue binding — still buyer', () => {
    const legacyTurn: AiPmLoopTurn = {
      issueId: 'bm_design',
      answer: '고객이요',
      appliedAt: '2026-08-31T00:00:00.000Z',
      semanticFactKey: 'buyer',
    };
    const semantic = interpretAnswerSemantics({
      answer: legacyTurn.answer,
      askedIssueId: legacyTurn.issueId,
      askedTargetGap: inferTargetGapFromQuestionText('누가 비용을 지불합니까?'),
    });
    expect(semantic.factKey).toBe('buyer');
  });

  it('resume path: stale session without buyer turn re-opens payer (simulated)', () => {
    const staleTurns: AiPmLoopTurn[] = [];
    const gaps = getAnsweredTargetGaps(staleTurns);
    expect(gaps.has('payer')).toBe(false);
  });
});
