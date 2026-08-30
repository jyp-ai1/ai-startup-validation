import { describe, expect, it } from 'vitest';

import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { getAnsweredTargetGaps } from '../resolve-missing-field-priority';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const CEO_ANSWERS = [
  '30대 직장인 커플이요. 서울 처음 와서 로컬 맛집 찾기 어려워하는 분들',
  '일본에서 오는 20대 여성 solo traveler',
  '혼자 여행하는 미국인 밀레니얼',
  '서울 3박4일 오는 외국인 중 패키지 말고 자유여행 선호하는 사람',
  '예약 전에 맞춤 일정을 원하는 방한 외국인',
  '맞춤형 경험을 원하는 외국인 관광객이에요',
  '영어권 MZ 세대가 주 고객입니다',
  '첫 서울 방문 외국인 커플',
  'K-컬처 팬으로 한국 온 20대',
  '외국인인데 혼자 오는 경우가 많아요',
  '방한 외국인이요',
  '외국인이요',
  '동선 낭비 없이 여행하고 싶은 외국인',
  '차별점을 예약 전에 체감하고 싶은 사람',
  '서울 처음인 30대 부부',
  '혼행하는 일본인 20대 여성',
];

function simulatePersonaTurn(answer: string): AiPmLoopTurn {
  const semantic = interpretAnswerSemantics({
    answer,
    askedIssueId: 'customer_definition',
    askedTargetGap: 'customerPersona',
  });
  return {
    issueId: 'customer_definition',
    answer,
    appliedAt: '2026-08-30T00:00:00.000Z',
    semanticFactKey: semantic.factKey ?? undefined,
    semanticFactKeys: semantic.facts.map((f) => f.key),
    intent: semantic.intent,
    targetGap: 'customerPersona',
    askedQuestionText: '이 서비스를 가장 필요로 하는 구체 고객은 누구인가요?',
  };
}

describe('CEO persona loop reproduction', () => {
  it('reports persona closure for CEO-style answers', () => {
    const failures: string[] = [];
    for (const answer of CEO_ANSWERS) {
      const turn = simulatePersonaTurn(answer);
      const semantic = interpretAnswerSemantics({
        answer,
        askedIssueId: 'customer_definition',
        askedTargetGap: 'customerPersona',
      });
      const gaps = getAnsweredTargetGaps([turn]);
      if (
        !semantic.mergeable ||
        semantic.factKey !== 'customer' ||
        !gaps.has('customerPersona')
      ) {
        failures.push(
          `${answer.slice(0, 40)} → factKey=${semantic.factKey} mergeable=${semantic.mergeable} gapClosed=${gaps.has('customerPersona')}`,
        );
      }
    }
    expect(failures, failures.join('\n')).toEqual([]);
  });
});
