import { describe, expect, it } from 'vitest';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import { founderFieldLabel } from '../founder-field-labels';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  buildUnderstandingDelta,
  explainSufficiency,
  formatUnderstandingDeltaSummary,
} from '../question-causality';
import { upsertConfirmedFact } from '../conversation-memory';
import { emptyConversationMemory } from '../conversation-memory';

const P0_INTERNAL_KEYS = [
  'businessOneLiner',
  'problemJtbd',
  'problemFrequencySeverity',
  'revenueModel',
  'customerPersona',
  'payer',
  'solution',
  'alternativesCompetitors',
  'differentiationVsAlternatives',
  'marketChannel',
  'validationTestability',
] as const;

const SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

function assertNoInternalKeys(text: string) {
  for (const key of P0_INTERNAL_KEYS) {
    expect(text).not.toMatch(new RegExp(`\\b${key}\\b`));
  }
}

describe('DAY 6 — question-causality CEO label mapping', () => {
  it('founderFieldLabel covers all P0 internal keys with Korean labels', () => {
    expect(founderFieldLabel('businessOneLiner')).toBe('사업 한 줄');
    expect(founderFieldLabel('problemJtbd')).toBe('핵심 문제');
    expect(founderFieldLabel('revenueModel')).toBe('수익 모델');
    expect(founderFieldLabel('customerPersona')).toBe('고객 페르소나');
    expect(founderFieldLabel('payer')).toBe('구매자');
    expect(founderFieldLabel('solution')).toBe('솔루션');
    expect(founderFieldLabel('alternativesCompetitors')).toBe('대안/경쟁');
    expect(founderFieldLabel('differentiationVsAlternatives')).toBe('차별점');
    expect(founderFieldLabel('marketChannel')).toBe('시장');
    expect(founderFieldLabel('validationTestability')).toBe('검증 가능성');
  });

  it('buildUnderstandingDelta summary never exposes internal field keys', () => {
    const understanding = buildBusinessUnderstanding(SEED);
    let memory = emptyConversationMemory('day6-delta');
    const before = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory,
    });
    memory = upsertConfirmedFact(
      memory,
      'problem',
      '10~50인 스타트업 CEO와 PM이 전략 검토를 회의마다 처음부터 다시 하는 문제입니다.',
      'user_turn',
    );
    const after = buildLivingUnderstandingState({
      documentText: SEED,
      understanding,
      memory,
    });
    const delta = buildUnderstandingDelta({
      before,
      after,
      factKeys: ['problem'],
    });
    const summary = formatUnderstandingDeltaSummary(delta);

    assertNoInternalKeys(summary);
    expect(summary).toMatch(/미확인|다음 공백|기존|신규|변경|재평가/);
    if (summary.includes('미확인')) {
      expect(summary).toMatch(/고객 페르소나|구매자|솔루션|대안\/경쟁|차별점/);
    }
  });

  it('explainSufficiency explanation never exposes internal field keys', () => {
    const living = buildLivingUnderstandingState({
      documentText: SEED,
      understanding: buildBusinessUnderstanding(SEED),
      memory: null,
    });
    const { explanation } = explainSufficiency(living);

    assertNoInternalKeys(explanation);
    if (explanation.includes('미확인 핵심')) {
      expect(explanation).toMatch(/고객 페르소나|구매자|솔루션|대안\/경쟁|차별점/);
    }
  });
});
