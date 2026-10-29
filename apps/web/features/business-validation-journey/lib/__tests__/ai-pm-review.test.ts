import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import { chooseReviewBackend, openSupabaseReviewStore, type AiPmDurablePort } from '../ai-pm-review-backend';
import {
  AI_PM_GEMINI_FALLBACK_MODEL,
  AI_PM_REVIEW_INPUT_TOKEN_BUDGET,
  AI_PM_REVIEW_FIRST_MAX_TOKENS,
  assessFollowUpRevision,
  buildFirstReviewRequest,
  buildFollowUpRequest,
  callReviewWithQuotaSwitch,
  estimateReviewTokens,
  parseFeedbackBody,
  parseSections,
  presentReview,
  readGptApiKey,
  reviewInputFromParts,
  runFirstReview,
  runFollowUpReview,
  saveReviewFeedback,
  toAiPmReviewView,
} from '../ai-pm-review';
import { composeReviewInput, nextDirectionAfterChoice } from '../ai-pm-review-intake';
import { visibleClaimStates } from '../ai-pm-review-marks';
import { projectLinksForUnscopedReviews } from '../ai-pm-review-project';
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
    claimConfirmation: null,
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
    const followUser = seen[1]?.messages.find((message) => message.role === 'user')?.content ?? '';
    const followPayload = JSON.parse(followUser) as {
      originalInput: string;
      previousReview: { nextQuestion: string };
      feedback: { comment: string };
      supplement: string;
      revision?: unknown;
    };
    expect(followPayload.originalInput).toBe(PLAN);
    expect(followPayload.previousReview.nextQuestion).toContain('양조장 대표');
    expect(followPayload.feedback.comment).toContain('양조장 수');
    expect(followPayload.supplement).toContain('인터뷰');
    expect(followPayload.revision).toBeUndefined();
    expect(follow.record.inputText).toBe(PLAN);
    expect(follow.record.parentReviewId).toBe(first.record.reviewId);
    expect(follow.record.model).toBe('gpt-4o-mini-later');
    const parent = await store.readReview('user-a', first.record.reviewId);
    expect(parent?.inputText).toBe(PLAN);
    expect(parent?.model).toBe('gpt-4o-mini');
    expect(await store.listFeedback('user-a', first.record.reviewId)).toHaveLength(1);
    const repeated = await runFollowUpReview({
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
    const marked = parseFeedbackBody({
      reviewId: 'rv',
      marks: ['understanding_wrong', 'core_missing', 'understanding_wrong'],
    });
    expect(marked.ok).toBe(true);
    if (marked.ok) {
      expect(marked.value.agreement).toBe('disagree');
      expect(marked.value.marks).toEqual(['understanding_wrong', 'core_missing']);
      expect(marked.value.comment).toContain('사업 이해가 틀림');
    }
    expect(
      (await saveReviewFeedback({ store, userId: 'user-c', projectId: 'project-test', now: NOW, body: { reviewId: 'missing' } })).ok,
    ).toBe(false);
    const direct = buildFollowUpRequest({
      originalInput: '원문에는 표식이 없다.',
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
        marks: [],
        submittedAt: NOW,
        modelCalls: 0,
      },
      supplement: '',
    });
    expect(direct.messages.some((message) => message.content.includes('UNIQUEPLANMARKER'))).toBe(false);
    const corrected = buildFollowUpRequest({
      originalInput: '원문에는 표식이 없다.',
      sections: sections(),
      feedback: {
        feedbackId: 'fb-marks',
        reviewId: 'rv',
        userId: 'user-c',
        agreement: 'disagree',
        accuracy: 'misstated',
        revisionAreas: ['problem'],
        comment: '사업 이해가 틀림, 핵심 내용이 빠짐',
        nextAction: 'verify_hypotheses',
        marks: ['understanding_wrong', 'core_missing'],
        submittedAt: NOW,
        modelCalls: 0,
      },
      supplement: '',
    });
    const correctedUser = corrected.messages.find((message) => message.role === 'user')?.content ?? '';
    const correctedPayload = JSON.parse(correctedUser) as {
      originalInput: string;
      previousReview: { problem: string; nextQuestion: string };
      feedback: { marks: string[] };
      revision: {
        reconfirm: {
          action: string;
          hypotheses: Array<{ field: string; requiredState: string; previousClaim: string }>;
          confirmation: { problem: string; target_customer: string; business_model: string };
        };
        askFounder: { action: string; requiredMeaning: string; rejectMeaning: string; previousQuestion: string };
      };
      supplement: string;
    };
    expect(correctedPayload.originalInput).toBe('원문에는 표식이 없다.');
    expect(correctedPayload.previousReview.problem).toBe(sections().problem);
    expect(correctedPayload.feedback.marks).toEqual(['understanding_wrong', 'core_missing']);
    expect(correctedPayload.revision.reconfirm.action).toBe('mark_unconfirmed');
    expect(correctedPayload.revision.reconfirm.hypotheses.map((item) => item.field)).toEqual([
      'problem',
      'target_customer',
      'business_model',
    ]);
    expect(correctedPayload.revision.reconfirm.hypotheses.every((item) => item.requiredState === 'unconfirmed')).toBe(true);
    expect(correctedPayload.revision.reconfirm.confirmation).toEqual({
      problem: 'unconfirmed',
      target_customer: 'unconfirmed',
      business_model: 'unconfirmed',
    });
    expect(correctedPayload.revision.askFounder.action).toBe('ask_missing_core');
    expect(correctedPayload.revision.askFounder.requiredMeaning).toBe('ask_what_core_is_missing');
    expect(correctedPayload.revision.askFounder.rejectMeaning).toBe('partnership_or_plan_substitute');
    expect(correctedPayload.revision.askFounder.previousQuestion).toBe(sections().nextQuestion);
    expect(correctedPayload.supplement).toBe('');
    expect(correctedUser).not.toContain('수정된 사업 이해:');
    expect(correctedUser).not.toContain('UNIQUEPLANMARKER');
    expect(estimateReviewTokens(corrected.messages.map((message) => message.content).join('\n'))).toBeLessThan(3_000);
    expect(toAiPmReviewView(unknownUsage.record, []).status).toBe('ready');
    store.close();
  });

  it('keeps model names off the user screen and out of feedback submission', () => {
    const panel = readFileSync(new URL('../../components/ai-pm-review-panel.tsx', import.meta.url), 'utf8');
    const feedbackRoute = readFileSync(new URL('../../../../app/api/ai-pm-review/feedback/route.ts', import.meta.url), 'utf8');
    const screen = readFileSync(new URL('../../components/validation-journey-screen.tsx', import.meta.url), 'utf8');
    expect(panel.toLowerCase()).not.toMatch(/gpt|gemini|openai|token/);
    expect(panel).toContain('visibleClaimStates');
    expect(panel).toContain('data-testid="ai-pm-claim-states"');
    expect(panel).toContain("review.status === 'ready'");
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
    expect(workspace).toContain('projectId={projectId}');
    expect(workspace).toContain('initialText={siInputText}');
    expect(workspace).toContain('!demoSamplePlayback && siInputText.length >= 8');
    expect(panel).toContain("fetch('/api/ai-pm-review'");
    expect(screen).not.toContain('GPT API');
    expect(panel).toContain('data-question-source="model-review"');
    const resultBlock = panel.slice(panel.indexOf('data-testid="ai-pm-result"'), panel.indexOf("step === 'question'"));
    expect(resultBlock).toContain('data-testid="ai-pm-next-question-text"');
    expect(panel).toContain('revisionReview.finishedAt >= active.finishedAt');
    expect(panel).not.toContain('present-si-ai-pm-question');
    expect(panel).not.toContain('가장 가까운 결제 후보에게 유료로 제안했거나');
    expect(panel).toContain('검토 목적');
    expect(panel).toContain('기타 / 직접 입력');
    expect(panel).not.toContain('/api/ai-pm-review/follow-up');
    expect(panel).toContain('data-testid="ai-pm-choice-submit"');
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
    expect(
      (await store.listReviews('user-missing', 'project-test')).filter((record) => record.parentReviewId === ready.record.reviewId),
    ).toHaveLength(0);
    store.close();
  });

  it('caps the review request and switches once after a quota error', async () => {
    const request = buildFirstReviewRequest(`${'가'.repeat(20_000)} UNIQUEPLANMARKER`);
    const joined = request.messages.map((message) => message.content).join('\n');
    expect(request.maxTokens).toBe(AI_PM_REVIEW_FIRST_MAX_TOKENS);
    expect(estimateReviewTokens(joined)).toBeLessThanOrEqual(AI_PM_REVIEW_INPUT_TOKEN_BUDGET);
    expect(joined).toContain('summary, customer, problem, value, operatingModel');
    expect(joined).toContain('choices');
    expect(joined).toContain('모든 사업에 결제 여부를 먼저 묻지 않는다');
    expect(joined).toContain('시장 규모');
    expect(joined).not.toContain('UNIQUEPLANMARKER');
    const short = {
      problem: '노출이 약하다.',
      target_customer: '양조장 대표',
      solution: '체험 안내를 지원한다.',
      business_model: '대표가 안내 비용을 내는 가설이다.',
      validation_metric: '안내를 제안한 양조장 수',
      nextQuestion: '양조장 대표에게 안내 비용을 제안한 적이 있습니까?',
    };
    const expanded = parseSections(JSON.stringify(short));
    expect(expanded?.nextQuestion).toBe(short.nextQuestion);
    expect(expanded?.customer).toBe(short.target_customer);
    expect(expanded?.execution).toBe(short.solution);
    const calls: string[] = [];
    const switched = await callReviewWithQuotaSwitch({
      request,
      openAI: async () => {
        calls.push('openai');
        throw new Error('OpenAI rate limit exceeded provider_http=429 code=credit_balance_exhausted type=insufficient_quota');
      },
      gemini: async (chatRequest) => {
        calls.push(chatRequest.model);
        return reply(JSON.stringify(short), { provider: 'google', model: AI_PM_GEMINI_FALLBACK_MODEL });
      },
    });
    expect(calls).toEqual(['openai', AI_PM_GEMINI_FALLBACK_MODEL]);
    expect(switched.provider).toBe('google');
    const rateLimited = callReviewWithQuotaSwitch({
      request,
      openAI: async () => {
        throw new Error('OpenAI rate limit exceeded provider_http=429 code=rate_limit_exceeded type=tokens');
      },
      gemini: async () => {
        throw new Error('gemini should not run');
      },
    });
    await expect(rateLimited).rejects.toThrow(/rate_limit_exceeded/);
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
      projectId: 'project-test',
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
      projectId: 'project-test',
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
    expect(await store.listReviews('user-b', 'project-test')).toEqual([]);
    expect(await store.listFeedback('user-b', saved.record.reviewId)).toEqual([]);
    const foreign = await saveReviewFeedback({
      projectId: 'project-test',
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
      projectId: 'project-test',
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
    expect(await store.listReviews('user-a', 'project-test')).toEqual([]);
    store.close();
  });

  it('rejects the stored wrong-and-missing follow-up and keeps a reconfirming one', async () => {
    const original =
      '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.';
    const previousRaw = JSON.stringify({
      problem: '관광객들이 개인별 다양한 경험을 중시하지만, 전통주 체험을 제공하는 양조장에 대한 정보와 접근성이 부족하다.',
      target_customer: '전통주를 좋아하는 내국인 및 외국인 관광객.',
      solution: '양조장 체험 프로그램을 제공하고, 이를 통해 관광객이 직접 전통주를 만들고 즐길 수 있도록 안내하며, 주변 관광명소도 함께 소개하는 서비스.',
      business_model: '양조장 체험 프로그램 참가비 및 온라인 마케팅 지원을 통한 수익 창출.',
      validation_metric: '프로그램 참가자 수 및 고객 만족도 조사 결과.',
      nextQuestion: '양조장 두 곳에 안내 비용을 제안한 적이 없는데, 어떻게 파트너십을 구축할 계획인가?',
    });
    const failedRaw = JSON.stringify({
      problem: '관광객들이 전통주 체험을 제공하는 양조장에 대한 정보와 접근성이 부족하다.',
      target_customer: '전통주를 좋아하는 내국인 및 외국인 관광객.',
      solution: '양조장 체험 프로그램을 제공하고, 이를 통해 관광객이 직접 전통주를 만들고 즐길 수 있도록 안내하며, 주변 관광명소도 함께 소개하는 서비스.',
      business_model: '양조장 체험 프로그램 참가비 및 온라인 마케팅 지원을 통한 수익 창출.',
      validation_metric: '프로그램 참가자 수 및 고객 만족도 조사 결과.',
      nextQuestion: '양조장 두 곳에 안내 비용을 제안한 적이 없는데, 어떻게 파트너십을 구축할 계획인가?',
    });
    const previous = parseSections(previousRaw);
    const failed = parseSections(failedRaw);
    expect(previous && failed).toBeTruthy();
    if (!previous || !failed) return;
    const blocked = assessFollowUpRevision({
      previous,
      next: failed,
      marks: ['understanding_wrong', 'core_missing'],
    });
    expect(blocked.pass).toBe(false);
    expect(blocked.failures).toEqual(
      expect.arrayContaining(['confirmation_unset', 'confirmed_reuse', 'question_unchanged', 'missing_core_not_asked']),
    );
    expect(blocked.changes.join(' ')).toContain('고객 가설이 확정 사실로 남았습니다');
    expect(blocked.changes.join(' ')).toContain('수익 가설이 확정 사실로 남았습니다');
    const versionSeven = parseSections(
      JSON.stringify({
        problem: `재확인 대상: ${previous.problem} 이 해석은 확정된 사실이 아니다.`,
        target_customer: previous.customer,
        solution: previous.execution,
        business_model: previous.revenueModel,
        validation_metric: previous.market,
        nextQuestion: '어떤 방식으로 양조장과의 파트너십을 구체화할 계획인가?',
      }),
    );
    expect(versionSeven).toBeTruthy();
    if (!versionSeven) return;
    const partial = assessFollowUpRevision({
      previous,
      next: versionSeven,
      marks: ['understanding_wrong', 'core_missing'],
    });
    expect(partial.pass).toBe(false);
    expect(partial.failures).toEqual(['confirmation_unset', 'confirmed_reuse', 'missing_core_not_asked']);
    expect(visibleClaimStates(versionSeven)).toBeNull();
    expect(partial.changes.join(' ')).toContain('고객 가설이 확정 사실로 남았습니다');
    expect(partial.changes.join(' ')).toContain('수익 가설이 확정 사실로 남았습니다');
    expect(partial.changes.join(' ')).not.toContain('문제 가설이 확정 사실로 남았습니다');
    const detached = assessFollowUpRevision({
      previous,
      next: {
        ...versionSeven,
        customer: `${previous.customer} 재확인 대상이며 이 해석은 확정된 사실이 아니다.`,
        revenueModel: `${previous.revenueModel} 재확인 대상이며 이 해석은 확정된 사실이 아니다.`,
        judgment: `${versionSeven.judgment} 재확인 대상이며 이 해석은 확정된 사실이 아니다.`,
      },
      marks: ['understanding_wrong', 'core_missing'],
    });
    expect(detached.pass).toBe(false);
    expect(detached.failures).toContain('confirmed_reuse');
    expect(detached.changes.join(' ')).toContain('고객 가설이 확정 사실로 남았습니다');
    expect(detached.changes.join(' ')).toContain('수익 가설이 확정 사실로 남았습니다');
    const partnershipWithKeyword = {
      ...versionSeven,
      customer: `재확인 대상: ${previous.customer} 이 해석은 확정된 사실이 아니다.`,
      revenueModel: `재확인 대상: ${previous.revenueModel} 이 해석은 확정된 사실이 아니다.`,
      judgment: `재확인 대상: ${previous.judgment} 이 해석은 확정된 사실이 아니다.`,
      nextQuestion: '빠진 핵심을 담아 파트너십을 어떻게 구축할 계획인가?',
    };
    const substituted = assessFollowUpRevision({
      previous,
      next: partnershipWithKeyword,
      marks: ['understanding_wrong', 'core_missing'],
    });
    expect(substituted.pass).toBe(false);
    expect(substituted.failures).toContain('missing_core_not_asked');
    const wiped = assessFollowUpRevision({
      previous,
      next: {
        ...previous,
        problem: '없음',
        customer: '없음',
        revenueModel: '없음',
        execution: '',
        market: '',
        judgment: '없음',
        nextQuestion: '이 검토에서 빠진 핵심은 무엇입니까?',
      },
      marks: ['understanding_wrong', 'core_missing'],
    });
    expect(wiped.pass).toBe(false);
    expect(wiped.failures).toContain('discarded_interpretation');
    const wrap = (text: string) => `재확인 대상: ${text} 이 해석은 확정된 사실이 아니다.`;
    const unlabeled = assessFollowUpRevision({
      previous,
      next: parseSections(
        JSON.stringify({
          problem: wrap(previous.problem),
          target_customer: wrap(previous.customer),
          solution: previous.execution,
          business_model: wrap(previous.revenueModel),
          validation_metric: previous.market,
          nextQuestion: '이 검토에서 빠진 핵심은 무엇입니까?',
        }),
      )!,
      marks: ['understanding_wrong', 'core_missing'],
    });
    expect(unlabeled.pass).toBe(false);
    expect(unlabeled.failures).toEqual(['confirmation_unset']);
    const confirmation = {
      problem: 'unconfirmed',
      target_customer: 'unconfirmed',
      business_model: 'unconfirmed',
    };
    const statedAsFact = assessFollowUpRevision({
      previous,
      next: parseSections(
        JSON.stringify({
          problem: previous.problem,
          target_customer: previous.customer,
          solution: previous.execution,
          business_model: previous.revenueModel,
          validation_metric: previous.market,
          nextQuestion: '이 검토에서 빠진 핵심은 무엇입니까?',
          confirmation,
        }),
      )!,
      marks: ['understanding_wrong', 'core_missing'],
    });
    expect(statedAsFact.pass).toBe(false);
    expect(statedAsFact.failures).toContain('confirmed_reuse');
    expect(statedAsFact.failures).not.toContain('confirmation_unset');
    const declaredConfirmed = assessFollowUpRevision({
      previous,
      next: parseSections(
        JSON.stringify({
          problem: wrap(previous.problem),
          target_customer: wrap(previous.customer),
          solution: previous.execution,
          business_model: wrap(previous.revenueModel),
          validation_metric: previous.market,
          nextQuestion: '이 검토에서 빠진 핵심은 무엇입니까?',
          confirmation: {
            problem: 'confirmed',
            target_customer: 'confirmed',
            business_model: 'confirmed',
          },
        }),
      )!,
      marks: ['understanding_wrong', 'core_missing'],
    });
    expect(declaredConfirmed.pass).toBe(false);
    expect(declaredConfirmed.failures).toEqual(['confirmed_reuse']);
    const structured = parseSections(
      JSON.stringify({
        problem: wrap(previous.problem),
        target_customer: wrap(previous.customer),
        solution: previous.execution,
        business_model: wrap(previous.revenueModel),
        validation_metric: previous.market,
        nextQuestion: '이 검토에서 빠진 핵심은 무엇입니까?',
        confirmation,
      }),
    );
    expect(structured?.claimConfirmation).toEqual({
      problem: 'unconfirmed',
      customer: 'unconfirmed',
      revenue: 'unconfirmed',
    });
    const passed = assessFollowUpRevision({
      previous,
      next: structured!,
      marks: ['understanding_wrong', 'core_missing'],
    });
    expect(passed.pass).toBe(true);
    expect(passed.changes.join(' ')).toContain('확인 전');
    expect(passed.changes.join(' ')).toContain('누락된 핵심');
    expect(visibleClaimStates(structured!)?.map((row) => row.stateLabel)).toEqual(['확인 전', '확인 전', '확인 전']);

    const store = openAiPmReviewStore(storePath());
    const parent = await runFirstReview({
      projectId: 'project-test',
      store,
      userId: 'user-gate',
      text: original,
      origin: 'typed',
      fileName: null,
      now: NOW,
      evidence: 'injected_http',
      chat: async () => reply(previousRaw),
    });
    const saved = await saveReviewFeedback({
      projectId: 'project-test',
      store,
      userId: 'user-gate',
      now: NOW,
      body: { reviewId: parent.record.reviewId, marks: ['understanding_wrong', 'core_missing'] },
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    const ungated: StoredReview = {
      ...parent.record,
      reviewId: 'stored-v6',
      version: 2,
      parentReviewId: parent.record.reviewId,
      sourceFeedbackId: saved.feedback.feedbackId,
      supplementSha: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      sections: failed,
      rawContent: failedRaw,
      revisionGate: null,
      status: 'succeeded',
    };
    await store.insertReview(ungated);
    const shown = presentReview(ungated, [saved.feedback], [parent.record, ungated]);
    expect(shown.status).toBe('failed');
    expect(shown.sections).toBeNull();
    expect(shown.revision?.pass).toBe(false);
    expect(shown.revision?.summary).toContain('반영하지 않았습니다');
    expect(JSON.stringify(shown)).not.toContain('revision_gate');

    let calls = 0;
    const rejected = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-gate',
      reviewId: parent.record.reviewId,
      supplement: '',
      now: NOW,
      evidence: 'injected_http',
      chat: async (request) => {
        calls += 1;
        const payload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
          originalInput?: string;
          revision?: {
            reconfirm?: {
              hypotheses?: Array<{ requiredState?: string }>;
              confirmation?: { problem?: string; target_customer?: string; business_model?: string };
            };
            askFounder?: { previousQuestion?: string; requiredMeaning?: string };
          };
          previousReview?: { judgment?: string };
          feedback?: { marks?: string[] };
        };
        expect(payload.originalInput).toBe(original);
        expect(payload.previousReview?.judgment).toBe(previous.judgment);
        expect(payload.feedback?.marks).toEqual(['understanding_wrong', 'core_missing']);
        expect(payload.revision?.reconfirm?.hypotheses).toHaveLength(3);
        expect(payload.revision?.reconfirm?.hypotheses?.every((item) => item.requiredState === 'unconfirmed')).toBe(true);
        expect(payload.revision?.reconfirm?.confirmation).toEqual({
          problem: 'unconfirmed',
          target_customer: 'unconfirmed',
          business_model: 'unconfirmed',
        });
        expect(payload.revision?.askFounder?.requiredMeaning).toBe('ask_what_core_is_missing');
        expect(payload.revision?.askFounder?.previousQuestion).toBe(previous.nextQuestion);
        expect(request.model).toBe('gpt-4o-mini');
        expect(request.maxTokens).toBe(800);
        return reply(failedRaw);
      },
    });
    expect(calls).toBe(1);
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    expect(rejected.called).toBe(true);
    expect(rejected.record.status).toBe('failed');
    expect(rejected.record.callCount).toBe(1);
    expect(rejected.record.revisionGate?.pass).toBe(false);
    expect(rejected.record.sections?.customer).toBe(failed.customer);
    expect(rejected.view.status).toBe('failed');
    expect(rejected.view.sections).toBeNull();
    expect(JSON.stringify(rejected.view)).not.toContain(failed.customer);
    expect(rejected.view.revision?.summary).toBe(rejected.record.revisionGate?.summary);
    const again = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-gate',
      reviewId: parent.record.reviewId,
      supplement: '',
      now: NOW,
      evidence: 'injected_http',
      chat: async () => {
        calls += 1;
        return reply(failedRaw);
      },
    });
    expect(calls).toBe(1);
    expect(again.ok && again.called).toBe(false);
    if (again.ok) expect(again.record.reviewId).toBe(rejected.record.reviewId);

    const accepted = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-pass',
      reviewId: 'missing',
      now: NOW,
      evidence: 'injected_http',
    });
    expect(accepted.ok).toBe(false);
    const passingParent = await runFirstReview({
      projectId: 'project-test',
      store,
      userId: 'user-pass',
      text: original,
      origin: 'typed',
      fileName: null,
      now: NOW,
      evidence: 'injected_http',
      chat: async () => reply(previousRaw),
    });
    await saveReviewFeedback({
      projectId: 'project-test',
      store,
      userId: 'user-pass',
      now: NOW,
      body: { reviewId: passingParent.record.reviewId, marks: ['understanding_wrong', 'core_missing'] },
    });
    const passingRaw = JSON.stringify({
      problem: wrap(previous.problem),
      target_customer: wrap(previous.customer),
      solution: previous.execution,
      business_model: wrap(previous.revenueModel),
      validation_metric: previous.market,
      nextQuestion: '이 검토에서 빠진 핵심은 무엇입니까?',
      confirmation: {
        problem: 'unconfirmed',
        target_customer: 'unconfirmed',
        business_model: 'unconfirmed',
      },
    });
    const kept = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-pass',
      reviewId: passingParent.record.reviewId,
      supplement: '',
      now: NOW,
      evidence: 'injected_http',
      chat: async () => reply(passingRaw),
    });
    expect(kept.ok).toBe(true);
    if (!kept.ok) return;
    expect(kept.record.status).toBe('succeeded');
    expect(kept.record.revisionGate?.pass).toBe(true);
    expect(kept.view.questionSource).toBe('model-review');
    expect(kept.view.sections?.nextQuestion).toBe('이 검토에서 빠진 핵심은 무엇입니까?');
    expect(kept.view.sections?.problem).toContain('재확인 대상:');
    expect(kept.view.sections?.problem).toContain('확정된 사실이 아니다');
    expect(kept.view.sections?.claimConfirmation).toEqual({
      problem: 'unconfirmed',
      customer: 'unconfirmed',
      revenue: 'unconfirmed',
    });
    expect(visibleClaimStates(kept.view.sections!)?.map((row) => `${row.label} ${row.stateLabel}`)).toEqual([
      '문제 확인 전',
      '고객 확인 전',
      '수익 확인 전',
    ]);
    const reread = presentReview(
      kept.record,
      await store.listFeedback('user-pass'),
      await store.listReviews('user-pass', 'project-test'),
    );
    expect(reread.revision).toEqual(kept.view.revision);
    expect(reread.sections).toEqual(kept.view.sections);
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
      projectId: 'project-test',
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
    expect(await remoteBackend.store.listReviews(owner, 'project-test')).toEqual([]);
    expect(port.rows).toHaveLength(0);
  });
});

const BREWERY =
  '다양한 관광객이 늘며, 개인별 다양한 경험을 중요시 한다. 우리는 그런 개인별 다양한 경험을 중요시 하는 관광객 중, 전통주(양조장)을 좋아하는 내국인/외국인 대상으로 양조장 체험(만들고, 마시고)을 안내하고 주변을 즐길수 있는 사업을 구상중이며, 이는 양조장의 다양한 온라인 마케팅에서 시행될수 있어서 우리는 그것을 지원하려 한다.';

function breweryAnalysis(question: string, choices: string[]) {
  return {
    summary:
      '전통주에 관심 있는 내국인과 외국인 관광객에게 양조장 체험과 주변 관광을 연결하고, 양조장에는 온라인 마케팅과 고객 유치 지원을 제공하는 사업입니다.',
    customer: '전통주 체험에 관심 있는 내국인과 외국인 관광객.',
    problem: '양조장 체험과 주변 관광을 하나의 경험으로 찾기 어렵다는 구상이다.',
    value: '양조장 체험을 안내하고 주변 관광을 연결하며, 양조장의 온라인 마케팅을 지원한다.',
    operatingModel: '양조장과 함께 체험 안내와 마케팅 지원을 운영하려는 구상이다.',
    payer: '누가 비용을 내는지는 원문에 없다. 양조장일 수 있다는 추정이다.',
    revenueModel: '수익 구조와 가격은 원문에 없다.',
    market: '개인 경험을 중시하는 관광객이 늘고 있다는 진술이 있다. 시장 규모는 원문만으로 확정할 수 없다.',
    competition: '경쟁 수단은 원문에 없다.',
    operations: '시범 운영 사실은 원문에 없다.',
    profitability: '매출은 원문만으로 확정할 수 없다.',
    strengths: ['체험과 주변 관광을 함께 말한다.'],
    risks: ['체험 수요와 양조장의 비용 부담이 확인되지 않았다.'],
    assumptions: ['관광객이 체험을 예약할 의사가 있다.'],
    evidenceToChange: ['실제 예약 한 건', '양조장과 비용 논의를 한 사실'],
    founderFacts: ['전통주 체험과 주변 관광을 안내한다.', '양조장 온라인 마케팅을 지원하려 한다.'],
    inferences: ['결제자는 양조장일 수 있다는 추정이다.'],
    judgment: '체험 수요와 양조장의 비용 부담을 확인하기 전에는 수익성을 확정할 수 없습니다.',
    nextQuestion: question,
    nextQuestionReason: '이 답이 다음 질문의 대상을 바꿉니다.',
    choices,
  };
}

describe('first review analysis', () => {
  it('stores a business reading and choices, and drops a figure the source does not contain', async () => {
    const question = '처음 사업을 시작할 때, 가장 먼저 해결하려는 문제는 무엇인가요?';
    const choices = [
      '관광객이 양조장 체험을 발견하고 예약하기 어렵다',
      '양조장이 온라인 홍보를 해도 실제 방문으로 연결되지 않는다',
      '기타 / 직접 입력',
    ];
    const withFigure = {
      ...breweryAnalysis(question, choices),
      market: '시장 규모는 300억으로 확정되어 있다.',
    };
    const parsed = parseSections(JSON.stringify(withFigure), BREWERY);
    expect(parsed?.analysis?.summary).toContain('양조장 체험');
    expect(parsed?.analysis?.choices.map((choice) => choice.label)).toEqual(choices);
    expect(parsed?.analysis?.choices.at(-1)?.id).toBe('other');
    expect(parsed?.market).toContain('원문에 없는 수치');
    expect(parsed?.market).not.toContain('300억');
    expect(parsed?.judgment).toBe(parsed?.analysis?.summary);
    const fixed = '가장 가까운 결제 후보에게 유료로 제안했거나, 실제로 받은 돈이 있습니까? 있다면 그 한 건을 알려주세요. 아직이면 제안 전이라고 답해도 됩니다.';
    expect(parseSections(JSON.stringify(breweryAnalysis(fixed, choices)), BREWERY)).toBeNull();
    const liveShape = {
      ...breweryAnalysis(question, [
        '양조장과의 협력 가능성이 높다.',
        '양조장과의 협력 가능성이 낮다.',
        '양조장과의 협력 여부는 미정이다.',
        '기타',
        '직접 입력',
      ]),
      evidenceToChange: '시장 조사 결과 및 관광객 피드백.',
      founderFacts: '사업 아이디어 단계이며, 구체적인 실행 계획은 없음.',
      inferences: '관광객의 수요와 양조장과의 협력 가능성이 사업 성공에 중요한 요소가 될 것이다.',
    };
    const accepted = parseSections(JSON.stringify(liveShape), BREWERY);
    expect(accepted?.analysis?.evidenceToChange).toEqual(['시장 조사 결과 및 관광객 피드백.']);
    expect(accepted?.analysis?.choices.at(-1)).toEqual({ id: 'other', label: '기타 / 직접 입력' });
    const repaired = presentReview(
      {
        reviewId: 'review-live',
        userId: 'user-a',
        version: 1,
        parentReviewId: null,
        sourceFeedbackId: null,
        supplementSha: null,
        projectId: 'project-test',
        inputSha: 'sha',
        inputText: BREWERY,
        inputOrigin: 'typed',
        fileName: null,
        status: 'failed',
        evidence: 'live_network',
        provider: 'openai',
        model: 'gpt-4o-mini-2024-07-18',
        sections: null,
        rawContent: JSON.stringify(liveShape),
        promptTokens: 590,
        completionTokens: 631,
        totalTokens: 1221,
        usageKnown: true,
        callCount: 1,
        latencyMs: 1,
        error: 'unstructured_response',
        requestedAt: NOW,
        finishedAt: NOW,
      },
      [],
      [],
    );
    expect(repaired.status).toBe('ready');
    expect(repaired.sections?.analysis?.summary).toContain('양조장');
    expect(repaired.questionSource).toBe('model-review');
  });

  it('asks from the review purpose and saves a choice without another model call', async () => {
    const store = openAiPmReviewStore(storePath());
    const calls: string[] = [];
    const chat = async (request: ChatRequest) => {
      const content = request.messages.map((message) => message.content).join('\n');
      calls.push(content);
      const revenue = content.includes('수익모델 검증');
      return reply(
        JSON.stringify(
          breweryAnalysis(
            revenue
              ? '양조장이 마케팅 지원 비용을 논의할 상대가 있습니까?'
              : '처음 사업을 시작할 때, 가장 먼저 해결하려는 문제는 무엇인가요?',
            revenue
              ? ['논의한 양조장이 있다', '아직 논의 전이다', '기타 / 직접 입력']
              : ['관광객이 예약 경로를 찾기 어렵다', '양조장 홍보가 방문으로 이어지지 않는다', '기타 / 직접 입력'],
          ),
        ),
      );
    };
    const marketText = composeReviewInput({
      text: BREWERY,
      purpose: 'market',
      stage: 'idea',
      focus: '고객이 누구인지',
    });
    const revenueText = composeReviewInput({ text: BREWERY, purpose: 'revenue' });
    expect(marketText).not.toBe(revenueText);
    const market = await runFirstReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      text: marketText,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    const revenue = await runFirstReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      text: revenueText,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    const again = await runFirstReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      text: marketText,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(calls).toHaveLength(2);
    expect(market.view.sections?.nextQuestion).not.toBe(revenue.view.sections?.nextQuestion);
    expect(again.called).toBe(false);
    expect(again.record.reviewId).toBe(market.record.reviewId);
    const saved = await saveReviewFeedback({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      now: NOW,
      body: {
        reviewId: market.record.reviewId,
        choiceId: 'c1',
        choiceLabel: '관광객이 예약 경로를 찾기 어렵다',
        otherText: '',
      },
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.feedback.modelCalls).toBe(0);
    expect(saved.view.feedback.at(-1)?.choiceAnswer?.label).toContain('예약 경로');
    const tourist = nextDirectionAfterChoice({
      label: '관광객이 예약 경로를 찾기 어렵다',
      otherText: '',
      reason: '예약 경로를 확인합니다.',
    });
    const breweryPay = nextDirectionAfterChoice({
      label: '양조장 홍보가 방문으로 이어지지 않는다',
      otherText: '',
      reason: '양조장의 현재 홍보를 확인합니다.',
    });
    expect(tourist).not.toBe(breweryPay);
    expect(tourist).toContain('후속 모델 검토는 실행하지 않습니다');
    const missingOther = parseFeedbackBody({
      reviewId: market.record.reviewId,
      choiceId: 'other',
      choiceLabel: '기타 / 직접 입력',
      otherText: ' ',
    });
    expect(missingOther.ok).toBe(false);
    store.close();
  });
});

describe('workspace review scope', () => {
  it('links a stored review only when one owned project has that body', () => {
    expect(
      projectLinksForUnscopedReviews(
        [
          { reviewId: 'shared', inputSha: 'sha', projectId: null },
          { reviewId: 'only', inputSha: 'other', projectId: null },
          { reviewId: 'kept', inputSha: 'only', projectId: 'already' },
        ],
        [
          { projectId: 'p1', inputSha: 'sha' },
          { projectId: 'p2', inputSha: 'sha' },
          { projectId: 'p3', inputSha: 'other' },
        ],
      ),
    ).toEqual([{ reviewId: 'only', projectId: 'p3' }]);
  });

  it('keeps the same text on two workspaces apart and removes one project with its feedback', async () => {
    const store = openAiPmReviewStore(storePath());
    const chat = async () => reply(JSON.stringify(sections()));
    const shared = '같은 본문을 두 워크스페이스에 둔다. 결과는 섞이면 안 된다.';
    const first = await runFirstReview({
      store,
      userId: 'user-a',
      projectId: 'project-a',
      text: shared,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    const second = await runFirstReview({
      store,
      userId: 'user-a',
      projectId: 'project-b',
      text: shared,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(first.called).toBe(true);
    expect(second.called).toBe(true);
    expect(second.record.reviewId).not.toBe(first.record.reviewId);
    expect((await store.listReviews('user-a', 'project-b')).map((review) => review.reviewId)).toEqual([
      second.record.reviewId,
    ]);
    const saved = await saveReviewFeedback({
      store,
      userId: 'user-a',
      projectId: 'project-a',
      now: NOW,
      body: { reviewId: first.record.reviewId, marks: ['understanding_accurate'] },
    });
    expect(saved.ok).toBe(true);
    const crossed = await saveReviewFeedback({
      store,
      userId: 'user-a',
      projectId: 'project-b',
      now: NOW,
      body: { reviewId: first.record.reviewId, marks: ['core_missing'] },
    });
    expect(crossed.ok).toBe(false);
    expect(await store.listFeedback('user-a', second.record.reviewId)).toEqual([]);
    const blocked = await runFollowUpReview({
      store,
      userId: 'user-a',
      projectId: 'project-b',
      reviewId: first.record.reviewId,
      supplement: '다른 공간',
      now: NOW,
      evidence: 'injected_http',
      chat: async () => {
        throw new Error('must not call');
      },
    });
    expect(blocked.ok).toBe(false);
    await store.deleteForProject('user-a', 'project-a');
    expect(await store.readReview('user-a', first.record.reviewId)).toBeNull();
    expect(await store.listFeedback('user-a', first.record.reviewId)).toEqual([]);
    expect((await store.readReview('user-a', second.record.reviewId))?.reviewId).toBe(second.record.reviewId);
    store.close();
  });

  it('accepts the previous insert shape with a null project', () => {
    const path = storePath();
    const store = openAiPmReviewStore(path);
    store.close();
    const db = new DatabaseSync(path);
    db.prepare(
      `INSERT INTO ai_pm_reviews
        (user_id, review_id, input_sha, version, parent_review_id, status, record_json, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run('user-a', 'legacy', 'sha', 1, null, 'not_run', '{}', NOW);
    const row = db.prepare('SELECT project_id FROM ai_pm_reviews WHERE review_id = ?').get('legacy') as {
      project_id: string | null;
    };
    expect(row.project_id).toBeNull();
    db.close();
  });

  it('declares a nullable project column that is removed with the project row', () => {
    const sql = readFileSync(
      new URL('../../../../../../packages/db/src/migration/024_ai_pm_review_project.sql', import.meta.url),
      'utf8',
    );
    const alter = sql
      .split('\n')
      .find((line) => line.includes('add column'));
    expect(alter).toContain('project_id uuid');
    expect(alter?.toLowerCase()).not.toContain('default');
    expect(alter?.toLowerCase()).not.toContain('not null');
    expect(sql).toContain('on delete cascade');
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
    latestForInput: async (userId, inputSha, projectId) => {
      const record = reviews
        .filter((item) => item.userId === userId && item.projectId === projectId && item.inputSha === inputSha)
        .at(-1);
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
    listReviews: async (userId, projectId) =>
      reviews.filter((item) => item.userId === userId && item.projectId === projectId).map(toRow),
    deleteForProject: async (userId, projectId) => {
      const ids = new Set(
        reviews.filter((item) => item.userId === userId && item.projectId === projectId).map((item) => item.reviewId),
      );
      for (let index = feedback.length - 1; index >= 0; index -= 1) {
        if (feedback[index]?.userId === userId && ids.has(feedback[index]?.reviewId ?? '')) feedback.splice(index, 1);
      }
      for (let index = reviews.length - 1; index >= 0; index -= 1) {
        if (reviews[index]?.userId === userId && reviews[index]?.projectId === projectId) reviews.splice(index, 1);
      }
    },
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
    projectId: record.projectId,
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
