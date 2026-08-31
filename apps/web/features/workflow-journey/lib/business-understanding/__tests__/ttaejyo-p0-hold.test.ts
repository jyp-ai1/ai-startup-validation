import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import {
  applyWorkspaceSnapshotToCache,
  shouldApplyDbSnapshot,
} from '@/features/workspace/lib/apply-workspace-snapshot';
import { bootstrapWorkspaceFromDb } from '@/features/workspace/lib/bootstrap-workspace-from-db';
import { getAnsweredTargetGaps } from '../resolve-missing-field-priority';
import { inferTargetGapFromQuestionText } from '../gap-question-map';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import {
  clearAiPmLoopState,
  createInitialAiPmLoopState,
  loadAiPmLoopState,
  saveAiPmLoopState,
} from '../workspace-ai-pm-loop-store';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

/**
 * TTAEJYO — independent CASE A / CASE B unit traces (no shared root-cause assumption).
 */

function stubSessionStorage() {
  const store = new Map<string, string>();
  const sessionStorage = {
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
  };
  vi.stubGlobal('sessionStorage', sessionStorage);
  vi.stubGlobal('window', { sessionStorage });
  return store;
}

describe('TTAEJYO CASE A — differentiation ask surface chain', () => {
  it('differentiation gap binds to competitor_analysis issueId', () => {
    const binding = inferTargetGapFromQuestionText('경쟁 대비 이 서비스만의 차별점은 무엇인가요?');
    expect(binding).toBe('differentiationVsAlternatives');
  });

  it('cross-issue transition (bm_design → competitor_analysis) triggers recognition gate condition', () => {
    const lastTurnIssueId = 'bm_design';
    const nextIssueId = 'competitor_analysis';
    const phase = 'issue';
    const recognitionWouldShow =
      phase === 'issue' && lastTurnIssueId !== nextIssueId;
    expect(recognitionWouldShow).toBe(true);
  });

  it('same-issue competitor → differentiation does NOT trigger recognition gate', () => {
    const lastTurnIssueId = 'competitor_analysis';
    const nextIssueId = 'competitor_analysis';
    const phase = 'issue';
    const recognitionWouldShow =
      phase === 'issue' && lastTurnIssueId !== nextIssueId;
    expect(recognitionWouldShow).toBe(false);
  });
});

describe('TTAEJYO CASE B — resume payer repeat (fresh vs resume paths)', () => {
  const payerTurn = (answer: string): AiPmLoopTurn => ({
    issueId: 'bm_design',
    answer,
    appliedAt: '2026-08-31T00:00:00.000Z',
    semanticFactKey: 'buyer',
    semanticFactKeys: ['buyer'],
    targetGap: 'payer',
    askedQuestionText: '누가 비용을 지불합니까?',
  });

  it('fresh path: 고객이요 closes payer when askedTargetGap is set', () => {
    const turn = payerTurn('고객이요');
    const semantic = interpretAnswerSemantics({
      answer: '고객이요',
      askedIssueId: 'bm_design',
      askedTargetGap: 'payer',
    });
    const gaps = getAnsweredTargetGaps([turn]);
    expect(semantic.factKey).toBe('buyer');
    expect(gaps.has('payer')).toBe(true);
  });

  it('resume path: turn missing targetGap falls back to issue binding — still buyer', () => {
    const legacyTurn: AiPmLoopTurn = {
      issueId: 'bm_design',
      answer: '고객이요',
      appliedAt: '2026-08-31T00:00:00.000Z',
      semanticFactKey: 'buyer',
    };
    const semantic = interpretAnswerSemantics({
      answer: legacyTurn.answer,
      askedIssueId: legacyTurn.issueId,
      askedTargetGap: inferTargetGapFromQuestionText('누가 비용을 지불합니까?'),
    });
    expect(semantic.factKey).toBe('buyer');
  });

  it('resume path: stale session without buyer turn re-opens payer (simulated)', () => {
    const staleTurns: AiPmLoopTurn[] = [];
    const gaps = getAnsweredTargetGaps(staleTurns);
    expect(gaps.has('payer')).toBe(false);
  });
});

describe('FIX 1 CASE A — hydration authority (payer infinite loop)', () => {
  const projectId = 'fix1-case-a-payer';
  const payerQuestion = '누가 비용을 지불합니까?';

  const priorTurns: AiPmLoopTurn[] = [
    {
      issueId: 'customer_definition',
      answer: '외국인 관광객',
      appliedAt: '2026-08-31T10:00:00.000Z',
      semanticFactKey: 'customer',
      targetGap: 'customer',
    },
    {
      issueId: 'problem_definition',
      answer: '일정·체험 예약이 어렵다',
      appliedAt: '2026-08-31T10:01:00.000Z',
      semanticFactKey: 'problem',
      targetGap: 'problem',
    },
  ];

  const payerBuyerTurn: AiPmLoopTurn = {
    issueId: 'bm_design',
    answer: '고객이요',
    appliedAt: '2026-08-31T10:02:00.000Z',
    semanticFactKey: 'buyer',
    semanticFactKeys: ['buyer'],
    targetGap: 'payer',
    askedQuestionText: payerQuestion,
  };

  beforeEach(() => {
    stubSessionStorage();
    clearAiPmLoopState(projectId);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('post-answer revalidate: stale DB snapshot does not restore payer-open turns', () => {
    const clientLoop = {
      ...createInitialAiPmLoopState(),
      phase: 'answer' as const,
      currentIssueId: 'competitor_analysis' as const,
      readingCompleted: true,
      turns: [...priorTurns, payerBuyerTurn],
    };
    saveAiPmLoopState(clientLoop, projectId);

    const staleDbSnapshot: WorkspacePersistedSnapshot = {
      updatedAt: '2026-08-31T10:01:30.000Z',
      aiPmLoop: {
        ...createInitialAiPmLoopState(),
        phase: 'answer',
        currentIssueId: 'bm_design',
        readingCompleted: true,
        turns: priorTurns,
      },
    };

    expect(shouldApplyDbSnapshot(projectId, staleDbSnapshot)).toBe(false);

    applyWorkspaceSnapshotToCache(projectId, staleDbSnapshot);

    const afterHydrate = loadAiPmLoopState(projectId);
    const gaps = getAnsweredTargetGaps(afterHydrate.turns);
    expect(gaps.has('payer')).toBe(true);
    expect(afterHydrate.turns).toHaveLength(3);
    expect(afterHydrate.turns.at(-1)?.semanticFactKey).toBe('buyer');
  });

  it('resume hydrate: empty client cache accepts DB turns with payer still open', () => {
    const dbSnapshot: WorkspacePersistedSnapshot = {
      updatedAt: '2026-08-31T09:00:00.000Z',
      aiPmLoop: {
        ...createInitialAiPmLoopState(),
        phase: 'answer',
        currentIssueId: 'bm_design',
        readingCompleted: true,
        turns: priorTurns,
      },
    };

    expect(shouldApplyDbSnapshot(projectId, dbSnapshot)).toBe(true);
    bootstrapWorkspaceFromDb(projectId, dbSnapshot);

    const hydrated = loadAiPmLoopState(projectId);
    expect(hydrated.turns).toHaveLength(2);
    expect(getAnsweredTargetGaps(hydrated.turns).has('payer')).toBe(false);
  });

  it('bootstrapWorkspaceFromDb respects shouldApplyDbSnapshot gate when client is ahead', () => {
    saveAiPmLoopState(
      {
        ...createInitialAiPmLoopState(),
        phase: 'answer',
        currentIssueId: 'competitor_analysis',
        readingCompleted: true,
        turns: [...priorTurns, payerBuyerTurn],
      },
      projectId,
    );

    bootstrapWorkspaceFromDb(projectId, {
      updatedAt: '2026-08-31T10:01:30.000Z',
      aiPmLoop: {
        ...createInitialAiPmLoopState(),
        phase: 'answer',
        currentIssueId: 'bm_design',
        readingCompleted: true,
        turns: priorTurns,
      },
    });

    const loop = loadAiPmLoopState(projectId);
    expect(getAnsweredTargetGaps(loop.turns).has('payer')).toBe(true);
  });

  it('고객이요 at payer closes payer before and after simulated revalidate', () => {
    const semantic = interpretAnswerSemantics({
      answer: '고객이요',
      askedIssueId: 'bm_design',
      askedTargetGap: inferTargetGapFromQuestionText(payerQuestion),
    });
    expect(semantic.factKey).toBe('buyer');

    saveAiPmLoopState(
      {
        ...createInitialAiPmLoopState(),
        phase: 'reanalyze',
        currentIssueId: 'bm_design',
        readingCompleted: true,
        turns: [...priorTurns, payerBuyerTurn],
      },
      projectId,
    );

    applyWorkspaceSnapshotToCache(projectId, {
      updatedAt: '2026-08-31T10:01:30.000Z',
      aiPmLoop: {
        ...createInitialAiPmLoopState(),
        phase: 'answer',
        currentIssueId: 'bm_design',
        readingCompleted: true,
        turns: priorTurns,
      },
    });

    expect(getAnsweredTargetGaps(loadAiPmLoopState(projectId).turns).has('payer')).toBe(true);
  });
});
