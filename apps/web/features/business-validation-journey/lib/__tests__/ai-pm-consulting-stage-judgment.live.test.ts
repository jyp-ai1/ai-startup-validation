import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { ChatRequest, ChatResponse } from '@repo/ai';

import { openReviewBackend } from '../ai-pm-review-backend';
import {
  assumptionRestatesUnverifiedHope,
  consultingQuestions,
  founderAnswerKinds,
  founderClaimTreatedAsFact,
  openReviewChat,
  submitConsultingStage,
  type ReviewChat,
} from '../ai-pm-review';
import type { ConsultingQuestion, StoredReview } from '../ai-pm-review-store';

/**
 * Preview-only reanalysis of the same four brewery answers.
 * Two stored answers form stage 1. The other two form stage 2.
 * Stage 3 has no stored founder answer, so its model call stays NOT RUN.
 * Existing rows are read and new rows are inserted. Nothing is updated or deleted.
 * Choice delivery, parent links, and one call per stage stay as they are.
 * A local quality note is not a CPO quality approval.
 */
const enabled = process.env.AI_PM_CONSULTING_STAGE_JUDGMENT === '1';
const PROJECT_ID = '3a5fc4a0-2e90-45e6-8370-350beda67342';
const SOURCE_ANALYSIS_ID = '9e169fef-7428-4d21-a6f0-f3034bcc91d1';
const BUCKET = 'ai-pm-quality-compare';
const OBJECT = 'product-consulting-judgment-logic-2026-10-31-e.json';

const PAIRS = {
  claim: {
    questionId: 'hist-1',
    question: '어떤 방식으로 양조장과의 파트너십을 구축할 계획인가?',
    choiceLabel: '양조장과의 협력 가능성이 높다.',
    supplement: '양조장과의 협력 가능성이 높다.',
  },
  plan: {
    questionId: 'hist-2',
    question:
      '협력 가능성을 확인하기 위해 우선 접촉할 양조장을 한 곳 정했나요? 정했다면 양조장 이름과 실제 연락할 수 있는 담당자 또는 연락 경로를 알려주세요.',
    choiceLabel: '양조장과의 협력 방안 구체화',
    supplement: '양조장 후보 선정과 연락 경로 확보를 우선 검증한다.',
  },
  gap: {
    questionId: 'hist-3',
    question:
      '후보 선정을 시작하면서 가장 먼저 떠오르는 양조장 이름이 있나요? 있으면 그 이름만 알려 주세요. 없으면 아직 떠오른 곳이 없다고 적어 주세요.',
    choiceLabel: '아직 떠오르는 양조장이 없다',
    supplement: '현재 우선 접촉할 구체적인 양조장 후보를 선정하지 못했다.',
  },
  criterion: {
    questionId: 'hist-4',
    question: '우선 접촉할 양조장 후보를 선정하기 위한 기준은 무엇인가요?',
    choiceLabel: '양조장 후보 선정 기준을 구체화한다.',
    supplement:
      '체험으로 만들고 마실 수 있는 양조장인지를 기준으로 후보를 고르겠다. 그 기준에 맞는 양조장은 아직 정하지 못했다.',
  },
} as const;

describe.skipIf(!enabled)('stored brewery judgment logic', () => {
  it('reuses the stored answers for two integrated calls and leaves the third unsent', async () => {
    const config = supabaseConfig();
    expect(config).not.toBeNull();
    if (!config) return;
    const preview = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
    const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
    if (!preview || !apiKey) {
      console.log(`preview-consulting-stage-judgment hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
      return;
    }
    const existing = await readMarker(config, OBJECT);
    if (existing && ['RECORDED', 'awaiting_cpo', 'quality_failed', 'failed', 'limited'].includes(String(existing.status))) {
      console.log(`preview-consulting-stage-judgment skip status=${existing.status}`);
      return;
    }
    if (existing?.status === 'started') {
      const ageMs = Date.now() - Date.parse(String(existing.startedAt ?? ''));
      if (Number.isFinite(ageMs) && ageMs < 20 * 60 * 1000) {
        console.log('preview-consulting-stage-judgment skip status=started');
        return;
      }
    }
    const startedAt = new Date().toISOString();
    await writeMarker(config, { status: 'started', startedAt, projectId: PROJECT_ID }, OBJECT);
    const before = await snapshot(config);
    let marker: Record<string, unknown> = {
      status: 'failed',
      startedAt,
      projectId: PROJECT_ID,
      screenLoggedInSubmit: 'NOT RUN',
      stage3IntegratedCall: 'NOT RUN',
    };
    try {
      const backend = openReviewBackend();
      expect(backend.storage.durable).toBe(true);
      const sourceRow = before.reviews.find((row) => row.review_id === SOURCE_ANALYSIS_ID);
      const userId = sourceRow?.user_id ?? '';
      const source = await backend.store.readReview(userId, SOURCE_ANALYSIS_ID);
      expect(source?.status).toBe('succeeded');
      expect(source?.sections?.analysis).toBeTruthy();
      expect(source?.inputText.includes('관광객')).toBe(true);
      const records = await backend.store.listReviews(userId, PROJECT_ID);
      const version = records.reduce((max, record) => Math.max(max, record.version), 0) + 1;
      const carrier1 = stageCarrier(source!, {
        reviewId: randomUUID(),
        parentReviewId: null,
        version,
        now: startedAt,
        questions: [question(PAIRS.claim), question(PAIRS.plan)],
      });
      expect((await backend.store.insertReview(carrier1)).wrote).toBe(true);

      const stage1Chat = recordingChat();
      const stage1Partial = await submitConsultingStage({
        store: backend.store,
        userId,
        projectId: PROJECT_ID,
        reviewId: carrier1.reviewId,
        now: startedAt,
        chat: stage1Chat.chat,
        evidence: 'live_network',
        answers: [answer(PAIRS.claim)],
      });
      expect(stage1Partial.ok && stage1Partial.pending && !stage1Partial.called).toBe(true);
      expect(stage1Chat.calls).toHaveLength(0);

      const stage1 = await submitConsultingStage({
        store: backend.store,
        userId,
        projectId: PROJECT_ID,
        reviewId: carrier1.reviewId,
        now: startedAt,
        chat: stage1Chat.chat,
        evidence: 'live_network',
        answers: [answer(PAIRS.claim), answer(PAIRS.plan)],
      });
      const stage1Duplicate = stage1.ok
        ? await submitConsultingStage({
            store: backend.store,
            userId,
            projectId: PROJECT_ID,
            reviewId: carrier1.reviewId,
            now: startedAt,
            chat: stage1Chat.chat,
            evidence: 'live_network',
            answers: [answer(PAIRS.claim), answer(PAIRS.plan)],
          })
        : null;
      const stage1Calls = stage1Chat.calls.length;
      if (stage1Duplicate?.ok) expect(stage1Duplicate.called).toBe(false);
      expect(stage1Chat.calls).toHaveLength(stage1Calls);
      marker = {
        ...marker,
        stage1Calls: stage1Chat.calls.map((call) => ({
          model: call.model,
          inputTokens: call.inputTokens,
          outputTokens: call.outputTokens,
          totalTokens: call.totalTokens,
          requestUser: call.user,
          response: call.response,
        })),
        stage1ReviewId: stage1.ok ? stage1.record.reviewId : null,
        stage1ParentReviewId: stage1.ok ? stage1.record.parentReviewId : null,
        stage1Error: stage1.ok ? stage1.record.error : stage1.error,
      };

      let stage2: Awaited<ReturnType<typeof submitConsultingStage>> | null = null;
      let stage2Calls: CapturedCall[] = [];
      let stage2PartialCalls = 0;
      let stage2CarrierId: string | null = null;
      let stage3: Record<string, unknown> = {
        integratedCall: 'NOT RUN',
        reason: '2차 응답의 새 질문에는 저장된 Founder 답이 없다. 답을 만들지 않았다.',
        saveCalls: 0,
      };
      if (stage1.ok && !stage1.pending && stage1.record.sections?.analysis) {
        const stage2Now = new Date().toISOString();
        const carrier2 = stageCarrier(stage1.record, {
          reviewId: randomUUID(),
          parentReviewId: stage1.record.reviewId,
          version: stage1.record.version + 1,
          now: stage2Now,
          questions: [question(PAIRS.gap), question(PAIRS.criterion)],
        });
        stage2CarrierId = carrier2.reviewId;
        expect((await backend.store.insertReview(carrier2)).wrote).toBe(true);
        const stage2Chat = recordingChat();
        const stage2Partial = await submitConsultingStage({
          store: backend.store,
          userId,
          projectId: PROJECT_ID,
          reviewId: carrier2.reviewId,
          now: stage2Now,
          chat: stage2Chat.chat,
          evidence: 'live_network',
          answers: [answer(PAIRS.gap)],
        });
        stage2PartialCalls = stage2Chat.calls.length;
        expect(stage2Partial.ok && stage2Partial.pending && !stage2Partial.called).toBe(true);
        expect(stage2PartialCalls).toBe(0);
        stage2 = await submitConsultingStage({
          store: backend.store,
          userId,
          projectId: PROJECT_ID,
          reviewId: carrier2.reviewId,
          now: stage2Now,
          chat: stage2Chat.chat,
          evidence: 'live_network',
          answers: [answer(PAIRS.gap), answer(PAIRS.criterion)],
        });
        const stage2IntegratedCalls = stage2Chat.calls.length;
        if (stage2.ok && !stage2.pending) {
          const stage2Duplicate = await submitConsultingStage({
            store: backend.store,
            userId,
            projectId: PROJECT_ID,
            reviewId: carrier2.reviewId,
            now: stage2Now,
            chat: stage2Chat.chat,
            evidence: 'live_network',
            answers: [answer(PAIRS.gap), answer(PAIRS.criterion)],
          });
          expect(stage2Duplicate.ok && !stage2Duplicate.called).toBe(true);
          expect(stage2Chat.calls).toHaveLength(stage2IntegratedCalls);
        }
        stage2Calls = stage2Chat.calls;
        if (stage2.ok && !stage2.pending && stage2.record.status === 'succeeded') {
          const stage3Chat = recordingChat();
          const pending = await submitConsultingStage({
            store: backend.store,
            userId,
            projectId: PROJECT_ID,
            reviewId: stage2.record.reviewId,
            now: new Date().toISOString(),
            chat: stage3Chat.chat,
            evidence: 'live_network',
            answers: [],
          });
          stage3 = {
            integratedCall: 'NOT RUN',
            reason: '저장된 Founder 답은 4개다. 새 질문에 해당하는 답이 없어 3차 통합 호출을 보내지 않았다.',
            saveCalls: stage3Chat.calls.length,
            pending: pending.ok ? pending.pending : false,
            called: pending.ok ? pending.called : false,
            parentReviewId: stage2.record.reviewId,
            nextQuestions: consultingQuestions(stage2.record.sections).map((item) => item.text),
          };
          expect(stage3Chat.calls).toHaveLength(0);
          expect(pending.ok && pending.pending && !pending.called).toBe(true);
        } else if (stage2.ok && stage2.record.status !== 'succeeded') {
          stage3 = {
            integratedCall: 'NOT RUN',
            reason: '2차 응답이 형식 실패로 저장되었다. 새 답을 만들지 않았고 모델을 다시 호출하지 않았다.',
            saveCalls: 0,
            parentReviewId: stage2.record.reviewId,
          };
        }
      }

      const after = await snapshot(config);
      const preservation = preserved(before, after);
      expect(preservation.reviewsChanged).toEqual([]);
      expect(preservation.feedbackChanged).toEqual([]);

      const stage1Grade = stage1.ok && !stage1.pending
        ? gradeStage({
            calls: stage1Chat.calls,
            record: stage1.record,
            priorQuestionTexts: [PAIRS.claim.question, PAIRS.plan.question],
            expectedPriorIds: [],
            expectUnresolved: false,
            expectCriterion: false,
          })
        : null;
      const stage2Grade = stage2?.ok && !stage2.pending
        ? gradeStage({
            calls: stage2Calls,
            record: stage2.record,
            priorQuestionTexts: [PAIRS.claim.question, PAIRS.plan.question, PAIRS.gap.question, PAIRS.criterion.question],
            expectedPriorIds: [PAIRS.claim.questionId, PAIRS.plan.questionId],
            expectUnresolved: true,
            expectCriterion: true,
          })
        : null;
      const structuralFailed = [stage1Grade, stage2Grade].some((grade) => grade && Object.values(grade.structural).includes('FAIL'));
      const qualityFailed = [stage1Grade, stage2Grade].some((grade) => grade && Object.values(grade.quality).includes('FAIL'));
      const limited = [stage1, stage2].some((result) => result?.ok && isLimited(result.record.error));
      const storedFailed = [stage1, stage2].some((result) => result?.ok && !result.pending && result.record.status !== 'succeeded');
      marker = {
        status:
          !stage1.ok || stage1.pending || !stage2?.ok || stage2.pending || storedFailed
            ? 'failed'
            : limited
              ? 'limited'
              : structuralFailed || qualityFailed
                ? 'quality_failed'
                : 'awaiting_cpo',
        cpoQuality: 'NOT APPROVED',
        parentLinks: 'unchanged',
        ancestorChain: [
          { reviewId: carrier1.reviewId, parentReviewId: null, callCount: 0, role: 'stage_row' },
          stage1.ok
            ? { reviewId: stage1.record.reviewId, parentReviewId: stage1.record.parentReviewId, callCount: stage1.record.callCount, role: 'analysis_row' }
            : null,
          { reviewId: stage2CarrierId, parentReviewId: stage1.ok ? stage1.record.reviewId : null, callCount: 0, role: 'stage_row' },
          stage2?.ok
            ? { reviewId: stage2.record.reviewId, parentReviewId: stage2.record.parentReviewId, callCount: stage2.record.callCount, role: 'analysis_row' }
            : null,
        ].filter((item) => item?.reviewId),
        startedAt,
        finishedAt: new Date().toISOString(),
        projectId: PROJECT_ID,
        sourceAnalysisId: SOURCE_ANALYSIS_ID,
        screenLoggedInSubmit: 'NOT RUN',
        preservation,
        answerKinds: {
          claim: founderAnswerKinds(PAIRS.claim),
          plan: founderAnswerKinds(PAIRS.plan),
          gap: founderAnswerKinds(PAIRS.gap),
          criterion: founderAnswerKinds(PAIRS.criterion),
        },
        stage1: stageReport({
          carrierId: carrier1.reviewId,
          carrierParentReviewId: null,
          result: stage1,
          calls: stage1Chat.calls,
          partialCalls: 0,
          duplicateCalled: stage1Duplicate?.ok ? stage1Duplicate.called : null,
          grade: stage1Grade,
        }),
        stage2: stage2
          ? stageReport({
              carrierId: stage2CarrierId,
              carrierParentReviewId: stage1.ok ? stage1.record.reviewId : null,
              result: stage2,
              calls: stage2Calls,
              partialCalls: stage2PartialCalls,
              duplicateCalled: stage2.ok ? false : null,
              grade: stage2Grade,
            })
          : { integratedCall: 'NOT RUN' },
        stage3,
      };
      expect(stage1.ok && !stage1.pending).toBe(true);
      if (stage1.ok) expect(stage1.record.parentReviewId).toBe(carrier1.reviewId);
      expect(stage2?.ok && !stage2.pending).toBe(true);
      if (stage2?.ok) expect(stage2.record.parentReviewId).toBe(stage2CarrierId);
    } catch (error) {
      marker = {
        ...marker,
        status: 'failed',
        finishedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message.slice(0, 500) : 'failed',
      };
      throw error;
    } finally {
      await writeMarker(config, marker, OBJECT);
      console.log(`preview-consulting-stage-judgment stored status=${marker.status}`);
    }
  }, 420_000);
});

type StoredPair = { questionId: string; question: string; choiceLabel: string; supplement: string };

function question(pair: StoredPair): ConsultingQuestion {
  return {
    questionId: pair.questionId,
    text: pair.question,
    choices: [{ id: 'c1', label: pair.choiceLabel }],
  };
}

function answer(pair: StoredPair) {
  return {
    questionId: pair.questionId,
    choiceId: 'c1',
    choiceLabel: pair.choiceLabel,
    otherText: pair.supplement,
  };
}

function stageCarrier(
  source: StoredReview,
  spec: { reviewId: string; parentReviewId: string | null; version: number; now: string; questions: ConsultingQuestion[] },
): StoredReview {
  if (!source.sections?.analysis) throw new Error('source_analysis_missing');
  const sections = structuredClone(source.sections);
  if (!sections.analysis) throw new Error('source_analysis_missing');
  sections.analysis.questions = spec.questions;
  sections.nextQuestion = spec.questions[0]?.text ?? sections.nextQuestion;
  return {
    reviewId: spec.reviewId,
    userId: source.userId,
    version: spec.version,
    parentReviewId: spec.parentReviewId,
    sourceFeedbackId: null,
    supplementSha: null,
    projectId: PROJECT_ID,
    inputSha: source.inputSha,
    inputText: source.inputText,
    inputOrigin: source.inputOrigin,
    fileName: null,
    status: 'succeeded',
    evidence: 'live_network',
    provider: null,
    model: null,
    sections,
    rawContent: null,
    firstRawContent: null,
    callLedger: [],
    revisionGate: null,
    consultingTurn: null,
    founderAnswerSource: null,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    usageKnown: false,
    callCount: 0,
    latencyMs: null,
    error: null,
    requestedAt: spec.now,
    finishedAt: spec.now,
  };
}

type CapturedCall = {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  usageKnown: boolean;
  requestModel: string;
  temperature: number | null;
  maxTokens: number | null;
  responseFormat: string;
  user: string;
  response: string;
};

function recordingChat(): { chat: ReviewChat; calls: CapturedCall[] } {
  const inner = openReviewChat();
  const calls: CapturedCall[] = [];
  if (!inner) throw new Error('gpt_api_key_missing');
  return {
    calls,
    chat: async (request: ChatRequest): Promise<ChatResponse> => {
      const response = await inner(request);
      calls.push({
        model: response.model,
        inputTokens: response.usage.inputTokens,
        outputTokens: response.usage.outputTokens,
        totalTokens: response.usage.totalTokens,
        usageKnown: response.usageKnown === true,
        requestModel: request.model,
        temperature: request.temperature ?? null,
        maxTokens: request.maxTokens ?? null,
        responseFormat: request.responseFormat?.type ?? '',
        user: request.messages.find((message) => message.role === 'user')?.content ?? '',
        response: response.content,
      });
      return response;
    },
  };
}

function userPayload(call: CapturedCall | undefined): Record<string, unknown> | null {
  if (!call) return null;
  try {
    return JSON.parse(call.user) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function gradeStage(input: {
  calls: CapturedCall[];
  record: StoredReview;
  priorQuestionTexts: string[];
  expectedPriorIds: string[];
  expectUnresolved: boolean;
  expectCriterion: boolean;
}) {
  const payload = userPayload(input.calls[0]);
  const reading = input.record.stageReading;
  const analysis = input.record.sections?.analysis;
  const judgment = reading?.updatedJudgment || analysis?.judgmentDetail || input.record.sections?.judgment || '';
  const summary = reading?.impactOnPreviousJudgment || analysis?.summary || '';
  const nextQuestionItems =
    reading?.nextQuestions ??
    consultingQuestions(input.record.sections).map((item) => ({
      text: item.text,
      choices: (item.choices ?? []).map((choice) => choice.label),
    }));
  const nextQuestions = nextQuestionItems.map((item) => item.text);
  const nextChoices = nextQuestionItems.flatMap((item) => item.choices);
  const asked = new Set(input.priorQuestionTexts.map((text) => text.replace(/\s+/g, '')));
  const repeated = nextQuestions.filter((question) => asked.has(question.replace(/\s+/g, '')));
  const pairs =
    (payload?.stagePairs as Array<{
      questionId?: string;
      choiceId?: string | null;
      offeredChoices?: Array<{ choiceId?: string; label?: string }>;
    }> | undefined) ?? [];
  const priorIds = ((payload?.priorStagePairs as Array<{ questionId?: string }> | undefined) ?? []).map((pair) => pair.questionId ?? '');
  const interpretations = reading?.answerInterpretation ?? [];
  const stored = input.record.stageAnswers ?? [];
  const choiceMenu = pairs.length > 0 && pairs.every((pair) => Array.isArray(pair.offeredChoices) && pair.offeredChoices.length > 0 && typeof pair.choiceId === 'string' && pair.choiceId.length > 0);
  const choiceLinked =
    stored.length > 0 &&
    stored.every((pair) => {
      const matches = interpretations.filter((item) => item.questionId === pair.questionId);
      return matches.length === 1 && matches[0]?.choiceId === (pair.choiceId ?? '');
    });
  const historySeparated =
    payload?.experimentRecords === undefined &&
    payload?.priorTurns === undefined &&
    payload?.failedCalls === undefined &&
    payload?.verificationStage === undefined &&
    (input.expectedPriorIds.length === 0
      ? priorIds.length === 0
      : input.expectedPriorIds.every((id) => priorIds.includes(id)));
  const oneCall = input.calls.length === 1 && input.record.callCount === 1 && input.record.status === 'succeeded';
  const structural = {
    choiceMenu: choiceMenu ? 'PASS' : 'FAIL',
    choiceIdLinked: choiceLinked ? 'PASS' : 'FAIL',
    historySeparated: historySeparated ? 'PASS' : 'FAIL',
    oneIntegratedCall: oneCall ? 'PASS' : 'FAIL',
    resolvedAndUnresolved: reading && Array.isArray(reading.resolvedIssues) && Array.isArray(reading.unresolvedIssues) ? 'PASS' : 'FAIL',
    nextQuestionAdvanced: nextQuestions.length >= 2 && new Set(nextQuestions).size === nextQuestions.length && repeated.length === 0 ? 'PASS' : 'FAIL',
    includesOriginalInput: typeof payload?.originalInput === 'string' && payload.originalInput.includes('관광객') ? 'PASS' : 'FAIL',
  };
  const reason = reading?.judgmentReason ?? '';
  const grounds = `${judgment}\n${summary}\n${reason}`;
  const criterionAnswer = stored.find((pair) => pair.supplement.includes('체험'));
  const criterionMeaning = interpretations.find((item) => item.questionId === criterionAnswer?.questionId)?.meaning ?? '';
  const asksCriterionAgain = nextQuestions.some((question) =>
    /기준은\s*무엇|기준을\s*무엇|어떤\s*기준|기준을\s*(알려|구체화|정하|세워)|선정하기 위한 기준|기준.{0,24}(구체적|자세히|설명)/.test(question),
  );
  const choiceRepeatsSubmittedPlan = nextChoices.some(
    (choice) => /체험으로 만들고 마실 수 있는/.test(choice) && !/찾|연락|접근|확보|접촉/.test(choice),
  );
  const claimPromoted =
    founderClaimTreatedAsFact(judgment) ||
    founderClaimTreatedAsFact(summary) ||
    founderClaimTreatedAsFact(reason) ||
    /확인됐|확인되었|확인되고/.test(grounds);
  const verifiedFacts = reading?.verifiedFacts ?? [];
  const unresolvedText = (reading?.unresolvedIssues ?? []).join('\n');
  const resolvedText = (reading?.resolvedIssues ?? []).join('\n');
  const claimInFacts = verifiedFacts.some(
    (fact) => /가능성이 높/.test(fact) || (/협력/.test(fact) && !/없|않|못|미확인|검증되지|확인되지/.test(fact)),
  );
  const planRecognized = /체험/.test(resolvedText) && /체험/.test(`${criterionMeaning}\n${judgment}\n${reason}`);
  const gapStaysOpen = /후보/.test(unresolvedText) && /없|못|선정하지|정해지지|비어/.test(unresolvedText);
  const impactExplains =
    summary.trim().length > 0 &&
    !/확인됐|확인되었|확인되고/.test(summary) &&
    (input.expectCriterion ? /기준|체험|계획/.test(summary) && /후보|실행|접촉/.test(summary) : /주장|가설|기대|가능성/.test(summary));
  const listsAgree =
    !claimInFacts &&
    !claimPromoted &&
    (input.expectCriterion ? planRecognized && gapStaysOpen && !/기준이 없|기준을 정하지/.test(judgment) : true);
  const advances =
    !asksCriterionAgain &&
    !choiceRepeatsSubmittedPlan &&
    nextQuestions.some((question) => /(후보|양조장).{0,40}(찾|확보|연락|접촉|접근)|(찾|확보|연락|접촉|접근).{0,40}(후보|양조장)/.test(question));
  const quality = {
    claimSeparatedFromFact: claimPromoted || claimInFacts ? 'FAIL' : 'PASS',
    criterionRecognizedAsPlan: input.expectCriterion ? (planRecognized ? 'PASS' : 'FAIL') : 'NOT RUN',
    candidateGapStaysOpen: input.expectUnresolved ? (gapStaysOpen ? 'PASS' : 'FAIL') : 'NOT RUN',
    impactExplainsAnswer: impactExplains ? 'PASS' : 'FAIL',
    judgmentConsistentWithLists: listsAgree ? 'PASS' : 'FAIL',
    criterionNotReasked: input.expectCriterion ? (asksCriterionAgain || choiceRepeatsSubmittedPlan ? 'FAIL' : 'PASS') : 'NOT RUN',
    nextQuestionAdvances: input.expectCriterion ? (advances ? 'PASS' : 'FAIL') : 'NOT RUN',
    oneCall: oneCall ? 'PASS' : 'FAIL',
    supplementInterpreted: input.expectCriterion
      ? criterionMeaning.includes('체험') && criterionMeaning.includes('만들')
        ? 'PASS'
        : 'FAIL'
      : 'NOT RUN',
    assumptionsAvoidPositiveEffect: assumptionRestatesUnverifiedHope(reading?.assumptions ?? analysis?.assumptions ?? []) ? 'FAIL' : 'PASS',
    unresolvedInJudgment: input.expectUnresolved
      ? /후보/.test(judgment) && /없|못|비어|선정되지|선정하지|확인되지/.test(judgment)
        ? 'PASS'
        : 'FAIL'
      : 'NOT RUN',
    executionNotForcedLow: /실행 가능성[^.。]{0,12}낮/.test(grounds) ? 'FAIL' : 'PASS',
  };
  return {
    structural,
    quality,
    repeated,
    judgment,
    summary,
    nextQuestions,
    nextChoices,
    nextVerification: reading?.nextVerification ?? analysis?.nextVerification ?? '',
    assumptions: reading?.assumptions ?? analysis?.assumptions ?? [],
    answerInterpretation: interpretations,
    resolvedIssues: reading?.resolvedIssues ?? [],
    unresolvedIssues: reading?.unresolvedIssues ?? [],
    judgmentReason: reading?.judgmentReason ?? '',
  };
}

function stageReport(input: {
  carrierId: string | null;
  carrierParentReviewId: string | null;
  result: Awaited<ReturnType<typeof submitConsultingStage>>;
  calls: CapturedCall[];
  partialCalls: number;
  duplicateCalled: boolean | null;
  grade: ReturnType<typeof gradeStage> | null;
}) {
  const record = input.result.ok ? input.result.record : null;
  const tokens = input.calls.reduce(
    (sum, call) => ({
      input: sum.input + call.inputTokens,
      output: sum.output + call.outputTokens,
      total: sum.total + call.totalTokens,
    }),
    { input: 0, output: 0, total: 0 },
  );
  return {
    carrierId: input.carrierId,
    carrierParentReviewId: input.carrierParentReviewId,
    carrierCallCount: 0,
    partialSaveCalls: input.partialCalls,
    duplicateCalled: input.duplicateCalled,
    called: input.result.ok ? input.result.called : false,
    pending: input.result.ok ? input.result.pending : false,
    error: input.result.ok ? record?.error ?? null : input.result.error,
    reviewId: record?.reviewId ?? null,
    parentReviewId: record?.parentReviewId ?? null,
    status: record?.status ?? null,
    model: input.calls[0]?.model ?? record?.model ?? null,
    callCount: input.calls.length,
    storedCallCount: record?.callCount ?? null,
    tokens,
    storedTokens: {
      prompt: record?.promptTokens ?? null,
      completion: record?.completionTokens ?? null,
      total: record?.totalTokens ?? null,
    },
    stageAnswers: record?.stageAnswers ?? [],
    stageReading: record?.stageReading ?? null,
    structural: input.grade?.structural ?? null,
    quality: input.grade?.quality ?? null,
    repeatedQuestions: input.grade?.repeated ?? [],
    answerInterpretation: input.grade?.answerInterpretation ?? [],
    resolvedIssues: input.grade?.resolvedIssues ?? [],
    unresolvedIssues: input.grade?.unresolvedIssues ?? [],
    judgmentReason: input.grade?.judgmentReason ?? null,
    judgment: input.grade?.judgment ?? record?.sections?.analysis?.judgmentDetail ?? null,
    summary: input.grade?.summary ?? null,
    nextQuestions: input.grade?.nextQuestions ?? [],
    nextVerification: input.grade?.nextVerification ?? null,
    assumptions: input.grade?.assumptions ?? [],
    calls: input.calls.map((call, index) => ({
      index,
      model: call.model,
      inputTokens: call.inputTokens,
      outputTokens: call.outputTokens,
      totalTokens: call.totalTokens,
      usageKnown: call.usageKnown,
      requestModel: call.requestModel,
      temperature: call.temperature,
      maxTokens: call.maxTokens,
      responseFormat: call.responseFormat,
      requestUser: call.user,
      response: call.response,
    })),
    firstRawContent: record?.firstRawContent ?? null,
    rawContent: record?.rawContent ?? null,
  };
}

type ReviewStamp = { review_id: string; finished_at: string; status: string; user_id?: string };
type FeedbackStamp = { feedback_id: string; submitted_at: string };

async function snapshot(config: { url: string; key: string }) {
  const reviews = (await restGet(
    config,
    `ai_pm_reviews?select=review_id,finished_at,status,user_id&project_id=eq.${PROJECT_ID}`,
  )) as ReviewStamp[];
  const feedback = (await restGet(config, 'ai_pm_feedback?select=feedback_id,submitted_at')) as FeedbackStamp[];
  return { reviews, feedback };
}

function preserved(
  before: { reviews: ReviewStamp[]; feedback: FeedbackStamp[] },
  after: { reviews: ReviewStamp[]; feedback: FeedbackStamp[] },
) {
  const reviewAfter = new Map(after.reviews.map((row) => [row.review_id, row.finished_at]));
  const feedbackAfter = new Map(after.feedback.map((row) => [row.feedback_id, row.submitted_at]));
  return {
    reviewCountBefore: before.reviews.length,
    reviewCountAfter: after.reviews.length,
    feedbackCountBefore: before.feedback.length,
    feedbackCountAfter: after.feedback.length,
    reviewsChanged: before.reviews
      .filter((row) => reviewAfter.get(row.review_id) !== row.finished_at)
      .map((row) => row.review_id),
    feedbackChanged: before.feedback
      .filter((row) => feedbackAfter.get(row.feedback_id) !== row.submitted_at)
      .map((row) => row.feedback_id),
  };
}

function supabaseConfig(): { url: string; key: string } | null {
  const url = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !key.trim()) return null;
  return { url, key };
}

async function restGet(config: { url: string; key: string }, query: string): Promise<unknown[]> {
  const response = await fetch(`${config.url}/rest/v1/${query}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) throw new Error(`read_${response.status}`);
  const body = (await response.json()) as unknown;
  return Array.isArray(body) ? body : [];
}

async function readMarker(config: { url: string; key: string }, objectName: string): Promise<Record<string, unknown> | null> {
  const response = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${objectName}`, {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` },
  });
  if (!response.ok) return null;
  return (await response.json()) as Record<string, unknown>;
}

async function writeMarker(config: { url: string; key: string }, payload: Record<string, unknown>, objectName: string): Promise<void> {
  const secrets = [config.key, process.env.GPT_API_KEY, process.env.SUPABASE_ANON_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY];
  let text = JSON.stringify(payload);
  for (const secret of secrets) {
    if (typeof secret === 'string' && secret.length > 8) text = text.split(secret).join('[redacted]');
  }
  text = text.replace(/sk-[A-Za-z0-9_-]+/g, '[redacted]');
  const response = await fetch(`${config.url}/storage/v1/object/${BUCKET}/${objectName}`, {
    method: 'POST',
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      'x-upsert': 'true',
    },
    body: text,
  });
  if (!response.ok) throw new Error(`marker_${response.status}`);
}

function isLimited(error: string | null | undefined): boolean {
  if (!error) return false;
  return /rate limit exceeded|credit_balance_exhausted|insufficient_quota|review_retry_blocked/i.test(error);
}
