import { describe, expect, it } from 'vitest';

import { AI_PM_FIRST_PROMPT_VERSION, AI_PM_REVIEW_MODEL, buildFirstReviewRequest, buildFollowUpRequest } from '../ai-pm-review';
import {
  COMPARE_BUSINESS_INPUT,
  QUALITY3_PROMPT_VERSION,
  buildQuality2CompareRequest,
  buildQuality3CompareRequest,
  compareConfounders,
  executeQualityCompare,
} from '../ai-pm-quality-compare';

describe('quality-2 and quality-3 compare requests', () => {
  it('keeps quality-2 equal to the product first-review request', () => {
    const compare = buildQuality2CompareRequest();
    const product = buildFirstReviewRequest(COMPARE_BUSINESS_INPUT);
    expect(compare).toEqual(product);
    const system = compare.messages[0]?.content ?? '';
    const user = compare.messages[1]?.content ?? '';
    expect(system).toContain(`프롬프트 버전 ${AI_PM_FIRST_PROMPT_VERSION}`);
    expect(user).toContain('전통주(양조장)');
    expect(user).toContain('검토 목적: 종합 사업성 검토');
    expect(user).not.toContain('alternatives, differentiation');
    expect(compare.model).toBe(AI_PM_REVIEW_MODEL);
    expect(compare.temperature).toBe(0.2);
    expect(compare.maxTokens).toBe(2400);
  });

  it('sends the quality-3 draft in full and records the two confounders', () => {
    const request = buildQuality3CompareRequest();
    const system = request.messages[0]?.content ?? '';
    const user = request.messages[1]?.content ?? '';
    expect(system.startsWith('프롬프트 버전 quality-3.')).toBe(true);
    expect(user).toContain('alternatives, differentiation');
    expect(user).toContain('전통주(양조장)');
    const confounders = compareConfounders();
    expect(confounders.map((item) => item.id)).toEqual(['user_key_list', 'product_input_clamp']);
    expect(confounders[0]?.detail).toContain('단정하지 않는다');
    expect(confounders[1]?.detail).toContain('잘린다');
  });

  it('does not call a model or the product follow-up when the key is absent', async () => {
    const report = await executeQualityCompare({});
    expect(report.status).toBe('NOT RUN');
    expect(report.productFollowUpInvoked).toBe(false);
    expect(report.calls.map((call) => call.promptVersion)).toEqual([AI_PM_FIRST_PROMPT_VERSION, QUALITY3_PROMPT_VERSION]);
    expect(report.calls.every((call) => call.status === 'not_run' && call.raw === null)).toBe(true);
    const follow = buildFollowUpRequest({
      originalInput: COMPARE_BUSINESS_INPUT,
      sections: {
        customer: '관광객',
        problem: '예약',
        market: '미확인',
        revenueModel: '가설',
        execution: '구상',
        risks: ['수요'],
        uncertain: ['협력'],
        hypotheses: ['협력'],
        judgment: '보류',
        nextQuestion: '질문',
        nextQuestionReason: '갈림길',
        answerHint: '',
        claimConfirmation: null,
      },
      feedback: null,
      supplement: '아직 협력 양조장이 없다.',
    });
    const followText = follow.messages.map((message) => message.content).join('\n');
    expect(followText).not.toContain('프롬프트 버전 quality-3');
  });
});
