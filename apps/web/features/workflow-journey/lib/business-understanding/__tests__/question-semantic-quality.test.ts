import { describe, expect, it } from 'vitest';

import { resolveGapQuestionBinding } from '../gap-question-map';
import { resolveDisplayQuestionWithLock } from '../question-transition-lock';
import {
  gateUserFacingQuestion,
  hasQuestionMetaLanguage,
  isCompoundAsk,
  isNaturalUserFacingQuestion,
  lacksClearAnswerTarget,
} from '../question-quality-gate';
import { reframeQuestion } from '../reframe-question';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';

const PAYER_Q = resolveGapQuestionBinding('payer').questionText;
const CUSTOMER_Q = resolveGapQuestionBinding('customerPersona').questionText;
const DIFF_Q = resolveGapQuestionBinding('differentiationVsAlternatives').questionText;
const VALIDATION_Q = resolveGapQuestionBinding('validationTestability').questionText;

const P0_BAD_CANDIDATE =
  '현재 이해(우리의 타켓이 온라인 커머스 전문도 아니고, 배송만 전문으로 하는… · 데이터를 접수 및 시스템 관리를 하고, 고객관리, … · 엑셀로 주로 주문관리 통합해서 관리해서 별도 시스템…)를 기준으로 다시 묻습니다 — 아직 확인이 필요한 핵심 공백이 있습니다. 알려 주세요.';

describe('TTAEJYO P0 — question semantic quality gate', () => {
  it('case 1 — 현재 이해(...) leaked digest → FAIL → canonical by targetGap', () => {
    expect(hasQuestionMetaLanguage(P0_BAD_CANDIDATE)).toBe(true);
    expect(isNaturalUserFacingQuestion(P0_BAD_CANDIDATE)).toBe(false);

    expect(gateUserFacingQuestion({ candidate: P0_BAD_CANDIDATE, targetGap: 'payer' })).toBe(
      PAYER_Q,
    );
    expect(
      gateUserFacingQuestion({ candidate: P0_BAD_CANDIDATE, targetGap: 'customerPersona' }),
    ).toBe(CUSTOMER_Q);
    expect(
      gateUserFacingQuestion({
        candidate: P0_BAD_CANDIDATE,
        targetGap: 'differentiationVsAlternatives',
      }),
    ).toBe(DIFF_Q);
  });

  it('case 2 — 핵심 공백 stub without answer target → FAIL', () => {
    const stub = '아직 확인이 필요한 핵심 공백이 있습니다. 알려 주세요.';
    expect(isNaturalUserFacingQuestion(stub)).toBe(false);
    expect(lacksClearAnswerTarget(stub)).toBe(true);
    expect(gateUserFacingQuestion({ candidate: stub, targetGap: 'payer' })).toBe(PAYER_Q);
  });

  it('case 3 — 다시 묻습니다 meta prefix → FAIL', () => {
    const reask = '다시 묻습니다 — 서비스 비용은 누가 지불하나요?';
    expect(hasQuestionMetaLanguage(reask)).toBe(true);
    expect(gateUserFacingQuestion({ candidate: reask, targetGap: 'payer' })).toBe(PAYER_Q);
  });

  it('case 4 — bare "알려 주세요" only → FAIL', () => {
    expect(isNaturalUserFacingQuestion('알려 주세요.')).toBe(false);
    expect(lacksClearAnswerTarget('알려 주세요.')).toBe(true);
    expect(gateUserFacingQuestion({ candidate: '알려 주세요.', targetGap: 'payer' })).toBe(
      PAYER_Q,
    );
  });

  it('case 5 — answer target 없는 instruction sentence → FAIL', () => {
    const vague = '현재 상황을 기준으로 다시 말씀해 주세요.';
    expect(isNaturalUserFacingQuestion(vague)).toBe(false);
    expect(gateUserFacingQuestion({ candidate: vague, targetGap: 'customerPersona' })).toBe(
      CUSTOMER_Q,
    );
  });

  it('case 6 — compound ask (multiple gap demands) → FAIL', () => {
    const compound =
      '주요 고객은 누구이고, 왜 이 서비스를 이용하며, 얼마를 지불하고, 경쟁사와 어떤 차이가 있나요?';
    expect(isCompoundAsk(compound)).toBe(true);
    expect(isNaturalUserFacingQuestion(compound)).toBe(false);
    expect(gateUserFacingQuestion({ candidate: compound, targetGap: 'payer' })).toBe(PAYER_Q);
  });

  it('case 7 — internal reasoning / 판단 결과 leakage → FAIL', () => {
    const reasoning = '분석 결과를 기준으로 — 검토 결과상 핵심 공백을 확인해 주세요.';
    expect(hasQuestionMetaLanguage(reasoning)).toBe(true);
    expect(gateUserFacingQuestion({ candidate: reasoning, targetGap: 'payer' })).toBe(PAYER_Q);
  });

  it('case 8 — valid single ask with 알려 주세요 subject → PASS', () => {
    const valid = '주요 고객층이 누구인지 알려 주세요.';
    expect(isNaturalUserFacingQuestion(valid)).toBe(true);
    expect(gateUserFacingQuestion({ candidate: valid, targetGap: 'customerPersona' })).toBe(valid);
  });

  it('case 9 — contextual reframe stem without meta → PASS', () => {
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
    expect(isNaturalUserFacingQuestion(reframed.questionText)).toBe(true);
  });

  it('case 10 — canonical gap fallback for invalid candidate', () => {
    const gated = gateUserFacingQuestion({
      candidate: P0_BAD_CANDIDATE,
      targetGap: 'validationTestability',
      fallbackIssueId: 'competitor_analysis',
    });
    expect(gated).toBe(VALIDATION_Q);
    expect(gated).not.toContain('현재 이해');
    expect(gated).not.toContain('핵심 공백');
  });

  it('integration — render path BAD candidate → canonical, no 현재 이해 on display', () => {
    const badCandidate = P0_BAD_CANDIDATE;
    expect(badCandidate).toContain('현재 이해');

    const display = resolveDisplayQuestionWithLock({
      lock: null,
      lockActive: false,
      fromEngine: badCandidate,
      fromSurface: badCandidate,
      fromRef: badCandidate,
      issueFallback: '',
      targetGap: 'payer',
      fallbackIssueId: 'bm_design',
    });

    expect(display).toBe(PAYER_Q);
    expect(display).not.toContain('현재 이해');
    expect(display).not.toContain('다시 묻습니다');
    expect(display).not.toContain('핵심 공백');
    expect(hasQuestionMetaLanguage(display)).toBe(false);
  });
});
