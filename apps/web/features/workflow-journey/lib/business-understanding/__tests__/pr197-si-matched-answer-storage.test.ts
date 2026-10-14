/**
 * Candidate 6 — an SI-matching answer updates the loop once.
 * It does not also append the same sentence onto the SI document.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  loadWorkspaceDocumentText,
  saveWorkspaceDocumentText,
} from '@/features/workflow-journey/lib/workspace-ai-pm-messages';
import type { SiAiPmQuestion } from '@repo/types/domain/strategic-intelligence';

import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import {
  recordSiMatchedAnswerOnLoop,
  resolveSiMatchedAnswerStorage,
} from '../si-matched-answer-storage';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';

const DOC = `# 소상공인 배송 SaaS
서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 반찬가게·꽃집 등 직접 배송 소상공인
문제: 주문과 배송을 따로 관리해야 함
수익: 월 구독`;

const QUESTION: SiAiPmQuestion = {
  questionText: '이 서비스의 비용은 누가 내나요?',
  whyAsking: '결제 주체를 확인해야 다음 판단을 할 수 있습니다.',
  evidenceSought: '누가 돈을 내는지',
  kind: 'payer_job',
  source: 'si-v1-ai-pm-bind',
};

const ANSWER = '서비스 비용은 매장 사장님이 지불합니다.';

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

describe('PR #197 SI-matched answer storage', () => {
  beforeEach(() => {
    stubSessionStorage();
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
  });

  it('keeps a matching SI ask on the loop and does not append the document', () => {
    const matched = resolveSiMatchedAnswerStorage({
      siAskText: QUESTION.questionText,
      liveAskText: QUESTION.questionText,
    });
    const different = resolveSiMatchedAnswerStorage({
      siAskText: QUESTION.questionText,
      liveAskText: '지금 가장 크게 해결하려는 불편은 무엇인가요?',
    });
    expect(matched.updateLoop).toBe(true);
    expect(matched.appendDocument).toBe(false);
    expect(matched.updateLoop && matched.appendDocument).toBe(false);
    expect(different.updateLoop).toBe(true);
    expect(different.appendDocument).toBe(false);
  });

  it('writes understanding, evidence, and judgment once', () => {
    const projectId = 'si-matched-once';
    clearAiPmLoopState(projectId);
    saveWorkspaceDocumentText(DOC, projectId);
    patchAiPmLoopState(
      {
        readingCompleted: true,
        dismissedReadAck: true,
        phase: 'answer',
        currentIssueId: 'problem_definition',
        ceoJudgment: emptyCeoJudgmentState(0),
      },
      projectId,
    );

    const recorded = recordSiMatchedAnswerOnLoop({
      projectId,
      documentText: DOC,
      answer: ANSWER,
      question: QUESTION,
    });
    const loop = loadAiPmLoopState(projectId);
    const storedDoc = loadWorkspaceDocumentText(projectId) ?? '';

    expect(recorded.storedCopies).toBe(1);
    expect(recorded.documentContainsAnswerMark).toBe(false);
    expect(recorded.reviewPresent).toBe(true);
    expect(recorded.judgmentPresent).toBe(true);
    expect(recorded.targetGap).toBe('payer');
    expect(storedDoc).not.toContain('[Founder evidence]');
    expect(storedDoc.split(ANSWER).length - 1).toBe(1);
    expect(loop.turns.filter((turn) => turn.answer === ANSWER)).toHaveLength(1);
    expect(loop.turns[0]?.review?.extractedFacts.length ?? 0).toBeGreaterThan(0);
    expect(loop.ceoJudgment?.conclusion.trim().length ?? 0).toBeGreaterThan(0);
    expect(loop.gapState?.gaps.payer?.evidence?.length ?? 0).toBeGreaterThan(0);
  });
});
