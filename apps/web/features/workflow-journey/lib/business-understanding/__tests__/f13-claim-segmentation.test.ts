import { describe, expect, it } from 'vitest';

import type { AnswerBehaviorId } from '@/lib/ai-pm-validation-engine/contracts';
import { replayCalibrationTurn } from '@/lib/ai-pm-validation-engine/calibration-turn-replay';
import { generateUserAnswer } from '@/lib/ai-pm-validation-engine/deterministic-user-agent';
import { MINI_SANDBOX_BUSINESSES } from '@/lib/ai-pm-validation-engine/mini-sandbox-businesses';

import { segmentAnswerClaims, segmentMultiClaimAnswer } from '../answer-claim-segmentation';
import { buildAnswerReview } from '../build-answer-review';

const MATRIX_MULTI_FACT = '대표가 구매하고 직원이 매일 사용하며 지금은 엑셀로 관리합니다.';
const SANDBOX_MULTI_FACT = '경영진/팀 리더가 구매하고 팀이 매일 사용하며, 지금은 엑셀로 업무 협업 비효율을 관리합니다.';

const SINGLE_FACT_BEHAVIORS: AnswerBehaviorId[] = [
  'normal',
  'sparse',
  'off_slot',
  'contradiction',
  'correction',
  'uncertainty',
  'longitudinal_f11',
  'longitudinal_f04_pricing',
];

describe('F13 — clause/claim segmentation', () => {
  it('splits a matrix multi-fact answer into buyer, user and workaround claims', () => {
    const claims = segmentAnswerClaims(MATRIX_MULTI_FACT);
    expect(claims.map((c) => [c.role, c.key, c.value, c.evidenceClass])).toEqual([
      ['buyer', 'buyer', '대표', 'FACT'],
      ['user', null, '직원', 'FACT'],
      ['workaround', 'competitor', '엑셀', 'FACT'],
    ]);
    expect(claims.find((c) => c.role === 'user')?.usageFrequency).toBe('매일');
  });

  it('derives the managed problem from a workaround clause as INFERENCE', () => {
    const claims = segmentMultiClaimAnswer(SANDBOX_MULTI_FACT);
    expect(claims.map((c) => [c.key, c.value, c.evidenceClass])).toEqual([
      ['buyer', '경영진/팀 리더', 'FACT'],
      ['competitor', '엑셀', 'FACT'],
      ['problem', '업무 협업 비효율', 'INFERENCE'],
    ]);
  });

  it('marks hedged claims as ASSUMPTION', () => {
    const claims = segmentMultiClaimAnswer('아마 대표가 구매할 것 같고, 지금은 아마 엑셀로 재고를 관리하는 것 같습니다.');
    expect(claims.every((c) => c.evidenceClass === 'ASSUMPTION')).toBe(true);
    expect(claims.map((c) => c.key)).toEqual(['buyer', 'competitor', 'problem']);
  });

  it('does not segment a single-claim answer', () => {
    for (const answer of [
      '대표가 결제합니다.',
      '고객은 직장인입니다.',
      '핵심 고객은 직장인이고, 가장 큰 문제는 할 일 분산입니다.',
      '경쟁 제품은 주로 엑셀과 수기 프로세스입니다.',
      '중소기업 고객이 월 10만원을 낼 것 같습니다. 아직 검증하지 않았습니다.',
      '정정합니다. 고객은 직장인이 아니라 중소 제조 CEO입니다.',
    ]) {
      expect(segmentMultiClaimAnswer(answer), answer).toEqual([]);
    }
  });

  it('leaves every non-multi-fact user agent answer on the existing path', () => {
    for (const business of MINI_SANDBOX_BUSINESSES) {
      for (const behavior of SINGLE_FACT_BEHAVIORS) {
        for (let turn = 1; turn <= 7; turn += 1) {
          const answer = generateUserAnswer({ business, behavior, turn, askedGapId: 'customerPersona' });
          expect(segmentMultiClaimAnswer(answer), `${business.id}/${behavior}/t${turn}`).toEqual([]);
        }
      }
    }
  });
});

describe('F13 — answer review is built claim by claim', () => {
  const result = buildAnswerReview({
    turnId: 't-f13',
    askedGapId: 'customerPersona',
    askedIssueId: 'customer_definition',
    userAnswer: SANDBOX_MULTI_FACT,
    displayedQuestionText: '이 서비스를 가장 필요로 하는 구체 고객은 누구인가요?',
    askedQuestionText: '이 서비스를 가장 필요로 하는 구체 고객은 누구인가요?',
  }).review;

  it('extracts one fact per claim with the claim value, not the whole sentence', () => {
    expect(result.extractedFacts.map((f) => [f.key, f.value, f.evidenceClass, f.targetGap])).toEqual([
      ['buyer', '경영진/팀 리더', 'FACT', 'payer'],
      ['competitor', '엑셀', 'FACT', 'alternativesCompetitors'],
      ['problem', '업무 협업 비효율', 'INFERENCE', 'problemJtbd'],
    ]);
  });

  it('updates each claim slot and keeps the unanswered asked gap open', () => {
    expect(result.gapVerdicts.customerPersona?.completeness).toBe('OPEN');
    expect(result.gapVerdicts.payer?.completeness).toBe('CLOSED');
    expect(result.gapVerdicts.alternativesCompetitors?.completeness).toBe('CLOSED');
    expect(result.gapVerdicts.problemJtbd?.completeness).toBe('PARTIAL');
    expect(result.gapVerdicts.revenueModel).toBeUndefined();
  });
});

describe('F13 — sandbox multi-fact replay', () => {
  it('keeps at least two facts per multi-fact turn', () => {
    for (const business of MINI_SANDBOX_BUSINESSES) {
      for (let turn = 1; turn <= 5; turn += 1) {
        const r = replayCalibrationTurn({ businessId: business.id, behavior: 'multi_fact', turn })!;
        // V3-06: technology cues on a persona ask are off-topic and clear all facts first.
        if (business.id === 'sb-platform' && r.askedGapId === 'customerPersona') continue;
        expect(r.actualFacts.length, `${business.id} t${turn}`).toBeGreaterThanOrEqual(2);
        expect(r.actualFacts.every((f) => f.value !== r.userInput)).toBe(true);
      }
    }
  });
});
