import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { applyBusinessChoiceThroughLoop } from '../apply-business-choice-through-loop';
import { resolveBusinessChoiceAnswer } from '../apply-business-choice';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import {
  CORE_BUSINESS_CHOICE_GAPS,
  UNKNOWN_CHOICE_LABEL,
  buildBusinessChoiceQuestion,
  isEscapeChoice,
} from '../build-business-choice-question';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { appendLoopTurnWithReview, runLoopAnswerProcessing } from '../process-loop-answer';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';
import { applyWorkspaceLoopAnswer } from '../workspace-state-update';
import { syncJudgmentAfterAnswer } from '../ai-pm-judgment-loop-sync';
import { resolveGapQuestionBinding } from '../gap-question-map';

const PROJECT_ID = 'mcq-real-loop';

const DELIVERY_DOC = `# 소상공인 배송 SaaS

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

function livingFrom(documentText: string) {
  const understanding = buildBusinessUnderstanding(documentText);
  const memory = buildConversationMemoryFromSources({
    projectId: PROJECT_ID,
    documentText,
    turns: [],
  });
  return buildLivingUnderstandingState({
    documentText,
    understanding,
    turns: [],
    memory,
  });
}

function asked(targetGap: string) {
  return buildBusinessChoiceQuestion({
    living: livingFrom(DELIVERY_DOC),
    documentText: DELIVERY_DOC,
    targetGap,
  });
}

function submitLikeUi(option: ReturnType<typeof asked>['options'][number]) {
  const resolved = resolveBusinessChoiceAnswer(option);
  const binding = resolveGapQuestionBinding(option.appliesToGap);
  const semantic = interpretAnswerSemantics({
    answer: resolved.answerText,
    askedIssueId: binding.issueId,
    askedTargetGap: option.appliesToGap,
  });
  if (!semantic.mergeable) {
    return { persisted: false, semantic, resolved };
  }
  appendLoopTurnWithReview(
    {
      issueId: binding.issueId,
      answer: resolved.answerText,
      appliedAt: `ui-${Date.now()}`,
      semanticFactKey: semantic.factKey,
      semanticFactKeys: semantic.facts.map((fact) => fact.key),
      intent: semantic.intent,
      targetGap: option.appliesToGap,
      askedQuestionText: binding.questionText,
    },
    {
      askedGapId: option.appliesToGap,
      askedQuestionText: binding.questionText,
      askedIssueId: binding.issueId,
      userAnswer: resolved.answerText,
      displayedQuestionText: binding.questionText,
    },
    PROJECT_ID,
  );
  const applied = applyWorkspaceLoopAnswer(binding.issueId, resolved.answerText, PROJECT_ID, {
    semantic,
    askedTargetGap: option.appliesToGap,
  });
  const processed = runLoopAnswerProcessing({
    projectId: PROJECT_ID,
    documentText: DELIVERY_DOC,
    understanding: buildBusinessUnderstanding(DELIVERY_DOC),
  });
  const judgment = syncJudgmentAfterAnswer({
    projectId: PROJECT_ID,
    living: processed.living,
    loop: processed.loop,
    lastQuestionText: binding.questionText,
    answer: resolved.answerText,
  });
  const next = resolveNextQuestionDecision({
    living: processed.living,
    turns: processed.loop.turns,
    memory: processed.memory,
    gapState: processed.loop.gapState,
    projectId: PROJECT_ID,
    judgment: judgment.judgment,
  });
  return {
    persisted: true,
    applied: applied.applied,
    semantic,
    resolved,
    processed,
    judgment,
    next,
  };
}

describe('AI PM MCQ real workspace loop', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    stubSessionStorage();
    clearAiPmLoopState(PROJECT_ID);
    saveWorkspaceDocumentText(DELIVERY_DOC, PROJECT_ID);
    patchAiPmLoopState(
      {
        readingCompleted: true,
        dismissedReadAck: true,
        phase: 'answer',
        currentIssueId: 'problem_definition',
        ceoJudgment: emptyCeoJudgmentState(0),
      },
      PROJECT_ID,
    );
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('1 — after business input the summary names this business, not a validated claim', () => {
    const question = asked('problemJtbd');
    expect(question.businessSummary).toMatch(/배송|주문|소상공인|반찬|꽃집/);
    expect(question.businessSummary).not.toMatch(/매출이 검증|결제가 확인|VALIDATED/);
    expect(question.facts.every((line) => !/VALIDATED|검증 완료/.test(line))).toBe(true);
  });

  it('2 — problem / payer / revenue / alternatives options fit this business', () => {
    for (const gap of CORE_BUSINESS_CHOICE_GAPS) {
      const question = asked(gap);
      expect(question.options.some((option) => option.kind === 'specific')).toBe(true);
      expect(question.options.some((option) => option.label === UNKNOWN_CHOICE_LABEL)).toBe(true);
      expect(question.options.some((option) => option.label === '기타')).toBe(true);
    }
    expect(asked('problemJtbd').options.map((option) => option.label).join(' ')).toMatch(
      /주문|배송/,
    );
    expect(asked('payer').options.map((option) => option.label).join(' ')).toMatch(
      /사장님|본사|관리자|대표|지불/,
    );
    expect(asked('revenueModel').options.map((option) => option.label).join(' ')).toMatch(/구독/);
    expect(asked('alternativesCompetitors').options.map((option) => option.label).join(' ')).toMatch(
      /따로 관리|지금은/,
    );
  });

  it('3 — 기타 waits for text and 아직 모르겠음 does not dead-end', () => {
    const question = asked('payer');
    const other = question.options.find((option) => option.kind === 'other');
    const unknown = question.options.find((option) => option.kind === 'unknown');
    expect(other).toBeTruthy();
    expect(unknown).toBeTruthy();
    expect(isEscapeChoice(other!)).toBe(true);

    const waiting = applyBusinessChoiceThroughLoop({
      projectId: PROJECT_ID,
      documentText: DELIVERY_DOC,
      option: other!,
      freeText: '',
    });
    expect(waiting.waitingForFreeText).toBe(true);
    expect(waiting.persisted).toBe(false);
    expect(loadAiPmLoopState(PROJECT_ID).turns).toHaveLength(0);

    const skipped = applyBusinessChoiceThroughLoop({
      projectId: PROJECT_ID,
      documentText: DELIVERY_DOC,
      option: unknown!,
      askedQuestionText: question.questionText,
    });
    expect(skipped.waitingForFreeText).toBe(false);
    expect(skipped.persisted).toBe(true);
    expect(skipped.conversationContinues).toBe(true);
    expect(skipped.nextTargetGap).not.toBe('payer');
    expect(skipped.nextQuestionText).toBeTruthy();
    expect(skipped.judgmentAfter.conclusion).not.toMatch(/검증 완료|사업성이 충분/);
    expect(loadAiPmLoopState(PROJECT_ID).turns.at(-1)?.intent).toBe('unknown_signal');
  });

  it('4+5 — a specific choice changes judgment and the next unknown', () => {
    const question = asked('problemJtbd');
    const option = question.options.find(
      (item) => item.kind === 'specific' && /주문|배송/.test(item.label),
    );
    expect(option).toBeTruthy();

    const before = loadAiPmLoopState(PROJECT_ID).ceoJudgment;
    const ui = submitLikeUi(option!);
    expect(ui.persisted).toBe(true);
    if ('judgment' in ui) {
      expect(ui.judgment.judgment.dimensions.problem.status).not.toBe('unknown');
      expect(ui.judgment.judgment.conclusion).not.toBe(before?.conclusion);
      expect(ui.next?.targetGap ?? ui.processed.living.gaps[0]?.fieldKey).not.toBe('problemJtbd');
    }

    clearAiPmLoopState(PROJECT_ID);
    saveWorkspaceDocumentText(DELIVERY_DOC, PROJECT_ID);
    patchAiPmLoopState(
      {
        readingCompleted: true,
        dismissedReadAck: true,
        phase: 'answer',
        currentIssueId: 'problem_definition',
        ceoJudgment: emptyCeoJudgmentState(0),
      },
      PROJECT_ID,
    );
    const through = applyBusinessChoiceThroughLoop({
      projectId: PROJECT_ID,
      documentText: DELIVERY_DOC,
      option: option!,
      askedQuestionText: question.questionText,
    });
    expect(through.persisted).toBe(true);
    expect(through.judgmentAfter.dimensions.problem.status).not.toBe('unknown');
    expect(through.judgmentAfter.conclusion).not.toBe(through.judgmentBefore?.conclusion);
    expect(through.nextTargetGap).not.toBe('problemJtbd');
    expect(through.nextQuestionText).not.toBe(question.questionText);
  });

  it('6 — negative evidence changes viability judgment', () => {
    const positive = applyBusinessChoiceThroughLoop({
      projectId: PROJECT_ID,
      documentText: DELIVERY_DOC,
      option: {
        id: 'validationTestability-opt-1',
        label: '실제 결제나 사용 증거가 있습니다',
        answerText: '이미 결제 3건이 있어 고객이 돈을 내고 있습니다.',
        kind: 'specific',
        appliesToGap: 'validationTestability',
        evidenceClassHint: 'ASSUMPTION',
      },
    });
    expect(positive.judgmentAfter.conclusion.length).toBeGreaterThan(4);

    const askedNext = buildBusinessChoiceQuestion({
      living: positive.livingAfter,
      documentText: DELIVERY_DOC,
      targetGap: 'validationTestability',
    });
    const weakening =
      askedNext.options.find((item) => /없/.test(item.label) || item.kind === 'unknown') ??
      askedNext.options.find((item) => item.kind === 'unknown');
    expect(weakening).toBeTruthy();

    const retracted = applyBusinessChoiceThroughLoop({
      projectId: PROJECT_ID,
      documentText: DELIVERY_DOC,
      option: weakening!,
      askedQuestionText: askedNext.questionText,
    });
    expect(retracted.judgmentAfter.conclusion).not.toMatch(/검증 완료|사업성이 충분/);
    expect(retracted.judgmentAfter.dimensions.customerChange.status).not.toBe('clear');
    expect(retracted.judgmentAfter.dimensions.customerChange.evidenceType).not.toBe('fact');
  });

  it('7 — the next surface still proposes a concrete validation action', () => {
    const question = asked('revenueModel');
    const option = question.options.find((item) => item.kind === 'specific' && /구독/.test(item.label));
    expect(option).toBeTruthy();

    const result = applyBusinessChoiceThroughLoop({
      projectId: PROJECT_ID,
      documentText: DELIVERY_DOC,
      option: option!,
      askedQuestionText: question.questionText,
    });
    expect(result.nextValidationAction?.length ?? 0).toBeGreaterThan(8);
    expect(result.nextWhyNow).toMatch(/확인|검증|판단|지불|고객|문제|대안|수익/);
    expect(result.conversationContinues).toBe(true);
  });
});
