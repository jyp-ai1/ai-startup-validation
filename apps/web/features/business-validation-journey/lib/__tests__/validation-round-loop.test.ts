import { describe, expect, it } from 'vitest';

import { startJourney } from '../journey-engine';
import type { Intake } from '../journey-types';
import {
  holdValidationLoop,
  readValidationLoop,
  reaggregateOpenRound,
  storeLoopOriginal,
  submitRoundFeedback,
} from '../validation-round-loop';

const NOW = '2026-10-17T07:40:00.000Z';
const LATER = '2026-10-17T07:50:00.000Z';
const AFTER = '2026-10-17T08:00:00.000Z';

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

const GEMINI = [
  '매출 2,000만 원은 문서의 주장이다.',
  '확정 매출 10억이 입금되었다.',
  '모회사 지원 없이도 매출을 유지할 수 있다.',
].join('\n');

function started() {
  const result = startJourney(INTAKE, 'test_hypothesis');
  if (!result.ok) throw new Error('start failed');
  return result.state;
}

function roundOneAggregated() {
  const gpt = storeLoopOriginal(started(), { slot: 'gpt', text: GPT, now: NOW, provenance: 'test_fixture' });
  return storeLoopOriginal(gpt.state, { slot: 'gemini', text: GEMINI, now: LATER, provenance: 'test_fixture' });
}

describe('validation round loop', () => {
  it('saves and reloads the first round originals and aggregation', () => {
    const stored = roundOneAggregated();
    expect(stored.accepted).toBe(true);
    const reloaded = readValidationLoop(JSON.parse(JSON.stringify(stored.state)));
    const round = reloaded?.rounds[0];
    expect(round?.roundId).toBe('r1');
    expect(round?.gptText).toBe(GPT);
    expect(round?.geminiText).toBe(GEMINI);
    expect(round?.phase).toBe('Founder 검토 대기');
    expect(round?.aggregation?.conflict.some((item) => item.includes('S3'))).toBe(true);
    expect(round?.aggregation?.factStatus).toBe('미확인');
    expect(round?.aggregation?.verifiedFact).toBe(false);
    expect(reloaded?.liveModelCall).toBe(false);
  });

  it('puts founder feedback into the next round input', () => {
    const stored = roundOneAggregated();
    const feedback = submitRoundFeedback(stored.state, { text: '원장에는 계열사 매출만 있다.', now: AFTER });
    expect(feedback.accepted).toBe(true);
    const next = readValidationLoop(feedback.state)?.rounds[1];
    expect(next?.businessSnapshot).toContain('원장에는 계열사 매출만 있다.');
    expect(next?.businessSnapshot).toContain('모회사 채널과 한정판 판매');
  });

  it('keeps the previous round original and aggregation unchanged', () => {
    const stored = roundOneAggregated();
    const before = readValidationLoop(stored.state)?.rounds[0];
    const feedback = submitRoundFeedback(stored.state, { text: '계열사 외 매출은 확인하지 못했다.', now: AFTER });
    const again = storeLoopOriginal(feedback.state, {
      slot: 'gpt',
      text: '다음 회차 GPT 문장',
      now: AFTER,
      provenance: 'test_fixture',
    });
    const previous = readValidationLoop(again.state)?.rounds[0];
    expect(previous?.gptText).toBe(before?.gptText);
    expect(previous?.geminiText).toBe(before?.geminiText);
    expect(previous?.aggregation).toEqual(before?.aggregation);
    expect(previous?.phase).toBe('다음 회차 준비 완료');
  });

  it('carries unresolved questions into the next round', () => {
    const stored = roundOneAggregated();
    const questions = readValidationLoop(stored.state)?.rounds[0]?.unresolvedQuestions ?? [];
    expect(questions.some((item) => item.includes('S3'))).toBe(true);
    const feedback = submitRoundFeedback(stored.state, { text: '아직 원장을 보지 못했다.', now: AFTER });
    const next = readValidationLoop(feedback.state)?.rounds[1];
    expect(next?.unresolvedQuestions).toEqual(questions);
    expect(next?.businessSnapshot).toContain('S3');
  });

  it('does not complete the Gemini step without a GPT original', () => {
    const rejected = storeLoopOriginal(started(), {
      slot: 'gemini',
      text: GEMINI,
      now: NOW,
      provenance: 'test_fixture',
    });
    expect(rejected.accepted).toBe(false);
    const round = readValidationLoop(rejected.state)?.rounds[0];
    expect(round?.phase).toBe('GPT 원문 대기');
    expect(round?.geminiText).toBeNull();
    expect(round?.aggregation).toBeNull();
  });

  it('does not refresh the aggregation without a new original', () => {
    const stored = roundOneAggregated();
    const before = readValidationLoop(stored.state)?.rounds[0]?.aggregation;
    const again = reaggregateOpenRound(stored.state);
    expect(again.updated).toBe(false);
    expect(readValidationLoop(again.state)?.rounds[0]?.aggregation).toEqual(before);
  });

  it('does not promote an answer without evidence to a verified fact', () => {
    const stored = roundOneAggregated();
    const feedback = submitRoundFeedback(stored.state, {
      text: '원장으로 확인한 매출 10억이 입금되었다.',
      now: AFTER,
    });
    const previous = readValidationLoop(feedback.state)?.rounds[0];
    expect(previous?.aggregation?.factStatus).toBe('미확인');
    expect(previous?.aggregation?.verifiedFact).toBe(false);
    expect(previous?.aggregation?.factStatus).not.toBe('검증 완료');
    expect(feedback.reason).toContain('미확인');
  });

  it('starts the next round at the GPT step', () => {
    const stored = roundOneAggregated();
    const feedback = submitRoundFeedback(stored.state, { text: '다음 조회에 반영할 답이다.', now: AFTER });
    const next = readValidationLoop(feedback.state)?.rounds[1];
    expect(next?.phase).toBe('GPT 원문 대기');
    expect(next?.gptText).toBeNull();
    expect(next?.geminiText).toBeNull();
    expect(next?.aggregation).toBeNull();
    const skipped = storeLoopOriginal(feedback.state, {
      slot: 'gemini',
      text: GEMINI,
      now: AFTER,
      provenance: 'test_fixture',
    });
    expect(skipped.accepted).toBe(false);
    expect(readValidationLoop(skipped.state)?.rounds[1]?.phase).toBe('GPT 원문 대기');
  });

  it('holds the loop without opening another round', () => {
    const stored = roundOneAggregated();
    const held = holdValidationLoop(stored.state, AFTER);
    const loop = readValidationLoop(held.state);
    expect(loop?.stopped).toBe(true);
    expect(loop?.rounds).toHaveLength(1);
    expect(loop?.rounds[0]?.phase).toBe('보류');
  });
});
