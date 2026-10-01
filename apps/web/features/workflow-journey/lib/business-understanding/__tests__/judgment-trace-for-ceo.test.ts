import { describe, expect, it } from 'vitest';

import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import {
  assertCeoJudgmentTraceSafe,
  buildCeoJudgmentTraceBundle,
} from '../judgment-trace-for-ceo';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';

describe('Track D — judgment trace for CEO', () => {
  it('builds living summary without internal gap keys', () => {
    const documentText = `사업명: 테스트
고객: F&B 사장
문제: 홍보 시간 부족`;
    const understanding = buildBusinessUnderstanding(documentText)!;
    const living = buildLivingUnderstandingState({
      documentText,
      understanding,
      entities: null,
    });
    const bundle = buildCeoJudgmentTraceBundle({ living });
    expect(bundle.livingSummary).toBeTruthy();
    expect(assertCeoJudgmentTraceSafe(bundle)).toBe(true);
    expect(bundle.livingSummary).not.toMatch(/businessOneLiner/);
  });

  it('includes dimension lines when judgment state has summaries', () => {
    const judgment = emptyCeoJudgmentState(2);
    judgment.dimensions.customer.summary = '고객은 소규모 F&B로 이해했습니다.';
    judgment.dimensions.customer.status = 'needs_check';
    const bundle = buildCeoJudgmentTraceBundle({ judgment });
    expect(bundle.dimensionLines.length).toBeGreaterThan(0);
    expect(bundle.knownUnknownHint).toMatch(/확인/);
  });
});
