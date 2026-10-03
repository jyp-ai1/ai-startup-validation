/**
 * Phase 2-C — minimal reproduction set for four defect candidates (reproduce only, not fixed).
 * Each test states the correct behavior and is marked `it.fails` while the defect exists.
 * When a fix lands, the matching test starts passing and vitest reports it — switch it to `it`.
 * Adjudication: docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-2/PHASE-2C-CANDIDATE-REPRODUCTION.md
 */
import { describe, expect, it } from 'vitest';

import type { AnswerReview } from '@repo/types/domain/answer-review';

import { replayCalibrationTurn } from '@/lib/ai-pm-validation-engine/calibration-turn-replay';

import { buildAnswerReview } from '../build-answer-review';

const CHANNEL_Q = '고객을 처음 만나는 채널은 어디인가요?';
const PROBLEM_Q = '이 고객이 겪는 가장 큰 문제는 무엇인가요?';
const CORRECTION = '정정합니다. 고객은 직장인·프리랜서가 아니라 중소 제조 CEO입니다.';

function review(
  askedGapId: string,
  askedIssueId: Parameters<typeof buildAnswerReview>[0]['askedIssueId'],
  userAnswer: string,
  question: string,
  existingFactsByKey: Parameters<typeof buildAnswerReview>[0]['existingFactsByKey'] = {},
): AnswerReview {
  return buildAnswerReview({
    turnId: 't-p2c',
    askedGapId,
    askedIssueId,
    userAnswer,
    displayedQuestionText: question,
    askedQuestionText: question,
    existingFactsByKey,
  }).review;
}

describe('Phase 2-C A — unrelated answer force-closes the asked gap', () => {
  it.fails('a customer correction does not close marketChannel', () => {
    const r = review('marketChannel', 'market_validation', CORRECTION, CHANNEL_Q, {
      customer: '직장인·프리랜서',
    });
    expect(r.gapVerdicts.marketChannel?.completeness).not.toBe('CLOSED');
  });

  it.fails('team size and HQ location do not close marketChannel', () => {
    const r = review(
      'marketChannel',
      'market_validation',
      '참고로 우리 팀은 8명이며, 본사는 판교에 있습니다.',
      CHANNEL_Q,
    );
    expect(r.gapVerdicts.marketChannel?.completeness).not.toBe('CLOSED');
  });
});

describe('Phase 2-C B — repeated answer flagged as a contradiction', () => {
  it.fails('restating the same problem is not a problemJtbd contradiction', () => {
    const r = review(
      'marketChannel',
      'market_validation',
      '핵심 고객은 직장인·프리랜서이고, 가장 큰 문제는 할 일·일정 분산입니다.',
      CHANNEL_Q,
      { customer: '직장인·프리랜서', problem: '할 일·일정 분산' },
    );
    expect(r.contradictions).toEqual([]);
    expect(r.gapVerdicts.problemJtbd?.completeness).not.toBe('CONTRADICTED');
  });
});

describe('Phase 2-C C — correction value truncated', () => {
  it('stores the full corrected customer segment', () => {
    const r = review('problemJtbd', 'problem_definition', CORRECTION, PROBLEM_Q, {
      customer: '직장인·프리랜서',
    });
    expect(r.extractedFacts.find((f) => f.key === 'customer')?.value).toBe('중소 제조 CEO');
  });
});

describe('Phase 2-C D — internal text leaks into the next question', () => {
  it.fails('does not quote the unreadable-document placeholder', () => {
    const r = replayCalibrationTurn({ businessId: 'sb-marketplace', behavior: 'normal', turn: 4 })!;
    expect(r.actualNextQuestion).not.toMatch(/아직 문서에서 사업 내용을 충분히 이해하지 못했습니다/);
  });

  it.fails('does not quote raw document field labels (readable document)', () => {
    const r = replayCalibrationTurn({ businessId: 'sb-b2c-saas', behavior: 'multi_fact', turn: 2 })!;
    expect(r.actualNextQuestion).not.toMatch(/「[^」]*(타겟:|문제:|구매:|사용:)/);
  });
});
