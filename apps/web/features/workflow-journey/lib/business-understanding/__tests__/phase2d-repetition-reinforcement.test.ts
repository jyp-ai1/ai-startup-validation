/**
 * Phase 2-D fix B — repeating a stated fact (verbatim or paraphrased) reinforces it.
 * Only a genuinely different value for the same slot is a contradiction.
 */
import { describe, expect, it } from 'vitest';

import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { buildAnswerReview } from '../build-answer-review';
import {
  createEmptyGapState,
  getClosedGapIds,
  updateGapStateFromReview,
} from '../update-gap-state-from-review';
import { answersContradict } from '../understanding-contract';
import { snapshotFactsFromGapState } from '@/lib/ai-pm-accuracy/accuracy-turn-harness';

type Turn = { gap: string; issue: Parameters<typeof buildAnswerReview>[0]['askedIssueId']; q: string; a: string };

const CUSTOMER = { gap: 'customerPersona', issue: 'customer_definition', q: '이 서비스를 실제로 가장 필요로 하는 사람은 누구인가요?' } as const;
const PROBLEM = { gap: 'problemJtbd', issue: 'problem_definition', q: '이 고객이 겪는 가장 큰 문제는 무엇인가요?' } as const;
const CHANNEL = { gap: 'marketChannel', issue: 'market_validation', q: '고객을 처음 만나는 채널은 어디인가요?' } as const;

function run(turns: Turn[]): { gapState: GapKnowledgeState; contradictions: number[] } {
  let gapState = createEmptyGapState();
  const contradictions: number[] = [];
  turns.forEach((t, i) => {
    const { review } = buildAnswerReview({
      turnId: `t-p2d-b-${i}`,
      askedGapId: t.gap,
      askedIssueId: t.issue,
      userAnswer: t.a,
      displayedQuestionText: t.q,
      askedQuestionText: t.q,
      existingFactsByKey: snapshotFactsFromGapState(gapState),
      priorClosedGaps: getClosedGapIds(gapState),
    });
    contradictions.push(review.contradictions.length);
    gapState = updateGapStateFromReview(review, gapState);
  });
  return { gapState, contradictions };
}

const ask = (base: Omit<Turn, 'a'>, a: string): Turn => ({ ...base, a });

describe('Phase 2-D B — repetition is reinforcement', () => {
  it('A/A/A — the same customer answer three times stays CLOSED', () => {
    const a = '핵심 고객은 바쁜 직장인입니다.';
    const { gapState, contradictions } = run([ask(CUSTOMER, a), ask(CHANNEL, a), ask(PROBLEM, a)]);
    expect(contradictions).toEqual([0, 0, 0]);
    expect(gapState.gaps.customerPersona?.completeness).toBe('CLOSED');
  });

  it("A/A' — a paraphrased customer answer stays CLOSED", () => {
    const { gapState, contradictions } = run([
      ask(CUSTOMER, '핵심 고객은 바쁜 직장인입니다.'),
      ask(CHANNEL, '다시 말씀드리면 저희 고객은 바쁜 직장인들입니다.'),
    ]);
    expect(contradictions).toEqual([0, 0]);
    expect(gapState.gaps.customerPersona?.completeness).toBe('CLOSED');
  });

  it("A/A' — a paraphrased problem answer is not a contradiction", () => {
    const { gapState, contradictions } = run([
      ask(PROBLEM, '가장 큰 문제는 할 일·일정 분산입니다.'),
      ask(CHANNEL, '앞에서 말씀드린 대로 할 일·일정 분산이 핵심입니다.'),
    ]);
    expect(contradictions).toEqual([0, 0]);
    expect(gapState.gaps.problemJtbd?.completeness).not.toBe('CONTRADICTED');
  });

  it('multi-fact restatement compares each stored fact with its own slot only', () => {
    const { gapState, contradictions } = run([
      ask(CUSTOMER, '핵심 고객은 직장인·프리랜서입니다.'),
      ask(PROBLEM, '가장 큰 문제는 할 일·일정 분산입니다.'),
      ask(CHANNEL, '핵심 고객은 직장인·프리랜서이고, 가장 큰 문제는 할 일·일정 분산입니다.'),
    ]);
    expect(contradictions[2]).toBe(0);
    expect(gapState.gaps.problemJtbd?.completeness).not.toBe('CONTRADICTED');
    expect(gapState.gaps.customerPersona?.completeness).not.toBe('CONTRADICTED');
  });

  it('"문제가 핵심입니다" restates the stored problem instead of declaring "핵심"', () => {
    const { gapState, contradictions } = run([
      ask(PROBLEM, '가장 큰 문제는 업무 요청이 메신저와 메일에 흩어져 누락되는 문제입니다.'),
      ask(CHANNEL, '앞에서 말씀드린 대로 업무 요청이 메신저와 메일에 흩어져 누락되는 문제가 핵심입니다.'),
    ]);
    expect(contradictions).toEqual([0, 0]);
    expect(gapState.gaps.problemJtbd?.completeness).toBe('CLOSED');
  });

  it('a channel answer that starts with "고객은" does not contradict the stored customer', () => {
    const { gapState, contradictions } = run([
      ask(CUSTOMER, '핵심 고객은 바쁜 직장인입니다.'),
      ask(CHANNEL, '고객은 주로 유튜브 재테크 채널 협업을 통해 처음 만납니다.'),
    ]);
    expect(contradictions).toEqual([0, 0]);
    expect(gapState.gaps.customerPersona?.completeness).toBe('CLOSED');
    expect(gapState.gaps.marketChannel?.completeness).not.toBe('CONTRADICTED');
  });

  it.each([CUSTOMER, CHANNEL])('A/B — a genuinely different customer is CONTRADICTED (asked $gap)', (asked) => {
    const { gapState, contradictions } = run([
      ask(CUSTOMER, '핵심 고객은 바쁜 직장인입니다.'),
      ask(asked, '사실 핵심 고객은 지역 세무사 사무실입니다.'),
    ]);
    expect(contradictions[1]).toBe(1);
    expect(gapState.gaps.customerPersona?.completeness).toBe('CONTRADICTED');
  });

  it('A/B — a genuinely different problem is still a contradiction', () => {
    expect(answersContradict('할 일·일정 분산', '사실 가장 큰 문제는 세금 신고 누락입니다.', 'problem')).toBe(true);
    expect(answersContradict('할 일·일정 분산', '가장 큰 문제는 할 일·일정 분산입니다.', 'problem')).toBe(false);
  });
});
