/**
 * RCA probe only — no product behavior change.
 * Replays Production 36b241e J2→J3 A→B→C through the canonical
 * Answer → Review → Gap → Readiness → Next Question pipeline
 * with Production-baked flags ON vs local-dev-like flags (V3 only).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { setAiPmAnswerTargetBindingV1ForTest } from '../ai-pm-answer-target-binding-policy-v1';
import { setAiPmBusinessReviewV1ForTest } from '../ai-pm-business-review-v1';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { setAiPmJudgmentFix10V1ForTest } from '../ai-pm-judgment-fix10-v1';
import { syncJudgmentAfterAnswer } from '../ai-pm-judgment-loop-sync';
import { setAiPmNoAskPolicyV1ForTest } from '../ai-pm-no-ask-policy-v1';
import {
  applyNoGapTermination,
  evaluateNoGapTermination,
  hasNoAskableGap,
  hasNoMeaningfulGap,
} from '../ai-pm-no-gap-termination';
import { evaluateJudgmentStop } from '../ai-pm-question-budget';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import {
  decideNextQuestionFromReview,
  isNextQuestionDecision,
} from '../decide-next-question-from-review';
import { evaluateStageReadiness, STAGE_A_REQUIRED_GAPS } from '../evaluate-stage-readiness';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  appendLoopTurnWithReview,
  runLoopAnswerProcessing,
} from '../process-loop-answer';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import { commitFirstAskAfterUnderstandingConfirm } from '../understanding-confirm-ask-transition';
import { isGapAskable } from '../update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  AI_PM_LOOP_ISSUE_ORDER,
  type AiPmLoopIssueId,
} from '../workspace-ai-pm-loop-types';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
  supersedeTurnAndInvalidateDownstream,
} from '../workspace-ai-pm-loop-store';

const TITLE = '양조장 체험 관광 서비스';
const LONG_SOURCE =
  '다양한 관광객이 늘며 개인별 다양한 경험을 중요하게 생각한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광을 연결하고, 양조장의 온라인 마케팅을 지원하는 사업이다.';
const CUSTOMER_A = 'A 관광객만 대상입니다.';
const CUSTOMER_B = 'B 내국인 애호가입니다.';
const CUSTOMER_C = 'C 전통주와 양조장 체험을 좋아하는 내국인과 외국인입니다.';

type FlagMode = 'production' | 'local_v3_only';

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
}

function applyFlagMode(mode: FlagMode) {
  setV3ReviewPipelineForTest(true);
  if (mode === 'production') {
    setAiPmJudgmentAggregationV1ForTest(true);
    setAiPmBusinessReviewV1ForTest(true);
    setAiPmNoAskPolicyV1ForTest(true);
    setAiPmAnswerTargetBindingV1ForTest(true);
    setAiPmJudgmentFix10V1ForTest(true);
  } else {
    setAiPmJudgmentAggregationV1ForTest(false);
    setAiPmBusinessReviewV1ForTest(false);
    setAiPmNoAskPolicyV1ForTest(false);
    setAiPmAnswerTargetBindingV1ForTest(false);
    setAiPmJudgmentFix10V1ForTest(false);
  }
}

function resetFlags() {
  setV3ReviewPipelineForTest(null);
  setAiPmJudgmentAggregationV1ForTest(null);
  setAiPmBusinessReviewV1ForTest(null);
  setAiPmNoAskPolicyV1ForTest(null);
  setAiPmAnswerTargetBindingV1ForTest(null);
  setAiPmJudgmentFix10V1ForTest(null);
}

function gapSnapshot(gapState: ReturnType<typeof loadAiPmLoopState>['gapState']) {
  const gaps = gapState?.gaps ?? {};
  return Object.fromEntries(
    Object.entries(gaps).map(([id, rec]) => [id, rec.completeness]),
  );
}

function summarizeDecision(decision: ReturnType<typeof resolveNextQuestionDecision>) {
  if (!decision) return null;
  return {
    targetGap: decision.targetGap,
    targetGapId: 'targetGapId' in decision ? decision.targetGapId : null,
    issueId: decision.issueId,
    questionType: 'questionType' in decision ? decision.questionType : null,
    action: 'action' in decision ? decision.action : null,
    reason: 'reason' in decision ? decision.reason : null,
    questionText: decision.questionText,
    drivenByReview: isNextQuestionDecision(decision),
  };
}

function snapshotPipeline(projectId: string, label: string) {
  const loop = loadAiPmLoopState(projectId);
  const lastReviewTurn = [...loop.turns].reverse().find((t) => !t.superseded && t.review);
  const lastReview = lastReviewTurn?.review ?? null;
  const gapState = loop.gapState;
  const stageReadiness = evaluateStageReadiness({
    gapState: gapState ?? { version: 1, gaps: {}, lastReviewByGap: {} },
    loop,
    turns: loop.turns,
  });
  const fromReview = lastReview
    ? decideNextQuestionFromReview({
        living: buildLivingUnderstandingState({
          documentText: LONG_SOURCE,
          understanding: buildBusinessUnderstanding(LONG_SOURCE),
          turns: loop.turns,
          memory: buildConversationMemoryFromSources({
            projectId,
            documentText: LONG_SOURCE,
            turns: loop.turns,
          }),
        }),
        turns: loop.turns,
        memory: buildConversationMemoryFromSources({
          projectId,
          documentText: LONG_SOURCE,
          turns: loop.turns,
        }),
        lastReview,
        gapState: gapState ?? { version: 1, gaps: {}, lastReviewByGap: {} },
        stageReadiness,
      })
    : null;
  const noGapInput = {
    decision: fromReview,
    living: buildLivingUnderstandingState({
      documentText: LONG_SOURCE,
      understanding: buildBusinessUnderstanding(LONG_SOURCE),
      turns: loop.turns,
    }),
    turns: loop.turns,
    gapState: gapState ?? { version: 1, gaps: {}, lastReviewByGap: {} },
    judgment: loop.ceoJudgment ?? null,
  };
  const noGapVerdict = evaluateNoGapTermination(noGapInput);
  const afterNoGap = applyNoGapTermination(noGapInput);
  const resolved = resolveNextQuestionDecision({
    living: buildLivingUnderstandingState({
      documentText: LONG_SOURCE,
      understanding: buildBusinessUnderstanding(LONG_SOURCE),
      turns: loop.turns,
      memory: buildConversationMemoryFromSources({
        projectId,
        documentText: LONG_SOURCE,
        turns: loop.turns,
      }),
    }),
    turns: loop.turns,
    memory: buildConversationMemoryFromSources({
      projectId,
      documentText: LONG_SOURCE,
      turns: loop.turns,
    }),
    projectId,
    gapState: loop.gapState,
    judgment: loop.ceoJudgment ?? undefined,
    persistLastDecision: false,
  });
  const stop = loop.ceoJudgment
    ? evaluateJudgmentStop({
        questionCount: loop.ceoJudgment.questionCount,
        judgment: loop.ceoJudgment,
      })
    : null;
  const budgetBlock = Boolean(stop?.shouldStop);
  const finishBranch =
    resolved && !budgetBlock
      ? 'keep_question_loop'
      : 'open_business_review_or_judgment';

  return {
    label,
    turnCount: loop.turns.length,
    activeTurnCount: loop.turns.filter((t) => !t.superseded).length,
    actionableTurnCount: loop.turns.filter(
      (t) => !t.superseded && Boolean(t.answer?.trim()) && t.intent !== 'why_meta',
    ).length,
    turns: loop.turns.map((t) => ({
      issueId: t.issueId,
      targetGap: t.targetGap,
      superseded: Boolean(t.superseded),
      intent: t.intent,
      answer: t.answer,
      askedQuestionText: t.askedQuestionText,
      reviewAction: t.review?.recommendedAction ?? null,
      askedGapCompleteness: t.review?.gapVerdicts[t.review.askedGapId]?.completeness ?? null,
    })),
    lastReview: lastReview
      ? {
          askedGapId: lastReview.askedGapId,
          recommendedAction: lastReview.recommendedAction,
          extractedFacts: lastReview.extractedFacts.map((f) => ({
            key: f.key,
            value: f.value,
            targetGap: f.targetGap,
          })),
          gapVerdicts: Object.fromEntries(
            Object.entries(lastReview.gapVerdicts).map(([id, v]) => [id, v.completeness]),
          ),
        }
      : null,
    gapState: gapSnapshot(gapState),
    gapAskable: Object.fromEntries(
      STAGE_A_REQUIRED_GAPS.map((id) => [
        id,
        isGapAskable(id, gapState ?? { version: 1, gaps: {}, lastReviewByGap: {} }),
      ]),
    ),
    hasNoAskableGap: hasNoAskableGap(gapState ?? { version: 1, gaps: {}, lastReviewByGap: {} }),
    hasNoMeaningfulGap: hasNoMeaningfulGap({
      living: buildLivingUnderstandingState({
        documentText: LONG_SOURCE,
        understanding: buildBusinessUnderstanding(LONG_SOURCE),
        turns: loop.turns,
      }),
      turns: loop.turns,
      gapState: gapState ?? { version: 1, gaps: {}, lastReviewByGap: {} },
    }),
    stageReadiness: {
      stageId: stageReadiness.stageId,
      status: stageReadiness.status,
      stageAReady: stageReadiness.stageAReady,
      stageBAllowed: stageReadiness.stageBAllowed,
      currentStageFocus: stageReadiness.currentStageFocus,
      blocker: stageReadiness.blocker,
      requiredGaps: stageReadiness.requiredGaps,
    },
    decideNextQuestionFromReview: summarizeDecision(fromReview),
    noGapVerdict,
    afterNoGap: summarizeDecision(afterNoGap),
    resolveNextQuestionDecision: summarizeDecision(resolved),
    judgment: loop.ceoJudgment
      ? {
          questionCount: loop.ceoJudgment.questionCount,
          oneLiner: loop.ceoJudgment.oneLiner,
          dimensions: Object.fromEntries(
            Object.entries(loop.ceoJudgment.dimensions).map(([id, d]) => [
              id,
              { status: d.status, summary: d.summary },
            ]),
          ),
        }
      : null,
    judgmentStop: stop,
    budgetBlock,
    finishBranch,
    viewMode: loop.viewMode ?? null,
  };
}

function submitAnswer(projectId: string, answer: string, asked: {
  targetGap: string;
  issueId: AiPmLoopIssueId;
  questionText: string;
}) {
  const appliedAt = new Date().toISOString();
  appendLoopTurnWithReview(
    {
      issueId: asked.issueId,
      answer,
      appliedAt,
      targetGap: asked.targetGap,
      askedQuestionText: asked.questionText,
    },
    {
      askedGapId: asked.targetGap,
      askedQuestionText: asked.questionText,
      askedIssueId: asked.issueId,
      userAnswer: answer,
      displayedQuestionText: asked.questionText,
    },
    projectId,
  );
  const processed = runLoopAnswerProcessing({
    projectId,
    documentText: LONG_SOURCE,
    understanding: buildBusinessUnderstanding(LONG_SOURCE),
  });
  const loop = loadAiPmLoopState(projectId);
  syncJudgmentAfterAnswer({
    projectId,
    living: processed.living,
    loop,
    lastQuestionText: asked.questionText,
    answer,
    beforeState: loop.ceoJudgment ?? null,
  });
  const decision = resolveNextQuestionDecision({
    living: processed.living,
    turns: loadAiPmLoopState(projectId).turns,
    memory: processed.memory,
    projectId,
    gapState: loadAiPmLoopState(projectId).gapState,
    persistLastDecision: true,
  });
  if (decision) {
    patchAiPmLoopState(
      {
        phase: 'answer',
        currentIssueId: decision.issueId,
        lastDecision: isNextQuestionDecision(decision) ? decision : loadAiPmLoopState(projectId).lastDecision,
        lockedAskSurface: {
          issueId: decision.issueId,
          targetGap: decision.targetGap,
          questionText: decision.questionText,
          whyNow: decision.whyNow,
          rationale: decision.rationale,
          score: decision.score ?? 0,
          missingField: 'customer',
        },
      },
      projectId,
    );
  } else {
    patchAiPmLoopState(
      {
        lastDecision: undefined,
        lockedAskSurface: undefined,
        viewMode: 'review',
      },
      projectId,
    );
  }
  return decision;
}

function currentAsk(projectId: string) {
  const loop = loadAiPmLoopState(projectId);
  const locked = loop.lockedAskSurface;
  const last = loop.lastDecision;
  return {
    targetGap: locked?.targetGap ?? last?.targetGap ?? 'customerPersona',
    issueId: (locked?.issueId ?? last?.issueId ?? 'customer_definition') as AiPmLoopIssueId,
    questionText: locked?.questionText ?? last?.questionText ?? '',
    questionType: last && 'questionType' in last ? last.questionType : null,
    confirmKnownValue:
      last && 'confirmKnownValue' in last ? (last.confirmKnownValue as string | undefined) : undefined,
  };
}

function replayJ2J3(projectId: string, mode: FlagMode) {
  applyFlagMode(mode);
  clearAiPmLoopState(projectId);
  patchAiPmLoopState(
    {
      readingCompleted: true,
      dismissedReadAck: true,
      phase: 'issue',
    },
    projectId,
  );

  const understanding = buildBusinessUnderstanding(LONG_SOURCE);
  const afterConfirm = commitFirstAskAfterUnderstandingConfirm({
    projectId,
    documentText: LONG_SOURCE,
    understanding,
    entities: null,
  });

  const firstAsk = currentAsk(projectId);
  const steps: Array<ReturnType<typeof snapshotPipeline> | Record<string, unknown>> = [
    {
      step: 'after_j2_first_ask',
      firstAsk,
      locked: afterConfirm.lockedAskSurface,
      lastDecision: summarizeDecision(afterConfirm.lastDecision ?? null),
    },
  ];

  if (firstAsk.questionType === 'confirm' && firstAsk.confirmKnownValue) {
    submitAnswer(projectId, firstAsk.confirmKnownValue, firstAsk);
    steps.push(snapshotPipeline(projectId, 'after_confirm_yes'));
  }

  const askA = currentAsk(projectId);
  submitAnswer(projectId, CUSTOMER_A, askA);
  steps.push(snapshotPipeline(projectId, 'after_a'));

  supersedeTurnAndInvalidateDownstream(askA.issueId, AI_PM_LOOP_ISSUE_ORDER, projectId);
  const afterEditA = loadAiPmLoopState(projectId);
  const livingAfterEditA = buildLivingUnderstandingState({
    documentText: LONG_SOURCE,
    understanding,
    turns: afterEditA.turns,
    memory: buildConversationMemoryFromSources({
      projectId,
      documentText: LONG_SOURCE,
      turns: afterEditA.turns,
    }),
  });
  const decisionAfterEditA = resolveNextQuestionDecision({
    living: livingAfterEditA,
    turns: afterEditA.turns,
    memory: buildConversationMemoryFromSources({
      projectId,
      documentText: LONG_SOURCE,
      turns: afterEditA.turns,
    }),
    projectId,
    gapState: afterEditA.gapState,
    persistLastDecision: true,
  });
  if (decisionAfterEditA) {
    patchAiPmLoopState(
      {
        phase: 'answer',
        currentIssueId: decisionAfterEditA.issueId,
        lockedAskSurface: {
          issueId: decisionAfterEditA.issueId,
          targetGap: decisionAfterEditA.targetGap,
          questionText: decisionAfterEditA.questionText,
          whyNow: decisionAfterEditA.whyNow,
          rationale: decisionAfterEditA.rationale,
          score: decisionAfterEditA.score ?? 0,
          missingField: 'customer',
        },
      },
      projectId,
    );
  }
  steps.push({
    step: 'after_edit_prior_a',
    decision: summarizeDecision(decisionAfterEditA),
    viewMode: loadAiPmLoopState(projectId).viewMode ?? null,
  });

  const askB = currentAsk(projectId);
  submitAnswer(projectId, CUSTOMER_B, askB);
  steps.push(snapshotPipeline(projectId, 'after_b'));

  supersedeTurnAndInvalidateDownstream(askB.issueId, AI_PM_LOOP_ISSUE_ORDER, projectId);
  const afterEditB = loadAiPmLoopState(projectId);
  const livingAfterEditB = buildLivingUnderstandingState({
    documentText: LONG_SOURCE,
    understanding,
    turns: afterEditB.turns,
    memory: buildConversationMemoryFromSources({
      projectId,
      documentText: LONG_SOURCE,
      turns: afterEditB.turns,
    }),
  });
  const decisionAfterEditB = resolveNextQuestionDecision({
    living: livingAfterEditB,
    turns: afterEditB.turns,
    memory: buildConversationMemoryFromSources({
      projectId,
      documentText: LONG_SOURCE,
      turns: afterEditB.turns,
    }),
    projectId,
    gapState: afterEditB.gapState,
    persistLastDecision: true,
  });
  if (decisionAfterEditB) {
    patchAiPmLoopState(
      {
        phase: 'answer',
        currentIssueId: decisionAfterEditB.issueId,
        lockedAskSurface: {
          issueId: decisionAfterEditB.issueId,
          targetGap: decisionAfterEditB.targetGap,
          questionText: decisionAfterEditB.questionText,
          whyNow: decisionAfterEditB.whyNow,
          rationale: decisionAfterEditB.rationale,
          score: decisionAfterEditB.score ?? 0,
          missingField: 'customer',
        },
      },
      projectId,
    );
  }

  const askC = currentAsk(projectId);
  submitAnswer(projectId, CUSTOMER_C, askC);
  const afterC = snapshotPipeline(projectId, 'after_c');
  steps.push(afterC);

  return {
    mode,
    title: TITLE,
    firstAsk,
    afterC,
    steps,
  };
}

describe('Production 36b241e J3 question-loop RCA', () => {
  beforeEach(() => {
    stubSessionStorage();
  });

  afterEach(() => {
    resetFlags();
    vi.unstubAllGlobals();
  });

  it('proves whether C answer ran the canonical next-question pipeline', () => {
    const production = replayJ2J3('rca-prod-36b241e', 'production');
    const local = replayJ2J3('rca-local-v3-only', 'local_v3_only');

    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify(
        {
          productionFirstAsk: production.firstAsk,
          productionAfterC: production.afterC,
          localFirstAsk: local.firstAsk,
          localAfterC: local.afterC,
        },
        null,
        2,
      ),
    );

    const afterA = production.steps.find((s) => 'label' in s && s.label === 'after_a') as
      | typeof production.afterC
      | undefined;
    const afterB = production.steps.find((s) => 'label' in s && s.label === 'after_b') as
      | typeof production.afterC
      | undefined;

    expect(production.firstAsk.questionType).toBe('confirm');
    expect(production.firstAsk.targetGap).toBe('businessOneLiner');
    expect(afterA?.finishBranch).toBe('keep_question_loop');
    expect(afterB?.finishBranch).toBe('keep_question_loop');

    expect(production.afterC.lastReview).toBeTruthy();
    expect(production.afterC.lastReview?.askedGapId).toBe('customerPersona');
    expect(production.afterC.lastReview?.recommendedAction).toBe('advance');
    expect(production.afterC.lastReview?.extractedFacts.some((f) => /내국인|외국인|전통주/.test(f.value))).toBe(
      true,
    );
    expect(production.afterC.gapState).toEqual({
      businessOneLiner: 'CLOSED',
      customerPersona: 'CLOSED',
    });
    expect(production.afterC.gapAskable.payer).toBe(true);
    expect(production.afterC.gapAskable.problemJtbd).toBe(true);
    expect(production.afterC.stageReadiness.stageAReady).toBe(false);
    expect(production.afterC.stageReadiness.stageId).toBe('A_understanding');
    expect(production.afterC.stageReadiness.blocker).toEqual({ gapId: 'payer', reason: 'OPEN' });
    expect(production.afterC.decideNextQuestionFromReview?.targetGap).toBe('payer');
    expect(production.afterC.afterNoGap?.targetGap).toBe('payer');
    expect(production.afterC.hasNoAskableGap).toBe(false);
    expect(production.afterC.noGapVerdict).toEqual({ terminate: false, reason: 'continue' });
    expect(production.afterC.resolveNextQuestionDecision).toBeTruthy();
    expect(['payer', 'problemJtbd']).toContain(
      production.afterC.resolveNextQuestionDecision?.targetGap,
    );
    expect(production.afterC.budgetBlock).toBe(false);
    expect(production.afterC.judgment?.questionCount).toBe(1);
    expect(production.afterC.finishBranch).toBe('keep_question_loop');
    expect(production.afterC.viewMode).not.toBe('review');
    expect(production.afterC.turnCount).toBe(4);

    expect(local.afterC.finishBranch).toBe('keep_question_loop');
    expect(local.afterC.resolveNextQuestionDecision?.targetGap).toBeTruthy();
  });
});
