import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

import { buildBusinessUnderstanding } from '../build-business-understanding';
import { commitFirstAskAfterUnderstandingConfirm } from '../understanding-confirm-ask-transition';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, v),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  });
  vi.stubGlobal('window', { sessionStorage: (globalThis as { sessionStorage: Storage }).sessionStorage });
}

const DOC = `사업: B2B SaaS
고객: 병원 원장
문제: 재방문 관리가 수동`;

describe('P0-3B understanding confirm → first ask', () => {
  const projectId = 'p0-3-confirm-ask';

  beforeEach(() => {
    stubSessionStorage();
    clearAiPmLoopState(projectId);
    patchAiPmLoopState(
      {
        readingCompleted: true,
        dismissedReadAck: true,
        phase: 'issue',
        lockedAskSurface: {
          issueId: 'customer_definition',
          targetGap: 'customerPersona',
          questionText: 'STALE OLD QUESTION',
          whyNow: 'stale',
          rationale: 'stale',
          score: 1,
          missingField: 'customer',
        },
      },
      projectId,
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('replaces stale lockedAskSurface with a fresh first question', () => {
    const understanding = buildBusinessUnderstanding(DOC);
    const next = commitFirstAskAfterUnderstandingConfirm({
      projectId,
      documentText: DOC,
      understanding,
      entities: null,
    });

    expect(next.phase).toBe('answer');
    expect(next.lockedAskSurface?.questionText).toBeTruthy();
    expect(next.lockedAskSurface?.questionText).not.toBe('STALE OLD QUESTION');
    expect(loadAiPmLoopState(projectId).lockedAskSurface?.questionText).toBe(
      next.lockedAskSurface?.questionText,
    );
  });
});
