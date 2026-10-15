import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  applyAnswerToJudgment,
  buildCeoJudgmentState,
} from '../ai-pm-judgment-aggregation';
import {
  setAiPmJudgmentAggregationV1ForTest,
} from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import {
  resolveBusinessChoiceAnswer,
  traceBusinessChoiceImpact,
} from '../apply-business-choice';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import {
  UNKNOWN_CHOICE_ANSWER,
  UNKNOWN_CHOICE_LABEL,
  buildBusinessChoiceQuestion,
} from '../build-business-choice-question';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { interpretAnswerSemantics } from '../interpret-answer-semantics';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { buildAiPmSimpleQuestionSnapshot } from '../ai-pm-simple-question-presenter';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const DELIVERY_DOC = `# 소상공인 배송 SaaS

서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 반찬가게·꽃집 등 직접 배송 소상공인
문제: 주문과 배송을 따로 관리해야 함
수익: 월 구독`;

const TOURISM_DOC = `# 전통주 현장 발견

서비스: 양조장과 여행객을 연결하는 현장 발견 앱
대상: 국내 여행객과 양조장
문제: 전통주를 현장에서 발견하기 어렵다
수익: 거래 수수료`;

function normalizeLabel(value: string): string {
  return value.replace(/\s+/g, '').toLowerCase();
}

function livingFrom(documentText: string, turns: AiPmLoopTurn[] = []) {
  const understanding = buildBusinessUnderstanding(documentText);
  const memory = buildConversationMemoryFromSources({
    projectId: 'mcq-understanding',
    documentText,
    turns,
  });
  return buildLivingUnderstandingState({
    documentText,
    understanding,
    turns,
    memory,
  });
}

function turn(
  issueId: AiPmLoopTurn['issueId'],
  targetGap: string,
  answer: string,
  at: string,
): AiPmLoopTurn {
  return {
    issueId,
    targetGap,
    answer,
    appliedAt: at,
    intent: 'business_fact',
    askedQuestionText: targetGap,
  };
}

describe('AI PM MCQ business understanding', () => {
  beforeEach(() => {
    setAiPmJudgmentAggregationV1ForTest(true);
  });

  afterEach(() => {
    setAiPmJudgmentAggregationV1ForTest(null);
  });

  it('A — document-only summary does not treat unknowns as facts', () => {
    const living = livingFrom(DELIVERY_DOC);
    const question = buildBusinessChoiceQuestion({
      living,
      documentText: DELIVERY_DOC,
      targetGap: 'problemJtbd',
    });

    expect(question.businessSummary).toMatch(/배송|주문|소상공인|반찬|꽃집/);
    expect(question.businessSummary).not.toMatch(/매출이 검증|결제가 확인|VALIDATED/);
    expect(question.facts.join(' ')).not.toMatch(/결제 3건|반복 구매가 검증/);
    expect(
      question.facts.every((line) => !/VALIDATED|검증 완료/.test(line)),
    ).toBe(true);
  });

  it('B — problem MCQ is business-specific and includes unknown', () => {
    const delivery = buildBusinessChoiceQuestion({
      living: livingFrom(DELIVERY_DOC),
      documentText: DELIVERY_DOC,
      targetGap: 'problemJtbd',
    });
    const tourism = buildBusinessChoiceQuestion({
      living: livingFrom(TOURISM_DOC),
      documentText: TOURISM_DOC,
      targetGap: 'problemJtbd',
    });

    const deliveryLabels = delivery.options.map((option) => option.label);
    const tourismLabels = tourism.options.map((option) => option.label);

    expect(deliveryLabels.some((label) => /주문|배송|따로 관리/.test(label))).toBe(true);
    expect(tourismLabels.some((label) => /전통주|발견/.test(label))).toBe(true);
    expect(deliveryLabels).toContain(UNKNOWN_CHOICE_LABEL);
    expect(deliveryLabels).toContain('기타');
    expect(deliveryLabels.some((label) => /전통주/.test(label))).toBe(false);
    expect(new Set(deliveryLabels).size).toBe(deliveryLabels.length);
  });

  it('C — a specific choice updates understanding and changes the next unknown', () => {
    const before = livingFrom(DELIVERY_DOC);
    const asked = buildBusinessChoiceQuestion({
      living: before,
      documentText: DELIVERY_DOC,
      targetGap: 'customerPersona',
    });
    const specific = asked.options.find((option) => option.kind === 'specific');
    expect(specific).toBeTruthy();

    const resolved = resolveBusinessChoiceAnswer(specific!);
    const after = livingFrom(DELIVERY_DOC, [
      turn('customer_definition', 'customerPersona', resolved.answerText, 't1'),
    ]);
    const next = buildBusinessChoiceQuestion({
      living: after,
      documentText: DELIVERY_DOC,
      targetGap: after.gaps[0]?.fieldKey,
    });
    const impact = traceBusinessChoiceImpact({
      option: specific!,
      livingBefore: before,
      livingAfter: after,
      nextValidationAction: next.targetUnknown,
    });

    expect(after.spine.customer).toMatch(/반찬|꽃집|소상공인|배송/);
    expect(next.targetGap).not.toBe('customerPersona');
    expect(next.questionText).not.toBe(asked.questionText);
    expect(impact.nextTargetChanged || impact.factsChanged || impact.assumptionChanged).toBe(
      true,
    );
    expect(impact.treatedAsValidated).toBe(false);
  });

  it('D — a confirmed answer is not asked again', () => {
    const living = livingFrom(DELIVERY_DOC, [
      turn(
        'customer_definition',
        'customerPersona',
        '이 서비스를 가장 필요로 하는 사람은 반찬가게입니다.',
        't1',
      ),
    ]);
    const next = buildBusinessChoiceQuestion({
      living,
      documentText: DELIVERY_DOC,
      targetGap: living.gaps[0]?.fieldKey ?? 'problemJtbd',
    });
    const replay = buildBusinessChoiceQuestion({
      living,
      documentText: DELIVERY_DOC,
      targetGap: 'customerPersona',
    });

    expect(next.targetGap).not.toBe('customerPersona');
    expect(
      replay.options
        .filter((option) => option.kind === 'specific')
        .every((option) => !normalizeLabel(option.label).includes('반찬가게')),
    ).toBe(true);
  });

  it('E — unknown / other does not lock a false assumption', () => {
    const living = livingFrom(DELIVERY_DOC);
    const asked = buildBusinessChoiceQuestion({
      living,
      documentText: DELIVERY_DOC,
      targetGap: 'marketSizeEvidence',
    });
    const unknown = asked.options.find((option) => option.kind === 'unknown');
    expect(unknown?.answerText).toBe(UNKNOWN_CHOICE_ANSWER);

    const semantic = interpretAnswerSemantics({
      answer: unknown!.answerText,
      askedIssueId: 'market_validation',
      askedTargetGap: 'marketSizeEvidence',
    });
    expect(semantic.intent).toBe('unknown_signal');
    expect(semantic.mergeable).toBe(false);

    const other = resolveBusinessChoiceAnswer(
      asked.options.find((option) => option.kind === 'other')!,
      '',
    );
    expect(other.needsFreeText).toBe(true);

    const filled = resolveBusinessChoiceAnswer(
      asked.options.find((option) => option.kind === 'other')!,
      '정확한 숫자는 아직 없어서 주변 가게 몇 곳에만 물어본 상태입니다.',
    );
    const otherSemantic = interpretAnswerSemantics({
      answer: filled.answerText,
      askedIssueId: 'market_validation',
      askedTargetGap: 'marketSizeEvidence',
    });
    expect(otherSemantic.intent).not.toBe('nonsense');
    expect(filled.choiceApplied.evidenceClassHint).not.toBe('FACT');
  });

  it('F — a weakening choice does not keep a positive conclusion', () => {
    const prior = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(1),
      answer: '이미 결제 3건이 있어 고객이 돈을 내고 있습니다.',
      issueId: 'market_validation',
      targetGap: 'validationTestability',
    });
    expect(prior.conclusion.length).toBeGreaterThan(4);

    const asked = buildBusinessChoiceQuestion({
      living: livingFrom(DELIVERY_DOC),
      documentText: DELIVERY_DOC,
      targetGap: 'validationTestability',
    });
    const weakening =
      asked.options.find((option) => /없/.test(option.label) || /없/.test(option.answerText)) ??
      asked.options.find((option) => option.kind === 'unknown');
    expect(weakening).toBeTruthy();

    const next = applyAnswerToJudgment({
      prior,
      answer: weakening!.answerText,
      issueId: 'market_validation',
      targetGap: 'validationTestability',
    });
    const semantic = interpretAnswerSemantics({
      answer: weakening!.answerText,
      askedIssueId: 'market_validation',
      askedTargetGap: 'validationTestability',
    });

    expect(next.conclusion).not.toMatch(/검증 완료|사업성이 충분|반복이 확인/);
    expect(next.dimensions.customerChange.evidenceType).not.toBe('fact');
    expect(next.dimensions.customerChange.status).not.toBe('clear');
    expect(semantic.quality === 'UNKNOWN' || /없|아직|모르/.test(weakening!.answerText)).toBe(
      true,
    );
    expect(next.dimensions.customerChange.knowledgeSource).not.toBe('ceo_confirmed');
  });

  it('G — the closing surface connects judgment, remaining unknown, and next action', () => {
    const turns = [
      turn(
        'customer_definition',
        'customerPersona',
        '이 서비스를 가장 필요로 하는 사람은 반찬가게입니다.',
        't1',
      ),
      turn(
        'problem_definition',
        'problemJtbd',
        '지금 가장 크게 해결하려는 불편은 주문과 배송을 따로 관리해야 함입니다.',
        't2',
      ),
    ];
    const living = livingFrom(DELIVERY_DOC, turns);
    const snapshot = buildAiPmSimpleQuestionSnapshot({
      displayQuestionText: '수익은 어떤 구조로 발생하나요?',
      targetGap: living.gaps[0]?.fieldKey ?? 'revenueModel',
      questionCount: turns.length,
      living,
      documentText: DELIVERY_DOC,
    });
    const judgment = buildCeoJudgmentState({ living, turns });
    const next = buildBusinessChoiceQuestion({
      living,
      documentText: DELIVERY_DOC,
      targetGap: living.gaps[0]?.fieldKey,
    });

    expect(judgment.oneLiner.length).toBeGreaterThan(8);
    expect(judgment.conclusion.length).toBeGreaterThan(8);
    expect(next.targetUnknown.length).toBeGreaterThan(1);
    expect(snapshot.choiceOptions?.some((option) => option.kind === 'unknown')).toBe(true);
    expect(snapshot.businessSummary).toBeTruthy();
    expect(living.judgmentSummary).toMatch(/공백|확인|이해/);
  });
});
