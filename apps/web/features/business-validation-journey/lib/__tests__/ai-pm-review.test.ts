import { readFileSync } from 'node:fs';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import { chooseReviewBackend, openSupabaseReviewStore, type AiPmDurablePort } from '../ai-pm-review-backend';
import {
  buildFirstReviewRequest,
  buildFollowUpRequest,
  parseFeedbackBody,
  parseSections,
  readGptApiKey,
  reviewInputFromParts,
  runFirstReview,
  runFollowUpReview,
  saveReviewFeedback,
  toAiPmReviewView,
} from '../ai-pm-review';
import { openAiPmReviewStore, type ReviewSections, type StoredFeedback, type StoredReview } from '../ai-pm-review-store';

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
    nextQuestion: '양조장 대표에게 노출 비용을 제안한 적이 있습니까?',
    nextQuestionReason: '지불 후보의 실제 제안 여부가 보류 판단을 바꿉니다.',
    answerHint: '제안한 적이 있으면 그 한 건을, 없으면 제안 전이라고 적습니다.',
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
    const saved = await saveReviewFeedback({
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
    const withoutOther = await saveReviewFeedback({
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
    await saveReviewFeedback({
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
    const parent = await store.readReview('user-a', first.record.reviewId);
    expect(parent?.inputText).toBe(PLAN);
    expect(parent?.model).toBe('gpt-4o-mini');
    expect(await store.listFeedback('user-a', first.record.reviewId)).toHaveLength(1);
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
    expect((await store.readReview('user-a', first.record.reviewId))?.sections?.judgment).toContain('보류');
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
    expect((await saveReviewFeedback({ store, userId: 'user-c', now: NOW, body: { reviewId: 'missing' } })).ok).toBe(false);
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
    const workspace = readFileSync(
      new URL(
        '../../../workflow-journey/components/project-workspace-shell/workspace-ai-pm-main.tsx',
        import.meta.url,
      ),
      'utf8',
    );
    expect(workspace).toContain('AiPmReviewPanel');
    expect(workspace).toContain('initialText={siInputText}');
    expect(panel).toContain("fetch('/api/ai-pm-review'");
    expect(screen).not.toContain('GPT API');
    expect(panel).toContain('data-question-source="model-review"');
    expect(panel).not.toContain('present-si-ai-pm-question');
    expect(panel).not.toContain('가장 가까운 결제 후보에게 유료로 제안했거나');
    const request = buildFirstReviewRequest(PLAN);
    expect(request.messages.map((message) => message.content).join('\n')).not.toContain(
      '가장 가까운 결제 후보에게 유료로 제안했거나',
    );
  });

  it('keeps a model next question distinct from the fixed rule sentence', async () => {
    const store = openAiPmReviewStore(storePath());
    const fixed =
      '가장 가까운 결제 후보에게 유료로 제안했거나, 실제로 받은 돈이 있습니까? 있다면 그 한 건을 알려주세요. 아직이면 제안 전이라고 답해도 됩니다.';
    const copied = { ...sections(), nextQuestion: fixed };
    const rejected = await runFirstReview({
      store,
      userId: 'user-a',
      text: PLAN,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat: async () => reply(JSON.stringify(copied)),
      evidence: 'injected_http',
    });
    expect(parseSections(JSON.stringify(copied))).toBeNull();
    expect(rejected.record.status).toBe('failed');
    expect(rejected.view.questionSource).toBeNull();
    expect(rejected.view.sections).toBeNull();
    const withoutQuestion = { ...sections() } as Partial<ReturnType<typeof sections>>;
    delete withoutQuestion.nextQuestion;
    expect(parseSections(JSON.stringify(withoutQuestion))).toBeNull();

    const accepted = await runFirstReview({
      store,
      userId: 'user-a',
      text: '다른 양조장 메모. 수요와 가격은 아직 없다.',
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat: async () => reply(JSON.stringify(sections())),
      evidence: 'injected_http',
    });
    expect(accepted.view.questionSource).toBe('model-review');
    expect(accepted.view.sections?.nextQuestion).toContain('양조장 대표');
    const answer = '제안한 적 없고, 받은 돈도 없습니다.';
    const follow = await runFollowUpReview({
      store,
      userId: 'user-a',
      reviewId: accepted.record.reviewId,
      supplement: answer,
      now: NOW,
      chat: async (request) => {
        const content = request.messages.map((message) => message.content).join('\n');
        expect(content).toContain(accepted.view.sections?.nextQuestion);
        expect(content).toContain(answer);
        expect(content).not.toContain('UNIQUEPLANMARKER');
        return reply(JSON.stringify(sections()));
      },
      evidence: 'injected_http',
    });
    expect(follow.ok).toBe(true);
    if (follow.ok) {
      expect(follow.called).toBe(true);
      expect(follow.record.parentReviewId).toBe(accepted.record.reviewId);
      expect(follow.record.inputText).toContain('다른 양조장 메모');
      expect(follow.view.questionSource).toBe('model-review');
    }
    store.close();
  });

  it('stores no review sentences when GPT_API_KEY is absent', async () => {
    const store = openAiPmReviewStore(storePath());
    const missing = await runFirstReview({
      store,
      userId: 'user-missing',
      text: PLAN,
      origin: 'typed',
      fileName: null,
      now: NOW,
      evidence: 'not_run',
      notRunReason: 'gpt_api_key_missing',
    });
    expect(missing.called).toBe(false);
    expect(missing.record.status).toBe('not_run');
    expect(missing.record.callCount).toBe(0);
    expect(missing.record.sections).toBeNull();
    expect(missing.record.rawContent).toBeNull();
    expect(missing.record.error).toBe('gpt_api_key_missing');
    expect(missing.view.status).toBe('unavailable');
    expect(missing.view.sections).toBeNull();
    expect(missing.view.questionSource).toBeNull();
    expect(JSON.stringify(missing.view)).not.toContain('gpt_api_key_missing');
    const reopened = await runFirstReview({
      store,
      userId: 'user-missing',
      text: PLAN,
      origin: 'file',
      fileName: 'plan.txt',
      now: NOW,
      evidence: 'not_run',
      notRunReason: 'gpt_api_key_missing',
    });
    expect(reopened.called).toBe(false);
    expect(reopened.record.reviewId).toBe(missing.record.reviewId);
    expect(reopened.record.callCount).toBe(0);

    const ready = await runFirstReview({
      store,
      userId: 'user-missing',
      text: '두 번째 사업 메모. 가격과 고객 수는 없다.',
      origin: 'typed',
      fileName: null,
      now: NOW,
      evidence: 'injected_http',
      chat: async () => reply(JSON.stringify(sections())),
    });
    await saveReviewFeedback({
      store,
      userId: 'user-missing',
      now: NOW,
      body: {
        reviewId: ready.record.reviewId,
        agreement: 'partial',
        accuracy: 'mostly_accurate',
        revisionAreas: ['payer'],
        comment: '지불자를 다시 봐야 한다.',
        nextAction: 'verify_hypotheses',
      },
    });
    const follow = await runFollowUpReview({
      store,
      userId: 'user-missing',
      reviewId: ready.record.reviewId,
      supplement: '대표 인터뷰는 아직 없다.',
      now: NOW,
      evidence: 'not_run',
      notRunReason: 'gpt_api_key_missing',
    });
    expect(follow.ok).toBe(false);
    if (!follow.ok) expect(follow.error).toBe('gpt_api_key_missing');
    expect((await store.listReviews('user-missing')).filter((record) => record.parentReviewId === ready.record.reviewId)).toHaveLength(0);
    store.close();
  });

  it('reads GPT_API_KEY and leaves OPENAI_API_KEY unused', () => {
    expect(readGptApiKey({ GPT_API_KEY: ' present ', OPENAI_API_KEY: 'other' })).toBe('present');
    expect(readGptApiKey({ OPENAI_API_KEY: 'other' })).toBeNull();
    expect(readGptApiKey({})).toBeNull();
    const reviewRoute = readFileSync(new URL('../../../../app/api/ai-pm-review/route.ts', import.meta.url), 'utf8');
    const followRoute = readFileSync(new URL('../../../../app/api/ai-pm-review/follow-up/route.ts', import.meta.url), 'utf8');
    const feedbackRoute = readFileSync(new URL('../../../../app/api/ai-pm-review/feedback/route.ts', import.meta.url), 'utf8');
    expect(reviewRoute).toContain('readGptApiKey');
    expect(followRoute).toContain('readGptApiKey');
    expect(reviewRoute).not.toContain('OPENAI_API_KEY');
    expect(followRoute).not.toContain('OPENAI_API_KEY');
    const storeSource = readFileSync(new URL('../ai-pm-review-store.ts', import.meta.url), 'utf8');
    expect(storeSource).toContain('durable: false');
    const backendSource = readFileSync(new URL('../ai-pm-review-backend.ts', import.meta.url), 'utf8');
    expect(backendSource).toContain('isSupabaseAdminConfigured');
    expect(backendSource).toContain('openSupabaseReviewStore');
    expect(reviewRoute).toContain('openReviewBackend');
    expect(followRoute).toContain('openReviewBackend');
    expect(feedbackRoute).toContain('openReviewBackend');
    const migration = readFileSync(
      new URL('../../../../../../packages/db/src/migration/023_ai_pm_reviews.sql', import.meta.url),
      'utf8',
    );
    expect(migration).toContain('references auth.users (id) on delete cascade');
    expect(migration).toContain('on delete cascade');
    expect(migration.toLowerCase()).not.toContain('insert into');
  });

  it('hides another user and deletes the plan with the owner', async () => {
    const store = openAiPmReviewStore(storePath());
    const saved = await runFirstReview({
      store,
      userId: 'user-a',
      text: PLAN,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat: async () => reply(JSON.stringify(sections())),
      evidence: 'injected_http',
    });
    await saveReviewFeedback({
      store,
      userId: 'user-a',
      now: NOW,
      body: {
        reviewId: saved.record.reviewId,
        agreement: 'partial',
        accuracy: 'mostly_accurate',
        revisionAreas: ['payer'],
        comment: '지불자를 다시 본다.',
        nextAction: 'hold',
      },
    });
    expect(await store.readReview('user-b', saved.record.reviewId)).toBeNull();
    expect(await store.listReviews('user-b')).toEqual([]);
    expect(await store.listFeedback('user-b', saved.record.reviewId)).toEqual([]);
    const foreign = await saveReviewFeedback({
      store,
      userId: 'user-b',
      now: NOW,
      body: {
        reviewId: saved.record.reviewId,
        agreement: 'agree',
        accuracy: 'very_accurate',
        revisionAreas: [],
        comment: '',
        nextAction: 'proceed',
      },
    });
    expect(foreign.ok).toBe(false);
    const follow = await runFollowUpReview({
      store,
      userId: 'user-b',
      reviewId: saved.record.reviewId,
      supplement: '다른 사용자의 추가 사실',
      now: NOW,
      chat: async () => reply(JSON.stringify(sections())),
      evidence: 'injected_http',
    });
    expect(follow.ok).toBe(false);
    await store.deleteOwnedRecords('user-a');
    expect(await store.readReview('user-a', saved.record.reviewId)).toBeNull();
    expect(await store.listFeedback('user-a')).toEqual([]);
    expect(await store.listReviews('user-a')).toEqual([]);
    store.close();
  });

  it('reports durable storage only for the Supabase repository', async () => {
    let remote = 0;
    const local = chooseReviewBackend({
      adminConfigured: false,
      openSqlite: () => openAiPmReviewStore(storePath()),
      openSupabase: () => {
        remote += 1;
        return openSupabaseReviewStore(memoryPort());
      },
    });
    expect(local.storage.durable).toBe(false);
    expect(local.storage.productionDatabase).toBe(false);
    expect(remote).toBe(0);
    local.store.close();

    const port = memoryPort();
    const remoteBackend = chooseReviewBackend({
      adminConfigured: true,
      openSqlite: () => openAiPmReviewStore(storePath()),
      openSupabase: () => {
        remote += 1;
        return openSupabaseReviewStore(port);
      },
    });
    expect(remote).toBe(1);
    expect(remoteBackend.storage.durable).toBe(true);
    expect(remoteBackend.storage.kind).toBe('supabase');
    const owner = '11111111-1111-1111-1111-111111111111';
    const other = '22222222-2222-2222-2222-222222222222';
    const saved = await runFirstReview({
      store: remoteBackend.store,
      userId: owner,
      text: PLAN,
      origin: 'typed',
      fileName: null,
      now: NOW,
      evidence: 'not_run',
      notRunReason: 'gpt_api_key_missing',
    });
    expect(saved.view.status).toBe('unavailable');
    expect(saved.record.sections).toBeNull();
    expect(await remoteBackend.store.readReview(other, saved.record.reviewId)).toBeNull();
    await remoteBackend.store.deleteOwnedRecords(owner);
    expect(await remoteBackend.store.listReviews(owner)).toEqual([]);
    expect(port.rows).toHaveLength(0);
  });
});

function memoryPort(): AiPmDurablePort & { rows: StoredReview[] } {
  const reviews: StoredReview[] = [];
  const feedback: StoredFeedback[] = [];
  return {
    rows: reviews,
    insertReview: async (row) => {
      const record = row.recordJson as StoredReview;
      if (reviews.some((item) => item.userId === row.userId && item.reviewId === row.reviewId)) return { wrote: false };
      reviews.push(record);
      return { wrote: true };
    },
    insertFeedback: async (row) => {
      feedback.push(row.recordJson as StoredFeedback);
      return { wrote: true };
    },
    readReview: async (userId, reviewId) => {
      const record = reviews.find((item) => item.userId === userId && item.reviewId === reviewId);
      return record ? toRow(record) : null;
    },
    latestForInput: async (userId, inputSha) => {
      const record = reviews.filter((item) => item.userId === userId && item.inputSha === inputSha).at(-1);
      return record ? toRow(record) : null;
    },
    succeededChild: async (userId, parentReviewId, sourceFeedbackId, supplementSha) => {
      const record = reviews.find(
        (item) =>
          item.userId === userId &&
          item.parentReviewId === parentReviewId &&
          item.sourceFeedbackId === sourceFeedbackId &&
          item.supplementSha === supplementSha &&
          item.status === 'succeeded',
      );
      return record ? toRow(record) : null;
    },
    listReviews: async (userId) => reviews.filter((item) => item.userId === userId).map(toRow),
    listFeedback: async (userId, reviewId) =>
      feedback
        .filter((item) => item.userId === userId && (!reviewId || item.reviewId === reviewId))
        .map((item) => ({
          userId: item.userId,
          feedbackId: item.feedbackId,
          reviewId: item.reviewId,
          recordJson: { ...item },
          submittedAt: item.submittedAt,
        })),
    deleteForUser: async (userId) => {
      for (let index = feedback.length - 1; index >= 0; index -= 1) {
        if (feedback[index]?.userId === userId) feedback.splice(index, 1);
      }
      for (let index = reviews.length - 1; index >= 0; index -= 1) {
        if (reviews[index]?.userId === userId) reviews.splice(index, 1);
      }
    },
  };
}

function toRow(record: StoredReview) {
  return {
    userId: record.userId,
    reviewId: record.reviewId,
    inputSha: record.inputSha,
    version: record.version,
    parentReviewId: record.parentReviewId,
    sourceFeedbackId: record.sourceFeedbackId,
    supplementSha: record.supplementSha,
    status: record.status,
    recordJson: { ...record },
    finishedAt: record.finishedAt,
  };
}
