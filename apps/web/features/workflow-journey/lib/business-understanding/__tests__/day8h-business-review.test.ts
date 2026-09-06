/**
 * DAY 8-H — Business review loop unit tests (H-R1 ~ H-R10).
 */
import { describe, expect, it } from 'vitest';

import {
  buildBusinessReviewResult,
  computeBusinessReviewReadiness,
  computeBusinessReviewVerdict,
} from '../ai-pm-business-review';
import type { CeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import {
  buildAiPmSupplementSnapshot,
  pickSupplementDimension,
} from '../ai-pm-supplement-presenter';

function withDims(
  partial: Partial<
    Record<
      keyof CeoJudgmentState['dimensions'],
      { status: 'clear' | 'needs_check' | 'unknown'; summary: string }
    >
  >,
): CeoJudgmentState {
  const base = emptyCeoJudgmentState(3);
  for (const [id, val] of Object.entries(partial)) {
    const key = id as keyof CeoJudgmentState['dimensions'];
    base.dimensions[key] = {
      ...base.dimensions[key],
      status: val!.status,
      summary: val!.summary,
    };
  }
  base.oneLiner = '테스트 사업 한 줄';
  return base;
}

describe('DAY 8-H business review', () => {
  it('H-R1 — review result has required sections', () => {
    const state = withDims({
      customer: { status: 'clear', summary: '직접 배송 소상공인' },
      problem: { status: 'clear', summary: '주문과 배송 분리 관리 불편' },
      solution: { status: 'needs_check', summary: '한 곳에서 관리' },
      customerChange: { status: 'clear', summary: '배송 누락 감소' },
    });
    const review = buildBusinessReviewResult(state);
    expect(review.oneLiner).toBeTruthy();
    expect(review.dimensions.customer.summary).toContain('소상공인');
    expect(review.aiJudgmentHeadline).toMatch(/추가 확인|검토 진행/);
    expect(review.primaryGapSummary).toBeTruthy();
  });

  it('H-R2 — one-page review structure', () => {
    const review = buildBusinessReviewResult(
      withDims({
        customer: { status: 'clear', summary: '반찬가게' },
        problem: { status: 'clear', summary: '주문 배송 분리' },
        solution: { status: 'unknown', summary: '' },
        customerChange: { status: 'needs_check', summary: '시간 절약' },
      }),
    );
    expect(review.dimensions.problem.summary).toBeTruthy();
    expect(review.aiJudgmentBody.length).toBeGreaterThan(10);
    expect(review.nextAction.length).toBeGreaterThan(5);
  });

  it('H-R3 — weak solution triggers supplement recommendation', () => {
    const state = withDims({
      customer: { status: 'clear', summary: '직접 배송 소상공인' },
      problem: { status: 'clear', summary: '주문과 배송 분리 불편' },
      solution: { status: 'needs_check', summary: '한 곳에서 통합 관리' },
      customerChange: { status: 'clear', summary: '배송 누락 감소' },
    });
    expect(computeBusinessReviewReadiness(state)).toBe('supplement_recommended');
    const review = buildBusinessReviewResult(state);
    expect(review.primaryGapId).toBe('solution');
    expect(review.primaryGapWhy).toMatch(/해결/);
  });

  it('H-R4 — supplement targets weakest dimension not customer when clear', () => {
    const state = withDims({
      customer: { status: 'clear', summary: '소상공인' },
      problem: { status: 'clear', summary: '불편' },
      solution: { status: 'needs_check', summary: '연결' },
      customerChange: { status: 'clear', summary: '누락 감소' },
    });
    expect(pickSupplementDimension(state)).toBe('solution');
  });

  it('H-R5 — supplement snapshot includes answer guide', () => {
    const state = withDims({
      customer: { status: 'clear', summary: '소상공인' },
      problem: { status: 'clear', summary: '불편' },
      solution: { status: 'needs_check', summary: '연결' },
      customerChange: { status: 'clear', summary: '누락 감소' },
    });
    const snap = buildAiPmSupplementSnapshot(state, 'solution');
    expect(snap.questionText).toMatch(/엑셀|주문·배송/);
    expect(snap.answerGuideText).toMatch(/💡/);
    expect(snap.answerGuideText).not.toMatch(/value proposition|JTBD/i);
  });

  it('H-R6 — readiness maps to verdict', () => {
    const strong = withDims({
      customer: { status: 'clear', summary: '소상공인 CEO' },
      problem: { status: 'clear', summary: '주문 배송 분리' },
      solution: { status: 'clear', summary: '통합 관리 플랫폼' },
      customerChange: { status: 'clear', summary: '관리 시간 단축' },
    });
    expect(computeBusinessReviewVerdict(computeBusinessReviewReadiness(strong))).toBe('go');

    const weak = withDims({
      customer: { status: 'unknown', summary: '' },
      problem: { status: 'unknown', summary: '' },
      solution: { status: 'unknown', summary: '' },
      customerChange: { status: 'unknown', summary: '' },
    });
    expect(computeBusinessReviewVerdict(computeBusinessReviewReadiness(weak))).toBe('no_go');
  });

  it('H-R7 — continue with current info yields verdict labels', () => {
    const review = buildBusinessReviewResult(
      withDims({
        customer: { status: 'clear', summary: '소상공인' },
        problem: { status: 'clear', summary: '불편' },
        solution: { status: 'needs_check', summary: '연결' },
        customerChange: { status: 'clear', summary: '시간' },
      }),
    );
    expect(review.verdictLabel).toMatch(/GO/);
    expect(review.verdictExplanation.length).toBeGreaterThan(10);
  });

  it('H-R8 — GO / conditional / NO-GO labels', () => {
    const go = buildBusinessReviewResult(
      withDims({
        customer: { status: 'clear', summary: '직접 배송 소상공인' },
        problem: { status: 'clear', summary: '주문 배송 분리 불편' },
        solution: { status: 'clear', summary: '통합 관리 플랫폼 제공' },
        customerChange: { status: 'clear', summary: '관리 시간 단축' },
      }),
    );
    expect(go.verdict).toBe('go');

    const cond = buildBusinessReviewResult(
      withDims({
        customer: { status: 'clear', summary: '직접 배송 소상공인' },
        problem: { status: 'clear', summary: '주문 배송 분리' },
        solution: { status: 'needs_check', summary: '통합 관리' },
        customerChange: { status: 'clear', summary: '시간 절약' },
      }),
    );
    expect(cond.verdict).toBe('conditional_go');

    const no = buildBusinessReviewResult(
      withDims({
        customer: { status: 'unknown', summary: '' },
        problem: { status: 'unknown', summary: '' },
        solution: { status: 'unknown', summary: '' },
        customerChange: { status: 'unknown', summary: '' },
      }),
    );
    expect(no.verdict).toBe('no_go');
  });

  it('H-R9 — next action present', () => {
    const review = buildBusinessReviewResult(
      withDims({
        customer: { status: 'clear', summary: '소상공인' },
        problem: { status: 'clear', summary: '불편' },
        solution: { status: 'needs_check', summary: '연결' },
        customerChange: { status: 'clear', summary: '시간' },
      }),
    );
    expect(review.nextAction).toMatch(/보완|검토|확인/);
  });

  it('H-R10 — no unsupported market facts in review copy', () => {
    const review = buildBusinessReviewResult(
      withDims({
        customer: { status: 'clear', summary: '반찬가게' },
        problem: { status: 'clear', summary: '주문 배송 분리' },
        solution: { status: 'needs_check', summary: '통합 관리' },
        customerChange: { status: 'clear', summary: '누락 감소' },
      }),
    );
    const blob = JSON.stringify(review);
    expect(blob).not.toMatch(/30%|시장 규모|TAM|SAM|memory_document|factKey/i);
  });
});
