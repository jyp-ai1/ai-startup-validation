import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { applyBusinessChoiceTurn } from '../apply-business-choice-turn';
import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import {
  CORE_BUSINESS_CHOICE_GAPS,
  UNKNOWN_CHOICE_LABEL,
  buildBusinessChoiceQuestion,
} from '../build-business-choice-question';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { buildLivingUnderstandingState } from '../living-understanding-state';

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

const DENTAL_DOC = `우리 팀은 치과 기공소에 보철 재작업 알림을 파는 서비스를 만듭니다.
고객은 치과 원장과 기공소입니다.
문제는 보철 재작업이 늦게 전달되어 환자가 다시 방문하는 것입니다.
지금은 전화와 카톡으로 확인하고 있습니다.
수익은 기공소 월 구독을 생각하고 있습니다.`;

function livingFrom(documentText: string) {
  const understanding = buildBusinessUnderstanding(documentText);
  const memory = buildConversationMemoryFromSources({
    projectId: 'mcq-journey',
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

function specificLabels(documentText: string, targetGap: string): string[] {
  return buildBusinessChoiceQuestion({
    living: livingFrom(documentText),
    documentText,
    targetGap,
  })
    .options.filter((option) => option.kind === 'specific')
    .map((option) => option.label);
}

describe('AI PM MCQ journey — problem / payer / revenue / alternatives', () => {
  beforeEach(() => {
    setAiPmJudgmentAggregationV1ForTest(true);
  });

  afterEach(() => {
    setAiPmJudgmentAggregationV1ForTest(null);
  });

  it('before: free-text only. after: each core gap has business-specific options + unknown', () => {
    for (const gap of CORE_BUSINESS_CHOICE_GAPS) {
      const delivery = buildBusinessChoiceQuestion({
        living: livingFrom(DELIVERY_DOC),
        documentText: DELIVERY_DOC,
        targetGap: gap,
      });
      const tourism = buildBusinessChoiceQuestion({
        living: livingFrom(TOURISM_DOC),
        documentText: TOURISM_DOC,
        targetGap: gap,
      });

      expect(delivery.options.some((option) => option.kind === 'specific')).toBe(true);
      expect(delivery.options.some((option) => option.label === UNKNOWN_CHOICE_LABEL)).toBe(true);
      expect(delivery.options.some((option) => option.label === '기타')).toBe(true);
      expect(tourism.options.some((option) => option.kind === 'specific')).toBe(true);

      const deliverySpecific = delivery.options
        .filter((option) => option.kind === 'specific')
        .map((option) => option.label)
        .join(' ');
      const tourismSpecific = tourism.options
        .filter((option) => option.kind === 'specific')
        .map((option) => option.label)
        .join(' ');
      expect(deliverySpecific).not.toBe(tourismSpecific);
    }

    expect(specificLabels(DELIVERY_DOC, 'problemJtbd').join(' ')).toMatch(/주문|배송/);
    expect(specificLabels(TOURISM_DOC, 'problemJtbd').join(' ')).toMatch(/전통주|발견/);
    expect(specificLabels(DELIVERY_DOC, 'payer').join(' ')).toMatch(/반찬|꽃집|소상공인|지불/);
    expect(specificLabels(TOURISM_DOC, 'payer').join(' ')).toMatch(/여행객|양조장|지불/);
    expect(specificLabels(DELIVERY_DOC, 'revenueModel').join(' ')).toMatch(/구독/);
    expect(specificLabels(TOURISM_DOC, 'revenueModel').join(' ')).toMatch(/수수료/);
    expect(specificLabels(DELIVERY_DOC, 'alternativesCompetitors').join(' ')).toMatch(
      /따로 관리|지금은/,
    );
    expect(specificLabels(DENTAL_DOC, 'alternativesCompetitors').join(' ')).toMatch(/카톡|전화|재작업/);
  });

  it('a problem choice updates judgment and changes the next question', () => {
    const asked = buildBusinessChoiceQuestion({
      living: livingFrom(DELIVERY_DOC),
      documentText: DELIVERY_DOC,
      targetGap: 'problemJtbd',
    });
    const option = asked.options.find((item) => item.kind === 'specific' && /주문|배송/.test(item.label));
    expect(option).toBeTruthy();

    const result = applyBusinessChoiceTurn({
      documentText: DELIVERY_DOC,
      option: option!,
      priorJudgment: emptyCeoJudgmentState(0),
    });

    expect(result.judgmentBefore.dimensions.problem.status).toBe('unknown');
    expect(result.judgmentAfter.dimensions.problem.status).not.toBe('unknown');
    expect(result.judgmentAfter.conclusion).not.toBe(result.judgmentBefore.conclusion);
    expect(result.nextQuestion.targetGap).not.toBe('problemJtbd');
    expect(result.nextQuestion.questionText).not.toBe(asked.questionText);
    expect(result.nextValidationAction.length).toBeGreaterThan(8);
    expect(result.impact.treatedAsValidated).toBe(false);
  });

  it('does not re-ask a gap after the founder already chose it', () => {
    const first = buildBusinessChoiceQuestion({
      living: livingFrom(DELIVERY_DOC),
      documentText: DELIVERY_DOC,
      targetGap: 'revenueModel',
    });
    const option = first.options.find((item) => item.kind === 'specific' && /구독/.test(item.label));
    expect(option).toBeTruthy();

    const after = applyBusinessChoiceTurn({
      documentText: DELIVERY_DOC,
      option: option!,
    });

    expect(after.nextQuestion.targetGap).not.toBe('revenueModel');
    expect(
      after.nextQuestion.options
        .filter((item) => item.kind === 'specific')
        .every((item) => !/월 구독으로 받습니다/.test(item.label)),
    ).toBe(true);
  });

  it('unknown on payer does not confirm a buyer and keeps judgment from over-claiming', () => {
    const asked = buildBusinessChoiceQuestion({
      living: livingFrom(TOURISM_DOC),
      documentText: TOURISM_DOC,
      targetGap: 'payer',
    });
    const unknown = asked.options.find((item) => item.kind === 'unknown');
    expect(unknown).toBeTruthy();

    const result = applyBusinessChoiceTurn({
      documentText: TOURISM_DOC,
      option: unknown!,
    });

    expect(result.resolved.answerText).toMatch(/아직 모르겠/);
    expect(result.livingAfter.claims.some((claim) => claim.fieldKey === 'payer' && claim.status === 'confirmed')).toBe(
      false,
    );
    expect(result.judgmentAfter.conclusion).not.toMatch(/검증 완료|사업성이 충분/);
    expect(result.judgmentAfter.dimensions.customerChange.evidenceType).not.toBe('fact');
  });

  it('a weakening evidence choice retracts a positive customer-change judgment', () => {
    const positive = applyBusinessChoiceTurn({
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

    const asked = buildBusinessChoiceQuestion({
      living: positive.livingAfter,
      documentText: DELIVERY_DOC,
      targetGap: 'validationTestability',
    });
    const weakening =
      asked.options.find((item) => /없/.test(item.label) || item.kind === 'unknown') ??
      asked.options.find((item) => item.kind === 'unknown');
    expect(weakening).toBeTruthy();

    const retracted = applyBusinessChoiceTurn({
      documentText: DELIVERY_DOC,
      turns: [
        {
          issueId: 'competitor_analysis',
          targetGap: 'validationTestability',
          answer: positive.resolved.answerText,
          appliedAt: 't-positive',
          intent: 'business_fact',
        },
      ],
      option: weakening!,
      priorJudgment: positive.judgmentAfter,
    });

    expect(retracted.judgmentAfter.conclusion).not.toMatch(/검증 완료|사업성이 충분/);
    expect(retracted.judgmentAfter.dimensions.customerChange.status).not.toBe('clear');
    expect(retracted.nextValidationAction).toBeTruthy();
  });
});
