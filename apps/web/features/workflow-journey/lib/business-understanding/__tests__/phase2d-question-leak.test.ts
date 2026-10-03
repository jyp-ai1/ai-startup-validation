/**
 * Phase 2-D D2 — user-facing questions never quote raw document lines, field labels,
 * placeholders, or parser text.
 */
import { describe, expect, it } from 'vitest';

import { replayCalibrationTurn } from '@/lib/ai-pm-validation-engine/calibration-turn-replay';

import { SHARED_UNDERSTANDING_UNREADABLE_BUSINESS } from '../build-shared-understanding';
import { reframeQuestion } from '../reframe-question';
import { isInternalClaimText, toUserFacingClaimSnippet } from '../user-facing-claim';

const LEAK_RE = /아직 문서에서 사업 내용을 충분히|「[^」]*(타겟:|문제:|구매:|사용:)|businessOneLiner|fieldKey/;

function livingWithClaim(fieldKey: string, value: string) {
  return {
    claims: [{ fieldKey, value, status: 'stated' as const }],
    judgmentSummary: value,
  } as Parameters<typeof reframeQuestion>[0]['living'];
}

describe('Phase 2-D D2 — claim sanitizer', () => {
  it('drops the unreadable-document placeholder', () => {
    expect(isInternalClaimText(SHARED_UNDERSTANDING_UNREADABLE_BUSINESS)).toBe(true);
    expect(toUserFacingClaimSnippet(SHARED_UNDERSTANDING_UNREADABLE_BUSINESS)).toBeNull();
  });

  it('drops raw field-label document lines', () => {
    expect(toUserFacingClaimSnippet('B2C SaaS — 개인 생산성 앱. 타겟: 직장인. 문제: 할 일 분산.')).toBeNull();
  });

  it('keeps a founder-spoken one-liner', () => {
    expect(toUserFacingClaimSnippet('개인 일정·할 일 통합 앱')).toBe('개인 일정·할 일 통합 앱');
  });
});

describe('Phase 2-D D2 — reframe uses the stock question when the claim is internal', () => {
  it('does not quote the placeholder', () => {
    const q = reframeQuestion({
      targetGap: 'alternativesCompetitors',
      living: livingWithClaim('businessOneLiner', SHARED_UNDERSTANDING_UNREADABLE_BUSINESS),
      reason: 'adaptive',
    });
    expect(q.questionText).not.toMatch(/아직 문서에서 사업 내용을 충분히/);
    expect(q.questionText).toMatch(/대안|경쟁|해결/);
  });

  it('does not quote field labels', () => {
    const q = reframeQuestion({
      targetGap: 'customerPersona',
      living: livingWithClaim('problemJtbd', '타겟: 직장인. 문제: 할 일 분산.'),
      reason: 'adaptive',
    });
    expect(q.questionText).not.toMatch(/타겟:|문제:/);
  });
});

describe('Phase 2-D D2 — calibration pins', () => {
  it('does not quote raw document field labels (readable document)', () => {
    const r = replayCalibrationTurn({ businessId: 'sb-b2c-saas', behavior: 'uncertainty', turn: 2 })!;
    expect(r.actualNextQuestion).not.toMatch(LEAK_RE);
  });

  it('does not quote the unreadable-document placeholder in the next question', () => {
    const r = replayCalibrationTurn({ businessId: 'sb-marketplace', behavior: 'multi_fact', turn: 1 })!;
    expect(r.actualNextQuestion).not.toMatch(/아직 문서에서 사업 내용을 충분히 이해하지 못했습니다/);
  });
});
