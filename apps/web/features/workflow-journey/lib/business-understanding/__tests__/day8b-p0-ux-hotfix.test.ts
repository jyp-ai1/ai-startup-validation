import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import type { AnswerReview } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import {
  buildCeoSixSurfaces,
  isEngineMetaCopy,
  isUserFacingSurfaceCopy,
} from '../build-ceo-six-surfaces';
import {
  clearAnswerDraft,
  loadAnswerDraft,
  saveAnswerDraft,
} from '../workspace-answer-draft-store';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

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

describe('DAY 8-B P0-1 — answer draft persistence', () => {
  beforeEach(() => {
    stubSessionStorage();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists and restores draft per project', () => {
    saveAnswerDraft('테스트 입력 중 refresh 테스트', 'proj-a');
    expect(loadAnswerDraft('proj-a')).toBe('테스트 입력 중 refresh 테스트');
    expect(loadAnswerDraft('proj-b')).toBe('');
  });

  it('clears draft on submit success path', () => {
    saveAnswerDraft('draft text', 'proj-clear');
    clearAnswerDraft('proj-clear');
    expect(loadAnswerDraft('proj-clear')).toBe('');
  });

  it('removes storage entry when draft trimmed empty', () => {
    saveAnswerDraft('hello', 'proj-empty');
    saveAnswerDraft('   ', 'proj-empty');
    expect(loadAnswerDraft('proj-empty')).toBe('');
  });
});

describe('DAY 8-B P0-2 — CEO engine meta filter', () => {
  it('flags engine meta copy', () => {
    expect(isEngineMetaCopy('Prior turn CLOSED — preserved in review.')).toBe(true);
    expect(isEngineMetaCopy('Multi-fact utterance — problem')).toBe(true);
    expect(isEngineMetaCopy('의미 라우팅: problem')).toBe(true);
    expect(isUserFacingSurfaceCopy('10~50인 스타트업 CEO와 PM')).toBe(true);
  });

  it('confirmed facts omit gapState engine rationale fallback', () => {
    const gapState: GapKnowledgeState = {
      version: 1,
      gaps: {
        businessOneLiner: {
          gapId: 'businessOneLiner',
          completeness: 'CLOSED',
          sourceTurnId: 't1',
          sourceReviewId: 'r1',
          evidence: [],
          confidence: 'medium',
          lastUpdated: '2026-09-05T00:00:00.000Z',
          rationale: 'Prior turn CLOSED — preserved in review.',
        },
        problemJtbd: {
          gapId: 'problemJtbd',
          completeness: 'CLOSED',
          sourceTurnId: 't1',
          sourceReviewId: 'r1',
          evidence: [
            {
              factKey: 'problem',
              value: '회의마다 전략 검토를 처음부터 다시 하는 문제',
              evidenceClass: 'FACT',
            },
          ],
          confidence: 'high',
          lastUpdated: '2026-09-05T00:00:00.000Z',
          rationale: 'Multi-fact utterance — problem',
        },
      },
      lastReviewByGap: {},
    };

    const review = {
      known: ['businessOneLiner'],
      extractedFacts: [],
      rationale: '답변이 충분합니다 — problemJtbd gap CLOSED, 다음 주제로 진행.',
    } as AnswerReview;

    const turn: AiPmLoopTurn = {
      issueId: 'problem_definition',
      answer: 'test',
      appliedAt: '1',
      review,
    };

    const surfaces = buildCeoSixSurfaces({
      lastTurn: turn,
      gapState,
    });

    const joined = surfaces.confirmedFacts.join('\n');
    expect(joined).not.toMatch(/Prior turn CLOSED/i);
    expect(joined).not.toMatch(/Multi-fact utterance/i);
    expect(joined).toMatch(/회의마다 전략 검토/);
    expect(joined).toMatch(/확인됨: 사업 한 줄/);
  });
});
