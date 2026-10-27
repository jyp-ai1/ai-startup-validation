import { readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import {
  buildFollowUpRequest,
  parseFeedbackBody,
  readGptApiKey,
  reviewInputFromParts,
  runFirstReview,
  runFollowUpReview,
  saveReviewFeedback,
  toAiPmReviewView,
} from '../ai-pm-review';
import { openAiPmReviewStore, type ReviewSections } from '../ai-pm-review-store';

const NOW = '2026-10-27T09:30:00.000Z';
const PLAN = 'UNIQUEPLANMARKER 영세 양조장의 온라인 노출을 연결하는 사업. 사용자는 관광객이고 비용은 양조장 대표가 낼 수 있다. 매출은 없다.';

function storePath(): string {
  return join(mkdtempSync(join(tmpdir(), 'ai-pm-review-')), 'reviews.sqlite');
}

function sections(): ReviewSections {
  return {
    customer: '사용자는 관광객이고 지불 후보는 양조장 대표다.',
    problem: '온라인 노출이 약하다는 진술이 있다.',
    market: '수요 조사는 입력에 없다.',
    revenueModel: '가격은 입력에 없다.',
    execution: '서비스는 출시 전이다.',
    risks: ['지불 의향이 확인되지 않았다.'],
    uncertain: ['관광객 수요'],
    hypotheses: ['양조장 대표가 노출 비용을 낼 이유가 있는지'],
    judgment: '보류. 지불자와 수요가 확인되지 않았다.',
  };
}

function reply(content: string, extra?: Partial<ChatResponse>): ChatResponse {
  return {
    id: 'resp-1',
    model: 'gpt-4o-mini',
    provider: 'openai',
    content,
    finishReason: 'stop',
    usage: { inputTokens: 120, outputTokens: 80, totalTokens: 200 },
    usageKnown: true,
    latencyMs: 42,
    ...extra,
  };
}

describe('AI PM first review', () => {
  it('sends a typed note and the same file text through one review', async () => {
    const typed = reviewInputFromParts({ typed: PLAN });
    const file = reviewInputFromParts({ extracted: PLAN, fileName: 'plan.txt' });
    expect(typed.ok && file.ok && typed.sha256).toBe(file.ok ? file.sha256 : '');
    const store = openAiPmReviewStore(storePath());
    const calls: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      calls.push(request);
      return reply(JSON.stringify(sections()));
    };
    const first = await runFirstReview({
      store,
      userId: 'user-a',
      text: typed.ok ? typed.text : '',
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    const second = await runFirstReview({
      store,
      userId: 'user-a',
      text: file.ok ? file.text : '',
      origin: 'file',
      fileName: 'plan.txt',
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.messages.some((message) => message.content.includes('UNIQUEPLANMARKER'))).toBe(true);
    expect(first.called).toBe(true);
    expect(second.called).toBe(false);
    expect(second.record.reviewId).toBe(first.record.reviewId);
    expect(first.record.model).toBe('gpt-4o-mini');
    expect(first.record.provider).toBe('openai');
    expect(first.record.promptTokens).toBe(120);
    expect(first.record.completionTokens).toBe(80);
    expect(first.record.totalTokens).toBe(200);
    expect(first.record.usageKnown).toBe(true);
    expect(first.record.latencyMs).toBe(42);
    expect(first.record.callCount).toBe(1);
    expect(first.view.sections?.customer).toContain('양조장 대표');
    store.close();
  });

  it('stores feedback on the review version without another review call', async () => {
    const store = openAiPmReviewStore(storePath());
    let calls = 0;
    const chat = async () => {
      calls += 1;
      return reply(JSON.stringify(sections()));
    };
    const review = await runFirstReview({
      store,
      userId: 'user-a',
      text: PLAN,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    const saved = saveReviewFeedback({
      store,
      userId: 'user-a',
      now: NOW,
      body: {
        reviewId: review.record.reviewId,
        agreement: 'partial',
        accuracy: 'misstated',
        revisionAreas: ['payer', 'evidence'],
        comment: '지불자를 사용자와 같은 사람으로 적었다.',
        nextAction: 'verify_hypotheses',
      },
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.feedback.modelCalls).toBe(0);
    expect(saved.feedback.comment).toContain('지불자');
    expect(saved.view.feedback).toHaveLength(1);
    const again = await runFirstReview({
      store,
      userId: 'user-a',
      text: PLAN,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(calls).toBe(1);
    expect(again.called).toBe(false);
    expect(again.view.feedback[0]?.revisionAreas).toEqual(['payer', 'evidence']);
    const withoutOther = saveReviewFeedback({
      store,
      userId: 'user-a',
      now: NOW,
      body: {
        reviewId: review.record.reviewId,
        agreement: 'agree',
        accuracy: 'mostly_accurate',
        revisionAreas: ['market'],
        comment: '기타를 고르지 않고 남기는 설명',
        nextAction: 'hold',
      },
    });
    expect(withoutOther.ok).toBe(true);
    expect(calls).toBe(1);
    store.close();
  });

  it('keeps the original plan and feedback when a follow-up uses another engine reply', async () => {
    const store = openAiPmReviewStore(storePath());
    const seen: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      seen.push(request);
      return reply(JSON.stringify(sections()), { model: seen.length === 1 ? 'gpt-4o-mini' : 'gpt-4o-mini-later' });
    };
    const first = await runFirstReview({
      store,
      userId: 'user-a',
      text: PLAN,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    saveReviewFeedback({
      store,
      userId: 'user-a',
      now: NOW,
      body: {
        reviewId: first.record.reviewId,
        agreement: 'disagree',
        accuracy: 'misstated',
        revisionAreas: ['other'],
        comment: '양조장 수를 확인하지 않았다.',
        nextAction: 'revise_plan',
      },
    });
    const follow = await runFollowUpReview({
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: '양조장 대표 인터뷰는 아직 없다.',
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(follow.ok).toBe(true);
    if (!follow.ok) return;
    expect(follow.called).toBe(true);
    expect(seen).toHaveLength(2);
    const followText = seen[1]?.messages.map((message) => message.content).join('\n') ?? '';
    expect(followText).not.toContain('UNIQUEPLANMARKER');
    expect(followText).toContain('양조장 대표');
    expect(follow.record.inputText).toBe(PLAN);
    expect(follow.record.parentReviewId).toBe(first.record.reviewId);
    expect(follow.record.model).toBe('gpt-4o-mini-later');
    const parent = store.readReview('user-a', first.record.reviewId);
    expect(parent?.inputText).toBe(PLAN);
    expect(parent?.model).toBe('gpt-4o-mini');
    expect(store.listFeedback('user-a', first.record.reviewId)).toHaveLength(1);
    const repeated = await runFollowUpReview({
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: '양조장 대표 인터뷰는 아직 없다.',
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(repeated.ok && repeated.called).toBe(false);
    expect(seen).toHaveLength(2);
    const replaced = await runFirstReview({
      store,
      userId: 'user-a',
      text: PLAN,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat: async () => reply(JSON.stringify(sections()), { model: 'some-other-model' }),
      evidence: 'injected_http',
    });
    expect(replaced.called).toBe(false);
    expect(replaced.record.model).not.toBe('some-other-model');
    expect(store.readReview('user-a', first.record.reviewId)?.sections?.judgment).toContain('보류');
    store.close();
  });

  it('hides engine names, token counts, and errors from the user view', async () => {
    const store = openAiPmReviewStore(storePath());
    const failed = await runFirstReview({
      store,
      userId: 'user-a',
      text: '짧은 사업 메모입니다. 고객은 아직 없습니다.',
      origin: 'typed',
      fileName: null,
      now: NOW,
      evidence: 'injected_http',
      chat: async () => {
        throw new Error('OpenAI connection failed');
      },
    });
    expect(failed.record.error).toContain('OpenAI');
    expect(failed.record.callCount).toBe(1);
    expect(JSON.stringify(failed.view).toLowerCase()).not.toMatch(/openai|gemini|\bgpt\b|token/);
    const quiet = await runFirstReview({
      store,
      userId: 'user-b',
      text: '다른 사업 메모입니다. 문제는 재고입니다.',
      origin: 'typed',
      fileName: null,
      now: NOW,
      evidence: 'not_run',
    });
    expect(quiet.called).toBe(false);
    expect(quiet.record.callCount).toBe(0);
    expect(quiet.record.promptTokens).toBeNull();
    expect(quiet.view.status).toBe('unavailable');
    expect(JSON.stringify(quiet.view)).not.toContain('engine_unconfigured');
    const unknownUsage = await runFirstReview({
      store,
      userId: 'user-c',
      text: '세 번째 사업 메모입니다. 가격은 없습니다.',
      origin: 'typed',
      fileName: null,
      now: NOW,
      evidence: 'injected_http',
      chat: async () => reply(JSON.stringify(sections()), { usageKnown: false }),
    });
    expect(unknownUsage.record.usageKnown).toBe(false);
    expect(unknownUsage.record.totalTokens).toBeNull();
    expect(parseFeedbackBody({ reviewId: 'x' }).ok).toBe(false);
    expect(saveReviewFeedback({ store, userId: 'user-c', now: NOW, body: { reviewId: 'missing' } }).ok).toBe(false);
    const direct = buildFollowUpRequest({
      sections: sections(),
      feedback: {
        feedbackId: 'fb',
        reviewId: 'rv',
        userId: 'user-c',
        agreement: 'need_info',
        accuracy: 'hard_to_compare',
        revisionAreas: [],
        comment: '',
        nextAction: 'design_interviews',
        submittedAt: NOW,
        modelCalls: 0,
      },
      supplement: '',
    });
    expect(direct.messages.some((message) => message.content.includes('UNIQUEPLANMARKER'))).toBe(false);
    expect(toAiPmReviewView(unknownUsage.record, []).status).toBe('ready');
    store.close();
  });

  it('keeps model names off the user screen and out of feedback submission', () => {
    const panel = readFileSync(new URL('../../components/ai-pm-review-panel.tsx', import.meta.url), 'utf8');
    const feedbackRoute = readFileSync(new URL('../../../../app/api/ai-pm-review/feedback/route.ts', import.meta.url), 'utf8');
    const screen = readFileSync(new URL('../../components/validation-journey-screen.tsx', import.meta.url), 'utf8');
    expect(panel.toLowerCase()).not.toMatch(/gpt|gemini|openai|token/);
    expect(feedbackRoute).not.toMatch(/OpenAIProviderAdapter|@repo\/ai|gemini|\.chat\(/i);
    expect(screen).not.toContain('GeminiRoundPanel');
    expect(screen).not.toContain('FreeGeminiWebPanel');
    expect(screen).not.toContain('WebReviewPanel');
    expect(screen).toContain('AiPmReviewPanel');
    expect(screen).not.toContain('GPT API');
  });

  it('reads GPT_API_KEY and leaves OPENAI_API_KEY unused', () => {
    expect(readGptApiKey({ GPT_API_KEY: ' present ', OPENAI_API_KEY: 'other' })).toBe('present');
    expect(readGptApiKey({ OPENAI_API_KEY: 'other' })).toBeNull();
    expect(readGptApiKey({})).toBeNull();
    const reviewRoute = readFileSync(new URL('../../../../app/api/ai-pm-review/route.ts', import.meta.url), 'utf8');
    const followRoute = readFileSync(new URL('../../../../app/api/ai-pm-review/follow-up/route.ts', import.meta.url), 'utf8');
    expect(reviewRoute).toContain('readGptApiKey');
    expect(followRoute).toContain('readGptApiKey');
    expect(reviewRoute).not.toContain('OPENAI_API_KEY');
    expect(followRoute).not.toContain('OPENAI_API_KEY');
    const storeSource = readFileSync(new URL('../ai-pm-review-store.ts', import.meta.url), 'utf8');
    expect(storeSource).toContain('durable: false');
  });
});
