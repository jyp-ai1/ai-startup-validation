import { describe, expect, it } from 'vitest';

import {
  buildBusinessUnderstanding,
  TASTE_COMPANY_FULL_SAMPLE,
} from '../../business-understanding/build-business-understanding';
import {
  applyMarketAlignmentToWorkspace,
  buildCommonStrategyPaths,
  buildDefaultMarketAlignment,
  buildMarketCandidates,
  buildReviewReadyTrust,
  buildViabilityIntro,
  isMarketAlignmentValid,
} from '../../business-understanding/workspace-alignment';
import { emptyWorkspaceDomain } from '../../workspace-ai-pm-messages';

describe('decision-alignment/minimal', () => {
  it('lists document-backed parties for PM read-back', () => {
    const u = buildBusinessUnderstanding(TASTE_COMPANY_FULL_SAMPLE);
    const candidates = buildMarketCandidates(u);
    expect(candidates.length).toBeGreaterThan(0);
    expect(buildCommonStrategyPaths(candidates).length).toBeGreaterThanOrEqual(2);
  });

  it('starts without forcing founder input', () => {
    const state = buildDefaultMarketAlignment();
    expect(state.direction).toBe('unset');
    expect(isMarketAlignmentValid(state)).toBe(false);
  });
});

describe('decision-alignment/review-ready trust', () => {
  it('starts from current info without claiming sufficiency (Zero Lie)', () => {
    const trust = buildReviewReadyTrust();
    expect(trust).not.toMatch(/충분/);
    expect(trust).toMatch(/검토를 시작/);
    expect(trust).toMatch(/추측하지 않/);
  });
});

describe('decision-alignment/no-pressure paths', () => {
  it('allows review when founder is still thinking', () => {
    const state = { direction: 'thinking' as const, primaryLabel: null };
    expect(isMarketAlignmentValid(state)).toBe(true);
    expect(buildViabilityIntro(state)).toMatch(/함께 방향/);
  });

  it('allows review when founder wants to decide after review', () => {
    const state = { direction: 'decide_after_review' as const, primaryLabel: null };
    expect(isMarketAlignmentValid(state)).toBe(true);
    expect(buildViabilityIntro(state)).toMatch(/함께 결정/);
  });

  it('captures optional direction without forcing others', () => {
    const u = buildBusinessUnderstanding(TASTE_COMPANY_FULL_SAMPLE);
    const candidates = buildMarketCandidates(u);
    const state = { direction: 'has_direction' as const, primaryLabel: '전국 양조장' };
    expect(isMarketAlignmentValid(state)).toBe(true);
    const { domain } = applyMarketAlignmentToWorkspace(state, candidates, emptyWorkspaceDomain(), null);
    expect(domain.customer).toBe('전국 양조장');
  });
});
