/**
 * PR #197 — V3 stage trace. Records review / gapState / raw decision / overlays.
 * Product engines are not modified.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { applyJudgmentNextQuestionBinding } from '../ai-pm-judgment-next-question-binding';
import { applyNoAskPolicy } from '../ai-pm-no-ask-policy';
import { applyBusinessChoiceThroughLoop } from '../apply-business-choice-through-loop';
import { buildBusinessChoiceQuestion } from '../build-business-choice-question';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { decideNextQuestionFromReview, isNextQuestionDecision } from '../decide-next-question-from-review';
import { evaluateStageReadiness } from '../evaluate-stage-readiness';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
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

const PID = 'v3-stage-trace';
const OUT = '/tmp/pr197-v3-stage-trace.json';

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

function reset() {
  clearAiPmLoopState(PID);
  saveWorkspaceDocumentText(DOC, PID);
  patchAiPmLoopState(
    {
      readingCompleted: true,
      dismissedReadAck: true,
      phase: 'answer',
      currentIssueId: 'problem_definition',
      ceoJudgment: emptyCeoJudgmentState(0),
    },
    PID,
  );
}

function living() {
  const loop = loadAiPmLoopState(PID);
  const understanding = buildBusinessUnderstanding(DOC);
  const memory = buildConversationMemoryFromSources({
    projectId: PID,
    documentText: DOC,
    turns: loop.turns,
  });
  return { loop, understanding, memory, living: buildLivingUnderstandingState({
    documentText: DOC,
    understanding,
    turns: loop.turns,
    memory,
  }) };
}

function apply(gap: string, pattern: RegExp) {
  const ctx = living();
  const question = buildBusinessChoiceQuestion({
    living: ctx.living,
    documentText: DOC,
    targetGap: gap,
  });
  const option = question.options.find((o) => o.kind === 'specific' && pattern.test(o.label))!;
  const result = applyBusinessChoiceThroughLoop({
    projectId: PID,
    documentText: DOC,
    option,
    askedQuestionText: question.questionText,
  });
  return { question, option, result };
}

function stageDump(label: string) {
  const { loop, memory, living: live } = living();
  const last = [...loop.turns].reverse().find((t) => !t.superseded && t.review);
  const review = last?.review ?? null;
  const gapState = loop.gapState;
  const readiness = evaluateStageReadiness({ gapState, loop, turns: loop.turns });
  const raw = decideNextQuestionFromReview({
    living: live,
    turns: loop.turns,
    memory,
    lastReview: review,
    gapState,
    stageReadiness: readiness,
  });
  let afterNoAsk = raw && isNextQuestionDecision(raw) ? raw : null;
  if (afterNoAsk) {
    afterNoAsk = applyNoAskPolicy({
      decision: afterNoAsk,
      living: live,
      gapState,
      turns: loop.turns,
      memory,
      stageReadiness: readiness,
      judgment: loop.ceoJudgment,
      judgmentTraces: loop.judgmentTraces,
    });
  }
  const afterFix10 = afterNoAsk
    ? applyJudgmentNextQuestionBinding({
        decision: afterNoAsk,
        judgment: loop.ceoJudgment,
        turns: loop.turns,
      })
    : null;
  const final = resolveNextQuestionDecision({
    living: live,
    turns: loop.turns,
    memory,
    gapState,
    projectId: PID,
    judgment: loop.ceoJudgment,
  });
  const verdicts: Record<string, string> = {};
  if (review) {
    for (const [k, v] of Object.entries(review.gapVerdicts)) {
      verdicts[k] = v.completeness;
    }
  }
  const closed: Record<string, string> = {};
  for (const id of ['businessOneLiner', 'customerPersona', 'payer', 'problemJtbd']) {
    closed[id] = gapState?.gaps[id]?.completeness ?? 'OPEN';
  }
  return {
    label,
    semantic: last
      ? interpretAnswerSemantics({
          answer: last.answer ?? '',
          askedIssueId: last.issueId,
          askedTargetGap: last.targetGap,
        })
      : null,
    review: review
      ? {
          askedGapId: review.askedGapId,
          recommendedAction: review.recommendedAction,
          verdicts,
          contradictions: review.contradictions.length,
        }
      : null,
    gapState: closed,
    readiness: {
      stageAReady: readiness.stageAReady,
      stageBAllowed: readiness.stageBAllowed,
      blocker: readiness.blocker,
    },
    judgment: loop.ceoJudgment
      ? {
          customer: loop.ceoJudgment.dimensions.customer.status,
          problem: loop.ceoJudgment.dimensions.problem.status,
          problemSummary: loop.ceoJudgment.dimensions.problem.summary,
          solution: loop.ceoJudgment.dimensions.solution.status,
          customerChange: loop.ceoJudgment.dimensions.customerChange.status,
          conclusion: loop.ceoJudgment.conclusion,
        }
      : null,
    rawNext: raw
      ? { gap: raw.targetGap, q: raw.questionText, type: raw.questionType ?? 'open', why: raw.whyNow }
      : null,
    afterNoAsk: afterNoAsk
      ? {
          gap: afterNoAsk.targetGap,
          q: afterNoAsk.questionText,
          type: afterNoAsk.questionType ?? 'open',
        }
      : null,
    afterFix10: afterFix10
      ? {
          gap: afterFix10.targetGap,
          q: afterFix10.questionText,
          type: afterFix10.questionType ?? 'open',
          rationale: afterFix10.actionRationale,
        }
      : null,
    final: final
      ? { gap: final.targetGap, q: final.questionText, type: final.questionType ?? 'open' }
      : null,
    overwrite:
      raw && afterFix10
        ? raw.targetGap !== afterFix10.targetGap || raw.questionText !== afterFix10.questionText
        : false,
  };
}

describe('PR #197 V3 stage trace', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    stubSessionStorage();
    reset();
  });
  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('dumps review vs FIX-10 after S1 problem and customer', () => {
    apply('problemJtbd', /주문|배송/);
    const afterProblem = stageDump('after-problem');
    apply('customerPersona', /반찬/);
    const afterCustomer = stageDump('after-customer');

    reset();
    applyBusinessChoiceThroughLoop({
      projectId: PID,
      documentText: DOC,
      option: {
        id: 'v-yes',
        label: '실제 결제나 사용 증거가 있습니다',
        answerText: '이미 결제 3건이 있어 고객이 돈을 내고 있습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'ASSUMPTION',
      },
    });
    const payYes = stageDump('pay-yes');

    reset();
    applyBusinessChoiceThroughLoop({
      projectId: PID,
      documentText: DOC,
      option: {
        id: 'v-no',
        label: '아직 없다',
        answerText: '아직 실제 결제·사용 증거는 없습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'UNKNOWN',
      },
    });
    const payNo = stageDump('pay-no');

    const out = { afterProblem, afterCustomer, payYes, payNo };
    writeFileSync(OUT, JSON.stringify(out, null, 2));
    expect(afterCustomer.overwrite).toBe(true);
  });
});
