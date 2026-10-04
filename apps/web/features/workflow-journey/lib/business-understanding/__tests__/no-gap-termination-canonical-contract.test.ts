/**
 * P0 contract: decideNextQuestionFromReview on an OPEN Canonical gap
 * must not be hard-nulled by hasNoAskableGap / applyNoGapTermination.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';
import {
  applyNoGapTermination,
  CANONICAL_V3_GAPS,
  evaluateNoGapTermination,
  hasNoAskableGap,
  isAskableCanonicalDecision,
} from '../ai-pm-no-gap-termination';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import type { NextQuestionDecision } from '../decide-next-question-from-review';
import {
  evaluateStageReadiness,
  STAGE_A_REQUIRED_GAPS,
  STAGE_B_REQUIRED_GAPS,
} from '../evaluate-stage-readiness';
import { resolveGapQuestionBinding } from '../gap-question-map';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { createEmptyGapState } from '../update-gap-state-from-review';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const DOC =
  '전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하는 사업이다.';

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  });
  vi.stubGlobal('window', { sessionStorage: globalThis.sessionStorage });
}

function closeGaps(ids: readonly string[]) {
  const state = createEmptyGapState();
  for (const gapId of ids) {
    state.gaps[gapId] = {
      gapId,
      completeness: 'CLOSED',
      sourceTurnId: null,
      sourceReviewId: null,
      evidence: [],
      confidence: 'high',
      lastUpdated: '2026-10-04T12:00:00.000Z',
      rationale: 'contract-test',
    };
  }
  return state;
}

function dummyTurns(count: number): AiPmLoopTurn[] {
  return Array.from({ length: count }, (_, i) => ({
    issueId: 'customer_definition' as const,
    answer: `turn-${i + 1}`,
    appliedAt: `2026-10-04T12:00:0${i}.000Z`,
    targetGap: i === 0 ? 'businessOneLiner' : 'customerPersona',
    askedQuestionText: `prior question ${i + 1}`,
  }));
}

function canonicalDecision(gapId: string): NextQuestionDecision {
  const binding = resolveGapQuestionBinding(gapId);
  return {
    targetGap: gapId,
    targetGapId: gapId,
    issueId: binding.issueId,
    questionText: binding.questionText,
    whyNow: binding.whyNow,
    rationale: binding.whyNow,
    score: 40_000,
    reframed: false,
    excludedGaps: [],
    drivenByReview: true,
    sourceAnswerId: 'contract',
    sourceReviewId: 'contract',
    reviewAction: 'advance',
    action: 'advance',
    actionRationale: 'contract',
    reason: `advance after customerPersona=CLOSED; target=${gapId}`,
  };
}

function living() {
  return buildLivingUnderstandingState({
    documentText: DOC,
    understanding: buildBusinessUnderstanding(DOC),
    turns: dummyTurns(4),
  });
}

describe('P0 no-gap termination ↔ Canonical OPEN contract', () => {
  beforeEach(() => {
    stubSessionStorage();
    setAiPmJudgmentFix10V1ForTest(true);
  });

  afterEach(() => {
    setAiPmJudgmentFix10V1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('P0-1 Production repro: CLOSED business+customer, OPEN payer → keep payer', () => {
    const gapState = closeGaps(['businessOneLiner', 'customerPersona']);
    const decision = canonicalDecision('payer');
    const turns = dummyTurns(4);

    expect(hasNoAskableGap(gapState)).toBe(false);
    expect(isAskableCanonicalDecision(decision, gapState)).toBe(true);
    expect(
      evaluateNoGapTermination({
        decision,
        living: living(),
        turns,
        gapState,
      }),
    ).toEqual({ terminate: false, reason: 'continue' });

    const kept = applyNoGapTermination({
      decision,
      living: living(),
      turns,
      gapState,
    });
    expect(kept).not.toBeNull();
    expect(kept?.targetGapId).toBe('payer');
    expect(kept?.questionText).toMatch(/지불/);

    const readiness = evaluateStageReadiness({ gapState, turns });
    expect(readiness.stageAReady).toBe(false);
    expect(readiness.stageId).toBe('A_understanding');
    expect(readiness.blocker).toEqual({ gapId: 'payer', reason: 'OPEN' });
  });

  it('P0-2 true no-gap: all Canonical CLOSED + null decision → terminate', () => {
    const gapState = closeGaps([...STAGE_A_REQUIRED_GAPS, ...STAGE_B_REQUIRED_GAPS]);
    expect(hasNoAskableGap(gapState)).toBe(true);

    const verdict = evaluateNoGapTermination({
      decision: null,
      living: living(),
      turns: dummyTurns(4),
      gapState,
    });
    expect(verdict).toEqual({ terminate: true, reason: 'no_decision' });
    expect(
      applyNoGapTermination({
        decision: null,
        living: living(),
        turns: dummyTurns(4),
        gapState,
      }),
    ).toBeNull();
  });

  it('P0-4 invariant: askable Canonical decision is never hard-nulled', () => {
    const gapState = closeGaps(['businessOneLiner', 'customerPersona']);
    const turns = dummyTurns(4);
    const live = living();

    for (const gapId of CANONICAL_V3_GAPS) {
      if (gapState.gaps[gapId]?.completeness === 'CLOSED') continue;
      const decision = canonicalDecision(gapId);
      expect(isAskableCanonicalDecision(decision, gapState)).toBe(true);
      expect(
        applyNoGapTermination({
          decision,
          living: live,
          turns,
          gapState,
        }),
      ).toMatchObject({ targetGapId: gapId, drivenByReview: true });
    }
  });
});
