import { describe, expect, it } from 'vitest';

import {
  buildAgreement,
  buildCompactQuestionInvite,
  buildCompactRecognition,
  buildQuestionPermission,
  buildTinyWin,
  buildTurnRecognition,
} from '../build-ai-pm-conversation-rhythm';

describe('build-ai-pm-conversation-rhythm', () => {
  it('builds compact recognition (confirm only, three lines)', () => {
    const recognition = buildCompactRecognition(
      {
        issueId: 'customer_definition',
        answer: '구매자는 대표입니다.',
        appliedAt: new Date().toISOString(),
      },
      'problem_definition',
    );

    expect(recognition.lines).toEqual([
      '좋습니다.',
      '이제 구매자는 명확합니다.',
      '다음은 문제만 같이 보면 됩니다.',
    ]);
  });

  it('builds compact question invite (hedge + invite + question)', () => {
    const invite = buildCompactQuestionInvite(
      'customer_definition',
      '실제로 비용을 내는 사람은 누구인가요?',
    );

    expect(invite.lines[0]).toContain('놓친');
    expect(invite.lines[1]).toBe('같이 확인해 볼까요?');
    expect(invite.lines[2]).toContain('비용');
  });

  it('keeps legacy recognition for internal use', () => {
    const recognition = buildTurnRecognition({
      issueId: 'customer_definition',
      answer: '구매자는 대표입니다.',
      appliedAt: new Date().toISOString(),
    });

    expect(recognition.lead).toBe('좋습니다.');
    expect(recognition.body).toContain('고객과 구매자');
  });

  it('builds tiny win with checkmark-style summary', () => {
    const tinyWin = buildTinyWin({
      issueId: 'customer_definition',
      answer: '구매자는 대표입니다.',
      appliedAt: new Date().toISOString(),
    });

    expect(tinyWin.label).toBe('구매자');
    expect(tinyWin.value).toBe('대표');
    expect(tinyWin.celebration).toContain('한 단계 선명해졌습니다');
  });

  it('builds agreement as co-judgment before question', () => {
    const agreement = buildAgreement('problem_definition');
    expect(agreement.hedge).toContain('놓친');
    expect(agreement.invite).toBe('같이 확인해 볼까요?');
  });

  it('asks question permission instead of forcing a quiz', () => {
    expect(buildQuestionPermission('customer_definition')).toBe('같이 확인해 볼까요?');
  });
});
