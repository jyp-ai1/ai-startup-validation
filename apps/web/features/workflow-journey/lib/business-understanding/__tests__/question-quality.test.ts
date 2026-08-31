import { describe, expect, it } from 'vitest';

import {
  GENERIC_GAP_QUESTION_TEXT,
  resolveGapQuestionBinding,
} from '../gap-question-map';
import { resolveDisplayQuestionWithLock } from '../question-transition-lock';
import {
  gateUserFacingQuestion,
  hasQuestionMetaLanguage,
  isNaturalUserFacingQuestion,
} from '../question-quality-gate';
import { reframeQuestion } from '../reframe-question';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';

const VALIDATION_Q = resolveGapQuestionBinding('validationTestability').questionText;
const CUSTOMER_Q = resolveGapQuestionBinding('customerPersona').questionText;

const META_REASK =
  '현재 이해(외국인 관광객을 대상으로 서울에서 기존 관광상품 · 방한 외국인)를 기준으로 다시 묻습니다 — 그 차별점이 고객에게 왜 중요한가요?';

describe('TTAEJYO P0 — user-facing question quality gate', () => {
  it('case 1 — valid stock gap question passes unchanged', () => {
    expect(isNaturalUserFacingQuestion(CUSTOMER_Q)).toBe(true);
    expect(gateUserFacingQuestion({ candidate: CUSTOMER_Q, targetGap: 'customerPersona' })).toBe(
      CUSTOMER_Q,
    );
  });

  it('case 2 — meta prefix "현재 이해(" → canonical by targetGap', () => {
    expect(hasQuestionMetaLanguage(META_REASK)).toBe(true);
    const gated = gateUserFacingQuestion({
      candidate: META_REASK,
      targetGap: 'validationTestability',
    });
    expect(gated).toBe(VALIDATION_Q);
    expect(hasQuestionMetaLanguage(gated)).toBe(false);
  });

  it('case 3 — "다시 묻습니다" in resolveDisplayQuestionWithLock → canonical', () => {
    const display = resolveDisplayQuestionWithLock({
      lock: null,
      lockActive: false,
      fromEngine: META_REASK,
      fromSurface: META_REASK,
      fromRef: '',
      issueFallback: '',
      targetGap: 'validationTestability',
      fallbackIssueId: 'competitor_analysis',
    });
    expect(display).toBe(VALIDATION_Q);
    expect(hasQuestionMetaLanguage(display)).toBe(false);
  });

  it('case 4 — generic "핵심 공백" stub → canonical gap question', () => {
    expect(isNaturalUserFacingQuestion(GENERIC_GAP_QUESTION_TEXT)).toBe(false);
    const display = resolveDisplayQuestionWithLock({
      lock: null,
      lockActive: false,
      fromEngine: GENERIC_GAP_QUESTION_TEXT,
      fromSurface: GENERIC_GAP_QUESTION_TEXT,
      fromRef: '',
      issueFallback: '',
      targetGap: 'customerPersona',
      fallbackIssueId: 'customer_definition',
    });
    expect(display).toBe(CUSTOMER_Q);
  });

  it('case 5 — IRRELEVANT feedback "이 답변으로는 확인" → canonical', () => {
    const irrelevant = '이 답변으로는 확인할 수 없습니다. 질문과 관련된 내용을 적어 주세요.';
    expect(hasQuestionMetaLanguage(irrelevant)).toBe(true);
    const gated = gateUserFacingQuestion({
      candidate: irrelevant,
      targetGap: 'payer',
      fallbackIssueId: 'bm_design',
    });
    expect(gated).toBe(resolveGapQuestionBinding('payer').questionText);
  });

  it('case 6 — contextual reframe stem without meta passes unchanged', () => {
    const doc =
      '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';
    const understanding = buildBusinessUnderstanding(doc);
    const living = buildLivingUnderstandingState({
      documentText: doc,
      understanding,
      turns: [],
      memory: null,
    });
    living.claims.push({
      fieldKey: 'differentiationVsAlternatives',
      value: '관심사·동선·식사 제약까지 반영한 실시간 맞춤 일정',
      status: 'USER_CONFIRMED',
      provenance: 'USER_CONFIRMED',
      confidence: 'high',
      evidence: [],
    });
    living.claims.push({
      fieldKey: 'customerPersona',
      value: '방한 외국인',
      status: 'USER_CONFIRMED',
      provenance: 'USER_CONFIRMED',
      confidence: 'high',
      evidence: [],
    });

    const reframed = reframeQuestion({
      targetGap: 'validationTestability',
      living,
      reason: 'adaptive',
      previousQuestionText: VALIDATION_Q,
    });

    expect(hasQuestionMetaLanguage(reframed.questionText)).toBe(false);
    const display = resolveDisplayQuestionWithLock({
      lock: null,
      lockActive: false,
      fromEngine: reframed.questionText,
      fromSurface: '',
      fromRef: '',
      issueFallback: '',
      targetGap: 'validationTestability',
      fallbackIssueId: 'competitor_analysis',
    });
    expect(display).toBe(reframed.questionText);
    expect(hasQuestionMetaLanguage(display)).toBe(false);
    expect(display.length).toBeGreaterThan(10);
  });
});
