import { describe, expect, it } from 'vitest';

import {
  buildBusinessUnderstanding,
  TASTE_COMPANY_FULL_SAMPLE,
} from '../../business-understanding/build-business-understanding';
import { buildMarketCandidates } from '../../business-understanding/workspace-alignment';
import {
  insightCopyIsDiscovery,
  INSIGHT_FORBIDDEN_PATTERNS,
  resolvePostReviewWorkshopPlan,
  shouldShowPostReviewWorkshop,
} from '../../business-understanding/workspace-decision-workshop';

/** CPO-approved insight copy — observation + impact only */
const KO_INSIGHTS = {
  market_entry_unclear:
    '이번 검토에서는 시장 진입 전략에 대한 가정이 아직 명확하지 않아, 이 부분이 사업성 평가에 가장 큰 영향을 주는 것으로 보였습니다.',
  revenue_unclear:
    '문서에서 수익 구조가 여러 방향으로 언급되었지만, 어떤 모델을 기준으로 볼지는 아직 정리되지 않은 상태로 보였습니다.',
  multiple_directions:
    '문서에서는 여러 시장 진입 방향이 보였지만, 어느 방향을 우선할지는 아직 결정되지 않았습니다.',
} as const;

describe('decision-workshop/insight copy', () => {
  it('uses discovery tone — no advice or premature judgment', () => {
    for (const text of Object.values(KO_INSIGHTS)) {
      expect(insightCopyIsDiscovery(text)).toBe(true);
    }
  });

  it('rejects banned judgment phrases', () => {
    expect(insightCopyIsDiscovery('시장 진입 전략이 가장 중요한 문제입니다.')).toBe(false);
    expect(insightCopyIsDiscovery('추천 전략은 B2B입니다.')).toBe(false);
    expect(INSIGHT_FORBIDDEN_PATTERNS.some((p) => p.test('해야 합니다'))).toBe(true);
  });
});

describe('decision-workshop/plan resolution', () => {
  it('surfaces multiple directions when parties and open alignment coexist', () => {
    const u = buildBusinessUnderstanding(TASTE_COMPANY_FULL_SAMPLE);
    const candidates = buildMarketCandidates(u);
    const plan = resolvePostReviewWorkshopPlan(u, { direction: 'thinking', primaryLabel: null }, candidates);
    expect(plan.insightKind).toBe('multiple_directions');
    expect(plan.topicId).toBe('market_entry');
    expect(plan.alternateTopicIds.length).toBeGreaterThan(0);
  });

  it('suggests market entry when direction is open with multiple parties', () => {
    const u = buildBusinessUnderstanding(TASTE_COMPANY_FULL_SAMPLE);
    const candidates = buildMarketCandidates(u);
    const plan = resolvePostReviewWorkshopPlan(
      u,
      { direction: 'decide_after_review', primaryLabel: null },
      candidates,
    );
    expect(['multiple_directions', 'market_entry_unclear']).toContain(plan.insightKind);
    expect(plan.topicId).toBe('market_entry');
  });
});

describe('decision-workshop/show gate', () => {
  it('hides before first review', () => {
    expect(shouldShowPostReviewWorkshop(0, null)).toBe(false);
  });

  it('shows after review when not yet agreed', () => {
    expect(shouldShowPostReviewWorkshop(1, null)).toBe(true);
  });

  it('hides when agreed for current round', () => {
    expect(
      shouldShowPostReviewWorkshop(1, {
        reviewRound: 1,
        topicId: 'market_entry',
        agreed: true,
      }),
    ).toBe(false);
  });

  it('shows again on new review round', () => {
    expect(
      shouldShowPostReviewWorkshop(2, {
        reviewRound: 1,
        topicId: 'market_entry',
        agreed: true,
      }),
    ).toBe(true);
  });
});
