import { describe, expect, it } from 'vitest';

import {
  classifyTurnMismatch,
  ENGINE_SOT_FIRST_GAP,
  FROZEN_INTENDED_GAP,
  FROZEN_PLAYBACK_FIRST_GAP,
  FROZEN_SCENARIO_SHA,
  pickFrozenAnswerForGap,
} from './pr197-frozen-scenario-adapter';

describe('PR #197 frozen scenario adapter (verification only)', () => {
  it('keeps frozen SHA and does not treat scenario T1 as engine SoT', () => {
    expect(FROZEN_SCENARIO_SHA).toBe('5263e83e');
    expect(ENGINE_SOT_FIRST_GAP).toBe('customerPersona');
    expect(FROZEN_PLAYBACK_FIRST_GAP.S1).toBe('problemJtbd');
    expect(FROZEN_INTENDED_GAP.S1[0]).toBe('problemJtbd');
    expect(FROZEN_INTENDED_GAP.S6[0]).toBe('marketplaceSide');
  });

  it('classifies SoT first ask vs frozen problem-first as FIRST_QUESTION + ORDER + OFF_SLOT', () => {
    expect(
      classifyTurnMismatch({
        turn: 1,
        askedQuestion: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?',
        expectedQuestion: '고객이 지금 가장 불편해하는 점은 무엇인가요?',
        askedGap: 'customerPersona',
        frozenIntendedGap: 'problemJtbd',
        founderAnswerAppliedToAskedGap: false,
      }),
    ).toEqual(['FIRST_QUESTION', 'ORDER', 'OFF_SLOT_ANSWER']);
  });

  it('classifies same-gap different sentence as WORDING only', () => {
    expect(
      classifyTurnMismatch({
        turn: 1,
        askedQuestion: '지금 가장 크게 해결하려는 불편은 무엇인가요?',
        expectedQuestion: '부모가 지금 가장 귀찮아하는 점은 무엇인가요?',
        askedGap: 'problemJtbd',
        frozenIntendedGap: 'problemJtbd',
        founderAnswerAppliedToAskedGap: true,
      }),
    ).toEqual(['WORDING']);
  });

  it('classifies empty next as STOP', () => {
    expect(
      classifyTurnMismatch({
        turn: 5,
        askedQuestion: null,
        expectedQuestion: '지금은 이 문제를 어떻게 처리하나요?',
        askedGap: null,
        frozenIntendedGap: 'alternativesCompetitors',
        founderAnswerAppliedToAskedGap: false,
      }),
    ).toEqual(['STOP']);
  });

  it('maps frozen founder answer onto the asked gap, not turn index', () => {
    const used = new Set<number>();
    const mapped = pickFrozenAnswerForGap(
      [
        { expectedQuestion: 'problem q', founderAnswer: 'problem answer' },
        { expectedQuestion: 'customer q', founderAnswer: '반찬가게' },
      ],
      ['problemJtbd', 'customerPersona'],
      'customerPersona',
      used,
    );
    expect(mapped).toEqual({
      answer: '반찬가게',
      frozenTurn: 2,
      intendedGap: 'customerPersona',
    });
    expect(used.has(1)).toBe(true);
  });
});
