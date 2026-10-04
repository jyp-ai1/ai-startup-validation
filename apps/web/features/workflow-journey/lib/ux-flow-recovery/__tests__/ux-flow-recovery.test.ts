import { describe, expect, it } from 'vitest';

import { buildBusinessUnderstanding } from '../../business-understanding/build-business-understanding';
import { emptyConversationMemory, upsertConfirmedFact } from '../../business-understanding/conversation-memory';
import { buildLivingUnderstandingState } from '../../business-understanding/living-understanding-state';
import { buildUxBusinessSummary, uxTrustLabel } from '../build-ux-business-summary';
import { buildUxViabilityResult } from '../build-ux-viability-result';
import { hasInternalUxLeak, sanitizeUxCopy } from '../sanitize-ux-copy';

const BREWERY = `다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 전통주와 양조장 체험을 좋아하는 내국인과 외국인을 대상으로 양조장 체험과 주변 관광 경험을 제공하려 한다.`;

describe('UX-01 / UX-02 new project + full business text', () => {
  it('keeps the founder document intact in the summary view', () => {
    const understanding = buildBusinessUnderstanding(BREWERY);
    const living = buildLivingUnderstandingState({
      documentText: BREWERY,
      understanding,
    });
    const view = buildUxBusinessSummary({
      projectTitle: '양조장 체험 관광 서비스',
      documentText: BREWERY,
      living,
      questionIndex: 1,
    });

    expect(view.projectTitle).toBe('양조장 체험 관광 서비스');
    expect(view.fullDescription).toBe(BREWERY);
    expect(view.fullDescription).toContain('전통주와 양조장 체험');
    expect(view.shortDescription.length).toBeLessThanOrEqual(view.fullDescription.length);
  });
});

describe('UX-03 / UX-09 answer updates connected state', () => {
  it('marks confirmed slots after a user answer and increments question index', () => {
    const understanding = buildBusinessUnderstanding(BREWERY);
    let memory = emptyConversationMemory('ux');
    memory = upsertConfirmedFact(memory, 'customer', '영세한 양조장 사장님과 관광객', 'user_turn');

    const living = buildLivingUnderstandingState({
      documentText: BREWERY,
      understanding,
      memory,
      turns: [
        {
          issueId: 'customer_definition',
          answer: '영세한 양조장 사장님과 관광객',
          appliedAt: new Date().toISOString(),
        },
      ],
    });

    const view = buildUxBusinessSummary({
      projectTitle: '양조장 체험 관광 서비스',
      documentText: BREWERY,
      living,
      questionIndex: 2,
    });

    const userSlot = view.slots.find((slot) => slot.id === 'user');
    expect(userSlot?.confirmed).toBe(true);
    expect(userSlot?.value).toContain('양조장 사장님');
    expect(view.questionIndex).toBe(2);
    expect(view.judgment).not.toMatch(/targetGap|coveragePercent|evaluator/);
  });
});

describe('UX-04 / UX-07 / UX-08 edit, long, multi-fact values', () => {
  it('preserves a long multi-fact answer without truncation in stored value', () => {
    const long =
      '사용자는 관광객이고 구매자는 양조장 대표이며 현재는 인스타그램을 통해 홍보한다. 중소 제조기업의 대표와 실무자가 함께 방문한다.';
    const understanding = buildBusinessUnderstanding(BREWERY);
    let memory = emptyConversationMemory('ux');
    memory = upsertConfirmedFact(memory, 'customer', long, 'user_turn');
    memory = upsertConfirmedFact(memory, 'buyer', '양조장 대표', 'user_turn');

    const living = buildLivingUnderstandingState({
      documentText: BREWERY,
      understanding,
      memory,
      turns: [
        {
          issueId: 'customer_definition',
          answer: long,
          appliedAt: new Date().toISOString(),
        },
      ],
    });
    const view = buildUxBusinessSummary({
      projectTitle: '양조장',
      documentText: BREWERY,
      living,
    });

    expect(view.slots.find((slot) => slot.id === 'user')?.value).toBe(long);
    expect(view.slots.find((slot) => slot.id === 'customer')?.value).toContain('양조장 대표');
  });
});

describe('UX-05 conflict UI is only for real contradictions', () => {
  it('does not mark a repeated same-value answer as needs_check contradiction', () => {
    const understanding = buildBusinessUnderstanding(BREWERY);
    let memory = emptyConversationMemory('ux');
    memory = upsertConfirmedFact(memory, 'customer', '방한 외국인', 'user_turn');

    const living = buildLivingUnderstandingState({
      documentText: BREWERY,
      understanding,
      memory,
      turns: [
        {
          issueId: 'customer_definition',
          answer: '방한 외국인',
          appliedAt: new Date().toISOString(),
        },
        {
          issueId: 'customer_definition',
          answer: '방한 외국인',
          appliedAt: new Date().toISOString(),
        },
      ],
    });

    const view = buildUxBusinessSummary({
      projectTitle: '양조장',
      documentText: BREWERY,
      living,
    });
    expect(view.slots.find((slot) => slot.id === 'user')?.value).toBe('방한 외국인');
    expect(view.slots.find((slot) => slot.id === 'user')?.trust).toBe('ceo_provided');
  });
});

describe('UX-06 repetition keeps prior value', () => {
  it('keeps the first confirmed customer after a restatement', () => {
    const understanding = buildBusinessUnderstanding(BREWERY);
    let memory = emptyConversationMemory('ux');
    memory = upsertConfirmedFact(memory, 'customer', '예비 관광객', 'user_turn');
    const living = buildLivingUnderstandingState({
      documentText: BREWERY,
      understanding,
      memory,
    });
    const view = buildUxBusinessSummary({
      projectTitle: '양조장',
      documentText: BREWERY,
      living,
    });
    expect(view.slots.find((slot) => slot.id === 'user')?.value).toBe('예비 관광객');
  });
});

describe('UX-10 / UX-11 / UX-12 viability result + PDF CTA data', () => {
  it('maps existing judgment to a founder-facing result without inventing GO', () => {
    const understanding = buildBusinessUnderstanding(BREWERY);
    const living = buildLivingUnderstandingState({
      documentText: BREWERY,
      understanding,
    });
    const summary = buildUxBusinessSummary({
      projectTitle: '양조장',
      documentText: BREWERY,
      living,
    });
    const result = buildUxViabilityResult({
      presenter: {
        judgment: '지금은 HOLD — 검증 근거가 부족합니다.',
        evidence: ['지불 의향 근거가 없습니다.'],
        reasons: ['지불 의향 근거가 없습니다.'],
        criticalGap: '고객이 실제로 겪는 핵심 문제',
        hero: null,
        secondary: [],
        supportingScoreHint: null,
        headline: '사업성 검토 결과',
        decisions: [],
        insights: [],
        recommended: null,
      },
      unknowns: summary.unknowns,
    });

    expect(result.verdict).toBe('HOLD');
    expect(result.title).toBe('사업성 검토 결과');
    expect(result.pdfReady).toBe(false);
    expect(result.why).toContain('지불 의향');
    expect(result.nextValidation.length).toBeGreaterThan(0);
  });
});

describe('UX copy hygiene', () => {
  it('strips internal tokens from founder copy', () => {
    const dirty =
      '이해 상태 커버리지 32% (필드 채움률이 아님). targetGap problemJtbd score 8 evaluator';
    const clean = sanitizeUxCopy(dirty);
    expect(hasInternalUxLeak(clean)).toBe(false);
    expect(clean).not.toMatch(/targetGap|coveragePercent|evaluator|problemJtbd/);
  });

  it('labels trust without machine status', () => {
    expect(uxTrustLabel('ceo_provided')).toBe('CEO 제공');
    expect(uxTrustLabel('ai_understood')).toBe('AI가 이해한 내용');
    expect(uxTrustLabel('needs_check')).toBe('확인 필요');
  });
});
