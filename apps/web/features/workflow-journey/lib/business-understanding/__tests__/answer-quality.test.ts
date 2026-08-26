import { describe, expect, it } from 'vitest';

import {
  answersContradict,
  evaluateAnswerQuality,
  mapDocumentFirstSourceToProvenance,
  shouldSkipReask,
} from '../understanding-contract';

describe('evaluateAnswerQuality (W5–W6)', () => {
  it('rejects nonsense / too short as IRRELEVANT', () => {
    expect(evaluateAnswerQuality('asdf').quality).toBe('IRRELEVANT');
    expect(evaluateAnswerQuality('asdf').mergeable).toBe(false);
    expect(evaluateAnswerQuality('xxx').mergeable).toBe(false);
  });

  it('rejects keyboard mash / punctuation-only as IRRELEVANT', () => {
    expect(evaluateAnswerQuality('as df as df').quality).toBe('IRRELEVANT');
    expect(evaluateAnswerQuality('!!! ???').mergeable).toBe(false);
    expect(evaluateAnswerQuality('blahblah').mergeable).toBe(false);
  });

  it('records 모름 as UNKNOWN without merging as fact', () => {
    expect(evaluateAnswerQuality('모름')).toEqual({ quality: 'UNKNOWN', mergeable: false });
  });

  it('accepts substantive answers as VALID', () => {
    const result = evaluateAnswerQuality('병원 원장이 진료 대기 때문에 재방문 관리가 어렵습니다');
    expect(result.quality).toBe('VALID');
    expect(result.mergeable).toBe(true);
  });

  it('flags CONTRADICTORY against existing confirmed fact', () => {
    const result = evaluateAnswerQuality('대학생 개인 여행자', {
      existingFact: '병원 원장',
    });
    expect(result.quality).toBe('CONTRADICTORY');
    expect(result.mergeable).toBe(false);
  });

  it('maps provenance helpers', () => {
    expect(mapDocumentFirstSourceToProvenance('document')).toBe('DOCUMENT');
    expect(shouldSkipReask('VALIDATED')).toBe(true);
    expect(answersContradict('병원 원장', '병원 원장')).toBe(false);
  });
});
