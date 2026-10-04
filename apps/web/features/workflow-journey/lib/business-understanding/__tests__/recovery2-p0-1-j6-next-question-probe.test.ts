import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmAnswerFirstRoutingV1ForTest } from '../ai-pm-answer-first-routing-policy-v1';
import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';
import { setAiPmNoAskPolicyV1ForTest } from '../ai-pm-no-ask-policy-v1';
import { applyNoAskPolicy } from '../ai-pm-no-ask-policy';
import { applyQuestionPolicy } from '../ai-pm-question-policy';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { decideNextQuestionFromReview, isNextQuestionDecision } from '../decide-next-question-from-review';
import { evaluateStageReadiness } from '../evaluate-stage-readiness';
import {
  inferTargetGapFromQuestionText,
  isBusinessUnderstandingConfirmQuestion,
} from '../gap-question-map';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { extractConfirmKnownValueFromQuestion } from '../ai-pm-question-presentation';
import { appendLoopTurnWithReview, runLoopAnswerProcessing } from '../process-loop-answer';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import { commitFirstAskAfterUnderstandingConfirm } from '../understanding-confirm-ask-transition';
import { getClosedGapIds } from '../update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';

const PROJECT_ID = 'recovery2-p0-1-j6-probe';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';

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

function clippedSource(): string {
  return `${LONG_SOURCE.trim().replace(/\s+/g, ' ').slice(0, 79).trim()}…`;
}

describe('J6 next-question probe after business Confirm Yes', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    setAiPmNoAskPolicyV1ForTest(true);
    setAiPmAnswerFirstRoutingV1ForTest(true);
    setAiPmJudgmentFix10V1ForTest(true);
    stubSessionStorage();
    clearAiPmLoopState(PROJECT_ID);
    saveWorkspaceDocumentText(LONG_SOURCE, PROJECT_ID);
    patchAiPmLoopState(
      {
        readingCompleted: true,
        dismissedReadAck: true,
        phase: 'issue',
      },
      PROJECT_ID,
    );
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmNoAskPolicyV1ForTest(null);
    setAiPmAnswerFirstRoutingV1ForTest(null);
    setAiPmJudgmentFix10V1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('dumps askedGap/factKey/review/gapState and next-question layers', () => {
    const understanding = buildBusinessUnderstanding(LONG_SOURCE);
    const first = commitFirstAskAfterUnderstandingConfirm({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding,
      entities: null,
    });
    const firstQ =
      first.lastDecision?.questionText ?? first.lockedAskSurface?.questionText ?? '';
    const confirmGapId =
      first.lastDecision?.confirmGapId ?? first.lastDecision?.targetGapId ?? null;
    const known =
      first.lastDecision?.confirmKnownValue?.trim() ||
      extractConfirmKnownValueFromQuestion(firstQ) ||
      clippedSource();

    expect(isBusinessUnderstandingConfirmQuestion(firstQ)).toBe(true);
    expect(confirmGapId).toBe('businessOneLiner');
    expect(inferTargetGapFromQuestionText(firstQ)).toBe('businessOneLiner');

    const askedGap = inferTargetGapFromQuestionText(firstQ) ?? confirmGapId;
    const semantic = interpretAnswerSemantics({
      answer: known,
      askedIssueId: first.currentIssueId ?? 'bm_design',
      askedTargetGap: askedGap,
    });

    appendLoopTurnWithReview(
      {
        issueId: first.currentIssueId ?? 'bm_design',
        answer: known,
        appliedAt: '2026-10-04T23:20:00.000Z',
        semanticFactKey: semantic.factKey,
        semanticFactKeys: semantic.facts.map((f) => f.key),
        targetGap: askedGap ?? 'businessOneLiner',
        intent: semantic.intent,
        askedQuestionText: firstQ,
      },
      {
        askedGapId: askedGap ?? 'businessOneLiner',
        askedQuestionText: firstQ,
        askedIssueId: first.currentIssueId ?? 'bm_design',
        userAnswer: known,
        displayedQuestionText: firstQ,
      },
      PROJECT_ID,
    );
    const processed = runLoopAnswerProcessing({
      projectId: PROJECT_ID,
      documentText: LONG_SOURCE,
      understanding,
    });
    const turn = processed.loop.turns.at(-1);
    const review = turn?.review;
    const gapState = processed.loop.gapState!;
    const stageReadiness = evaluateStageReadiness({
      gapState,
      loop: processed.loop,
      turns: processed.loop.turns,
    });

    const rawDecide = decideNextQuestionFromReview({
      living: processed.living,
      turns: processed.loop.turns,
      memory: processed.memory,
      lastReview: review ?? null,
      gapState,
      stageReadiness,
    });
    const afterPolicy =
      rawDecide && isNextQuestionDecision(rawDecide)
        ? applyQuestionPolicy({
            decision: rawDecide,
            gapState,
            living: processed.living,
            turns: processed.loop.turns,
            stageReadiness,
            isBootstrap: false,
          })
        : rawDecide;
    const afterNoAsk =
      afterPolicy && isNextQuestionDecision(afterPolicy)
        ? applyNoAskPolicy({
            decision: afterPolicy,
            living: processed.living,
            gapState,
            turns: processed.loop.turns,
            memory: processed.memory,
            stageReadiness,
          })
        : afterPolicy;
    const resolved = resolveNextQuestionDecision({
      living: processed.living,
      turns: processed.loop.turns,
      memory: processed.memory,
      gapState,
      projectId: PROJECT_ID,
    });

    const evidence = {
      firstQuestion: firstQ,
      confirmGapId,
      known,
      askedGap,
      factKey: semantic.factKey,
      answerKind: semantic.intent,
      extractedFacts: review?.extractedFacts.map((f) => ({ key: f.key, value: f.value })) ?? [],
      gapBusiness: gapState.gaps.businessOneLiner,
      gapCustomer: gapState.gaps.customerPersona,
      closed: getClosedGapIds(gapState),
      livingCustomer: processed.living.spine.customer,
      rawDecide: rawDecide
        ? { gap: rawDecide.targetGapId, q: rawDecide.questionText, reason: rawDecide.reason }
        : null,
      afterPolicy: afterPolicy
        ? {
            gap: afterPolicy.targetGapId,
            q: afterPolicy.questionText,
            reason: afterPolicy.reason,
          }
        : null,
      afterNoAsk: afterNoAsk
        ? {
            gap: afterNoAsk.targetGapId,
            q: afterNoAsk.questionText,
            reason: afterNoAsk.reason,
          }
        : null,
      resolved: resolved
        ? {
            gap: 'targetGapId' in resolved ? resolved.targetGapId : resolved.targetGap,
            q: resolved.questionText,
          }
        : null,
    };
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(evidence, null, 2));

    expect(semantic.factKey).toBe('business');
    expect(review?.extractedFacts.some((f) => f.key === 'customer')).toBe(false);
    expect(gapState.gaps.businessOneLiner?.completeness).toBe('CLOSED');
    expect(gapState.gaps.customerPersona?.completeness ?? 'OPEN').not.toBe('CLOSED');
    expect(rawDecide?.targetGapId).toBe('customerPersona');
    expect(resolved && 'targetGapId' in resolved ? resolved.targetGapId : resolved?.targetGap).toBe(
      'customerPersona',
    );
    expect(resolved?.questionText ?? '').toMatch(/누구|고객/);
  });
});
