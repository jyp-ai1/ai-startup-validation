import { describe, expect, it, beforeEach, afterEach } from 'vitest';

import { resolveAnswerTargetKnowledgeForGap } from '../ai-pm-answer-target-binding-policy';
import { setAiPmAnswerTargetBindingV1ForTest } from '../ai-pm-answer-target-binding-policy-v1';
import { classifyAiPmCeoIntent } from '../ai-pm-intent-policy';
import {
  applyNoAskPolicy,
  evaluateNoAskPolicy,
  scanSemanticKnowledgeForGap,
} from '../ai-pm-no-ask-policy';
import { setAiPmNoAskPolicyV1ForTest } from '../ai-pm-no-ask-policy-v1';
import {
  inferQuestionPresentationType,
  isConfirmPollutionValue,
  sanitizeCeoWhyNow,
  extractConfirmKnownValueFromQuestion,
} from '../ai-pm-question-presentation';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { emptyConversationMemory, upsertConfirmedFact } from '../conversation-memory';
import { createEmptyGapState } from '../update-gap-state-from-review';
import { evaluateStageReadiness } from '../evaluate-stage-readiness';
import { resolveGapQuestionBinding } from '../gap-question-map';
import { resolveEditablePriorTurns } from '../ai-pm-editable-turns';
import type { NextQuestionDecision } from '../decide-next-question-from-review';
import type { AiPmLoopTurn } from '../workspace-ai-pm-loop-types';

const DOC = `# Brewery platform

서비스: 지역 양조장 온라인 홍보`;

function makeTurn(partial: Partial<AiPmLoopTurn> & Pick<AiPmLoopTurn, 'answer'>): AiPmLoopTurn {
  return {
    issueId: 'problem_definition',
    intent: 'business_fact',
    targetGap: 'solution',
    appliedAt: partial.appliedAt ?? new Date().toISOString(),
    answer: partial.answer,
    ...partial,
  };
}

describe('DAY 8-F — Question Causality', () => {
  beforeEach(() => {
    setAiPmAnswerTargetBindingV1ForTest(true);
    setAiPmNoAskPolicyV1ForTest(true);
  });

  afterEach(() => {
    setAiPmAnswerTargetBindingV1ForTest(null);
    setAiPmNoAskPolicyV1ForTest(null);
  });

  it('F1-R1 — solution gap must not confirm document company name', () => {
    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: buildBusinessUnderstanding(DOC),
    });
    let memory = emptyConversationMemory('p1');
    memory = upsertConfirmedFact(memory, 'business', '취향저격컴퍼니', 'document');

    const turns: AiPmLoopTurn[] = [
      makeTurn({
        appliedAt: 't1',
        targetGap: 'problemJtbd',
        issueId: 'problem_definition',
        answer: '영세한 양조장은 온라인 마케팅을 하지 못하는 것이 핵심 문제입니다.',
      }),
    ];

    const hit = scanSemanticKnowledgeForGap({
      gapId: 'solution',
      living,
      memory,
      turns,
    });

    expect(hit).toBeNull();
    const verdict = evaluateNoAskPolicy({
      targetGapId: 'solution',
      questionText: resolveGapQuestionBinding('solution').questionText,
      living,
      gapState: createEmptyGapState(),
      turns,
      memory,
      stageReadiness: evaluateStageReadiness({ gapState: createEmptyGapState() }),
    });
    expect(verdict.action).toBe('ASK');
  });

  it('F1-R2 — latest solution answer binds as 제공 가치 target', () => {
    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: buildBusinessUnderstanding(DOC),
    });
    const memory = emptyConversationMemory('p1');
    const valueAnswer =
      '양조장을 온라인 시장으로 홍보하고 지역경제 활성화를 돕습니다.';
    const turns: AiPmLoopTurn[] = [
      makeTurn({
        appliedAt: 't2',
        targetGap: 'solution',
        answer: valueAnswer,
      }),
    ];

    const hit = resolveAnswerTargetKnowledgeForGap({
      gapId: 'solution',
      living,
      memory,
      turns,
    });

    expect(hit).not.toBeNull();
    expect(hit!.value).toMatch(/양조장|온라인|지역경제/);
    expect(hit!.value).not.toMatch(/취향저격/);
  });

  it('F1-R3 — new value answer must not be polluted by old company name memory', () => {
    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: buildBusinessUnderstanding(DOC),
    });
    let memory = emptyConversationMemory('p1');
    memory = upsertConfirmedFact(memory, 'business', '취향저격컴퍼니', 'document');
    const turns: AiPmLoopTurn[] = [
      makeTurn({
        appliedAt: 't3',
        targetGap: 'solution',
        answer: '양조장을 온라인 시장으로 홍보합니다.',
      }),
    ];

    const verdict = evaluateNoAskPolicy({
      targetGapId: 'solution',
      questionText: resolveGapQuestionBinding('solution').questionText,
      living,
      gapState: createEmptyGapState(),
      turns,
      memory,
      stageReadiness: evaluateStageReadiness({ gapState: createEmptyGapState() }),
    });

    expect(verdict.action).toBe('CONFIRM');
    if (verdict.action === 'CONFIRM') {
      expect(verdict.knownValue).toMatch(/양조장|온라인/);
      expect(verdict.knownValue).not.toMatch(/취향저격/);
    }
  });

  it('F2-R1 — confirm question type inferred; pollution detected', () => {
    expect(inferQuestionPresentationType('제공 가치은(는) 「양조장」으로 이해했습니다. 맞나요?')).toBe(
      'confirm',
    );
    expect(inferQuestionPresentationType('경쟁 대비 차별점은 무엇인가요?')).toBe('open');
    expect(isConfirmPollutionValue('네 맞습니다')).toBe(true);
    expect(isConfirmPollutionValue('B 가 네 맞습니다')).toBe(true);
    expect(extractConfirmKnownValueFromQuestion('사업 한 줄은(는) 「스마트PM」으로 이해했습니다. 맞나요?')).toBe(
      '스마트PM',
    );
  });

  it('F2-R2 — applyNoAskPolicy sets questionType confirm and clean whyNow', () => {
    const living = buildLivingUnderstandingState({
      documentText: DOC,
      understanding: buildBusinessUnderstanding(DOC),
    });
    const turns: AiPmLoopTurn[] = [
      makeTurn({
        targetGap: 'solution',
        answer: '양조장 온라인 홍보와 지역경제 활성화 모델입니다.',
      }),
    ];
    const base: NextQuestionDecision = {
      targetGap: 'solution',
      targetGapId: 'solution',
      issueId: 'problem_definition',
      questionText: resolveGapQuestionBinding('solution').questionText,
      whyNow: 'test',
      rationale: 'test',
      score: 100,
      reframed: false,
      excludedGaps: [],
      drivenByReview: true,
      sourceAnswerId: 'a',
      sourceReviewId: 'r',
      reviewAction: 'advance',
      action: 'advance',
      actionRationale: 'test',
      reason: 'test',
    };

    const applied = applyNoAskPolicy({
      decision: base,
      living,
      gapState: createEmptyGapState(),
      turns,
      memory: emptyConversationMemory('p1'),
      stageReadiness: evaluateStageReadiness({ gapState: createEmptyGapState() }),
    });

    expect(applied.questionType).toBe('confirm');
    expect(applied.confirmKnownValue).toMatch(/양조장|온라인/);
    expect(applied.whyNow).not.toMatch(/semantic repeat|memory_document/i);
    expect(sanitizeCeoWhyNow(applied.whyNow)).not.toMatch(/memory_document/i);
  });

  it('F4-R1 — research delegation phrases', () => {
    const cases = [
      '경쟁사 찾아줘',
      '경쟁사를 모르겠어요. 확인해주세요.',
      '경쟁사를 알아보고 안내해주세요',
      '비슷한 서비스 조사해줘.',
    ];
    for (const utterance of cases) {
      expect(classifyAiPmCeoIntent(utterance).intent).toBe('RESEARCH');
    }
    expect(classifyAiPmCeoIntent('배민이요 경쟁사 찾아줘').intent).toBe('ANSWER');
  });

  it('F3-R1 — edit prior binds to last CEO answer not first memory turn', () => {
    const turns: AiPmLoopTurn[] = [
      makeTurn({
        appliedAt: 't1',
        issueId: 'problem_definition',
        targetGap: 'businessOneLiner',
        answer: '취향저격컴퍼니',
      }),
      makeTurn({
        appliedAt: 't2',
        issueId: 'problem_definition',
        targetGap: 'problemJtbd',
        answer: '영세한 양조장의 온라인 마케팅 부족이 핵심 문제입니다.',
      }),
      makeTurn({
        appliedAt: 't3',
        issueId: 'problem_definition',
        targetGap: 'solution',
        answer: '양조장을 온라인 시장으로 홍보합니다.',
      }),
      makeTurn({ appliedAt: 't4', intent: 'why_meta', answer: '왜 이 질문인가요?' }),
      makeTurn({
        appliedAt: 't5',
        issueId: 'competitor_analysis',
        targetGap: 'alternativesCompetitors',
        answer: '아직 경쟁사를 모르겠습니다.',
      }),
    ];

    const editable = resolveEditablePriorTurns(turns);
    expect(editable).toHaveLength(1);
    expect(editable[0]!.appliedAt).toBe('t5');
    expect(editable[0]!.answer).toMatch(/경쟁사/);
    expect(editable[0]!.answer).not.toMatch(/취향저격/);
  });
});
