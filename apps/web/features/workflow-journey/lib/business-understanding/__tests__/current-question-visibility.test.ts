import { describe, expect, it } from 'vitest';

import {
  GENERIC_GAP_QUESTION_TEXT,
  isGenericGapQuestionText,
  resolveGapQuestionBinding,
} from '../gap-question-map';
import { resolveDisplayQuestionWithLock } from '../question-transition-lock';
import { reframeQuestion } from '../reframe-question';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';

const CUSTOMER_Q = resolveGapQuestionBinding('customerPersona').questionText;

describe('P0 — current question visibility', () => {
  it('case 1 — normal next question: gap binding beats generic engine text', () => {
    const display = resolveDisplayQuestionWithLock({
      lock: null,
      lockActive: false,
      fromEngine: GENERIC_GAP_QUESTION_TEXT,
      fromSurface: '',
      fromRef: '',
      issueFallback: '',
      targetGap: 'customerPersona',
      fallbackIssueId: 'customer_definition',
    });

    expect(display).toBe(CUSTOMER_Q);
    expect(isGenericGapQuestionText(display)).toBe(false);
  });

  it('case 2 — irrelevant answer: reframe override beats generic engine text', () => {
    const doc =
      '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';
    const understanding = buildBusinessUnderstanding(doc);
    const living = buildLivingUnderstandingState({
      documentText: doc,
      understanding,
      turns: [],
      memory: null,
    });
    const reframed = reframeQuestion({
      targetGap: 'customerPersona',
      living,
      reason: 'unknown_signal',
      previousQuestionText: CUSTOMER_Q,
    });

    const display = resolveDisplayQuestionWithLock({
      lock: null,
      lockActive: false,
      fromOverride: reframed.questionText,
      fromEngine: GENERIC_GAP_QUESTION_TEXT,
      fromSurface: GENERIC_GAP_QUESTION_TEXT,
      fromRef: '',
      issueFallback: '',
      targetGap: 'customerPersona',
      fallbackIssueId: 'customer_definition',
    });

    expect(display).toBe(reframed.questionText);
    expect(display).not.toBe(GENERIC_GAP_QUESTION_TEXT);
  });

  it('case 3 — prior edit remount: targetGap resolves stock question when engine is empty', () => {
    const display = resolveDisplayQuestionWithLock({
      lock: null,
      lockActive: false,
      fromEngine: '',
      fromSurface: '',
      fromRef: '',
      issueFallback: '',
      targetGap: 'customerPersona',
      fallbackIssueId: 'customer_definition',
    });

    expect(display).toBe(CUSTOMER_Q);
    expect(display.length).toBeGreaterThan(10);
  });

  it('isGenericGapQuestionText identifies the fallback stub only', () => {
    expect(isGenericGapQuestionText(GENERIC_GAP_QUESTION_TEXT)).toBe(true);
    expect(isGenericGapQuestionText(CUSTOMER_Q)).toBe(false);
    expect(isGenericGapQuestionText('')).toBe(false);
  });
});
