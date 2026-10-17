import { describe, expect, it } from 'vitest';

import { startJourney } from '../journey-engine';
import { JUDGMENT_TEXT, type Intake } from '../journey-types';
import { compareWebReviews, readWebReview, storeWebReview, WEB_REVIEW_PROMPT } from '../web-review-comparison';

const NOW = '2026-10-17T06:00:00.000Z';
const LATER = '2026-10-17T06:10:00.000Z';

const INTAKE: Intake = {
  business: '모회사 채널과 한정판 판매',
  customer: '한정판 수집가',
  problem: '매출 구성이 문서 주장과 원장으로 나뉘지 않았다',
  solution: '',
  payer: '',
  revenue: '',
  evidence: '',
  url: '',
};

const GPT = [
  'S1 매출 2,000만 원은 문서의 주장이다.',
  'S3 예상 연매출 10억은 받은 돈이 아니다.',
  'A2 모회사 지원이 필수이고 현재 매출 구조를 유지할 수 없다.',
].join('\n');

const GEMINI_AGREE = [
  '매출 2,000만 원은 원장으로 확인하지 않은 주장이다.',
  '예상 연매출 10억은 계획이다.',
  '모회사 지원이 필수라 유지할 수 없다.',
].join('\n');

const GEMINI_CONFLICT = [
  '매출 2,000만 원은 문서의 주장이다.',
  '확정 매출 10억이 입금되었다.',
  '모회사 지원 없이도 매출을 유지할 수 있다.',
].join('\n');

function started() {
  const result = startJourney(INTAKE, 'test_hypothesis');
  if (!result.ok) throw new Error('start failed');
  return result.state;
}

describe('web review comparison', () => {
  it('keeps the shared business input and does not invent a web original', () => {
    expect(WEB_REVIEW_PROMPT).toContain('예상 연매출 10억');
    expect(WEB_REVIEW_PROMPT).toContain('모회사 지원이 필수다');
    expect(WEB_REVIEW_PROMPT).not.toContain('chatgpt.com');
  });

  it('asks for the missing original and leaves verifiedFact false', () => {
    const onlyGpt = compareWebReviews(GPT, null);
    expect(onlyGpt.verifiedFact).toBe(false);
    expect(onlyGpt.factStatus).toBe('미확인');
    expect(onlyGpt.liveModelCall).toBe(false);
    expect(onlyGpt.nextExperiment.material).toContain('Gemini');
    expect(onlyGpt.agreement).toEqual([]);
    expect(onlyGpt.conflict).toEqual([]);
    expect(onlyGpt.insufficient.join(' ')).toContain('Gemini 웹 원문');
    expect(onlyGpt.nextAction).toContain('Gemini');
  });

  it('splits agreement from missing evidence without promoting either side', () => {
    const compared = compareWebReviews(GPT, GEMINI_AGREE);
    expect(compared.verifiedFact).toBe(false);
    expect(compared.agreement.some((item) => item.includes('S1'))).toBe(true);
    expect(compared.agreement.some((item) => item.includes('S3'))).toBe(true);
    expect(compared.agreement.some((item) => item.includes('A2'))).toBe(true);
    expect(compared.agreement.join(' ')).toContain('검증된 사실이 아니다');
    expect(compared.insufficient.join(' ')).toContain('원장');
    expect(compared.conflict).toEqual([]);
    expect(compared.factStatus).toBe('미확인');
    expect(compared.nextExperiment.hypothesis).toContain('S2');
    expect(compared.nextExperiment.cost).toBe('미확인');
    expect(compared.nextAction).toContain('주문 원장');
    expect(compared.nextAction).toContain('S2');
  });

  it('keeps a forecast-versus-actual clash and an A2 reversal as conflict', () => {
    const compared = compareWebReviews(GPT, GEMINI_CONFLICT);
    expect(compared.verifiedFact).toBe(false);
    expect(compared.factStatus).toBe('미확인');
    expect(compared.factStatus).not.toBe('검증 완료');
    expect(compared.conflict.some((item) => item.includes('S3'))).toBe(true);
    expect(compared.conflict.some((item) => item.includes('A2'))).toBe(true);
    expect(compared.nextExperiment.hypothesis).toContain('S3 예상 연매출 10억');
    expect(compared.nextExperiment.hypothesis).toContain('A2');
    expect(compared.nextAction).toContain('모델 문장으로 고르지 않는다');
    expect(compared.nextAction).toContain('S3 예상 연매출 10억');
  });

  it('does not prescribe a revenue ledger when the only open issue is the conversion rate', () => {
    const shared = [
      'S1 매출 2,000만 원은 문서의 주장이다.',
      'S3 예상 연매출 10억은 받은 돈이 아니다.',
      'S4 예상 연매출 1억은 계획이다.',
      'S5 예상 매출 4억은 계획이다.',
      'S6 회원수 2,000만 명은 계획이다.',
      'A1 가장 큰 비중은 계열사 판매다.',
      'A2 모회사 지원이 필수이고 유지할 수 없다.',
    ];
    const gpt = ['구매전환율 3.8%는 문서의 주장이다.', ...shared].join('\n');
    const gemini = ['전환율은 없다.', ...shared].join('\n');
    const compared = compareWebReviews(gpt, gemini);
    expect(compared.conflict.join(' ')).toContain('S2');
    expect(compared.conflict.join(' ')).not.toContain('S3');
    expect(compared.nextExperiment.method).toContain('S2');
    expect(compared.nextExperiment.method).not.toContain('주문 원장');
    expect(compared.nextExperiment.material).not.toContain('주문 원장');
    expect(compared.nextExperiment.cost).toBe('미확인');
    expect(compared.factStatus).toBe('미확인');
  });

  it('stores each slot independently and does not change the judgment', () => {
    const initial = started();
    const gpt = storeWebReview(initial, { slot: 'gpt', text: GPT, now: NOW, provenance: 'test_fixture' });
    expect(gpt.accepted).toBe(true);
    expect(gpt.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(gpt.state.externalNotes?.[0]).toMatchObject({
      executionId: 'web-review-gpt',
      providerLabel: 'gpt_web',
      verifiedFact: false,
      liveModelCall: false,
      text: GPT,
    });

    const both = storeWebReview(gpt.state, {
      slot: 'gemini',
      text: GEMINI_CONFLICT,
      now: LATER,
      provenance: 'test_fixture',
    });
    expect(both.state.judgmentText).toBe(JUDGMENT_TEXT);
    expect(both.state.externalNotes).toHaveLength(2);

    const replaced = storeWebReview(both.state, {
      slot: 'gpt',
      text: 'S3 예상 연매출 10억만 다시 적는다.',
      now: LATER,
      provenance: 'test_fixture',
    });
    expect(replaced.state.externalNotes).toHaveLength(2);
    expect(replaced.state.externalNotes?.find((note) => note.executionId === 'web-review-gpt')?.text).toContain('10억');
    expect(replaced.state.externalNotes?.find((note) => note.executionId === 'web-review-gemini')?.text).toBe(GEMINI_CONFLICT);

    const roundTrip = readWebReview(JSON.parse(JSON.stringify(replaced.state)) as typeof replaced.state);
    expect(roundTrip.gpt?.text).toContain('10억');
    expect(roundTrip.gemini?.text).toBe(GEMINI_CONFLICT);
    expect(roundTrip.comparison.verifiedFact).toBe(false);
    expect(roundTrip.comparison.conflict.some((item) => item.includes('A2') || item.includes('S3'))).toBe(true);
  });

  it('does not treat a model sentence about a ledger as a verified fact', () => {
    const compared = compareWebReviews('원장으로 확인한 매출 2,000만 원이다.', '원장으로 확인한 매출 2,000만 원이다.');
    expect(compared.verifiedFact).toBe(false);
    expect(compared.insufficient.join(' ')).toContain('사실로 올리지 않는다');
  });
});
