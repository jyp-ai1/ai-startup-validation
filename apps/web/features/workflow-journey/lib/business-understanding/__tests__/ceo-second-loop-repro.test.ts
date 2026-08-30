import { describe, expect, it } from 'vitest';

import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { getAnsweredTargetGaps } from '../resolve-missing-field-priority';
import { inferTargetGapFromQuestionText } from '../gap-question-map';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const CASE_A_ANSWER = '여행관련, 전통주 관련 개별 서비스는 많다.';

const CASE_B_ANSWERS = [
  '고객이 직접 결제합니다',
  '관광객이 앱에서 일정·체험을 직접 예약·결제합니다',
  '고객이요',
  '당연히 고객이지',
  '외국인 관광객이요',
];

function simulateTurn(input: {
  answer: string;
  askedGap: string;
  issueId: AiPmLoopTurn['issueId'];
  askedQuestionText: string;
}): AiPmLoopTurn {
  const semantic = interpretAnswerSemantics({
    answer: input.answer,
    askedIssueId: input.issueId,
    askedTargetGap: input.askedGap,
  });
  return {
    issueId: input.issueId,
    answer: input.answer,
    appliedAt: '2026-08-31T00:00:00.000Z',
    semanticFactKey: semantic.factKey ?? undefined,
    semanticFactKeys: semantic.facts.map((f) => f.key),
    intent: semantic.intent,
    targetGap: input.askedGap,
    askedQuestionText: input.askedQuestionText,
  };
}

describe('CEO second-loop — CASE A competitor', () => {
  it('closes alternativesCompetitors for CEO free-form competitor answer', () => {
    const turn = simulateTurn({
      answer: CASE_A_ANSWER,
      askedGap: 'alternativesCompetitors',
      issueId: 'competitor_analysis',
      askedQuestionText: '비슷한 역할을 이미 하고 있는 서비스가 있나요?',
    });
    const semantic = interpretAnswerSemantics({
      answer: CASE_A_ANSWER,
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'alternativesCompetitors',
    });
    const gaps = getAnsweredTargetGaps([turn]);

    expect(semantic.mergeable).toBe(true);
    expect(semantic.quality).toBe('VALID');
    expect(semantic.factKey).toBe('competitor');
    expect(gaps.has('alternativesCompetitors')).toBe(true);
  });

  it('does not misroute CASE A answer to business slot', () => {
    const semantic = interpretAnswerSemantics({
      answer: CASE_A_ANSWER,
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'alternativesCompetitors',
    });
    expect(semantic.factKey).not.toBe('business');
  });
});

describe('CEO second-loop — CASE B payer', () => {
  it('infers payer gap from i18n question text', () => {
    expect(inferTargetGapFromQuestionText('누가 비용을 지불합니까?')).toBe('payer');
  });

  it.each(CASE_B_ANSWERS)('closes payer gap on payer ask: %s', (answer) => {
    const turn = simulateTurn({
      answer,
      askedGap: 'payer',
      issueId: 'bm_design',
      askedQuestionText: '누가 비용을 지불합니까?',
    });
    const semantic = interpretAnswerSemantics({
      answer,
      askedIssueId: 'bm_design',
      askedTargetGap: 'payer',
    });
    const gaps = getAnsweredTargetGaps([turn]);

    expect(semantic.mergeable, `mergeable: ${answer}`).toBe(true);
    expect(semantic.factKey, `factKey: ${answer}`).toBe('buyer');
    expect(gaps.has('payer'), `payer closed: ${answer}`).toBe(true);
  });

  it.each(['고객이요', '외국인 관광객이요'])(
    'CEO implicit payer answer closes payer when gap inferred from i18n Q: %s',
    (answer) => {
      const askedGap = inferTargetGapFromQuestionText('누가 비용을 지불합니까?');
      expect(askedGap).toBe('payer');
      const semantic = interpretAnswerSemantics({
        answer,
        askedIssueId: 'bm_design',
        askedTargetGap: askedGap,
      });
      const gaps = getAnsweredTargetGaps([
        simulateTurn({
          answer,
          askedGap: 'payer',
          issueId: 'bm_design',
          askedQuestionText: '누가 비용을 지불합니까?',
        }),
      ]);
      expect(semantic.factKey).toBe('buyer');
      expect(gaps.has('payer')).toBe(true);
    },
  );
});
