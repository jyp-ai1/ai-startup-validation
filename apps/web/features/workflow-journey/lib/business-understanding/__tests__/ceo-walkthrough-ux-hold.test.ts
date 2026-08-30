import { describe, expect, it } from 'vitest';

import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { presentThinking } from '../build-thinking-presenter';
import { presentThinkingSurface } from '../build-thinking-surface-presenter';
import { presentS11Surface } from '../build-s11-surface-presenter';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import {
  buildConversationUnderstandingRows,
  formatFounderJudgmentSummary,
} from '../build-conversation-understanding-summary';
import { decideNextQuestion } from '../question-decision-engine';

const ALABOM_SEED =
  '외국인 관광객을 대상으로 서울에서 기존 관광상품과 다른 개인 맞춤형 경험을 제공하는 사업을 생각하고 있습니다.';

describe('CEO walkthrough UX — surface question visibility', () => {
  it('presentThinkingSurface uses gapQuestionText when issueId is null (confirmed fact)', () => {
    const memory = buildConversationMemoryFromSources({
      projectId: 'ux-hold',
      documentText: ALABOM_SEED,
      turns: [],
      entities: null,
      previous: null,
    });
    // Simulate revenue already confirmed while adaptive engine asks pricingHint
    memory.facts.push({
      key: 'revenue',
      value: '관광객 앱 예약·결제',
      lifecycle: 'current',
      provenance: 'USER_CONFIRMED',
      updatedAt: new Date().toISOString(),
    });

    const thinking = presentThinking({
      memory,
      documentText: ALABOM_SEED,
      entities: null,
      nextIssueId: 'bm_design',
      targetGap: 'pricingHint',
    });

    expect(thinking.question.issueId).toBeNull();

    const gapQuestion = '가격·요금은 어떻게 책정하나요?';
    const surface = presentThinkingSurface(thinking, {
      mode: 'ask',
      gapQuestionText: gapQuestion,
    });

    expect(surface.nextQuestion).toBe(gapQuestion);
  });

  it('presentS11Surface renders adaptive gap question for 아라봄 bm_design path', () => {
    const doc = ALABOM_SEED;
    const understanding = buildBusinessUnderstanding(doc);
    const memory = buildConversationMemoryFromSources({
      projectId: 'ux-hold',
      documentText: doc,
      turns: [],
      entities: null,
      previous: null,
    });
    memory.facts.push({
      key: 'revenue',
      value: '관광객 앱 예약·결제',
      lifecycle: 'current',
      provenance: 'USER_CONFIRMED',
      updatedAt: new Date().toISOString(),
    });

    const living = buildLivingUnderstandingState({
      documentText: doc,
      understanding,
      turns: [],
      memory,
    });
    const decision = decideNextQuestion({ living, turns: [], memory });
    expect(decision?.questionText?.trim().length).toBeGreaterThan(0);

    const thinking = presentThinking({
      memory,
      documentText: doc,
      entities: null,
      nextIssueId: 'bm_design',
      targetGap: decision?.targetGap ?? null,
    });

    const s11 = presentS11Surface(thinking, {
      mode: 'ask',
      documentText: doc,
      targetGap: decision?.targetGap ?? null,
      gapQuestionText: decision?.questionText ?? null,
    });

    expect(s11.question.text.trim().length).toBeGreaterThan(0);
    expect(s11.question.text).toBe(decision!.questionText.trim());
  });

  it('formatFounderJudgmentSummary uses Korean labels not internal keys', () => {
    const doc = ALABOM_SEED;
    const understanding = buildBusinessUnderstanding(doc);
    const living = buildLivingUnderstandingState({
      documentText: doc,
      understanding,
      turns: [],
      memory: null,
    });

    const summary = formatFounderJudgmentSummary(living);
    expect(summary).not.toMatch(/businessOneLiner:/);
    expect(summary).not.toMatch(/customerPersona:/);
  });

  it('buildConversationUnderstandingRows returns labeled spine fields', () => {
    const doc = ALABOM_SEED;
    const understanding = buildBusinessUnderstanding(doc);
    const living = buildLivingUnderstandingState({
      documentText: doc,
      understanding,
      turns: [],
      memory: null,
    });

    const rows = buildConversationUnderstandingRows(living);
    expect(rows.map((r) => r.label)).toEqual([
      '고객',
      '문제',
      '해결 방법',
      '수익',
      '차별점',
      '수요',
    ]);
    expect(rows.every((r) => r.value.length > 0)).toBe(true);
  });
});
