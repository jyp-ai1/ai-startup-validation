import { describe, expect, it } from 'vitest';

import {
  buildCeoSixSurfaces,
  isUserFacingSurfaceCopy,
} from '../build-ceo-six-surfaces';
import {
  formatFounderJudgmentSummary,
} from '../build-conversation-understanding-summary';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { founderFieldLabel, isInternalFieldKey } from '../founder-field-labels';
import { buildLivingUnderstandingState } from '../living-understanding-state';

const INTERNAL_KEYS = [
  'businessOneLiner',
  'problemJtbd',
  'revenueModel',
  'alternativesCompetitors',
  'differentiationVsAlternatives',
  'validationTestability',
] as const;

const ALABOM_SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

describe('DAY 6 — founder field labels (detail view / 상세 보기)', () => {
  it('founderFieldLabel maps all P0 internal keys to Korean CEO language', () => {
    expect(founderFieldLabel('businessOneLiner')).toBe('사업 한 줄');
    expect(founderFieldLabel('problemJtbd')).toBe('핵심 문제');
    expect(founderFieldLabel('revenueModel')).toBe('수익 모델');
    expect(founderFieldLabel('alternativesCompetitors')).toBe('대안/경쟁');
    expect(founderFieldLabel('unknownFutureKey')).toBe('확인 항목');
  });

  it('isInternalFieldKey detects schema tokens', () => {
    for (const key of INTERNAL_KEYS) {
      expect(isInternalFieldKey(key)).toBe(true);
    }
    expect(isInternalFieldKey('사업 한 줄')).toBe(false);
    expect(isInternalFieldKey('확인됨: 지불 주체')).toBe(false);
  });

  it('formatFounderJudgmentSummary never leaks internal keys after document parse', () => {
    const living = buildLivingUnderstandingState({
      documentText: ALABOM_SEED,
      understanding: buildBusinessUnderstanding(ALABOM_SEED),
      turns: [],
      memory: null,
    });

    const summary = formatFounderJudgmentSummary(living);
    for (const key of INTERNAL_KEYS) {
      expect(summary).not.toMatch(new RegExp(`\\b${key}\\b`));
    }
  });

  it('living judgmentSummary never leaks internal keys', () => {
    const living = buildLivingUnderstandingState({
      documentText: ALABOM_SEED,
      understanding: buildBusinessUnderstanding(ALABOM_SEED),
      turns: [],
      memory: null,
    });

    for (const key of INTERNAL_KEYS) {
      expect(living.judgmentSummary).not.toMatch(new RegExp(`\\b${key}\\b`));
    }
  });

  it('CEO unconfirmed empty state uses explanatory copy not bare dash', () => {
    const surfaces = buildCeoSixSurfaces({
      lastTurn: {
        issueId: 'customer_definition',
        answer: '외국인 관광객이 직접 결제합니다.',
        appliedAt: '2026-09-04T00:00:00.000Z',
      },
      lastDecision: null,
    });
    expect(surfaces.unconfirmedItems).toHaveLength(0);
    expect(surfaces.confirmedFacts).toHaveLength(0);
    expect(isUserFacingSurfaceCopy('businessOneLiner')).toBe(false);
  });
});
