import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { applyAnswerToJudgment, buildCeoJudgmentState } from '../ai-pm-judgment-aggregation';
import {
  setAiPmJudgmentAggregationV1ForTest,
} from '../ai-pm-judgment-aggregation-v1';
import { toHumanLanguageQuestion, sanitizeConsultingTerms } from '../ai-pm-question-human-language';
import { buildAnswerGuide, formatAnswerGuideText } from '../ai-pm-answer-guide';
import { buildAiPmSimpleQuestionSnapshot } from '../ai-pm-simple-question-presenter';
import {
  CEO_JUDGMENT_SESSION_MAX_QUESTIONS,
  evaluateJudgmentStop,
  isJudgmentReadinessReached,
} from '../ai-pm-question-budget';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const DOC = `# 소상공인 배송 SaaS

서비스: 주문부터 배송까지 관리하는 B2B SaaS
대상: 반찬가게·꽃집 등 직접 배송 소상공인
문제: 주문과 배송을 따로 관리해야 함`;

function livingWithTurns(turns: AiPmLoopTurn[]) {
  const understanding = buildBusinessUnderstanding(DOC);
  return buildLivingUnderstandingState({
    documentText: DOC,
    understanding,
    turns,
  });
}

describe('DAY 8-G — Judgment & Simple Conversation', () => {
  beforeEach(() => {
    setAiPmJudgmentAggregationV1ForTest(true);
  });

  afterEach(() => {
    setAiPmJudgmentAggregationV1ForTest(null);
  });

  it('G-R1 — one answer updates customer + problem', () => {
    const answer =
      '직접 배송하는 반찬가게와 꽃집 사장님들이 고객이고, 주문과 배송을 따로 관리하는 게 불편합니다.';
    const state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(0),
      answer,
      issueId: 'customer_definition',
      targetGap: 'customerPersona',
    });

    expect(state.dimensions.customer.status).not.toBe('unknown');
    expect(state.dimensions.problem.status).not.toBe('unknown');
    expect(state.dimensions.solution.status).toBe('unknown');
    expect(state.dimensions.customerChange.status).toBe('unknown');
  });

  it('G-R2 — customer change answer updates customerChange', () => {
    const state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(2),
      answer: '배송 누락을 줄이고 주문 확인 시간을 줄일 수 있습니다.',
      issueId: 'competitor_analysis',
      targetGap: 'validationTestability',
    });

    expect(state.dimensions.customerChange.status).toBe('clear');
    expect(state.dimensions.customerChange.summary).toMatch(/누락|확인/);
  });

  it('G-R3 — off-slot answer preserves alternative info for problem', () => {
    const state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(1),
      answer: '지금은 엑셀과 카카오톡으로 주문을 관리하고 있습니다.',
      issueId: 'competitor_analysis',
      targetGap: 'validationTestability',
    });

    expect(state.dimensions.problem.status).not.toBe('unknown');
    expect(state.dimensions.problem.summary).toMatch(/엑셀|카카오/);
  });

  it('G-R4 — human language removes consulting terms', () => {
    const raw =
      '직접 배송을 관리하는 사장님에게 이 서비스가 생기면 구체적으로 어떤 가치를 만드나요?';
    const human = toHumanLanguageQuestion(raw, 'validationTestability');
    expect(human).not.toMatch(/가치|기대효과|JTBD|검증\s*설계/i);
    expect(human).toMatch(/좋아지는 점/);
  });

  it('G-R5 — question budget hard stop at 5', () => {
    const judgment = emptyCeoJudgmentState(CEO_JUDGMENT_SESSION_MAX_QUESTIONS);
    const stop = evaluateJudgmentStop({
      questionCount: CEO_JUDGMENT_SESSION_MAX_QUESTIONS,
      judgment,
    });
    expect(stop.shouldStop).toBe(true);
    expect(stop.showJudgmentView).toBe(true);
    expect(stop.judgmentTitle).toBe('result');
  });

  it('G-R6 — readiness enables interim view without auto-stop before budget', () => {
    let state = emptyCeoJudgmentState(2);
    state = applyAnswerToJudgment({
      prior: state,
      answer:
        '직접 배송 소상공인이 고객이고 주문·배송 분리 관리가 불편해서 하나로 연결하려 합니다.',
    });
    expect(isJudgmentReadinessReached(state)).toBe(true);

    const stop = evaluateJudgmentStop({ questionCount: 3, judgment: state });
    expect(stop.shouldStop).toBe(false);
    expect(stop.showJudgmentView).toBe(false);

    const snapshot = buildAiPmSimpleQuestionSnapshot({
      displayQuestionText: '다음 질문',
      questionCount: 3,
    });
    expect(snapshot.showInterimJudgmentCta).toBe(true);
  });

  it('G-R7 — incomplete dimensions shown at budget stop', () => {
    const state = applyAnswerToJudgment({
      prior: emptyCeoJudgmentState(4),
      answer: '직접 배송 소상공인이 고객입니다.',
      targetGap: 'customerPersona',
    });
    const stop = evaluateJudgmentStop({
      questionCount: CEO_JUDGMENT_SESSION_MAX_QUESTIONS,
      judgment: { ...state, questionCount: CEO_JUDGMENT_SESSION_MAX_QUESTIONS },
    });
    expect(stop.shouldStop).toBe(true);
    expect(state.dimensions.customerChange.status).toBe('unknown');
    expect(state.conclusion).toMatch(/확인|부족|아직/);
  });

  it('G-R8 — judgment view fields populated from buildCeoJudgmentState', () => {
    const turns: AiPmLoopTurn[] = [
      {
        issueId: 'customer_definition',
        answer: '직접 배송하는 소상공인',
        appliedAt: '2026-09-06T01:00:00.000Z',
        targetGap: 'customerPersona',
        intent: 'business_fact',
      },
      {
        issueId: 'problem_definition',
        answer: '주문과 배송을 따로 관리해야 해서 불편합니다.',
        appliedAt: '2026-09-06T01:01:00.000Z',
        targetGap: 'problemJtbd',
        intent: 'business_fact',
      },
    ];
    const state = buildCeoJudgmentState({
      living: livingWithTurns(turns),
      turns,
    });

    expect(state.oneLiner.length).toBeGreaterThan(10);
    expect(state.conclusion.length).toBeGreaterThan(10);
    expect(state.dimensions.customer.summary).toBeTruthy();
    expect(state.dimensions.problem.summary).toBeTruthy();
  });

  it('G-R9 — CEO copy has no internal meta tokens', () => {
    const guide = formatAnswerGuideText(buildAnswerGuide({ targetGap: 'validationTestability' }));
    const human = sanitizeConsultingTerms('고객 가치 proposition JTBD');
    const snapshot = buildAiPmSimpleQuestionSnapshot({
      displayQuestionText: '테스트 질문',
      targetGap: 'problemJtbd',
      questionCount: 1,
    });

    const corpus = [guide, human, snapshot.questionText, snapshot.answerGuideText].join('\n');
    expect(corpus).not.toMatch(
      /memory_document|fieldKey|targetGap|semantic repeat|gapState|memory_user/i,
    );
  });

  it('G-R10 — flag off returns empty judgment (8-F path preserved)', () => {
    setAiPmJudgmentAggregationV1ForTest(false);
    const state = buildCeoJudgmentState({
      living: livingWithTurns([]),
      turns: [],
    });
    expect(state.dimensions.customer.status).toBe('unknown');
    expect(state.questionCount).toBe(0);
  });
});
