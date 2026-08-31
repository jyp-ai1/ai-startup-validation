import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import {
  applyWorkspaceSnapshotToCache,
  mergeAiPmLoopForHydrate,
  shouldApplyDbSnapshot,
} from '@/features/workspace/lib/apply-workspace-snapshot';
import { bootstrapWorkspaceFromDb } from '@/features/workspace/lib/bootstrap-workspace-from-db';
import {
  hasPersistedQuestionTransitionLock,
  isQuestionTransitionLockActive,
  resolveDisplayQuestionWithLock,
  type LockedAskSurface,
} from '../question-transition-lock';
import {
  clearAiPmLoopState,
  createInitialAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
  saveAiPmLoopState,
} from '../workspace-ai-pm-loop-store';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';
import type { WorkspacePersistedSnapshot } from '@/lib/project/workspace-persisted-state';

const QUESTION_A = '직접 경쟁사와 대체재를 알려주세요.';
const QUESTION_B = '누가 비용을 지불합니까?';

const lockB: LockedAskSurface = {
  issueId: 'bm_design',
  targetGap: 'payer',
  questionText: QUESTION_B,
  whyNow: '수익 모델을 확인해야 합니다.',
  rationale: '수익 모델을 확인해야 합니다.',
  score: 48_000,
  missingField: 'bm',
};

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

function resolveVisibleQuestionAfterHydrate(projectId: string): string {
  const loop = loadAiPmLoopState(projectId);
  const lock = loop.lockedAskSurface ?? null;
  const lockActive = isQuestionTransitionLockActive({
    lock,
    phase: loop.phase,
    reanalyzing: false,
  });
  return resolveDisplayQuestionWithLock({
    lock,
    lockActive,
    fromEngine: QUESTION_A,
    fromSurface: QUESTION_A,
    fromRef: QUESTION_A,
    issueFallback: QUESTION_A,
  });
}

/** Simulates remount boundary: hydrate → bootstrap → re-read loop + lock. */
function simulateRemountHydrateResync(
  projectId: string,
  staleSnapshot: WorkspacePersistedSnapshot,
): ReturnType<typeof loadAiPmLoopState> {
  applyWorkspaceSnapshotToCache(projectId, staleSnapshot);
  bootstrapWorkspaceFromDb(projectId, staleSnapshot);
  return loadAiPmLoopState(projectId);
}

describe('FIX 2b+2c — question transition survives persist/revalidate/remount', () => {
  const projectId = 'fix2bc-remount-integration';
  const competitorTurn: AiPmLoopTurn = {
    issueId: 'competitor_analysis',
    answer: '직접 찾아봐줘',
    appliedAt: '2026-08-31T12:00:00.000Z',
    semanticFactKey: 'competitor',
    targetGap: 'alternativesCompetitors',
    askedQuestionText: QUESTION_A,
  };

  beforeEach(() => {
    stubSessionStorage();
    clearAiPmLoopState(projectId);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scenario 1: A submit → B committed → stale persist/hydrate/remount keeps B', () => {
    const postCommitClient = {
      ...createInitialAiPmLoopState(),
      phase: 'answer' as const,
      currentIssueId: 'bm_design' as const,
      readingCompleted: true,
      turns: [competitorTurn],
      lockedAskSurface: lockB,
    };
    saveAiPmLoopState(postCommitClient, projectId);

    const staleDbSnapshot: WorkspacePersistedSnapshot = {
      updatedAt: '2026-08-31T12:00:01.000Z',
      aiPmLoop: {
        ...createInitialAiPmLoopState(),
        phase: 'answer',
        currentIssueId: 'competitor_analysis',
        readingCompleted: true,
        turns: [competitorTurn],
      },
    };

    expect(shouldApplyDbSnapshot(projectId, staleDbSnapshot)).toBe(false);

    const afterRemount = simulateRemountHydrateResync(projectId, staleDbSnapshot);

    expect(hasPersistedQuestionTransitionLock(afterRemount)).toBe(true);
    expect(afterRemount.lockedAskSurface?.questionText).toBe(QUESTION_B);
    expect(afterRemount.lockedAskSurface?.targetGap).toBe('payer');
    expect(afterRemount.currentIssueId).toBe('bm_design');
    expect(resolveVisibleQuestionAfterHydrate(projectId)).toBe(QUESTION_B);
    expect(resolveVisibleQuestionAfterHydrate(projectId)).not.toBe(QUESTION_A);
  });

  it('scenario 2: B visible + typing lock → remount/hydrate keeps B', () => {
    saveAiPmLoopState(
      {
        ...createInitialAiPmLoopState(),
        phase: 'answer',
        currentIssueId: 'bm_design',
        readingCompleted: true,
        turns: [competitorTurn],
      },
      projectId,
    );

    patchAiPmLoopState({ lockedAskSurface: lockB }, projectId);

    const staleSnapshot: WorkspacePersistedSnapshot = {
      updatedAt: '2026-08-31T12:00:02.000Z',
      aiPmLoop: {
        ...createInitialAiPmLoopState(),
        phase: 'answer',
        currentIssueId: 'competitor_analysis',
        readingCompleted: true,
        turns: [competitorTurn],
      },
    };

    const afterRemount = simulateRemountHydrateResync(projectId, staleSnapshot);

    expect(afterRemount.lockedAskSurface?.questionText).toBe(QUESTION_B);
    expect(resolveVisibleQuestionAfterHydrate(projectId)).toBe(QUESTION_B);
  });

  it('mergeAiPmLoopForHydrate preserves lock B over stale DB currentIssueId', () => {
    const client = {
      ...createInitialAiPmLoopState(),
      phase: 'answer' as const,
      currentIssueId: 'bm_design' as const,
      readingCompleted: true,
      turns: [competitorTurn],
      lockedAskSurface: lockB,
    };
    const db = {
      ...createInitialAiPmLoopState(),
      phase: 'answer' as const,
      currentIssueId: 'competitor_analysis' as const,
      readingCompleted: true,
      turns: [competitorTurn],
    };

    const merged = mergeAiPmLoopForHydrate(client, db);
    expect(merged.lockedAskSurface?.targetGap).toBe('payer');
    expect(merged.currentIssueId).toBe('bm_design');
    expect(merged.lockedAskSurface?.questionText).toBe(QUESTION_B);
  });
});
