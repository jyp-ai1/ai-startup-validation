import { describe, expect, it } from 'vitest';

import { interpretAnswerSemantics } from '@/features/workflow-journey/lib/business-understanding/interpret-answer-semantics';
import { answersContradict } from '@/features/workflow-journey/lib/business-understanding/understanding-contract';

describe('F11 interpret direct', () => {
  it('answersContradict on calibration utterance', () => {
    const prior = '20~30대 직장인·프리랜서';
    const next =
      '실제 최종 고객은 50대 남성 기업 IT 담당자입니다. 이전에 말한 고객 정의는 초기 가설이었습니다.';
    expect(answersContradict(prior, next)).toBe(true);
  });

  it('persona reversal on marketChannel ask is CONTRADICTORY', () => {
    const result = interpretAnswerSemantics({
      answer:
        '실제 최종 고객은 50대 남성 기업 IT 담당자입니다. 이전에 말한 고객 정의는 초기 가설이었습니다.',
      askedIssueId: 'competitor_analysis',
      askedTargetGap: 'marketChannel',
      existingFactsByKey: { customer: '20~30대 직장인·프리랜서' },
    });
    expect(result.quality).toBe('CONTRADICTORY');
    expect(result.mergeable).toBe(false);
  });
});
