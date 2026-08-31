import { describe, expect, it } from 'vitest';

import {
  captureLockedAskSurface,
  isQuestionTransitionLockActive,
  resolveDisplayQuestionWithLock,
  resolveWhyThisQuestionWithLock,
  shouldRejectStaleAskSurfaceUpdate,
  type LockedAskSurface,
} from '../question-transition-lock';

const QUESTION_A = '직접 경쟁사와 대체재를 알려주세요.';
const QUESTION_B = '누가 비용을 지불합니까?';

const lockA: LockedAskSurface = {
  issueId: 'competitor_analysis',
  targetGap: 'alternativesCompetitors',
  questionText: QUESTION_A,
  whyNow: '경쟁 구조를 확인해야 합니다.',
  rationale: '경쟁 구조를 확인해야 합니다.',
  score: 50_000,
  missingField: 'competitor',
};

const lockB: LockedAskSurface = {
  issueId: 'bm_design',
  targetGap: 'payer',
  questionText: QUESTION_B,
  whyNow: '수익 모델을 확인해야 합니다.',
  rationale: '수익 모델을 확인해야 합니다.',
  score: 48_000,
  missingField: 'bm',
};

describe('FIX 2 — question transition lock', () => {
  it('A typing + stale snapshot → A maintained', () => {
    const lockActive = isQuestionTransitionLockActive({
      lock: lockA,
      phase: 'answer',
      reanalyzing: false,
    });
    const staleFresh = {
      ...lockB,
      rationale: lockB.whyNow,
    };

    const resolved = resolveWhyThisQuestionWithLock(lockA, lockActive, staleFresh);
    const display = resolveDisplayQuestionWithLock({
      lock: lockA,
      lockActive,
      fromEngine: staleFresh.questionText,
      fromSurface: staleFresh.questionText,
      fromRef: '',
      issueFallback: QUESTION_B,
    });

    expect(resolved?.questionText).toBe(QUESTION_A);
    expect(resolved?.targetGap).toBe('alternativesCompetitors');
    expect(display).toBe(QUESTION_A);
  });

  it('A typing + revalidate simulation → A maintained', () => {
    const lockActive = isQuestionTransitionLockActive({
      lock: lockA,
      phase: 'answer',
      reanalyzing: false,
    });

    expect(
      shouldRejectStaleAskSurfaceUpdate({
        committedLock: lockA,
        incoming: {
          targetGap: 'alternativesCompetitors',
          questionText: QUESTION_B,
        },
      }),
    ).toBe(true);

    const display = resolveDisplayQuestionWithLock({
      lock: lockA,
      lockActive,
      fromEngine: QUESTION_B,
      fromSurface: QUESTION_B,
      fromRef: QUESTION_B,
      issueFallback: QUESTION_B,
    });
    expect(display).toBe(QUESTION_A);
  });

  it('A submit → processing → B transition OK', () => {
    const processingLockActive = isQuestionTransitionLockActive({
      lock: lockA,
      phase: 'reanalyze',
      reanalyzing: true,
    });
    expect(processingLockActive).toBe(true);

    const committedB = captureLockedAskSurface({
      issueId: 'bm_design',
      targetGap: 'payer',
      questionText: QUESTION_B,
      whyNow: lockB.whyNow,
      rationale: lockB.rationale,
      score: lockB.score,
      missingField: 'bm',
      fallbackIssueId: 'bm_design',
    });
    expect(committedB?.questionText).toBe(QUESTION_B);

    const postCommitActive = isQuestionTransitionLockActive({
      lock: committedB,
      phase: 'answer',
      reanalyzing: false,
    });
    const display = resolveDisplayQuestionWithLock({
      lock: committedB,
      lockActive: postCommitActive,
      fromEngine: QUESTION_A,
      fromSurface: QUESTION_A,
      fromRef: QUESTION_A,
      issueFallback: QUESTION_A,
    });
    expect(display).toBe(QUESTION_B);
  });

  it('B rendered + stale A callback → B maintained', () => {
    const lockActive = isQuestionTransitionLockActive({
      lock: lockB,
      phase: 'answer',
      reanalyzing: false,
    });

    expect(
      shouldRejectStaleAskSurfaceUpdate({
        committedLock: lockB,
        incoming: {
          targetGap: 'alternativesCompetitors',
          questionText: QUESTION_A,
        },
      }),
    ).toBe(true);

    const resolved = resolveWhyThisQuestionWithLock(lockB, lockActive, {
      ...lockA,
      rationale: lockA.whyNow,
    });
    expect(resolved?.questionText).toBe(QUESTION_B);
    expect(resolved?.targetGap).toBe('payer');
  });

  it('decideNextQuestion stale turns do not override committed lock display', () => {
    const staleEngineText = QUESTION_A;
    const lockActive = isQuestionTransitionLockActive({
      lock: lockB,
      phase: 'answer',
      reanalyzing: false,
    });
    const display = resolveDisplayQuestionWithLock({
      lock: lockB,
      lockActive,
      fromEngine: staleEngineText,
      fromSurface: staleEngineText,
      fromRef: staleEngineText,
      issueFallback: staleEngineText,
    });
    expect(display).toBe(QUESTION_B);
    expect(display).not.toBe(staleEngineText);
  });
});
