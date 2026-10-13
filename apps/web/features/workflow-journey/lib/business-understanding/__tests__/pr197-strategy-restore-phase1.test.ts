/**
 * PR #197 Phase 1 — D1–D7 strategy restore.
 * Success = understanding verification + answer-dependent judgment,
 * not 8-turn completion.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { applyBusinessChoiceThroughLoop } from '../apply-business-choice-through-loop';
import { buildAiPmSimpleQuestionSnapshot } from '../ai-pm-simple-question-presenter';
import { buildAnswerReview } from '../build-answer-review';
import { hasValidationEvidenceCue } from '../semantic-slot-normalization';
import {
  ACCURATE_CHOICE_LABEL,
  REJECT_CHOICE_LABEL,
  UNKNOWN_CHOICE_LABEL,
  buildBusinessChoiceQuestion,
} from '../build-business-choice-question';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { decideNextQuestionFromReview } from '../decide-next-question-from-review';
import { evaluateStageReadiness } from '../evaluate-stage-readiness';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { resolveTurnDecision } from '../resolve-turn-decision';
import { createEmptyGapState } from '../update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';

const S4 = `# 구독 박스
서비스: 아이 간식을 매주 집 앞으로 보내는 구독 박스
대상: 맞벌이 부모
문제: 장을 볼 시간이 없고 과자 고르기가 피곤하다
수익: 월 구독`;

const S1 = `# 소상공인 배송 SaaS
서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 반찬가게·꽃집 등 직접 배송 소상공인
문제: 주문과 배송을 따로 관리해야 함
수익: 월 구독`;

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

function reset(projectId: string, documentText: string) {
  clearAiPmLoopState(projectId);
  saveWorkspaceDocumentText(documentText, projectId);
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
}

function livingFrom(documentText: string, projectId: string) {
  const loop = loadAiPmLoopState(projectId);
  const understanding = buildBusinessUnderstanding(documentText);
  const memory = buildConversationMemoryFromSources({
    projectId,
    documentText,
    turns: loop.turns,
    gapState: loop.gapState,
  });
  return buildLivingUnderstandingState({
    documentText,
    understanding,
    turns: loop.turns,
    memory,
    gapState: loop.gapState,
  });
}

function closed(gapId: string) {
  return {
    gapId,
    completeness: 'CLOSED' as const,
    sourceTurnId: 't',
    sourceReviewId: 'r',
    evidence: [],
    confidence: 'high' as const,
    lastUpdated: '2026-10-13T00:00:00.000Z',
    rationale: 'closed',
  };
}

describe('PR #197 Phase 1 strategy restore', () => {
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

  it('S4 first surface is understanding verification, not document-echo confirm-yes', () => {
    const projectId = 'phase1-s4-surface';
    reset(projectId, S4);
    const living = livingFrom(S4, projectId);
    const gapState = createEmptyGapState();
    const bootstrap = decideNextQuestionFromReview({
      living,
      turns: [],
      memory: null,
      lastReview: null,
      gapState,
      stageReadiness: evaluateStageReadiness({ gapState }),
    });
    const snapshot = buildAiPmSimpleQuestionSnapshot({
      displayQuestionText: bootstrap?.questionText ?? '',
      targetGap: bootstrap?.targetGapId ?? 'customerPersona',
      questionCount: 0,
      living,
      documentText: S4,
    });
    const asked = buildBusinessChoiceQuestion({
      living,
      documentText: S4,
      targetGap: bootstrap?.targetGapId ?? 'customerPersona',
    });

    expect(bootstrap?.targetGapId).not.toBe('businessOneLiner');
    expect(bootstrap?.questionText ?? '').not.toMatch(/제가 이해한 사업은/);
    expect(snapshot.businessSummary).toMatch(/맞벌이|부모|간식|구독/);
    expect(asked.mode).toBe('understanding-verification');
    expect(asked.options.some((o) => o.label === ACCURATE_CHOICE_LABEL)).toBe(true);
    expect(asked.options.some((o) => o.label === UNKNOWN_CHOICE_LABEL)).toBe(true);
    expect(asked.options.some((o) => o.label === REJECT_CHOICE_LABEL)).toBe(true);
    expect(asked.questionText).toMatch(/이해/);
    expect(asked.questionText).not.toMatch(/제가 이해한 사업은 「/);
  });

  it('accurate customer confirm CLOSEs completeness but stays CLAIM/ASSUMPTION', () => {
    const { review } = buildAnswerReview({
      turnId: 's4-accurate',
      askedGapId: 'customerPersona',
      askedQuestionText: '주요 고객은 누구인가요?',
      askedIssueId: 'customer_definition',
      userAnswer: '이 서비스를 가장 필요로 하는 사람은 맞벌이 부모입니다.',
      displayedQuestionText: '주요 고객은 누구인가요?',
    });
    const customerFact = review.extractedFacts.find((f) => f.key === 'customer');
    expect(review.gapVerdicts.customerPersona?.completeness).toBe('CLOSED');
    expect(customerFact?.evidenceClass).toBe('ASSUMPTION');
    expect(customerFact?.evidenceClass).not.toBe('FACT');
  });

  it('unknown customer keeps OPEN and does not invent FACT', () => {
    const { review } = buildAnswerReview({
      turnId: 's4-unknown',
      askedGapId: 'customerPersona',
      askedQuestionText: '주요 고객은 누구인가요?',
      askedIssueId: 'customer_definition',
      userAnswer: '아직 모르겠습니다.',
      displayedQuestionText: '주요 고객은 누구인가요?',
    });
    expect(review.gapVerdicts.customerPersona?.completeness).not.toBe('CLOSED');
    expect(review.extractedFacts.every((f) => f.evidenceClass !== 'FACT')).toBe(true);
  });

  it('S4 parents vs 20s change understanding and next action', () => {
    const parentsId = 'phase1-s4-parents';
    const twentiesId = 'phase1-s4-20s';
    reset(parentsId, S4);
    reset(twentiesId, S4);

    const living = livingFrom(S4, parentsId);
    const asked = buildBusinessChoiceQuestion({
      living,
      documentText: S4,
      targetGap: 'customerPersona',
    });
    const accurate = asked.options.find((o) => o.kind === 'accurate');
    const twenties =
      asked.options.find(
        (o) => o.kind === 'specific' && /20대|혼자/.test(`${o.label}${o.answerText}`),
      ) ?? {
        id: 's4-20s',
        label: '혼자 사는 20대',
        answerText: '이 서비스를 가장 필요로 하는 사람은 혼자 사는 20대입니다.',
        kind: 'specific' as const,
        appliesToGap: 'customerPersona',
        evidenceClassHint: 'ASSUMPTION' as const,
      };
    expect(accurate).toBeTruthy();

    const afterParents = applyBusinessChoiceThroughLoop({
      projectId: parentsId,
      documentText: S4,
      option: accurate!,
    });
    const afterTwenties = applyBusinessChoiceThroughLoop({
      projectId: twentiesId,
      documentText: S4,
      option: twenties,
    });

    expect(afterParents.livingAfter.spine.customer).toMatch(/맞벌이|부모/);
    expect(afterTwenties.livingAfter.spine.customer).toMatch(/20대|혼자/);
    expect(afterParents.livingAfter.spine.customer).not.toBe(
      afterTwenties.livingAfter.spine.customer,
    );
    expect(afterParents.nextTargetGap).not.toBe('solution');
    expect(afterTwenties.nextTargetGap).not.toBe('solution');

    const parentsNext = buildBusinessChoiceQuestion({
      living: afterParents.livingAfter,
      documentText: S4,
      targetGap: afterParents.nextTargetGap,
    });
    const twentiesNext = buildBusinessChoiceQuestion({
      living: afterTwenties.livingAfter,
      documentText: S4,
      targetGap: afterTwenties.nextTargetGap,
    });
    expect(parentsNext.businessSummary).toMatch(/맞벌이|부모/);
    expect(twentiesNext.businessSummary).toMatch(/20대|혼자/);
    expect(
      afterParents.nextTargetGap !== afterTwenties.nextTargetGap ||
        parentsNext.questionText !== twentiesNext.questionText ||
        parentsNext.businessSummary !== twentiesNext.businessSummary,
    ).toBe(true);
  });

  it('S1 payer specified vs unknown diverge; unknown stays OPEN', () => {
    const specifiedId = 'phase1-s1-payer-yes';
    const unknownId = 'phase1-s1-payer-no';
    reset(specifiedId, S1);
    reset(unknownId, S1);

    const living = livingFrom(S1, specifiedId);
    const asked = buildBusinessChoiceQuestion({
      living,
      documentText: S1,
      targetGap: 'payer',
    });
    const specified =
      asked.options.find((o) => o.kind === 'specific' && /사장|관리자|본사/.test(o.label)) ??
      asked.options.find((o) => o.kind === 'accurate');
    const unknown = asked.options.find((o) => o.kind === 'unknown');
    expect(specified).toBeTruthy();
    expect(unknown).toBeTruthy();

    const afterYes = applyBusinessChoiceThroughLoop({
      projectId: specifiedId,
      documentText: S1,
      option: specified!,
    });
    const afterNo = applyBusinessChoiceThroughLoop({
      projectId: unknownId,
      documentText: S1,
      option: unknown!,
    });

    const yesPayer = loadAiPmLoopState(specifiedId).gapState?.gaps.payer?.completeness;
    const noPayer = loadAiPmLoopState(unknownId).gapState?.gaps.payer?.completeness;
    expect(noPayer).not.toBe('CLOSED');
    expect(afterNo.nextTargetGap).not.toBe('solution');
    expect(
      yesPayer !== noPayer || afterYes.nextTargetGap !== afterNo.nextTargetGap,
    ).toBe(true);
  });

  it('T7: customer+problem CLOSED and payer OPEN → next payer, not solution', () => {
    const gapState = createEmptyGapState();
    gapState.gaps.customerPersona = closed('customerPersona');
    gapState.gaps.problemJtbd = closed('problemJtbd');
    const living = livingFrom(S4, 'phase1-t7');
    const turned = resolveTurnDecision({
      living,
      gapState,
      stageReadiness: evaluateStageReadiness({ gapState }),
      turns: [],
    });
    expect(turned.targetGapId).toBe('payer');
    expect(turned.mode).toBe('t7-payer');
  });

  it('FIX-10: solution is not next while customer is still open', () => {
    const gapState = createEmptyGapState();
    const living = livingFrom(S4, 'phase1-fix10');
    const turned = resolveTurnDecision({
      living,
      gapState,
      stageReadiness: evaluateStageReadiness({ gapState }),
      turns: [],
    });
    expect(turned.targetGapId).not.toBe('solution');
    expect(turned.targetGapId).not.toBe('alternativesCompetitors');
  });

  it('validation cue can FACT; founder confirm without cue cannot', () => {
    const claimed = buildAnswerReview({
      turnId: 'claim',
      askedGapId: 'validationTestability',
      askedQuestionText: '실제 결제 증거가 있나요?',
      askedIssueId: 'market_validation',
      userAnswer: '고객이 분명히 돈을 낼 것 같습니다.',
      displayedQuestionText: '실제 결제 증거가 있나요?',
    });
    const validated = buildAnswerReview({
      turnId: 'validated',
      askedGapId: 'validationTestability',
      askedQuestionText: '실제 결제 증거가 있나요?',
      askedIssueId: 'market_validation',
      userAnswer: '실제 결제 3건이 있습니다.',
      displayedQuestionText: '실제 결제 증거가 있나요?',
    });
    expect(claimed.review.gapVerdicts.validationTestability?.completeness).not.toBe(
      'CLOSED',
    );
    expect(
      claimed.review.extractedFacts.every((f) => f.evidenceClass !== 'FACT'),
    ).toBe(true);
    expect(hasValidationEvidenceCue(validated.review.userAnswer)).toBe(true);
    expect(hasValidationEvidenceCue(claimed.review.userAnswer)).toBe(false);
    if (validated.review.extractedFacts.length > 0) {
      expect(
        validated.review.extractedFacts.some((f) => f.evidenceClass === 'FACT'),
      ).toBe(true);
    }
  });
});
