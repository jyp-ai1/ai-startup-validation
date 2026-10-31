import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { OpenAIProviderAdapter } from '@repo/ai/providers';

import { openReviewBackend } from '../ai-pm-review-backend';
import { buildProductReanalysisRequest, type ConsultingPathStep, type PriorAnalysisBrief } from '../ai-pm-review';
import type { StagePair, StageReading, StoredReview } from '../ai-pm-review-store';

/**
 * One integrated call for consulting round 4.
 * Rounds 1–3 are the stored rows. They are read and sent again. They are not called and not updated.
 * The round-4 answer is a CPO simulation of already known information. It is not a new verified fact.
 * A format error stays on the new row with the raw response. There is no repair call.
 */
const enabled = process.env.AI_PM_CONSULTING_ROUND4 === '1';
const PROJECT_ID = '3a5fc4a0-2e90-45e6-8370-350beda67342';
const ROUND1_ID = '0a13c604-9931-40c5-88a5-80f06687fd5a';
const FAILED_QUESTION_ID = '3be5715e-7294-44bd-b163-f3af1dec4259';
const FOUNDER_FEEDBACK_ID = '7d2d04e5-93a1-4cd6-aebf-03582eeb003f';
const INTERVENING_ID = '9e169fef-7428-4d21-a6f0-f3034bcc91d1';
const ROUND3_ID = '970b8ce1-3e4b-4840-834f-2c6a87b2ec54';
const BUCKET = 'ai-pm-quality-compare';
const OBJECT = 'product-consulting-round4-2026-10-31.json';

const ROUND4_QUESTION = '현재 실제로 접촉했거나 협력 가능성을 확인한 양조장이 있습니까?';
const ROUND4_CHOICES = [
  { choiceId: 'c1', label: '실제 양조장과 연락하거나 미팅했고, 협력 의사도 확인했다.' },
  { choiceId: 'c2', label: '양조장과 연락했지만 아직 협력 여부나 조건은 정해지지 않았다.' },
  { choiceId: 'c3', label: '접촉할 양조장 후보는 있지만 아직 연락하지 않았다.' },
  { choiceId: 'c4', label: '아직 양조장 후보조차 정하지 못했다.' },
  { choiceId: 'other', label: '기타 직접 입력' },
] as const;
const ROUND4_SUPPLEMENT =
  '체험으로 술을 직접 만들고 마실 수 있는 양조장을 우선 후보로 선정하려고 한다. 하지만 아직 구체적인 양조장 후보를 정하지 않았고, 실제 연락도 하지 않았다.';

describe.skipIf(!enabled)('stored brewery round 4', () => {
  it('reuses the stored rounds and calls GPT once with the simulated fourth answer', async () => {
    const config = supabaseConfig();
    expect(config).not.toBeNull();
    if (!config) return;
    const preview = process.env.VERCEL_ENV === 'preview' && process.env.VERCEL_GIT_COMMIT_REF !== 'main';
    const apiKey = process.env.GPT_API_KEY?.trim() ?? '';
    if (!preview || !apiKey) {
      console.log(`preview-consulting-round4 hold preview=${preview} gpt_key=${apiKey ? 'present' : 'absent'}`);
      return;
    }
    const existing = await readMarker(config, OBJECT);
    if (existing && typeof existing.response === 'string' && existing.reviewId) {
      console.log(`preview-consulting-round4 skip status=${existing.status}`);
      return;
    }
    if (existing && !existing.response && ['failed', 'limited'].includes(String(existing.status))) {
      console.log(`preview-consulting-round4 skip status=${existing.status}`);
      return;
    }
    if (existing?.status === 'started' && !existing.response) {
      const ageMs = Date.now() - Date.parse(String(existing.startedAt ?? ''));
      if (Number.isFinite(ageMs) && ageMs < 20 * 60 * 1000) {
        console.log('preview-consulting-round4 skip status=started');
        return;
      }
    }

    const backend = openReviewBackend();
    expect(backend.storage.durable).toBe(true);
    const before = await snapshot(config);
    const sourceRow = before.reviews.find((row) => row.review_id === ROUND3_ID);
    const userId = sourceRow?.user_id ?? '';
    expect(userId.length).toBeGreaterThan(0);
    const round1 = await backend.store.readReview(userId, ROUND1_ID);
    const failed = await backend.store.readReview(userId, FAILED_QUESTION_ID);
    const intervening = await backend.store.readReview(userId, INTERVENING_ID);
    const round3 = await backend.store.readReview(userId, ROUND3_ID);
    const feedback = (await backend.store.listFeedback(userId, FAILED_QUESTION_ID)).find(
      (item) => item.feedbackId === FOUNDER_FEEDBACK_ID,
    );
    expect(round1?.sections).toBeTruthy();
    expect(round1?.inputText.includes('관광객')).toBe(true);
    expect(round3?.status).toBe('succeeded');
    expect(round3?.sections).toBeTruthy();
    expect(feedback?.choiceAnswer?.choiceId).toBeTruthy();
    const founderQuestion = failed ? storedQuestion(failed) : '';
    expect(founderQuestion.length).toBeGreaterThan(0);
    if (!round1?.sections || !failed || !round3?.sections || !feedback?.choiceAnswer || !founderQuestion) return;

    const round1Question = round1.sections.nextQuestion;
    const offered = choicesFromReview(failed);
    expect(offered.length).toBeGreaterThan(0);
    const priorPair: StagePair = {
      questionId: 'stored-3be5715e',
      question: founderQuestion,
      offeredChoices: offered,
      choiceId: feedback.choiceAnswer.choiceId,
      choiceLabel: feedback.choiceAnswer.label,
      supplement: (feedback.choiceAnswer.otherText || feedback.comment || '').trim(),
      status: 'answered',
    };
    const round4Pair: StagePair = {
      questionId: 'round4-q1',
      question: ROUND4_QUESTION,
      offeredChoices: ROUND4_CHOICES.map((choice) => ({ ...choice })),
      choiceId: 'c4',
      choiceLabel: ROUND4_CHOICES[3].label,
      supplement: ROUND4_SUPPLEMENT,
      status: 'answered',
    };
    const priorAnalyses: PriorAnalysisBrief[] = [brief(round1), ...(intervening ? [brief(intervening)] : []), brief(round3)];
    const consultingPath: ConsultingPathStep[] = [
      {
        order: 1,
        reviewId: FAILED_QUESTION_ID,
        choice: priorPair.choiceLabel,
        supplement: priorPair.supplement,
        answeredQuestion: priorPair.question,
        judgment: round3.sections.analysis?.judgmentDetail || round3.sections.judgment,
        nextQuestion: round3.sections.nextQuestion,
        assumptions: round3.sections.analysis?.assumptions ?? round3.sections.hypotheses,
        risks: round3.sections.risks,
        judgmentStatus: 'unresolved',
      },
    ];
    const previousQuestions = [round1Question, founderQuestion, round3.sections.nextQuestion, ROUND4_QUESTION];
    const request = buildProductReanalysisRequest({
      originalInput: round1.inputText,
      firstAnalysis: round1.sections,
      priorTurns: [],
      priorAnalyses,
      previousQuestions,
      founderAnswerSource: { feedbackId: FOUNDER_FEEDBACK_ID, reviewId: FAILED_QUESTION_ID, onThisReview: false },
      latestAnalysis: round3.sections,
      founderChoice: null,
      founderSupplement: '',
      founderFeedback: null,
      consultingPath,
      experimentRecords: [],
      failedCalls: [],
      stagePairs: [round4Pair],
      priorStagePairs: [priorPair],
      stagePartial: false,
    });
    const userMessage = request.messages.find((message) => message.role === 'user');
    const parsedUser = JSON.parse(userMessage?.content ?? '') as Record<string, unknown>;
    const recordLink = {
      note: '1차 성공 행의 질문과 Founder 답변이 연결된 질문 행이 다르다. 하나의 연속 대화로 단정하지 않는다.',
      round1SuccessReviewId: ROUND1_ID,
      round1Question: round1Question,
      founderAnswerReviewId: FAILED_QUESTION_ID,
      founderAnswerQuestion: founderQuestion,
      founderAnswerFeedbackId: FOUNDER_FEEDBACK_ID,
      founderAnswerOnThisReview: false,
      round3ReviewId: ROUND3_ID,
      round3ParentReviewId: round3.parentReviewId,
      interveningReviewId: INTERVENING_ID,
      interveningParentReviewId: intervening?.parentReviewId ?? null,
      questionsDiffer: round1Question.trim() !== founderQuestion.trim(),
    };
    const answerProvenance = {
      round: 4,
      kind: '시뮬레이션',
      notice:
        '이번 4차 답변은 기존에 알려진 정보만으로 작성한 시뮬레이션이다. 새로 확인된 사실이 아니며, Founder가 새로 저장한 답이 아니다. 협력 가능성을 검증된 사실로 올리지 않는다.',
      notAVerifiedFact: true,
    };
    parsedUser.answerProvenance = answerProvenance;
    parsedUser.recordLink = recordLink;
    parsedUser.independentReevaluation =
      '1차 분석, 저장된 Founder 주장, 3차 분석을 읽고 사업성을 다시 판단한다. priorJudgmentText를 유지 근거로 이어 쓰지 않는다. 시뮬레이션 답을 확인된 협력이나 확인된 접촉으로 바꾸지 않는다.';
    parsedUser.storedOriginals = {
      round1: {
        reviewId: ROUND1_ID,
        role: '1차 최초 사업성 분석. 재사용. 이 행을 다시 호출하지 않는다.',
        priorQuestionText: round1Question,
        priorJudgmentText: round1.sections.judgment,
        rawContent: round1.rawContent,
      },
      founderAnswer: {
        reviewId: FAILED_QUESTION_ID,
        feedbackId: FOUNDER_FEEDBACK_ID,
        role: '저장된 Founder 답. 유형은 주장이다. 확인된 사실이 아니다.',
        question: founderQuestion,
        choiceId: priorPair.choiceId,
        choiceLabel: priorPair.choiceLabel,
        supplement: priorPair.supplement,
      },
      interveningParent: {
        reviewId: INTERVENING_ID,
        parentReviewId: intervening?.parentReviewId ?? null,
        role: '3차 분석의 부모. Founder 답이 연결된 질문 행은 아니다.',
        priorQuestionText: intervening?.sections?.nextQuestion ?? '',
        priorJudgmentText: intervening?.sections?.analysis?.judgmentDetail || intervening?.sections?.judgment || '',
      },
      round3: {
        reviewId: ROUND3_ID,
        parentReviewId: round3.parentReviewId,
        role: '3차 통합 분석. 누적 전달. 이 문장을 유지 근거로 쓰지 말고 다시 평가한다.',
        priorJudgmentText: round3.sections.analysis?.judgmentDetail || round3.sections.judgment,
        rawContent: round3.rawContent,
      },
    };
    const stagePairs = parsedUser.stagePairs as Array<Record<string, unknown>>;
    const priorStagePairs = parsedUser.priorStagePairs as Array<Record<string, unknown>>;
    if (stagePairs[0]) {
      stagePairs[0].answerTrust =
        '시뮬레이션. 새로 확인된 사실이 아니다. 체험형 양조장을 우선 후보로 고르려는 계획과, 구체적인 후보와 실제 연락이 없다는 상태만 반영한다.';
    }
    if (priorStagePairs[0]) {
      priorStagePairs[0].answerTrust =
        'Founder 주장. 확인된 사실이 아니다. 실제 협력 의사, 양조장 접촉, 협력 조건은 미확인이다.';
    }
    if (parsedUser.evidenceLedger && typeof parsedUser.evidenceLedger === 'object') {
      parsedUser.evidenceLedger = {
        ...(parsedUser.evidenceLedger as Record<string, unknown>),
        round4AnswerKind: '시뮬레이션',
        round4IsVerifiedFact: false,
      };
    }
    const sentRequest: ChatRequest = {
      ...request,
      messages: request.messages.map((message) =>
        message.role === 'user' ? { ...message, content: stripUser(JSON.stringify(parsedUser), userId) } : message,
      ),
    };

    const startedAt = new Date().toISOString();
    let marker: Record<string, unknown> = {
      status: 'started',
      startedAt,
      projectId: PROJECT_ID,
      cpoReview: '4차 원문 제출. 이 호출은 품질 판정을 내리지 않는다.',
      rounds1to3: 'reused, not called',
      rounds5to10: 'NOT RUN',
      screenLoggedInSubmit: 'NOT RUN',
      repairCall: 'NOT RUN',
      answerProvenance,
      recordLink,
    };
    if (typeof existing?.response === 'string' && !existing.reviewId) {
      marker = { ...existing, status: 'response_received' };
    } else {
      await writeMarker(config, marker, OBJECT);
    }

    try {
      let response: ChatResponse | null = null;
      if (marker.status === 'response_received' && typeof marker.response === 'string') {
        response = {
          id: 'recovered',
          model: String(marker.model ?? ''),
          provider: 'openai',
          content: marker.response,
          finishReason: 'stop',
          usage: {
            inputTokens: Number(marker.inputTokens ?? 0),
            outputTokens: Number(marker.outputTokens ?? 0),
            totalTokens: Number(marker.totalTokens ?? 0),
          },
          usageKnown: marker.usageKnown === true,
          latencyMs: Number(marker.latencyMs ?? 0),
        };
      } else {
        const started = Date.now();
        response = await new OpenAIProviderAdapter({ apiKey }).chat(sentRequest);
        marker = {
          ...marker,
          status: 'response_received',
          callCount: 1,
          model: response.model,
          provider: response.provider,
          inputTokens: response.usageKnown === true ? response.usage.inputTokens : null,
          outputTokens: response.usageKnown === true ? response.usage.outputTokens : null,
          totalTokens: response.usageKnown === true ? response.usage.totalTokens : null,
          usageKnown: response.usageKnown === true,
          latencyMs: response.latencyMs ?? Date.now() - started,
          request: {
            model: sentRequest.model,
            temperature: sentRequest.temperature ?? null,
            maxTokens: sentRequest.maxTokens ?? null,
            responseFormat: sentRequest.responseFormat ?? null,
            messages: sentRequest.messages,
          },
          response: response.content,
        };
        await writeMarker(config, marker, OBJECT);
      }

      const judged = readStageContract(response.content, {
        askedQuestions: previousQuestions,
        pairs: [round4Pair],
      });
      const records = await backend.store.listReviews(userId, PROJECT_ID);
      const version = records.reduce((max, record) => Math.max(max, record.version), 0) + 1;
      const now = new Date().toISOString();
      const known = response.usageKnown === true;
      const reviewId = typeof marker.reviewId === 'string' ? marker.reviewId : randomUUID();
      const record: StoredReview = {
        reviewId,
        userId,
        version,
        parentReviewId: ROUND3_ID,
        sourceFeedbackId: null,
        supplementSha: null,
        projectId: PROJECT_ID,
        inputSha: round1.inputSha,
        inputText: round1.inputText,
        inputOrigin: round1.inputOrigin,
        fileName: null,
        status: judged.issues.length === 0 && judged.sections ? 'succeeded' : 'failed',
        evidence: 'live_network',
        provider: 'openai',
        model: response.model,
        sections: judged.issues.length === 0 ? judged.sections : null,
        rawContent: response.content,
        firstRawContent: null,
        callLedger: [
          {
            index: 1,
            promptTokens: known ? response.usage.inputTokens : null,
            completionTokens: known ? response.usage.outputTokens : null,
            totalTokens: known ? response.usage.totalTokens : null,
            readingIssues: judged.issues,
            ...(judged.reading
              ? {
                  judgment: judged.reading.updatedJudgment.slice(0, 400),
                  nextQuestion: judged.reading.nextQuestions[0]?.text.slice(0, 400) ?? '',
                  nextVerification: judged.reading.nextVerification.slice(0, 400),
                }
              : {}),
          },
        ],
        revisionGate: null,
        consultingTurn: null,
        stageAnswers: [round4Pair],
        stagePartial: false,
        stageReading: judged.reading,
        founderAnswerSource: { feedbackId: FOUNDER_FEEDBACK_ID, reviewId: FAILED_QUESTION_ID, onThisReview: false },
        promptTokens: known ? response.usage.inputTokens : null,
        completionTokens: known ? response.usage.outputTokens : null,
        totalTokens: known ? response.usage.totalTokens : null,
        usageKnown: known,
        callCount: 1,
        latencyMs: response.latencyMs,
        error: judged.issues.length === 0 ? null : judged.issues.join(','),
        requestedAt: startedAt,
        finishedAt: now,
      };
      const wrote = (await backend.store.insertReview(record)).wrote;
      const after = await snapshot(config);
      const preservation = preserved(before, after);
      marker = {
        ...marker,
        status: 'awaiting_cpo',
        finishedAt: now,
        reviewId: record.reviewId,
        parentReviewId: record.parentReviewId,
        rowStatus: record.status,
        rowError: record.error,
        inserted: wrote,
        callCount: 1,
        stageReading: judged.reading,
        preservation,
        round5: 'NOT RUN',
      };
      expect(wrote).toBe(true);
      expect(preservation.reviewsChanged).toEqual([]);
      expect(preservation.feedbackChanged).toEqual([]);
      expect(preservation.reviewCountAfter).toBe(preservation.reviewCountBefore + 1);
      expect(preservation.feedbackCountAfter).toBe(preservation.feedbackCountBefore);
      expect(recordLink.questionsDiffer).toBe(true);
    } catch (error) {
      const limited = isLimited(error instanceof Error ? error.message : '');
      if (!marker.response) {
        marker = {
          ...marker,
          status: limited ? 'limited' : 'failed',
          finishedAt: new Date().toISOString(),
          callCount: 0,
          error: error instanceof Error ? error.message.slice(0, 500) : 'failed',
        };
      } else {
        marker = {
          ...marker,
          status: 'awaiting_cpo',
          finishedAt: new Date().toISOString(),
          testError: error instanceof Error ? error.message.slice(0, 500) : 'failed',
        };
      }
      throw error;
    } finally {
      await writeMarker(config, stripMarker(marker, userId), OBJECT);
      console.log(`preview-consulting-round4 stored status=${marker.status} review=${marker.reviewId ?? ''}`);
    }
  }, 180_000);
});

function brief(review: StoredReview): PriorAnalysisBrief {
  return {
    reviewId: review.reviewId,
    judgment: review.sections?.analysis?.judgmentDetail || review.sections?.judgment || '',
    nextQuestion: review.sections?.nextQuestion ?? '',
    assumptions: review.sections?.analysis?.assumptions ?? review.sections?.hypotheses ?? [],
    risks: review.sections?.risks ?? [],
  };
}

function storedQuestion(review: StoredReview): string {
  const fromSections = review.sections?.nextQuestion?.trim() ?? '';
  if (fromSections) return fromSections;
  try {
    const parsed = JSON.parse(review.rawContent ?? '') as { nextQuestion?: unknown };
    return typeof parsed.nextQuestion === 'string' ? parsed.nextQuestion.trim() : '';
  } catch {
    return '';
  }
}

function offeredChoiceId(label: string, index: number): string {
  if (label.trim() === '직접 입력') return 'other';
  return `c${index + 1}`;
}

function choicesFromReview(review: StoredReview): StagePair['offeredChoices'] {
  const stored = review.sections?.analysis?.choices ?? [];
  if (stored.length > 0) return stored.map((choice) => ({ choiceId: choice.id, label: choice.label }));
  try {
    const parsed = JSON.parse(review.rawContent ?? '') as { choices?: unknown };
    if (!Array.isArray(parsed.choices)) return [];
    return parsed.choices.flatMap((item, index) => {
      if (typeof item === 'string' && item.trim()) {
        return [{ choiceId: offeredChoiceId(item, index), label: item.trim() }];
      }
      if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
      const record = item as { id?: unknown; choiceId?: unknown; label?: unknown; text?: unknown };
      const label = typeof record.label === 'string' ? record.label : typeof record.text === 'string' ? record.text : '';
      if (!label.trim()) return [];
      const choiceId =
        typeof record.id === 'string' ? record.id : typeof record.choiceId === 'string' ? record.choiceId : offeredChoiceId(label, index);
      return [{ choiceId, label: label.trim() }];
    });
  } catch {
    return [];
  }
}

function readStageContract(
  content: string,
  contract: { askedQuestions: string[]; pairs: StagePair[] },
): { sections: StoredReview['sections']; issues: string[]; reading: StageReading | null } {
  let parsed: Record<string, unknown>;
  try {
    const value = JSON.parse(content.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()) as unknown;
    if (!value || typeof value !== 'object' || Array.isArray(value)) return { sections: null, issues: ['invalid_json'], reading: null };
    parsed = value as Record<string, unknown>;
  } catch {
    return { sections: null, issues: ['invalid_json'], reading: null };
  }
  const issues: string[] = [];
  const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null);
  const list = (value: unknown) =>
    Array.isArray(value) && value.every((item) => typeof item === 'string')
      ? value.map((item) => item.trim()).filter((item) => item.length > 0)
      : null;
  const impactOnPreviousJudgment = text(parsed.impactOnPreviousJudgment);
  const updatedJudgment = text(parsed.updatedJudgment);
  const judgmentReason = text(parsed.judgmentReason);
  const nextVerification = text(parsed.nextVerification);
  const verifiedFacts = list(parsed.verifiedFacts);
  const unverifiedClaims = list(parsed.unverifiedClaims);
  const assumptions = list(parsed.assumptions);
  const resolvedIssues = list(parsed.resolvedIssues);
  const unresolvedIssues = list(parsed.unresolvedIssues);
  const interpretations = Array.isArray(parsed.answerInterpretation) ? parsed.answerInterpretation : null;
  const nextQuestionItems = Array.isArray(parsed.nextQuestions) ? parsed.nextQuestions : null;
  const choiceMatrix = Array.isArray(parsed.nextQuestionChoices) ? parsed.nextQuestionChoices : null;
  if (
    !impactOnPreviousJudgment ||
    !updatedJudgment ||
    !judgmentReason ||
    !nextVerification ||
    !verifiedFacts ||
    !unverifiedClaims ||
    !assumptions ||
    !resolvedIssues ||
    !unresolvedIssues ||
    !interpretations ||
    !nextQuestionItems ||
    !choiceMatrix
  ) {
    issues.push('stage_fields_missing');
  }
  const answerInterpretation: StageReading['answerInterpretation'] = [];
  if (interpretations) {
    for (const item of interpretations) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        issues.push('stage_fields_missing');
        break;
      }
      const record = item as Record<string, unknown>;
      const questionId = typeof record.questionId === 'string' ? record.questionId.trim() : '';
      const meaning = typeof record.meaning === 'string' ? record.meaning.trim() : '';
      if (!questionId || typeof record.choiceId !== 'string' || !meaning) {
        issues.push('stage_fields_missing');
        break;
      }
      answerInterpretation.push({ questionId, choiceId: record.choiceId.trim(), meaning });
    }
  }
  const nextQuestions: StageReading['nextQuestions'] = [];
  if (nextQuestionItems) {
    for (const item of nextQuestionItems) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        issues.push('stage_fields_missing');
        break;
      }
      const question = text((item as { text?: unknown }).text);
      const choices = list((item as { choices?: unknown }).choices);
      if (!question || !choices) {
        issues.push('stage_fields_missing');
        break;
      }
      nextQuestions.push({ text: question, choices });
    }
  }
  const nextQuestionChoices: string[][] = [];
  if (choiceMatrix) {
    for (const row of choiceMatrix) {
      const labels = list(row);
      if (!labels) {
        issues.push('stage_fields_missing');
        break;
      }
      nextQuestionChoices.push(labels);
    }
  }
  const reading: StageReading | null =
    impactOnPreviousJudgment &&
    updatedJudgment &&
    judgmentReason &&
    nextVerification &&
    verifiedFacts &&
    unverifiedClaims &&
    assumptions &&
    resolvedIssues &&
    unresolvedIssues &&
    !issues.includes('stage_fields_missing')
      ? {
          answerInterpretation,
          impactOnPreviousJudgment,
          updatedJudgment,
          judgmentReason,
          verifiedFacts,
          unverifiedClaims,
          assumptions,
          resolvedIssues,
          unresolvedIssues,
          nextVerification,
          nextQuestions,
          nextQuestionChoices,
        }
      : null;
  const answered = contract.pairs.filter((pair) => pair.status === 'answered');
  const linked =
    reading !== null &&
    answered.every((pair) => {
      const matches = reading.answerInterpretation.filter((item) => item.questionId === pair.questionId);
      return matches.length === 1 && matches[0]?.choiceId === (pair.choiceId ?? '');
    }) &&
    reading.answerInterpretation.every((item) => answered.some((pair) => pair.questionId === item.questionId));
  if (reading && !linked) issues.push('choice_link_mismatch');
  const texts = reading?.nextQuestions.map((item) => item.text) ?? [];
  const compact = (value: string) => value.replace(/\s+/g, '').trim();
  if (!reading || texts.length < 1 || new Set(texts.map(compact)).size !== texts.length) issues.push('stage_questions_missing');
  const menus = reading?.nextQuestions ?? [];
  const matrix = reading?.nextQuestionChoices ?? [];
  const menusMissing =
    !reading ||
    menus.some((item) => item.choices.length < 2) ||
    matrix.length !== menus.length ||
    menus.some((item, index) => item.choices.length !== (matrix[index]?.length ?? 0) || item.choices.some((label, labelIndex) => label !== matrix[index]?.[labelIndex]));
  if (menusMissing) issues.push('stage_choices_missing');
  const asked = new Set(contract.askedQuestions.map(compact).filter((value) => value.length > 0));
  if (reading && texts.some((value) => asked.has(compact(value)))) issues.push('stage_questions_repeated');
  const unique = [...new Set(issues)];
  if (unique.length > 0 || !reading) return { sections: null, issues: unique.length > 0 ? unique : ['stage_fields_missing'], reading };
  const questions = reading.nextQuestions.map((item, index) => ({
    questionId: `q${index + 1}`,
    text: item.text,
    choices: item.choices.map((label, choiceIndex) => ({
      id: label.trim() === '직접 입력' ? 'other' : `c${choiceIndex + 1}`,
      label,
    })),
  }));
  return {
    issues: [],
    reading,
    sections: {
      customer: '',
      problem: '',
      market: '',
      revenueModel: '',
      execution: '',
      risks: reading.unresolvedIssues,
      uncertain: reading.unresolvedIssues,
      hypotheses: reading.assumptions,
      judgment: reading.updatedJudgment,
      nextQuestion: reading.nextQuestions[0]?.text ?? '',
      nextQuestionReason: reading.judgmentReason,
      answerHint: '선택하거나 직접 적습니다. 확인된 사실과 계획을 구분합니다.',
      claimConfirmation: null,
      analysis: {
        summary: reading.impactOnPreviousJudgment,
        value: '',
        operatingModel: '',
        payer: '',
        competition: '',
        operations: '',
        profitability: '',
        strengths: [],
        assumptions: reading.assumptions,
        evidenceToChange: [],
        founderFacts: reading.verifiedFacts,
        inferences: reading.unverifiedClaims,
        judgmentDetail: reading.updatedJudgment,
        choices: questions[0]?.choices ?? [],
        nextVerification: reading.nextVerification,
        questions,
      },
    },
  };
}

function stripUser(value: string, userId: string): string {
  return userId ? value.split(userId).join('[user]') : value;
}

function stripMarker(marker: Record<string, unknown>, userId: string): Record<string, unknown> {
  return JSON.parse(stripUser(JSON.stringify(marker), userId)) as Record<string, unknown>;
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
  text = text.replace(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-jwt]');
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

function isLimited(error: string): boolean {
  return /rate limit exceeded|credit_balance_exhausted|insufficient_quota|review_retry_blocked/i.test(error);
}
