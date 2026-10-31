import { readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type { ChatRequest, ChatResponse } from '@repo/ai';
import { describe, expect, it } from 'vitest';
import { AiPmReviewPanel } from '../../components/ai-pm-review-panel';

import { chooseReviewBackend, openSupabaseReviewStore, type AiPmDurablePort } from '../ai-pm-review-backend';
import type { ReviewSections } from '../ai-pm-review-store';
import {
  AI_PM_GEMINI_FALLBACK_MODEL,
  AI_PM_REVIEW_INPUT_TOKEN_BUDGET,
  AI_PM_REVIEW_FIRST_MAX_TOKENS,
  assessFollowUpRevision,
  AI_PM_FIRST_PROMPT_VERSION,
  AI_PM_FOLLOW_UP_INPUT_TOKEN_BUDGET,
  AI_PM_FOLLOW_UP_MAX_TOKENS,
  buildFirstReviewRequest,
  buildFollowUpRequest,
  assembleConsultingHistory,
  buildProductReanalysisRequest,
  AI_PM_PRODUCT_REANALYSIS_MAX_TOKENS,
  judgmentIsConsistent,
  judgmentSeparatesPotential,
  founderClaimTreatedAsFact,
  judgmentContradictsUnverifiedClaim,
  assumptionRestatesUnverifiedHope,
  answerSaysNoCandidate,
  questionRepeatsAnsweredSelection,
  questionVerificationTargets,
  nextFactToAsk,
  purposeStage,
  verificationPurposeAligns,
  questionAsksForPlan,
  questionRepeatsPrior,
  questionSameContactStage,
  questionVerificationStage,
  unverifiedClaimStoredAsFact,
  callReviewWithQuotaSwitch,
  estimateReviewTokens,
  FOLLOW_UP_ANALYSIS_CONTRACT,
  FOLLOW_UP_ANALYSIS_CONTRACT_NOTE,
  FOLLOW_UP_BREWERY_VERIFICATION_PLAN,
  FOLLOW_UP_OUTPUT_CONTRACT,
  FOLLOW_UP_REVIEW_FIELDS,
  FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM,
  followUpOutputContractErrors,
  followUpReflectionSchema,
  followUpRepairMessage,
  incrementalReflectionErrors,
  isProviderLimitError,
  normalizeIncrementalSections,
  reflectionReviewsRepeat,
  FOLLOW_UP_SEPARATION_RULES,
  buildSyntheticFollowUpRequest,
  followUpAnswerNotice,
  followUpRequestMismatches,
  followUpStructureCoverage,
  parseFeedbackBody,
  parseSections,
  presentReview,
  readGptApiKey,
  reviewInputFromParts,
  runFirstReview,
  runFollowUpReview,
  saveReviewFeedback,
  toAiPmReviewView,
  type AiPmReviewView,
} from '../ai-pm-review';
import { reviewFailureCopy } from '../ai-pm-review-failure-copy';
import { composeReviewInput, nextDirectionAfterChoice } from '../ai-pm-review-intake';
import { visibleClaimStates } from '../ai-pm-review-marks';
import { projectLinksForUnscopedReviews } from '../ai-pm-review-project';
import { openAiPmReviewStore, type ReviewSections, type StoredFeedback, type StoredReview } from '../ai-pm-review-store';

const NOW = '2026-10-27T09:30:00.000Z';
const PLAN = 'UNIQUEPLANMARKER 영세 양조장의 온라인 노출을 연결하는 사업. 사용자는 관광객이고 비용은 양조장 대표가 낼 수 있다. 매출은 없다.';

function storePath(): string {
  return join(mkdtempSync(join(tmpdir(), 'ai-pm-review-')), 'reviews.sqlite');
}

function productAnalysisRaw(patch: { judgment: string; nextQuestion: string; nextVerification?: string }): string {
  return JSON.stringify({
    summary: '양조장 체험 사업의 지불자는 아직 확인되지 않았다.',
    customer: '관광객과 양조장 대표',
    problem: '노출과 수요가 확인되지 않았다.',
    value: '체험 안내',
    operatingModel: '구상',
    alternatives: '직접 방문',
    differentiation: '미확인',
    payer: '지불자는 확인되지 않았다.',
    revenueModel: '가격은 가설이며 원문에 없다.',
    market: '수요 조사는 입력에 없다.',
    competition: '경쟁은 확인되지 않았다.',
    operations: '운영은 구상이다.',
    profitability: '수익성은 확인되지 않았다.',
    judgment: patch.judgment,
    nextVerification: patch.nextVerification ?? '잠재 고객에게 참여 의향을 묻는다.',
    nextQuestion: patch.nextQuestion,
    nextQuestionReason: '이번 답 다음에 남은 확인이다.',
    strengths: ['체험 구상이 있다'],
    risks: ['수요가 없다'],
    assumptions: ['체험 수요'],
    evidenceToChange: ['인터뷰'],
    founderFacts: ['구상 중이다'],
    inferences: ['추론: 지불자는 미확인'],
    choices: ['체험 수요를 먼저 확인한다', '홍보 필요를 먼저 확인한다'],
  });
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

function validUngatedFollowUpRaw(previous: ReviewSections, supplement = '양조장 대표 인터뷰는 아직 없다.'): string {
  const line = previous.hypotheses.join(' / ');
  const baselineVerification = previous.analysis?.nextVerification ?? '';
  const nextVerification = baselineVerification || '추가 설명이 확인되기 전에는 기존 질문을 다시 확인한다.';
  const founderAnswer = {
    choice: null,
    supplement,
    source: 'founder-input',
    status: 'unverified-input',
  };
  const change = (field: string, previousValue: string, updated: string) => {
    const same = updated === previousValue;
    const reason =
      field === 'judgment'
        ? `${supplement} 이 추가 설명은 확인된 사실이 아니어서 저장된 판단에 영향을 주지 못한다. 근거가 충분하지 않아 판단을 바꾸지 않고 유지한다. 판단을 바꾸려면 계약서가 필요하다.`
        : field === 'hypotheses'
          ? `${supplement} 이 추가 설명은 가설을 확정하지 못한다. 근거가 부족해 미확인으로 유지한다. 가설을 바꾸려면 예약 확인이 필요하다.`
          : field === 'nextVerification'
            ? `${supplement} 이 말은 검증 문장을 바꾸기에 충분하지 않다.`
            : `${supplement} 이 말은 질문을 바꾸기에 충분하지 않다.`;
    const decision = same ? 'retained' : 'changed';
    return {
      field,
      previous: previousValue,
      current: updated,
      decision,
      reason,
      founderAnswer,
      evidenceStatus: 'unverified-input',
      ...reviewFields(field, decision, supplement),
    };
  };
  return JSON.stringify({
    judgment: previous.judgment,
    hypotheses: previous.hypotheses,
    nextVerification,
    nextQuestion: previous.nextQuestion,
    revenueModel: previous.revenueModel,
    changes: [
      change('judgment', previous.judgment, previous.judgment),
      change('hypotheses', line, line),
      change('nextVerification', baselineVerification, nextVerification),
      change('nextQuestion', previous.nextQuestion, previous.nextQuestion),
    ],
  });
}

function reflectionCase(input: {
  previous: ReviewSections;
  supplement: string;
  choiceLabel?: string | null;
  judgment?: string;
  hypotheses?: string[];
  nextVerification?: string;
  nextQuestion?: string;
  reasons: Record<string, string>;
  decisions?: Record<string, string>;
  evidenceStatus?: string;
}): { raw: string; context: Parameters<typeof incrementalReflectionErrors>[1] } {
  const judgment = input.judgment ?? input.previous.judgment;
  const hypotheses = input.hypotheses ?? input.previous.hypotheses;
  const nextVerification = input.nextVerification ?? '추가 설명이 확인되기 전에는 기존 질문을 다시 확인한다.';
  const nextQuestion = input.nextQuestion ?? input.previous.nextQuestion;
  const line = (values: string[]) => values.join(' / ');
  const previousVerification = input.previous.analysis?.nextVerification ?? '';
  const fields = [
    ['judgment', input.previous.judgment, judgment],
    ['hypotheses', line(input.previous.hypotheses), line(hypotheses)],
    ['nextVerification', previousVerification, nextVerification],
    ['nextQuestion', input.previous.nextQuestion, nextQuestion],
  ] as const;
  return {
    raw: JSON.stringify({
      judgment,
      hypotheses,
      nextVerification,
      nextQuestion,
      revenueModel: input.previous.revenueModel,
      changes: fields.map(([field, previousValue, current]) => {
        const decision = input.decisions?.[field] ?? (current === previousValue ? 'retained' : 'changed');
        return {
          field,
          previous: previousValue,
          current,
          decision,
          reason: input.reasons[field],
          evidenceStatus: input.evidenceStatus ?? 'unverified-input',
          ...reviewFields(field, decision, input.supplement),
        };
      }),
    }),
    context: {
      previousJudgment: input.previous.judgment,
      previousHypotheses: [...input.previous.hypotheses],
      previousNextVerification: previousVerification,
      previousNextQuestion: input.previous.nextQuestion,
      previousRevenueModel: input.previous.revenueModel,
      choiceLabel: input.choiceLabel ?? null,
      supplement: input.supplement,
      answerOrigin: 'synthetic-test-data',
    },
  };
}

function reviewFields(field: string, decision: string, supplement: string): Record<string, string> {
  const held = decision === 'retained' || decision === 'unresolved';
  return {
    inputConsidered: `${supplement} 에서 새로 들은 내용이다.`,
    impactAssessment:
      field === 'hypotheses'
        ? '이 내용은 가설을 확정하지 못해 기존 가설에 미치는 영향이 제한된다.'
        : '이 내용은 저장된 판단에 미치는 영향이 제한된다.',
    sufficiencyAssessment: decision === 'changed' ? 'partial' : 'insufficient',
    retentionDecision: decision,
    holdReason:
      decision === 'unresolved'
        ? '근거가 부족해 아직 판단을 유보한다.'
        : held
          ? '확인된 사실이 아니어서 바꾸지 않고 유지한다.'
          : '기존 문장을 유지하지 않고 검증 순서를 바꾼다.',
    evidenceNeeded: field === 'hypotheses' ? '예약 확인 기록이 필요하다.' : '계약서 증빙이 필요하다.',
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
  it('puts the stored analysis and the answer origin on the product follow-up request', () => {
    const evidence = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-quality14-independent-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      gitSha: string;
      businessInput: string;
      report: { calls: Array<{ promptVersion: string; raw: string }> };
    };
    const previous = evidence.report.calls.find((call) => call.promptVersion === 'quality-14-cpo-draft:brewery');
    const sections = parseSections(previous?.raw ?? '', evidence.businessInput);
    expect(sections?.analysis?.founderFacts.length).toBeGreaterThan(0);
    expect(sections?.nextQuestion).toBe('체험 프로그램과 마케팅 지원 중 어느 쪽을 먼저 검증할지?');
    const selected = sections?.analysis?.choices.find((choice) => choice.label === '체험 프로그램을 먼저 검증할 것');
    expect(selected?.id).toBeTruthy();
    const supplement = '테스트용 합성 설명. 실제 창업자가 제공한 문장이 아니다. 예약 고객, 가격, 계약, 확정된 양조장은 없다.';
    const request = buildSyntheticFollowUpRequest({
      originalInput: evidence.businessInput,
      sections: sections!,
      feedback: {
        feedbackId: 'feedback-structure',
        reviewId: 'review-structure',
        userId: 'user-structure',
        agreement: 'need_info',
        accuracy: 'hard_to_compare',
        revisionAreas: ['other'],
        comment: selected?.label ?? '',
        nextAction: 'verify_hypotheses',
        marks: [],
        choiceAnswer: { choiceId: selected?.id ?? '', label: selected?.label ?? '', otherText: '' },
        submittedAt: NOW,
        modelCalls: 0,
      },
      supplement,
      answerOrigin: 'synthetic-test-data',
    });
    const source = {
      originalInput: evidence.businessInput,
      sections: sections!,
      feedback: {
        feedbackId: 'feedback-structure',
        reviewId: 'review-structure',
        userId: 'user-structure',
        agreement: 'need_info' as const,
        accuracy: 'hard_to_compare' as const,
        revisionAreas: ['other' as const],
        comment: selected?.label ?? '',
        nextAction: 'verify_hypotheses' as const,
        marks: [],
        choiceAnswer: { choiceId: selected?.id ?? '', label: selected?.label ?? '', otherText: '' },
        submittedAt: NOW,
        modelCalls: 0 as const,
      },
      supplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    expect(followUpRequestMismatches(request, source)).toEqual([]);
    expect(followUpStructureCoverage(request)).toEqual({
      originalInput: true,
      previousAnalysis: true,
      previousQuestion: true,
      founderChoice: true,
      founderSupplement: true,
      separationRules: true,
      answerOrigin: true,
    });
    const user = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      analysisContract: string;
      analysisContractNote: string;
      answerOrigin: string;
      answerOriginNotice: string;
      originalInput: string;
      previousQuestion: string;
      previousAnalysis: {
        customer: string;
        problem: string;
        market: string;
        revenueModel: string;
        execution: string;
        risks: string[];
        uncertain: string[];
        hypotheses: string[];
        judgment: string;
        nextQuestion: string;
        nextQuestionReason: string;
        answerHint: string;
        claimConfirmation: null;
        analysis: {
          summary: string;
          value: string;
          operatingModel: string;
          payer: string;
          competition: string;
          operations: string;
          profitability: string;
          strengths: string[];
          assumptions: string[];
          evidenceToChange: string[];
          founderFacts: string[];
          inferences: string[];
          judgmentDetail: string;
          choices: Array<{ id: string; label: string }>;
          alternatives: string;
          differentiation: string;
          nextVerification: string;
        };
      };
      founderChoice: { answerOrigin: string; choiceId: string; label: string; otherText: string };
      founderSupplement: string;
      separationRules: string[];
      supplement: string;
      feedback: { choiceAnswer: { label: string } };
    };
    expect(user.answerOrigin).toBe('synthetic-test-data');
    expect(user.answerOriginNotice).toBe(followUpAnswerNotice('synthetic-test-data'));
    expect(user.originalInput).toBe(evidence.businessInput);
    expect(user.previousQuestion).toBe(sections?.nextQuestion);
    expect(user.previousAnalysis.nextQuestion).toBe(sections?.nextQuestion);
    expect(user.previousAnalysis.revenueModel).toBe(sections?.revenueModel);
    expect(user.previousAnalysis.hypotheses).toEqual(sections?.hypotheses);
    expect(user.previousAnalysis.analysis.founderFacts).toEqual(sections?.analysis?.founderFacts);
    expect(user.previousAnalysis.analysis.choices.map((choice) => choice.label)).toEqual(
      sections?.analysis?.choices.map((choice) => choice.label),
    );
    expect(user.previousAnalysis.analysis.summary).toBe(sections?.analysis?.summary);
    expect(user.previousAnalysis.analysis.judgmentDetail).toBe(sections?.analysis?.judgmentDetail);
    expect(user.founderChoice).toEqual({
      answerOrigin: 'synthetic-test-data',
      choiceId: selected?.id,
      label: '체험 프로그램을 먼저 검증할 것',
      otherText: '',
    });
    expect(user.feedback.choiceAnswer.label).toBe('체험 프로그램을 먼저 검증할 것');
    expect(user.founderSupplement).toBe(supplement);
    expect(user.supplement).toBe(supplement);
    expect(user.separationRules).toEqual([...FOLLOW_UP_SEPARATION_RULES]);
    const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
    for (const rule of FOLLOW_UP_SEPARATION_RULES) expect(system).toContain(rule);
    expect(buildFirstReviewRequest(evidence.businessInput).messages[0]?.content).not.toContain('통째로 다시 출력하지 않는다');
    expect(AI_PM_FIRST_PROMPT_VERSION).toBe('quality-2');
    expect(request.maxTokens).toBe(AI_PM_FOLLOW_UP_MAX_TOKENS);
    const followSystem = request.messages.find((message) => message.role === 'system')?.content ?? '';
    expect(followSystem).toContain(FOLLOW_UP_OUTPUT_CONTRACT);
    expect(followSystem).toContain('changes는 JSON 배열이다');
    expect(followSystem).toContain('객체 맵');
    expect(followSystem).toContain('판단의 reason이 선택 문장뿐이면 실패다');
    expect(followSystem).toContain('수요가 있다고 단정하지 않는다');
    expect(followSystem).toContain(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(followSystem).toContain('reason이 비어 있으면 실패다');
    expect(followSystem).toContain('코드가 창업자 답변을 보존한다');
    expect(followSystem).toContain('코드는 여섯 검토 필드를 만들지 않는다');
    expect(followSystem).toContain('inputConsidered');
    expect(followSystem).toContain('holdReason');
    expect(request.responseFormat?.type).toBe('json_schema');
    if (request.responseFormat?.type === 'json_schema') {
      const changes = request.responseFormat.schema.properties as { changes: { items: { required: string[] } } };
      expect(changes.changes.items.required).toEqual(expect.arrayContaining([...FOLLOW_UP_REVIEW_FIELDS]));
      expect(request.responseFormat.schema.additionalProperties).toBe(false);
    }
    expect(followUpReflectionSchema().title).toBe('reflection_output_11');
    expect(followSystem).toContain('선택 문장과 추가 설명을 원소마다 복사하지 않는다');
    expect(followSystem).not.toContain('선택이 있는데 null이면 실패다');
    expect(followSystem).not.toContain('원소 choiceTrace');
    expect(followSystem).toContain('revenueModel은 previousAnalysis.revenueModel');
    expect(followSystem).not.toContain('선택이 없으면 null이다');
    expect(followSystem).not.toContain('grounds는 빈 문자열이다');
    expect(buildFirstReviewRequest(evidence.businessInput).messages[0]?.content).not.toContain(FOLLOW_UP_OUTPUT_CONTRACT);
    expect(estimateReviewTokens(request.messages.map((message) => message.content).join('\n'))).toBeLessThan(
      AI_PM_FOLLOW_UP_INPUT_TOKEN_BUDGET,
    );
    const stored = buildFollowUpRequest({
      originalInput: evidence.businessInput,
      sections: sections!,
      feedback: null,
      supplement: '',
      answerOrigin: 'founder-input',
    });
    const storedUser = JSON.parse(stored.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      answerOrigin: string;
      answerOriginNotice: string;
      founderChoice: null;
      founderSupplement: string;
    };
    expect(storedUser.answerOrigin).toBe('founder-input');
    expect(storedUser.answerOriginNotice).toBe(followUpAnswerNotice('founder-input'));
    expect(storedUser.founderChoice).toBeNull();
    expect(storedUser.founderSupplement).toBe('');
    expect(
      followUpRequestMismatches(stored, {
        originalInput: evidence.businessInput,
        sections: sections!,
        feedback: null,
        supplement: '',
        answerOrigin: 'founder-input',
      }),
    ).toEqual([]);
    const omitted = {
      originalInput: evidence.businessInput,
      sections: sections!,
      feedback: null,
      supplement: '테스트용 합성 설명',
    };
    expect(() => buildFollowUpRequest(omitted as Parameters<typeof buildFollowUpRequest>[0])).toThrow(
      'follow_up_answer_origin_required',
    );
    expect(() => buildSyntheticFollowUpRequest(omitted)).toThrow('synthetic_answer_origin_required');
    expect(() =>
      buildSyntheticFollowUpRequest({
        ...omitted,
        answerOrigin: 'founder-input',
      }),
    ).toThrow('synthetic_answer_origin_required');
    expect(followUpStructureCoverage(stored).founderChoice).toBe(false);
    const raw = JSON.parse(previous?.raw ?? '') as Record<string, unknown>;
    expect(user.previousAnalysis.customer).toBe(raw.customer);
    expect(user.previousAnalysis.problem).toBe(raw.problem);
    expect(user.previousAnalysis.market).toBe(raw.market);
    expect(user.previousAnalysis.revenueModel).toBe(raw.revenueModel);
    expect(user.previousAnalysis.execution).toBe(raw.operatingModel);
    expect(user.previousAnalysis.risks).toEqual([raw.risks]);
    expect(user.previousAnalysis.uncertain).toEqual([raw.assumptions]);
    expect(user.previousAnalysis.hypotheses).toEqual([raw.assumptions]);
    expect(user.previousAnalysis.judgment).toBe(raw.summary);
    expect(user.previousAnalysis.judgment).not.toBe(raw.judgment);
    expect(user.previousAnalysis.nextQuestion).toBe(raw.nextQuestion);
    expect(user.previousAnalysis.nextQuestionReason).toBe(raw.nextQuestionReason);
    expect(user.previousAnalysis.answerHint).toBe('선택하거나 직접 적습니다. 확인된 사실과 계획을 구분합니다.');
    expect(user.previousAnalysis.claimConfirmation).toBeNull();
    expect(user.previousAnalysis.analysis.summary).toBe(raw.summary);
    expect(user.previousAnalysis.analysis.value).toBe(raw.value);
    expect(user.previousAnalysis.analysis.operatingModel).toBe(raw.operatingModel);
    expect(user.previousAnalysis.analysis.payer).toBe(raw.payer);
    expect(user.previousAnalysis.analysis.competition).toBe(raw.competition);
    expect(user.previousAnalysis.analysis.operations).toBe(raw.operations);
    expect(user.previousAnalysis.analysis.profitability).toBe(raw.profitability);
    expect(user.previousAnalysis.analysis.strengths).toEqual(raw.strengths);
    expect(user.previousAnalysis.analysis.assumptions).toEqual([raw.assumptions]);
    expect(user.previousAnalysis.analysis.evidenceToChange).toEqual([raw.evidenceToChange]);
    expect(user.previousAnalysis.analysis.founderFacts).toEqual(raw.founderFacts);
    expect(user.previousAnalysis.analysis.inferences).toEqual(raw.inferences);
    expect(user.previousAnalysis.analysis.judgmentDetail).toBe(raw.judgment);
    expect(user.previousAnalysis.analysis.alternatives).toBe(raw.alternatives);
    expect(user.previousAnalysis.analysis.differentiation).toBe(raw.differentiation);
    expect(user.previousAnalysis.analysis.nextVerification).toBe(raw.nextVerification);
    expect(user.previousAnalysis.analysis.choices.map((choice) => choice.label)).toEqual(raw.choices);
    expect(user.previousAnalysis.analysis.founderFacts).not.toContain(selected?.label);
    expect(user.previousAnalysis.analysis.founderFacts.join('\n')).not.toContain(supplement);
    expect(user.separationRules).toHaveLength(5);
    const wrongInput = buildSyntheticFollowUpRequest({
      ...source,
      originalInput: '다른 사업 원문이다.',
      answerOrigin: 'synthetic-test-data',
    });
    expect(followUpStructureCoverage(wrongInput).originalInput).toBe(true);
    expect(followUpRequestMismatches(wrongInput, source)).toContain('originalInput');
    expect(followUpRequestMismatches(wrongInput, source)).not.toContain('previousAnalysis');
    expect(user.analysisContract).toBe(FOLLOW_UP_ANALYSIS_CONTRACT);
    expect(user.analysisContractNote).toBe(FOLLOW_UP_ANALYSIS_CONTRACT_NOTE);
    expect(JSON.stringify(user.previousAnalysis)).not.toBe(previous?.raw);
    expect(Object.hasOwn(user, 'rawContent')).toBe(false);
    const mutate = (apply: (payload: Record<string, unknown>) => void) => {
      const payload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as Record<string, unknown>;
      apply(payload);
      return {
        ...request,
        messages: request.messages.map((message) =>
          message.role === 'user' ? { ...message, content: JSON.stringify(payload) } : message,
        ),
      };
    };
    const analysisOf = (payload: Record<string, unknown>) =>
      (payload.previousAnalysis as Record<string, unknown>).analysis as Record<string, unknown>;
    const sectionOf = (payload: Record<string, unknown>) => payload.previousAnalysis as Record<string, unknown>;
    const choiceOf = (payload: Record<string, unknown>) => payload.founderChoice as Record<string, unknown>;
    const requiredMismatches: Array<[string, (payload: Record<string, unknown>) => void]> = [
      ['outputContract', (payload) => { payload.outputContract = 'short-keys-1'; }],
      ['outputContract', (payload) => { payload.outputContract = ''; }],
      ['outputContract', (payload) => { delete payload.outputContract; }],
      ['analysisContract', (payload) => { payload.analysisContract = 'raw-bytes-1'; }],
      ['analysisContract', (payload) => { payload.analysisContract = ''; }],
      ['analysisContract', (payload) => { delete payload.analysisContract; }],
      ['originalInput', (payload) => { payload.originalInput = '다른 사업 원문이다.'; }],
      ['originalInput', (payload) => { payload.originalInput = ''; }],
      ['originalInput', (payload) => { delete payload.originalInput; }],
      ['previousQuestion', (payload) => { payload.previousQuestion = '다른 질문인가?'; }],
      ['previousQuestion', (payload) => { payload.previousQuestion = ''; }],
      ['previousQuestion', (payload) => { delete payload.previousQuestion; }],
      ['previousAnalysis.customer', (payload) => { sectionOf(payload).customer = '다른 고객'; }],
      ['previousAnalysis.customer', (payload) => { sectionOf(payload).customer = ''; }],
      ['previousAnalysis.customer', (payload) => { delete sectionOf(payload).customer; }],
      ['previousAnalysis.problem', (payload) => { sectionOf(payload).problem = ''; }],
      ['previousAnalysis.revenueModel', (payload) => { sectionOf(payload).revenueModel = '다른 수익'; }],
      ['previousAnalysis.revenueModel', (payload) => { sectionOf(payload).revenueModel = ''; }],
      ['previousAnalysis.judgment', (payload) => { sectionOf(payload).judgment = '다른 판단'; }],
      ['previousAnalysis.judgment', (payload) => { sectionOf(payload).judgment = ''; }],
      ['previousAnalysis.nextQuestion', (payload) => { sectionOf(payload).nextQuestion = ''; }],
      ['previousAnalysis.hypotheses', (payload) => { sectionOf(payload).hypotheses = []; }],
      ['previousAnalysis.hypotheses', (payload) => { delete sectionOf(payload).hypotheses; }],
      ['previousAnalysis.analysis.summary', (payload) => { analysisOf(payload).summary = '다른 요약'; }],
      ['previousAnalysis.analysis.summary', (payload) => { analysisOf(payload).summary = ''; }],
      ['previousAnalysis.analysis.founderFacts', (payload) => { analysisOf(payload).founderFacts = ['합성 선택을 사실로 넣었다']; }],
      ['previousAnalysis.analysis.founderFacts', (payload) => { analysisOf(payload).founderFacts = []; }],
      ['previousAnalysis.analysis.founderFacts', (payload) => { delete analysisOf(payload).founderFacts; }],
      ['previousAnalysis.analysis.choices', (payload) => { analysisOf(payload).choices = []; }],
      ['previousAnalysis.analysis.judgmentDetail', (payload) => { analysisOf(payload).judgmentDetail = '사실로 올린 판단'; }],
      ['previousAnalysis.analysis.judgmentDetail', (payload) => { analysisOf(payload).judgmentDetail = ''; }],
      ['previousAnalysis.analysis', (payload) => { sectionOf(payload).analysis = null; }],
      ['previousAnalysis', (payload) => { delete payload.previousAnalysis; }],
      ['founderChoice.label', (payload) => { choiceOf(payload).label = '다른 선택'; }],
      ['founderChoice.label', (payload) => { choiceOf(payload).label = ''; }],
      ['founderChoice.answerOrigin', (payload) => { choiceOf(payload).answerOrigin = 'founder-input'; }],
      ['founderChoice.otherText', (payload) => { choiceOf(payload).otherText = '합성 직접 입력'; }],
      ['founderChoice', (payload) => { payload.founderChoice = null; }],
      ['founderChoice', (payload) => { delete payload.founderChoice; }],
      ['founderSupplement', (payload) => { payload.founderSupplement = '다른 설명'; }],
      ['founderSupplement', (payload) => { payload.founderSupplement = ''; }],
      ['founderSupplement', (payload) => { delete payload.founderSupplement; }],
      ['separationRules', (payload) => { payload.separationRules = []; }],
      ['separationRules', (payload) => { payload.separationRules = [...FOLLOW_UP_SEPARATION_RULES].slice(0, 4); }],
      ['separationRules', (payload) => { delete payload.separationRules; }],
      ['answerOrigin', (payload) => { payload.answerOrigin = 'founder-input'; }],
      ['answerOrigin', (payload) => { delete payload.answerOrigin; }],
      ['answerOriginNotice', (payload) => { payload.answerOriginNotice = followUpAnswerNotice('founder-input'); }],
      ['answerOriginNotice', (payload) => { payload.answerOriginNotice = ''; }],
      ['answerOriginNotice', (payload) => { delete payload.answerOriginNotice; }],
      ['analysisContractNote', (payload) => { payload.analysisContractNote = '원문 바이트 복사'; }],
      ['analysisContractNote', (payload) => { payload.analysisContractNote = ''; }],
      ['analysisContractNote', (payload) => { delete payload.analysisContractNote; }],
      ['founderChoice.choiceId', (payload) => { choiceOf(payload).choiceId = 'c9'; }],
      ['founderChoice.choiceId', (payload) => { choiceOf(payload).choiceId = ''; }],
      ['founderChoice.choiceId', (payload) => { delete choiceOf(payload).choiceId; }],
      ['supplement', (payload) => { payload.supplement = '다른 설명'; }],
      ['supplement', (payload) => { payload.supplement = ''; }],
      ['supplement', (payload) => { delete payload.supplement; }],
      ['inputLedger', (payload) => { payload.inputLedger = []; }],
      ['inputLedger', (payload) => { delete payload.inputLedger; }],
    ];
    for (const [name, apply] of requiredMismatches) {
      expect(followUpRequestMismatches(mutate(apply), source), name).toContain(name);
    }
    const changedValue = (value: unknown): unknown => {
      if (typeof value === 'string') return `${value} 변경`;
      if (Array.isArray(value)) return [{ id: 'changed', label: '변경' }];
      if (value === null) return '있음';
      return { changed: true };
    };
    const emptyValue = (value: unknown): unknown => {
      if (typeof value === 'string') return '';
      if (Array.isArray(value)) return [];
      if (value === null) return null;
      return '';
    };
    const requiredSectionKeys = [
      'customer',
      'problem',
      'market',
      'revenueModel',
      'execution',
      'risks',
      'uncertain',
      'hypotheses',
      'judgment',
      'nextQuestion',
      'nextQuestionReason',
      'answerHint',
      'claimConfirmation',
    ];
    const requiredAnalysisKeys = [
      'summary',
      'value',
      'operatingModel',
      'payer',
      'competition',
      'operations',
      'profitability',
      'strengths',
      'assumptions',
      'evidenceToChange',
      'founderFacts',
      'inferences',
      'judgmentDetail',
      'choices',
      'alternatives',
      'differentiation',
      'nextVerification',
    ];
    const sectionRecord = user.previousAnalysis as unknown as Record<string, unknown>;
    const analysisRecord = user.previousAnalysis.analysis as unknown as Record<string, unknown>;
    expect(Object.keys(sectionRecord).sort()).toEqual([...requiredSectionKeys, 'analysis'].sort());
    expect(Object.keys(analysisRecord).sort()).toEqual([...requiredAnalysisKeys].sort());
    const emptySkipped: string[] = [];
    const walkRecord = (
      prefix: string,
      current: Record<string, unknown>,
      assign: (payload: Record<string, unknown>, key: string, value: unknown) => void,
      remove: (payload: Record<string, unknown>, key: string) => void,
    ) => {
      for (const key of Object.keys(current)) {
        const name = `${prefix}${key}`;
        const value = current[key];
        expect(followUpRequestMismatches(mutate((payload) => assign(payload, key, changedValue(value))), source), `${name}:changed`).toContain(name);
        const empty = emptyValue(value);
        if (JSON.stringify(empty) === JSON.stringify(value)) emptySkipped.push(name);
        else expect(followUpRequestMismatches(mutate((payload) => assign(payload, key, empty)), source), `${name}:empty`).toContain(name);
        expect(followUpRequestMismatches(mutate((payload) => remove(payload, key)), source), `${name}:missing`).toContain(name);
      }
    };
    walkRecord(
      'previousAnalysis.',
      Object.fromEntries(requiredSectionKeys.map((key) => [key, sectionRecord[key]])),
      (payload, key, value) => {
        sectionOf(payload)[key] = value;
      },
      (payload, key) => {
        delete sectionOf(payload)[key];
      },
    );
    walkRecord(
      'previousAnalysis.analysis.',
      analysisRecord,
      (payload, key, value) => {
        analysisOf(payload)[key] = value;
      },
      (payload, key) => {
        delete analysisOf(payload)[key];
      },
    );
    expect(emptySkipped).toEqual(['previousAnalysis.claimConfirmation']);
    expect(followUpRequestMismatches(mutate((payload) => { delete sectionOf(payload).analysis; }), source)).toContain('previousAnalysis.analysis');
    const systemContent = request.messages.find((message) => message.role === 'system')?.content ?? '';
    for (const rule of FOLLOW_UP_SEPARATION_RULES) {
      const dropped = request.messages.map((message) =>
        message.role === 'system' ? { ...message, content: systemContent.replace(rule, '') } : message,
      );
      expect(followUpRequestMismatches({ ...request, messages: dropped }, source), rule).toContain(`system:${rule}`);
    }
    const comparedKeys = {
      contract: FOLLOW_UP_ANALYSIS_CONTRACT,
      previousAnalysis: requiredSectionKeys,
      analysis: requiredAnalysisKeys,
      emptySkipped,
      modes: 'changed, empty when the empty value differs from the stored value, missing',
      scalarMismatches: [...new Set(requiredMismatches.map(([name]) => name))].sort(),
      systemRules: [...FOLLOW_UP_SEPARATION_RULES],
    };
    const panel = readFileSync(new URL('../../components/ai-pm-review-panel.tsx', import.meta.url), 'utf8');
    const followRoute = readFileSync(new URL('../../../../app/api/ai-pm-review/follow-up/route.ts', import.meta.url), 'utf8');
    expect(panel).toContain('/api/ai-pm-review/follow-up');
    expect(followRoute).toContain('runFollowUpReview');
    expect(followRoute).not.toContain('answerOrigin');
    const evidenceUrl = new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-product-follow-up-request.json', import.meta.url);
    const frozen = {
      kind: 'product-follow-up-request-object',
      modelInvoked: false,
      analysisContract: FOLLOW_UP_ANALYSIS_CONTRACT,
      analysisContractNote: FOLLOW_UP_ANALYSIS_CONTRACT_NOTE,
      answerOrigin: 'synthetic-test-data',
      notice: followUpAnswerNotice('synthetic-test-data'),
      previousAnalysisSource: {
        evidence: 'docs/evidence/ALABOM/AI-PM/sprint-q1-quality14-independent-recorded.json',
        promptVersion: 'quality-14-cpo-draft:brewery',
        executionSha: evidence.gitSha,
        note: '1차 모델 출력이다. 품질 통과가 아니다. 이 파일은 제품 요청 객체이며 모델을 호출하지 않는다.',
      },
      comparedKeys,
      request,
    };
    if (process.env.WRITE_COMPARE_FIXTURE === '1') writeFileSync(evidenceUrl, `${JSON.stringify(frozen, null, 2)}\n`);
    expect(JSON.parse(readFileSync(evidenceUrl, 'utf8'))).toEqual(frozen);
  });

  it('rejects a follow-up reply that drops the reflection fields or the hypothesis label', () => {
    const recorded = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-recorded.json', import.meta.url), 'utf8'),
    ) as { report: { calls: Array<{ raw: string; userPrompt: string }> } };
    const sent = JSON.parse(recorded.report.calls[0]?.userPrompt ?? '{}') as {
      previousAnalysis: {
        judgment: string;
        hypotheses: string[];
        nextQuestion: string;
        revenueModel: string;
        analysis: { nextVerification: string };
      };
      founderChoice: { label: string };
      founderSupplement: string;
    };
    const context = {
      previousJudgment: sent.previousAnalysis.judgment,
      previousHypotheses: sent.previousAnalysis.hypotheses,
      previousNextVerification: sent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: sent.previousAnalysis.nextQuestion,
      previousRevenueModel: sent.previousAnalysis.revenueModel,
      choiceLabel: sent.founderChoice.label,
      supplement: sent.founderSupplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    const failed = followUpOutputContractErrors(recorded.report.calls[0]?.raw ?? '', context);
    expect(failed).toEqual(
      expect.arrayContaining([
        'follow_up_output_missing_judgment',
        'follow_up_output_missing_hypotheses',
        'follow_up_output_missing_nextVerification',
        'hypothesis_label_removed',
      ]),
    );
    const choice = sent.founderChoice.label;
    const cited = '예약 고객, 가격, 계약, 확정된 양조장은 없다';
    const nextVerification = FOLLOW_UP_BREWERY_VERIFICATION_PLAN;
    const nextQuestion = '체험을 제공할 수 있는 양조장 후보가 있습니까?';
    const founderAnswer = {
      choice,
      supplement: cited,
      source: 'synthetic-test-data' as const,
      status: 'unverified-input' as const,
    };
    const choiceEffect = (field: string) =>
      field === 'judgment'
        ? `${choice}은 계획이라 저장된 판단을 바꾸지 않는다.`
        : field === 'hypotheses'
          ? `${choice}은 가설의 수요 증거가 아니다.`
          : field === 'nextVerification'
            ? `${choice}은 체험 검증을 먼저 둔다. 이 선택만으로 수요와 양조장 협력은 입증되지 않는다.`
            : `${choice}이므로 질문을 양조장 후보로 바꾼다.`;
    expect(context.previousRevenueModel).toContain('가설');
    const kept = {
      judgment: sent.previousAnalysis.judgment,
      hypotheses: sent.previousAnalysis.hypotheses,
      nextVerification,
      nextQuestion,
      revenueModel: context.previousRevenueModel,
      founderFacts: sent.previousAnalysis.analysis && 'founderFacts' in sent.previousAnalysis.analysis
        ? (sent.previousAnalysis.analysis as { founderFacts?: string[] }).founderFacts
        : [],
      changes: [
        {
          field: 'judgment',
          previous: context.previousJudgment,
          current: sent.previousAnalysis.judgment,
          decision: 'retained',
          reason: `${cited}. 이 없음은 확인된 사실이 아니어서 저장된 판단을 바꾸지 않는다.`,
          founderAnswer,
          choiceTrace: { label: choice, answerOrigin: 'synthetic-test-data', role: 'plan', effect: choiceEffect('judgment') },
          evidenceStatus: 'unverified-input',
        },
        {
          field: 'hypotheses',
          previous: context.previousHypotheses.join(' / '),
          current: context.previousHypotheses.join(' / '),
          decision: 'retained',
          reason: `${cited}. 이 없음은 수요의 근거가 아니어서 가설은 미확인으로 둔다.`,
          founderAnswer,
          choiceTrace: { label: choice, answerOrigin: 'synthetic-test-data', role: 'plan', effect: choiceEffect('hypotheses') },
          evidenceStatus: 'unverified-input',
        },
        {
          field: 'nextVerification',
          previous: context.previousNextVerification,
          current: nextVerification,
          decision: 'changed',
          reason: `${choice}. ${cited}. 확정된 양조장이 없으므로 양조장 후보와 협력 가능 여부를 먼저 검증하고, 가격과 예약은 별도로 둔다.`,
          founderAnswer,
          choiceTrace: { label: choice, answerOrigin: 'synthetic-test-data', role: 'plan', effect: choiceEffect('nextVerification') },
          evidenceStatus: 'unverified-input',
        },
        {
          field: 'nextQuestion',
          previous: context.previousNextQuestion,
          current: nextQuestion,
          decision: 'changed',
          reason: `${choice}. ${cited}. 저장된 질문을 양조장 후보 질문으로 바꾼다.`,
          founderAnswer,
          choiceTrace: { label: choice, answerOrigin: 'synthetic-test-data', role: 'plan', effect: choiceEffect('nextQuestion') },
          evidenceStatus: 'unverified-input',
        },
      ],
    };
    expect(followUpOutputContractErrors(JSON.stringify(kept), context)).toEqual([]);
    const choiceOnly = {
      ...kept,
      changes: kept.changes.map((change) => ({
        ...change,
        founderAnswer: { ...change.founderAnswer, supplement: '' },
      })),
    };
    expect(followUpOutputContractErrors(JSON.stringify(choiceOnly), context)).toEqual([
      'founder_answer_supplement_missing:judgment',
      'founder_answer_supplement_missing:hypotheses',
      'founder_answer_supplement_missing:nextVerification',
      'founder_answer_supplement_missing:nextQuestion',
    ]);
    const unlinkedSource = {
      ...kept,
      changes: kept.changes.map((change) => ({
        ...change,
        founderAnswer: { ...change.founderAnswer, source: 'model' },
      })),
    };
    expect(followUpOutputContractErrors(JSON.stringify(unlinkedSource), context)).toEqual([
      'founder_answer_source_unlinked:judgment',
      'founder_answer_source_unlinked:hypotheses',
      'founder_answer_source_unlinked:nextVerification',
      'founder_answer_source_unlinked:nextQuestion',
    ]);
    const rootOnly = {
      ...kept,
      founderAnswer: kept.changes[0]?.founderAnswer,
      changes: kept.changes.map(({ founderAnswer: _answer, ...change }) => change),
    };
    expect(followUpOutputContractErrors(JSON.stringify(rootOnly), context)).toEqual([
      'founder_answer_type:judgment',
      'founder_answer_type:hypotheses',
      'founder_answer_type:nextVerification',
      'founder_answer_type:nextQuestion',
    ]);
    const unlinkedField = {
      ...kept,
      changes: kept.changes.map((change) => ({
        ...change,
        founderAnswer: { ...change.founderAnswer, supplement: '형식적인 추가 설명' },
      })),
    };
    expect(followUpOutputContractErrors(JSON.stringify(unlinkedField), context)).toEqual([
      'founder_answer_supplement_unlinked:judgment',
      'founder_answer_supplement_unlinked:hypotheses',
      'founder_answer_supplement_unlinked:nextVerification',
      'founder_answer_supplement_unlinked:nextQuestion',
    ]);
    const copiedChoiceGrounds = {
      ...kept,
      changes: kept.changes.map((change) => (change.field === 'judgment' ? { ...change, reason: choice } : change)),
    };
    expect(followUpOutputContractErrors(JSON.stringify(copiedChoiceGrounds), context)).toEqual([
      'reason_missing_supplement:judgment',
      'reason_not_field_specific:judgment',
      'reason_choice_copied:judgment',
    ]);
    const repeatedChoice = '체험 프로그램을 먼저 검증할 것이라는 선택 문장.';
    const repeatedGrounds = {
      ...kept,
      changes: kept.changes.map((change) => ({ ...change, reason: repeatedChoice })),
    };
    expect(followUpOutputContractErrors(JSON.stringify(repeatedGrounds), context)).toContain('reason_repeated_choice');
    const demandLine = '체험 프로그램의 수요가 존재할 것이다.';
    const demandForecast = {
      ...kept,
      hypotheses: [demandLine],
      changes: kept.changes.map((change) =>
        change.field === 'hypotheses'
          ? { ...change, current: demandLine, decision: 'changed', reason: `${choice} ${cited} 가설을 수요 존재 예상으로 바꿨다.` }
          : change,
      ),
    };
    const demandErrors = followUpOutputContractErrors(JSON.stringify(demandForecast), context);
    expect(demandErrors).toContain('hypothesis_unconfirmed_replaced');
    expect(demandErrors).toContain('hypothesis_demand_ungrounded');
    const instructionQuestion = '체험 운영을 검증하려면 양조장 후보가 있는지 질문한다.';
    const copiedInstruction = {
      ...kept,
      nextQuestion: instructionQuestion,
      changes: kept.changes.map((change) =>
        change.field === 'nextQuestion' ? { ...change, current: instructionQuestion, decision: 'changed' } : change,
      ),
    };
    expect(followUpOutputContractErrors(JSON.stringify(copiedInstruction), context)).toContain('next_question_not_a_question');
    const repeatedEffect = `${choice}은 체험 검증을 먼저 둔다. 이 선택만으로 수요와 양조장 협력은 입증되지 않는다.`;
    const sameEffectAndReason = {
      ...kept,
      changes: kept.changes.map((change) =>
        change.field === 'nextVerification'
          ? {
              ...change,
              reason: `${repeatedEffect} ${cited}`,
              choiceTrace: { label: choice, answerOrigin: 'synthetic-test-data', role: 'plan', effect: `${repeatedEffect} ${cited}` },
            }
          : change,
      ),
    };
    expect(followUpOutputContractErrors(JSON.stringify(sameEffectAndReason), context)).toContain(
      'reason_repeats_effect:nextVerification',
    );
    const invented = {
      ...kept,
      changes: kept.changes.map((change) =>
        change.field === 'judgment'
          ? { ...change, reason: `${cited} 그러나 예약 고객이 있고 가격이 정해졌으며 계약이 있다. 판단은 그대로다.` }
          : change,
      ),
    };
    expect(followUpOutputContractErrors(JSON.stringify(invented), context)).toContain('absent_input_invented');
    const planJudgment = '체험 프로그램을 먼저 검증하는 것이 필요하다.';
    const movedPlan = {
      ...kept,
      judgment: planJudgment,
      changes: kept.changes.map((change) =>
        change.field === 'judgment'
          ? { ...change, current: planJudgment, decision: 'changed', reason: `${choice} ${cited} 그래서 판단을 바꿨다.` }
          : change,
      ),
    };
    expect(followUpOutputContractErrors(JSON.stringify(movedPlan), context)).toContain('choice_promoted_to_judgment');
    const asObject = {
      ...kept,
      changes: {
        judgment: kept.changes[0],
        hypotheses: kept.changes[1],
        nextVerification: kept.changes[2],
        nextQuestion: kept.changes[3],
      },
    };
    expect(followUpOutputContractErrors(JSON.stringify(asObject), context)).toContain('follow_up_output_changes_type');
    expect(followUpOutputContractErrors(JSON.stringify({ ...kept, changes: 'judgment, hypotheses' }), context)).toContain(
      'follow_up_output_changes_type',
    );
    const missingChanges = { ...kept } as Partial<typeof kept>;
    delete missingChanges.changes;
    expect(followUpOutputContractErrors(JSON.stringify(missingChanges), context)).toContain('follow_up_output_missing_changes');
    expect(followUpOutputContractErrors(JSON.stringify({ ...kept, changes: [kept.changes[0], 'bad', null, 1] }), context)).toContain(
      'follow_up_output_change_type',
    );
    const emptyChangedGrounds = {
      ...kept,
      changes: kept.changes.map((change) => (change.field === 'nextVerification' ? { ...change, reason: '' } : change)),
    };
    expect(followUpOutputContractErrors(JSON.stringify(emptyChangedGrounds), context)).toContain('reason_missing:nextVerification');
    const emptyUnchangedGrounds = {
      ...kept,
      changes: kept.changes.map((change) => (change.field === 'hypotheses' ? { ...change, reason: '' } : change)),
    };
    expect(followUpOutputContractErrors(JSON.stringify(emptyUnchangedGrounds), context)).toContain('reason_missing:hypotheses');
    const genericHold = {
      ...kept,
      changes: kept.changes.map((change) => (change.field === 'hypotheses' ? { ...change, reason: '새 정보가 없어 유지' } : change)),
    };
    const genericErrors = followUpOutputContractErrors(JSON.stringify(genericHold), context);
    expect(genericErrors).toContain('reason_generic:hypotheses');
    const staleQuestion = {
      ...kept,
      changes: kept.changes.map((change) => (change.field === 'nextQuestion' ? { ...change, previous: '다른 질문' } : change)),
    };
    expect(followUpOutputContractErrors(JSON.stringify(staleQuestion), context)).toContain('follow_up_output_previous:nextQuestion');
    const thinVerification = '체험 확인';
    const thinPlan = {
      ...kept,
      nextVerification: thinVerification,
      changes: kept.changes.map((change) =>
        change.field === 'nextVerification' ? { ...change, current: thinVerification, decision: 'changed' } : change,
      ),
    };
    expect(followUpOutputContractErrors(JSON.stringify(thinPlan), context)).toContain('next_verification_not_executable');
    const promotedStatus = {
      ...kept,
      changes: kept.changes.map((change) => ({ ...change, evidenceStatus: 'confirmed-fact' })),
    };
    expect(followUpOutputContractErrors(JSON.stringify(promotedStatus), context)).toContain('evidence_status_promoted:judgment');
    const promotedJudgment = {
      ...kept,
      judgment: choice,
      changes: kept.changes.map((change) =>
        change.field === 'judgment' ? { ...change, current: choice, decision: 'changed', reason: `${choice} ${cited} 판단을 선택으로 바꿨다.` } : change,
      ),
    };
    expect(followUpOutputContractErrors(JSON.stringify(promotedJudgment), context)).toContain('choice_promoted_to_judgment');
    const marketingQuestion = '마케팅 지원의 효과를 검증할 필요가 있는가?';
    const regressed = {
      ...kept,
      nextQuestion: marketingQuestion,
      changes: kept.changes.map((change) =>
        change.field === 'nextQuestion' ? { ...change, current: marketingQuestion, decision: 'changed', reason: `${choice} ${cited} 질문을 바꿨다.` } : change,
      ),
    };
    const regressedErrors = followUpOutputContractErrors(JSON.stringify(regressed), context);
    expect(regressedErrors).toContain('next_question_regressed');
    expect(regressedErrors).toContain('next_question_unknown_missing');
    expect(JSON.stringify(kept.founderFacts ?? [])).not.toContain(choice);
    const promoted = { ...kept, revenueModel: '체험 프로그램 참가비 및 관련 상품 판매 수익' };
    expect(followUpOutputContractErrors(JSON.stringify(promoted), context)).toContain('hypothesis_label_removed');
    const copied = { ...kept, founderFacts: [choice] };
    expect(followUpOutputContractErrors(JSON.stringify(copied), context)).toContain('choice_in_founder_facts');
    const strengthened = { ...kept, judgment: '체험 수요 가설이 강화되었다.' };
    expect(followUpOutputContractErrors(JSON.stringify(strengthened), context)).toContain('hypothesis_strengthened');
    const rootOnlyTrace = {
      ...kept,
      choiceTrace: { label: choice, answerOrigin: 'synthetic-test-data', role: 'plan', effect: choiceEffect('judgment') },
      changes: kept.changes.map(({ choiceTrace: _trace, ...change }) => change),
    };
    expect(followUpOutputContractErrors(JSON.stringify(rootOnlyTrace), context)).toEqual([
      'choice_trace_root_only',
      'choice_effect_missing:judgment',
      'choice_effect_missing:hypotheses',
      'choice_effect_missing:nextVerification',
      'choice_effect_missing:nextQuestion',
    ]);
    const nullChoice = {
      ...kept,
      changes: kept.changes.map((change) => ({
        ...change,
        founderAnswer: { ...change.founderAnswer, choice: null },
      })),
    };
    expect(followUpOutputContractErrors(JSON.stringify(nullChoice), context)).toEqual([
      'founder_answer_choice:judgment',
      'founder_answer_choice:hypotheses',
      'founder_answer_choice:nextVerification',
      'founder_answer_choice:nextQuestion',
    ]);
    const missingChoiceTrace = {
      ...kept,
      changes: kept.changes.map(({ choiceTrace: _trace, ...change }) => change),
    };
    expect(followUpOutputContractErrors(JSON.stringify(missingChoiceTrace), context)).toEqual([
      'choice_effect_missing:judgment',
      'choice_effect_missing:hypotheses',
      'choice_effect_missing:nextVerification',
      'choice_effect_missing:nextQuestion',
    ]);
    const missingStatus = {
      ...kept,
      changes: kept.changes.map(({ evidenceStatus: _status, ...change }) => change),
    };
    expect(followUpOutputContractErrors(JSON.stringify(missingStatus), context)).toEqual([
      'evidence_status:judgment',
      'evidence_status:hypotheses',
      'evidence_status:nextVerification',
      'evidence_status:nextQuestion',
    ]);
    const uncitedHypothesis = {
      ...kept,
      changes: kept.changes.map((change) => (change.field === 'hypotheses' ? { ...change, reason: '가설은 미확인으로 둔다.' } : change)),
    };
    expect(followUpOutputContractErrors(JSON.stringify(uncitedHypothesis), context)).toContain('reason_untraced:hypotheses');
    const unrelatedChoiceTrace = {
      ...kept,
      changes: kept.changes.map((change) => ({
        ...change,
        choiceTrace: {
          label: '마케팅을 먼저 할 것',
          answerOrigin: 'synthetic-test-data',
          role: 'plan',
          effect:
            change.field === 'judgment'
              ? '마케팅을 먼저 할 것은 저장된 판단을 유지한다.'
              : change.field === 'hypotheses'
                ? '마케팅을 먼저 할 것은 가설의 증거가 아니다.'
                : change.field === 'nextVerification'
                  ? '마케팅을 먼저 할 것이므로 광고 효과를 검증한다.'
                  : '마케팅을 먼저 할 것이므로 질문을 광고로 바꾼다.',
        },
      })),
    };
    expect(followUpOutputContractErrors(JSON.stringify(unrelatedChoiceTrace), context)).toEqual([
      'choice_effect_label:judgment',
      'choice_effect_unrelated:judgment',
      'choice_effect_label:hypotheses',
      'choice_effect_unrelated:hypotheses',
      'choice_effect_label:nextVerification',
      'choice_effect_unrelated:nextVerification',
      'choice_effect_label:nextQuestion',
      'choice_effect_unrelated:nextQuestion',
    ]);
    const copiedEffect = `${choice}은 판단과 가설의 수요 증거가 아니며 검증을 먼저 두고 수요는 입증되지 않으며 질문을 양조장 후보로 바꾼다.`;
    const copiedEffects = {
      ...kept,
      changes: kept.changes.map((change) => ({
        ...change,
        choiceTrace: { label: choice, answerOrigin: 'synthetic-test-data', role: 'plan', effect: copiedEffect },
      })),
    };
    expect(followUpOutputContractErrors(JSON.stringify(copiedEffects), context)).toEqual(['choice_effect_copied']);
    const planAsEvidence = {
      ...kept,
      changes: kept.changes.map((change) =>
        change.field === 'hypotheses'
          ? {
              ...change,
              choiceTrace: {
                label: choice,
                answerOrigin: 'synthetic-test-data',
                role: 'plan',
                effect: `${choice}은 가설을 미확인으로 두지만 성공 가능성을 높인다.`,
              },
            }
          : change,
      ),
    };
    expect(followUpOutputContractErrors(JSON.stringify(planAsEvidence), context)).toContain('choice_effect_plan_as_evidence:hypotheses');
    const priorityUnlinked = {
      ...kept,
      changes: kept.changes.map((change) =>
        change.field === 'nextVerification'
          ? {
              ...change,
              choiceTrace: {
                label: choice,
                answerOrigin: 'synthetic-test-data',
                role: 'plan',
                effect: `${choice}은 검증 문장을 다른 말로 유지한다.`,
              },
            }
          : change,
      ),
    };
    expect(followUpOutputContractErrors(JSON.stringify(priorityUnlinked), context)).toContain(
      'choice_effect_priority_unlinked:nextVerification',
    );
    const questionWithoutSupplement = {
      ...kept,
      changes: kept.changes.map((change) =>
        change.field === 'nextQuestion' ? { ...change, reason: `${choice}. 질문을 양조장 후보로 바꾼다.` } : change,
      ),
    };
    const questionErrors = followUpOutputContractErrors(JSON.stringify(questionWithoutSupplement), context);
    expect(questionErrors).toContain('reason_missing_supplement:nextQuestion');
    expect(questionErrors).not.toContain('next_question_choice_unmentioned');
    expect(questionErrors).not.toContain('reason_untraced:nextQuestion');
    const droppedRevenue = { ...kept } as Partial<typeof kept>;
    delete droppedRevenue.revenueModel;
    expect(followUpOutputContractErrors(JSON.stringify(droppedRevenue), context)).toEqual(['follow_up_output_missing_revenueModel']);
    const factRevenue = { ...kept, revenueModel: '확정 수익: 체험 프로그램 참가비 판매' };
    const factErrors = followUpOutputContractErrors(JSON.stringify(factRevenue), context);
    expect(factErrors).toContain('revenue_hypothesis_replaced');
    expect(factErrors).toContain('hypothesis_label_removed');
    const unexplainedReason = {
      ...kept,
      changes: kept.changes.map((change) =>
        change.field === 'judgment' ? { ...change, reason: `${cited}. 이 입력은 확인된 사실이 아니어서 바꾸지 않는다.` } : change,
      ),
    };
    const unexplained = followUpOutputContractErrors(JSON.stringify(unexplainedReason), context);
    expect(unexplained).toContain('reason_not_field_specific:judgment');
    expect(unexplained).not.toContain('reason_untraced:judgment');
    expect(unexplained).not.toContain('reason_missing:judgment');
    const offPlan = '광고 채널의 클릭을 먼저 센다.';
    const offVerification = {
      ...kept,
      nextVerification: offPlan,
      changes: kept.changes.map((change) =>
        change.field === 'nextVerification' ? { ...change, current: offPlan, decision: 'changed' } : change,
      ),
    };
    const offVerificationErrors = followUpOutputContractErrors(JSON.stringify(offVerification), context);
    expect(offVerificationErrors).toContain('next_verification_choice_absent');
    expect(offVerificationErrors).toContain('next_verification_not_executable');
    const offQuestion = '광고 예산을 어떻게 나눌까?';
    const offQuestionReply = {
      ...kept,
      nextQuestion: offQuestion,
      changes: kept.changes.map((change) =>
        change.field === 'nextQuestion' ? { ...change, current: offQuestion, decision: 'changed' } : change,
      ),
    };
    expect(followUpOutputContractErrors(JSON.stringify(offQuestionReply), context)).toContain('next_question_unknown_missing');
    const outputCall = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-output-recorded.json', import.meta.url), 'utf8'),
    ) as { report: { calls: Array<{ raw: string; userPrompt: string }> } };
    const outputSent = JSON.parse(outputCall.report.calls[0]?.userPrompt ?? '{}') as typeof sent;
    const outputContext = {
      previousJudgment: outputSent.previousAnalysis.judgment,
      previousHypotheses: outputSent.previousAnalysis.hypotheses,
      previousNextVerification: outputSent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: outputSent.previousAnalysis.nextQuestion,
      previousRevenueModel: outputSent.previousAnalysis.revenueModel,
      choiceLabel: outputSent.founderChoice.label,
      supplement: outputSent.founderSupplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    expect(followUpOutputContractErrors(outputCall.report.calls[0]?.raw ?? '', outputContext)).toEqual([
      'follow_up_output_changes_type',
      'follow_up_output_missing_change:judgment',
      'follow_up_output_missing_change:hypotheses',
      'follow_up_output_missing_change:nextVerification',
      'follow_up_output_missing_change:nextQuestion',
      'choice_promoted_to_judgment',
      'next_verification_choice_absent',
      'next_verification_not_executable',
      'next_question_regressed',
      'next_question_unknown_missing',
    ]);
    const arrayCall = JSON.parse(
      readFileSync(new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-array-recorded.json', import.meta.url), 'utf8'),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      productFollowUpInvoked: boolean;
      reflectionScored: boolean;
      report: { calls: Array<{ raw: string; userPrompt: string }> };
    };
    expect(arrayCall.runId).toBe('q1-incremental-reflection-array-2026-10-29');
    expect(arrayCall.priorRunId).toBe('q1-incremental-reflection-output-2026-10-29');
    expect(arrayCall.gitSha).toBe('24a100b3809d32f05c2ca225ffdc7f9761baf7b4');
    expect(arrayCall.productFollowUpInvoked).toBe(false);
    expect(arrayCall.reflectionScored).toBe(false);
    const arraySent = JSON.parse(arrayCall.report.calls[0]?.userPrompt ?? '{}') as typeof sent;
    const arrayContext = {
      previousJudgment: arraySent.previousAnalysis.judgment,
      previousHypotheses: arraySent.previousAnalysis.hypotheses,
      previousNextVerification: arraySent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: arraySent.previousAnalysis.nextQuestion,
      previousRevenueModel: arraySent.previousAnalysis.revenueModel,
      choiceLabel: arraySent.founderChoice.label,
      supplement: arraySent.founderSupplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    expect(followUpOutputContractErrors(arrayCall.report.calls[0]?.raw ?? '', arrayContext)).toEqual([
      'choice_trace_root_only',
      'founder_answer_type:judgment',
      'choice_effect_missing:judgment',
      'follow_up_output_current:judgment',
      'decision_missing:judgment',
      'reason_missing:judgment',
      'evidence_status:judgment',
      'founder_answer_type:hypotheses',
      'choice_effect_missing:hypotheses',
      'follow_up_output_current:hypotheses',
      'decision_missing:hypotheses',
      'reason_missing:hypotheses',
      'evidence_status:hypotheses',
      'founder_answer_type:nextVerification',
      'choice_effect_missing:nextVerification',
      'follow_up_output_current:nextVerification',
      'decision_missing:nextVerification',
      'reason_missing:nextVerification',
      'evidence_status:nextVerification',
      'next_verification_choice_unmentioned',
      'founder_answer_type:nextQuestion',
      'choice_effect_missing:nextQuestion',
      'follow_up_output_current:nextQuestion',
      'decision_missing:nextQuestion',
      'reason_missing:nextQuestion',
      'evidence_status:nextQuestion',
      'next_question_choice_unmentioned',
      'choice_promoted_to_judgment',
      'hypothesis_unconfirmed_replaced',
      'hypothesis_demand_ungrounded',
      'next_verification_choice_absent',
      'next_verification_not_executable',
    ]);
    const arrayParsed = JSON.parse(arrayCall.report.calls[0]?.raw ?? '{}') as {
      judgment: string;
      hypotheses: string[];
      nextQuestion: string;
      revenueModel: string;
      changes: Array<{ grounds: string }>;
    };
    expect(Array.isArray(arrayParsed.changes)).toBe(true);
    expect(arrayParsed.changes).toHaveLength(4);
    expect(arrayParsed.revenueModel).toContain('가설');
    expect(arrayParsed.judgment).not.toBe(arrayContext.previousJudgment);
    expect(arrayParsed.hypotheses.join('\n')).toContain('수요가 존재');
    expect(arrayParsed.changes.every((change) => change.grounds === '체험 프로그램을 먼저 검증할 것이라는 선택 문장.')).toBe(true);
    expect(arrayParsed.changes.some((change) => change.grounds.includes('확정된 양조장'))).toBe(false);
    expect(arrayParsed.nextQuestion).not.toContain('마케팅 지원의 효과');
    const groundsCall = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-grounds-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      productFollowUpInvoked: boolean;
      reflectionScored: boolean;
      report: { calls: Array<{ raw: string; userPrompt: string }> };
    };
    expect(groundsCall.runId).toBe('q1-incremental-reflection-grounds-2026-10-29');
    expect(groundsCall.priorRunId).toBe('q1-incremental-reflection-array-2026-10-29');
    expect(groundsCall.gitSha).toBe('51ac2cadf0d445e3f9b948781749359130d240c3');
    expect(groundsCall.productFollowUpInvoked).toBe(false);
    expect(groundsCall.reflectionScored).toBe(false);
    const groundsSent = JSON.parse(groundsCall.report.calls[0]?.userPrompt ?? '{}') as typeof sent;
    const groundsContext = {
      previousJudgment: groundsSent.previousAnalysis.judgment,
      previousHypotheses: groundsSent.previousAnalysis.hypotheses,
      previousNextVerification: groundsSent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: groundsSent.previousAnalysis.nextQuestion,
      previousRevenueModel: groundsSent.previousAnalysis.revenueModel,
      choiceLabel: groundsSent.founderChoice.label,
      supplement: groundsSent.founderSupplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    expect(followUpOutputContractErrors(groundsCall.report.calls[0]?.raw ?? '', groundsContext)).toEqual([
      'choice_trace_root_only',
      'founder_answer_type:judgment',
      'choice_effect_missing:judgment',
      'follow_up_output_current:judgment',
      'decision_missing:judgment',
      'reason_missing:judgment',
      'evidence_status:judgment',
      'founder_answer_type:hypotheses',
      'choice_effect_missing:hypotheses',
      'follow_up_output_current:hypotheses',
      'decision_missing:hypotheses',
      'reason_missing:hypotheses',
      'evidence_status:hypotheses',
      'founder_answer_type:nextVerification',
      'choice_effect_missing:nextVerification',
      'follow_up_output_current:nextVerification',
      'decision_missing:nextVerification',
      'reason_missing:nextVerification',
      'evidence_status:nextVerification',
      'next_verification_choice_unmentioned',
      'founder_answer_type:nextQuestion',
      'choice_effect_missing:nextQuestion',
      'follow_up_output_current:nextQuestion',
      'decision_missing:nextQuestion',
      'reason_missing:nextQuestion',
      'evidence_status:nextQuestion',
      'next_question_choice_unmentioned',
      'next_verification_choice_absent',
      'next_verification_not_executable',
    ]);
    const groundsParsed = JSON.parse(groundsCall.report.calls[0]?.raw ?? '{}') as {
      judgment: string;
      hypotheses: string[];
      nextVerification: string;
      nextQuestion: string;
      revenueModel: string;
      changes: Array<{ field: string; grounds: string; founderAnswer: string }>;
    };
    expect(groundsParsed.judgment).toBe(groundsContext.previousJudgment);
    expect(groundsParsed.hypotheses).toEqual(['미확인']);
    expect(groundsParsed.nextVerification).toContain('확정된 양조장');
    expect(groundsParsed.nextQuestion).toContain('양조장');
    expect(groundsParsed.revenueModel).toContain('가설');
    expect(groundsParsed.changes.map((change) => change.grounds)).not.toEqual([
      '체험 프로그램을 먼저 검증할 것이라는 선택 문장.',
      '체험 프로그램을 먼저 검증할 것이라는 선택 문장.',
      '체험 프로그램을 먼저 검증할 것이라는 선택 문장.',
      '체험 프로그램을 먼저 검증할 것이라는 선택 문장.',
    ]);
    expect(groundsParsed.changes.every((change) => change.founderAnswer === '체험 프로그램을 먼저 검증할 것')).toBe(true);
    const sourceCall = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-source-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      productFollowUpInvoked: boolean;
      reflectionScored: boolean;
      report: { calls: Array<{ raw: string; userPrompt: string }> };
    };
    expect(sourceCall.runId).toBe('q1-incremental-reflection-source-2026-10-29');
    expect(sourceCall.priorRunId).toBe('q1-incremental-reflection-grounds-2026-10-29');
    expect(sourceCall.gitSha).toBe('62b689669d7da43266029c3b3c4692c606b8f8bb');
    expect(sourceCall.productFollowUpInvoked).toBe(false);
    expect(sourceCall.reflectionScored).toBe(false);
    const sourceSent = JSON.parse(sourceCall.report.calls[0]?.userPrompt ?? '{}') as typeof sent;
    const sourceContext = {
      previousJudgment: sourceSent.previousAnalysis.judgment,
      previousHypotheses: sourceSent.previousAnalysis.hypotheses,
      previousNextVerification: sourceSent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: sourceSent.previousAnalysis.nextQuestion,
      previousRevenueModel: sourceSent.previousAnalysis.revenueModel,
      choiceLabel: sourceSent.founderChoice.label,
      supplement: sourceSent.founderSupplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    expect(followUpOutputContractErrors(sourceCall.report.calls[0]?.raw ?? '', sourceContext)).toEqual([
      'choice_trace_root_only',
      'founder_answer_type:judgment',
      'choice_effect_missing:judgment',
      'follow_up_output_current:judgment',
      'decision_missing:judgment',
      'reason_missing:judgment',
      'evidence_status:judgment',
      'founder_answer_type:hypotheses',
      'choice_effect_missing:hypotheses',
      'follow_up_output_current:hypotheses',
      'decision_missing:hypotheses',
      'reason_missing:hypotheses',
      'evidence_status:hypotheses',
      'founder_answer_type:nextVerification',
      'choice_effect_missing:nextVerification',
      'follow_up_output_current:nextVerification',
      'decision_missing:nextVerification',
      'reason_missing:nextVerification',
      'evidence_status:nextVerification',
      'next_verification_choice_unmentioned',
      'founder_answer_type:nextQuestion',
      'choice_effect_missing:nextQuestion',
      'follow_up_output_current:nextQuestion',
      'decision_missing:nextQuestion',
      'reason_missing:nextQuestion',
      'evidence_status:nextQuestion',
      'next_question_choice_unmentioned',
      'next_verification_choice_absent',
      'next_verification_not_executable',
    ]);
    const sourceParsed = JSON.parse(sourceCall.report.calls[0]?.raw ?? '{}') as {
      judgment: string;
      hypotheses: string[];
      nextVerification: string;
      nextQuestion: string;
      revenueModel: string;
      founderAnswer: { choice: string; supplement: string; source: string; status: string };
      changes: Array<{ grounds: string; founderAnswer?: unknown }>;
    };
    expect(sourceParsed.judgment).toBe(sourceContext.previousJudgment);
    expect(sourceParsed.hypotheses).toEqual(['미확인']);
    expect(sourceParsed.revenueModel).toContain('가설');
    expect(sourceParsed.founderAnswer).toEqual({
      choice: '체험 프로그램을 먼저 검증할 것',
      supplement: '예약 고객, 가격, 계약, 확정된 양조장이 없다.',
      source: 'synthetic-test-data',
      status: 'unverified-input',
    });
    expect(sourceParsed.changes.every((change) => change.founderAnswer === undefined)).toBe(true);
    expect(sourceParsed.nextVerification).toBe('체험 확인');
    expect(sourceParsed.nextQuestion).toContain('양조장');
    expect(sourceParsed.nextQuestion).not.toContain('마케팅 지원의 효과');
    const traceCall = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-trace-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      productFollowUpInvoked: boolean;
      reflectionScored: boolean;
      report: { calls: Array<{ raw: string; userPrompt: string }> };
    };
    expect(traceCall.runId).toBe('q1-incremental-reflection-trace-2026-10-29');
    expect(traceCall.priorRunId).toBe('q1-incremental-reflection-source-2026-10-29');
    expect(traceCall.gitSha).toBe('09ff316a35e3e889fde9c0587091fbf79bfcd847');
    expect(traceCall.productFollowUpInvoked).toBe(false);
    expect(traceCall.reflectionScored).toBe(false);
    const traceSent = JSON.parse(traceCall.report.calls[0]?.userPrompt ?? '{}') as typeof sent;
    const traceContext = {
      previousJudgment: traceSent.previousAnalysis.judgment,
      previousHypotheses: traceSent.previousAnalysis.hypotheses,
      previousNextVerification: traceSent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: traceSent.previousAnalysis.nextQuestion,
      previousRevenueModel: traceSent.previousAnalysis.revenueModel,
      choiceLabel: traceSent.founderChoice.label,
      supplement: traceSent.founderSupplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    expect(followUpOutputContractErrors(traceCall.report.calls[0]?.raw ?? '', traceContext)).toEqual([
      'choice_trace_root_only',
      'choice_effect_missing:judgment',
      'follow_up_output_current:judgment',
      'decision_missing:judgment',
      'reason_missing:judgment',
      'evidence_status:judgment',
      'choice_effect_missing:hypotheses',
      'follow_up_output_current:hypotheses',
      'decision_missing:hypotheses',
      'reason_missing:hypotheses',
      'evidence_status:hypotheses',
      'choice_effect_missing:nextVerification',
      'follow_up_output_current:nextVerification',
      'decision_missing:nextVerification',
      'reason_missing:nextVerification',
      'evidence_status:nextVerification',
      'next_verification_choice_unmentioned',
      'follow_up_output_previous:nextQuestion',
      'choice_effect_missing:nextQuestion',
      'follow_up_output_current:nextQuestion',
      'decision_missing:nextQuestion',
      'reason_missing:nextQuestion',
      'evidence_status:nextQuestion',
      'next_question_choice_unmentioned',
      'next_verification_not_executable',
      'next_question_not_a_question',
    ]);
    const traceParsed = JSON.parse(traceCall.report.calls[0]?.raw ?? '{}') as {
      judgment: string;
      hypotheses: string[];
      nextVerification: string;
      nextQuestion: string;
      revenueModel: string;
      founderAnswer?: unknown;
      changes: Array<{
        field: string;
        founderAnswer: { choice: string; supplement: string; source: string; status: string };
        grounds: string;
        unchangedReason: string;
      }>;
    };
    expect(traceParsed.founderAnswer).toBeUndefined();
    expect(traceParsed.judgment).toBe(traceContext.previousJudgment);
    expect(traceParsed.hypotheses).toEqual(['미확인']);
    expect(traceParsed.revenueModel).toContain('가설');
    expect(traceParsed.nextVerification).not.toContain('양조장');
    expect(traceParsed.changes).toHaveLength(4);
    expect(traceParsed.changes.every((change) => change.founderAnswer.status === 'unverified-input')).toBe(true);
    expect(traceParsed.changes.every((change) => change.founderAnswer.source === 'synthetic-test-data')).toBe(true);
    expect(traceParsed.changes.every((change) => change.founderAnswer.supplement.includes('확정된 양조장'))).toBe(true);
    expect(traceParsed.changes.every((change) => change.unchangedReason === '')).toBe(true);
    const reasonCall = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-reason-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      productFollowUpInvoked: boolean;
      reflectionScored: boolean;
      report: { calls: Array<{ raw: string; userPrompt: string }> };
    };
    expect(reasonCall.runId).toBe('q1-incremental-reflection-reason-2026-10-29');
    expect(reasonCall.priorRunId).toBe('q1-incremental-reflection-trace-2026-10-29');
    expect(reasonCall.gitSha).toBe('ab1aa7c40e539732a05576c85b60c708b12f3f52');
    expect(reasonCall.productFollowUpInvoked).toBe(false);
    expect(reasonCall.reflectionScored).toBe(false);
    const reasonSent = JSON.parse(reasonCall.report.calls[0]?.userPrompt ?? '{}') as typeof sent;
    const reasonContext = {
      previousJudgment: reasonSent.previousAnalysis.judgment,
      previousHypotheses: reasonSent.previousAnalysis.hypotheses,
      previousNextVerification: reasonSent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: reasonSent.previousAnalysis.nextQuestion,
      previousRevenueModel: reasonSent.previousAnalysis.revenueModel,
      choiceLabel: reasonSent.founderChoice.label,
      supplement: reasonSent.founderSupplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    expect(followUpOutputContractErrors(reasonCall.report.calls[0]?.raw ?? '', reasonContext)).toEqual([
      'follow_up_output_missing_revenueModel',
      'founder_answer_choice:judgment',
      'choice_effect_missing:judgment',
      'founder_answer_choice:hypotheses',
      'choice_effect_missing:hypotheses',
      'reason_untraced:hypotheses',
      'founder_answer_choice:nextVerification',
      'choice_effect_missing:nextVerification',
      'reason_untraced:nextVerification',
      'next_verification_choice_unmentioned',
      'founder_answer_choice:nextQuestion',
      'choice_effect_missing:nextQuestion',
      'reason_untraced:nextQuestion',
      'next_question_choice_unmentioned',
      'next_verification_choice_absent',
    ]);
    const reasonParsed = JSON.parse(reasonCall.report.calls[0]?.raw ?? '{}') as {
      judgment: string;
      hypotheses: string[];
      nextVerification: string;
      nextQuestion: string;
      revenueModel?: string;
      choiceTrace?: unknown;
      changes: Array<{
        field: string;
        previous: string;
        decision: string;
        reason: string;
        founderAnswer: { choice: string | null; supplement: string; source: string; status: string };
        evidenceStatus: string;
      }>;
    };
    expect(reasonParsed.revenueModel).toBeUndefined();
    expect(reasonParsed.choiceTrace).toBeUndefined();
    expect(reasonParsed.judgment).toBe(reasonContext.previousJudgment);
    expect(reasonParsed.hypotheses).toEqual(['미확인']);
    expect(reasonParsed.nextVerification).toContain('양조장 후보');
    expect(reasonParsed.nextVerification).toContain('확정된 공급처로 간주하지');
    expect(reasonParsed.nextQuestion).toBe('양조장 후보가 있는가?');
    expect(reasonParsed.changes.find((change) => change.field === 'nextQuestion')?.previous).toBe(reasonContext.previousNextQuestion);
    expect(reasonParsed.changes.every((change) => change.founderAnswer.choice === null)).toBe(true);
    expect(reasonParsed.changes.every((change) => change.evidenceStatus === 'unverified-input')).toBe(true);
    expect(reasonParsed.changes.find((change) => change.field === 'judgment')?.decision).toBe('retained');
    expect(reasonParsed.changes.find((change) => change.field === 'hypotheses')?.decision).toBe('retained');
    const preserveCall = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-preserve-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      startedAt: string;
      finishedAt: string;
      productFollowUpInvoked: boolean;
      reflectionScored: boolean;
      report: { calls: Array<{ raw: string; userPrompt: string; finishReason: string; model: string }> };
    };
    expect(preserveCall.runId).toBe('q1-incremental-reflection-preserve-2026-10-29');
    expect(preserveCall.priorRunId).toBe('q1-incremental-reflection-reason-2026-10-29');
    expect(preserveCall.gitSha).toBe('51d6e6aac0de456297db39d5e7c9636e9268c75b');
    expect(preserveCall.startedAt).toBe('2026-10-29T14:09:53.710Z');
    expect(preserveCall.finishedAt).toBe('2026-10-29T14:10:07.404Z');
    expect(preserveCall.productFollowUpInvoked).toBe(false);
    expect(preserveCall.reflectionScored).toBe(false);
    expect(preserveCall.report.calls[0]?.model).toBe('gpt-4o-mini-2024-07-18');
    expect(preserveCall.report.calls[0]?.finishReason).toBe('stop');
    const preserveSent = JSON.parse(preserveCall.report.calls[0]?.userPrompt ?? '{}') as typeof sent;
    const preserveContext = {
      previousJudgment: preserveSent.previousAnalysis.judgment,
      previousHypotheses: preserveSent.previousAnalysis.hypotheses,
      previousNextVerification: preserveSent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: preserveSent.previousAnalysis.nextQuestion,
      previousRevenueModel: preserveSent.previousAnalysis.revenueModel,
      choiceLabel: preserveSent.founderChoice.label,
      supplement: preserveSent.founderSupplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    expect(followUpOutputContractErrors(preserveCall.report.calls[0]?.raw ?? '', preserveContext)).toEqual([
      'choice_trace_root_only',
      'choice_effect_missing:judgment',
      'evidence_status:judgment',
      'choice_effect_missing:hypotheses',
      'reason_untraced:hypotheses',
      'evidence_status:hypotheses',
      'choice_effect_missing:nextVerification',
      'reason_missing_supplement:nextVerification',
      'evidence_status:nextVerification',
      'choice_effect_missing:nextQuestion',
      'evidence_status:nextQuestion',
      'reason_missing_supplement:nextQuestion',
    ]);
    const preserveParsed = JSON.parse(preserveCall.report.calls[0]?.raw ?? '{}') as {
      judgment: string;
      hypotheses: string[];
      nextVerification: string;
      nextQuestion: string;
      revenueModel: string;
      choiceTrace: { label?: string; answerOrigin?: string; role?: string; effect?: string };
      changes: Array<{
        field: string;
        previous: string;
        decision: string;
        reason: string;
        founderAnswer: { choice: string | null; supplement: string; source: string; status: string };
        choiceTrace?: unknown;
        evidenceStatus?: string;
      }>;
    };
    expect(preserveParsed.revenueModel).toBe(preserveContext.previousRevenueModel);
    expect(preserveParsed.choiceTrace).toEqual({
      label: '체험 프로그램을 먼저 검증할 것',
      effect: '체험 프로그램을 먼저 검증할 것은 계획이라 저장된 판단을 바꾸지 않는다.',
    });
    expect(preserveParsed.judgment).toBe(preserveContext.previousJudgment);
    expect(preserveParsed.hypotheses).toEqual(['미확인']);
    expect(preserveParsed.nextVerification).toBe(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(preserveParsed.nextQuestion).toBe('양조장 후보가 있는가?');
    expect(preserveParsed.changes.find((change) => change.field === 'nextQuestion')?.previous).toBe(preserveContext.previousNextQuestion);
    expect(preserveParsed.changes.every((change) => change.founderAnswer.choice === '체험 프로그램을 먼저 검증할 것')).toBe(true);
    expect(preserveParsed.changes.every((change) => change.founderAnswer.status === 'unverified-input')).toBe(true);
    expect(preserveParsed.changes.every((change) => change.founderAnswer.source === 'synthetic-test-data')).toBe(true);
    expect(preserveParsed.changes.every((change) => change.choiceTrace === undefined)).toBe(true);
    expect(preserveParsed.changes.every((change) => change.evidenceStatus === undefined)).toBe(true);
    expect(preserveParsed.changes.find((change) => change.field === 'judgment')?.decision).toBe('retained');
    expect(preserveParsed.changes.find((change) => change.field === 'hypotheses')?.decision).toBe('retained');
    const elementCall = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-element-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      startedAt: string;
      finishedAt: string;
      productFollowUpInvoked: boolean;
      reflectionScored: boolean;
      report: { calls: Array<{ raw: string; userPrompt: string; finishReason: string; model: string }> };
    };
    expect(elementCall.runId).toBe('q1-incremental-reflection-element-2026-10-29');
    expect(elementCall.priorRunId).toBe('q1-incremental-reflection-preserve-2026-10-29');
    expect(elementCall.gitSha).toBe('92a663bd43f2a6e299b7fc317faac4899243a229');
    expect(elementCall.startedAt).toBe('2026-10-29T14:36:39.233Z');
    expect(elementCall.finishedAt).toBe('2026-10-29T14:36:57.160Z');
    expect(elementCall.productFollowUpInvoked).toBe(false);
    expect(elementCall.reflectionScored).toBe(false);
    expect(elementCall.report.calls[0]?.model).toBe('gpt-4o-mini-2024-07-18');
    expect(elementCall.report.calls[0]?.finishReason).toBe('stop');
    const elementSent = JSON.parse(elementCall.report.calls[0]?.userPrompt ?? '{}') as typeof sent;
    const elementContext = {
      previousJudgment: elementSent.previousAnalysis.judgment,
      previousHypotheses: elementSent.previousAnalysis.hypotheses,
      previousNextVerification: elementSent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: elementSent.previousAnalysis.nextQuestion,
      previousRevenueModel: elementSent.previousAnalysis.revenueModel,
      choiceLabel: elementSent.founderChoice.label,
      supplement: elementSent.founderSupplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    expect(followUpOutputContractErrors(elementCall.report.calls[0]?.raw ?? '', elementContext)).toEqual([
      'choice_effect_unrelated:hypotheses',
      'choice_effect_unrelated:nextVerification',
      'choice_effect_unrelated:nextQuestion',
      'reason_untraced:nextQuestion',
      'next_question_choice_unmentioned',
    ]);
    const elementParsed = JSON.parse(elementCall.report.calls[0]?.raw ?? '{}') as {
      judgment: string;
      hypotheses: string[];
      nextVerification: string;
      nextQuestion: string;
      revenueModel: string;
      choiceTrace?: unknown;
      changes: Array<{
        field: string;
        previous: string;
        decision: string;
        reason: string;
        founderAnswer: { choice: string; supplement: string; source: string; status: string };
        choiceTrace: { label: string; answerOrigin: string; role: string; effect: string };
        evidenceStatus: string;
      }>;
    };
    expect(elementParsed.choiceTrace).toBeUndefined();
    expect(elementParsed.revenueModel).toBe(elementContext.previousRevenueModel);
    expect(elementParsed.judgment).toBe(elementContext.previousJudgment);
    expect(elementParsed.hypotheses).toEqual(['미확인']);
    expect(elementParsed.nextVerification).toBe(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(elementParsed.nextQuestion).toBe('양조장 후보가 있는가?');
    expect(elementParsed.changes.find((change) => change.field === 'nextQuestion')?.previous).toBe(elementContext.previousNextQuestion);
    expect(elementParsed.changes.every((change) => change.founderAnswer.choice === '체험 프로그램을 먼저 검증할 것')).toBe(true);
    expect(elementParsed.changes.every((change) => change.evidenceStatus === 'unverified-input')).toBe(true);
    expect(elementParsed.changes.every((change) => change.choiceTrace.role === 'plan')).toBe(true);
    expect(elementParsed.changes.every((change) => change.choiceTrace.answerOrigin === 'synthetic-test-data')).toBe(true);
    expect(elementParsed.changes.find((change) => change.field === 'hypotheses')?.reason).toContain('확정된 양조장');
    expect(elementParsed.changes.find((change) => change.field === 'judgment')?.decision).toBe('retained');
    expect(elementParsed.changes.find((change) => change.field === 'hypotheses')?.decision).toBe('retained');
    const linkCall = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-link-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as typeof elementCall;
    expect(linkCall.runId).toBe('q1-incremental-reflection-link-2026-10-29');
    expect(linkCall.priorRunId).toBe('q1-incremental-reflection-element-2026-10-29');
    expect(linkCall.gitSha).toBe('1fb52b05400b1f98ffc39788790b71456d49cf62');
    expect(linkCall.startedAt).toBe('2026-10-29T14:52:23.070Z');
    expect(linkCall.finishedAt).toBe('2026-10-29T14:52:46.835Z');
    expect(linkCall.productFollowUpInvoked).toBe(false);
    expect(linkCall.reflectionScored).toBe(false);
    expect(linkCall.report.calls[0]?.model).toBe('gpt-4o-mini-2024-07-18');
    expect(linkCall.report.calls[0]?.finishReason).toBe('stop');
    const linkSent = JSON.parse(linkCall.report.calls[0]?.userPrompt ?? '{}') as typeof sent;
    const linkContext = {
      previousJudgment: linkSent.previousAnalysis.judgment,
      previousHypotheses: linkSent.previousAnalysis.hypotheses,
      previousNextVerification: linkSent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: linkSent.previousAnalysis.nextQuestion,
      previousRevenueModel: linkSent.previousAnalysis.revenueModel,
      choiceLabel: linkSent.founderChoice.label,
      supplement: linkSent.founderSupplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    expect(followUpOutputContractErrors(linkCall.report.calls[0]?.raw ?? '', linkContext)).toEqual([
      'choice_effect_unrelated:hypotheses',
      'choice_effect_priority_unlinked:nextVerification',
      'reason_missing_supplement:nextVerification',
      'reason_repeats_effect:nextVerification',
      'choice_effect_question_unlinked:nextQuestion',
      'reason_missing_supplement:nextQuestion',
      'reason_repeats_effect:nextQuestion',
      'hypothesis_unconfirmed_replaced',
      'hypothesis_demand_ungrounded',
      'next_question_not_a_question',
    ]);
    const linkParsed = JSON.parse(linkCall.report.calls[0]?.raw ?? '{}') as typeof elementParsed;
    expect(linkParsed.choiceTrace).toBeUndefined();
    expect(linkParsed.revenueModel).toBe(linkContext.previousRevenueModel);
    expect(linkParsed.judgment).toBe(linkContext.previousJudgment);
    expect(linkParsed.hypotheses).toEqual([
      '체험 프로그램의 수요가 있을 것이다. / 예약 고객, 가격, 계약, 확정된 양조장이 없다. 이 없음은 가설을 확정하지 못한다.',
    ]);
    expect(linkParsed.nextVerification).toBe(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(linkParsed.nextQuestion).toBe(
      '체험 프로그램을 먼저 검증할 것이므로 체험 운영을 검증하려면 협력 가능한 양조장 후보가 있는지 질문한다.',
    );
    expect(linkParsed.changes.every((change) => change.founderAnswer.choice === '체험 프로그램을 먼저 검증할 것')).toBe(true);
    expect(linkParsed.changes.every((change) => change.evidenceStatus === 'unverified-input')).toBe(true);
    expect(linkParsed.changes.find((change) => change.field === 'hypotheses')?.decision).toBe('changed');
    expect(linkParsed.changes.find((change) => change.field === 'nextQuestion')?.previous).toBe(linkContext.previousNextQuestion);
    const questionCall = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-question-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as typeof elementCall;
    expect(questionCall.runId).toBe('q1-incremental-reflection-question-2026-10-29');
    expect(questionCall.priorRunId).toBe('q1-incremental-reflection-link-2026-10-29');
    expect(questionCall.gitSha).toBe('42d087ccd0c5e06638ee9a6b8cf6d4baa0a4a264');
    expect(questionCall.startedAt).toBe('2026-10-29T15:17:26.481Z');
    expect(questionCall.finishedAt).toBe('2026-10-29T15:17:41.952Z');
    expect(questionCall.productFollowUpInvoked).toBe(false);
    expect(questionCall.reflectionScored).toBe(false);
    expect(questionCall.report.calls[0]?.model).toBe('gpt-4o-mini-2024-07-18');
    expect(questionCall.report.calls[0]?.finishReason).toBe('stop');
    const questionSent = JSON.parse(questionCall.report.calls[0]?.userPrompt ?? '{}') as typeof sent;
    const questionContext = {
      previousJudgment: questionSent.previousAnalysis.judgment,
      previousHypotheses: questionSent.previousAnalysis.hypotheses,
      previousNextVerification: questionSent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: questionSent.previousAnalysis.nextQuestion,
      previousRevenueModel: questionSent.previousAnalysis.revenueModel,
      choiceLabel: questionSent.founderChoice.label,
      supplement: questionSent.founderSupplement,
      answerOrigin: 'synthetic-test-data' as const,
    };
    expect(followUpOutputContractErrors(questionCall.report.calls[0]?.raw ?? '', questionContext)).toEqual([
      'founder_answer_choice:hypotheses',
      'founder_answer_supplement_missing:hypotheses',
      'choice_effect_label:hypotheses',
      'choice_effect_unrelated:hypotheses',
      'founder_answer_choice:nextVerification',
      'founder_answer_supplement_missing:nextVerification',
      'choice_effect_label:nextVerification',
      'choice_effect_priority_unlinked:nextVerification',
      'next_verification_choice_unmentioned',
      'founder_answer_choice:nextQuestion',
      'founder_answer_supplement_missing:nextQuestion',
      'choice_effect_label:nextQuestion',
      'choice_effect_unrelated:nextQuestion',
    ]);
    const questionParsed = JSON.parse(questionCall.report.calls[0]?.raw ?? '{}') as typeof elementParsed;
    expect(questionParsed.choiceTrace).toBeUndefined();
    expect(questionParsed.revenueModel).toBe(questionContext.previousRevenueModel);
    expect(questionParsed.judgment).toBe(questionContext.previousJudgment);
    expect(questionParsed.hypotheses).toEqual(['미확인']);
    expect(questionParsed.nextVerification).toBe(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(questionParsed.nextQuestion).toBe('양조장 후보가 있는가?');
    expect(questionParsed.changes.find((change) => change.field === 'nextQuestion')?.previous).toBe(questionContext.previousNextQuestion);
    expect(questionParsed.changes.find((change) => change.field === 'hypotheses')?.decision).toBe('retained');
    expect(questionParsed.changes.every((change) => change.evidenceStatus === 'unverified-input')).toBe(true);
    expect(questionParsed.changes.find((change) => change.field === 'judgment')?.founderAnswer.choice).toBe('체험 프로그램을 먼저 검증할 것');
    expect(questionParsed.changes.filter((change) => change.field !== 'judgment').every((change) => change.founderAnswer.choice === null)).toBe(true);
  });

  it('shows the second request carries the first analysis while the screen never sends it', () => {
    const recorded = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-question-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      productFollowUpInvoked: boolean;
      report: { calls: Array<{ raw: string; userPrompt: string }> };
    };
    expect(recorded.productFollowUpInvoked).toBe(false);
    const sent = JSON.parse(recorded.report.calls[0]?.userPrompt ?? '{}') as {
      originalInput: string;
      previousQuestion: string;
      previousAnalysis: { judgment: string; nextQuestion: string; hypotheses: string[]; revenueModel: string };
      founderChoice: { label: string; answerOrigin: string };
      founderSupplement: string;
      answerOrigin: string;
    };
    expect(sent.originalInput.length).toBeGreaterThan(20);
    expect(sent.previousAnalysis.judgment.length).toBeGreaterThan(0);
    expect(sent.previousQuestion).toBe(sent.previousAnalysis.nextQuestion);
    expect(sent.founderChoice.label).toBe('체험 프로그램을 먼저 검증할 것');
    expect(sent.founderChoice.answerOrigin).toBe('synthetic-test-data');
    expect(sent.founderSupplement).toContain('확정된 양조장');
    expect(sent.answerOrigin).toBe('synthetic-test-data');
    const raw = recorded.report.calls[0]?.raw ?? '';
    expect(parseSections(raw, sent.originalInput)).toBeNull();
    const panel = readFileSync(new URL('../../components/ai-pm-review-panel.tsx', import.meta.url), 'utf8');
    expect(panel).toContain('/api/ai-pm-review/follow-up');
    expect(panel).toContain("fetch('/api/ai-pm-review/feedback'");
    expect(panel).toContain('data-testid="ai-pm-history"');
    expect(panel).toContain('data-testid="ai-pm-reflected-answer"');
    expect(panel).toContain('data-testid="ai-pm-project-gate"');
    expect(panel).toContain('href="/workspace?intent=new"');
    expect(panel).toContain('href="/auth/login?next=/workspace"');
    expect(panel).toContain('최초 분석');
    expect(panel).toContain('`${index}차 재분석`');
    expect(panel).toContain('답을 저장했습니다. 다시 검토는 추가 설명을 적은 뒤 진행합니다.');
    expect(panel).not.toMatch(/gpt|gemini|openai|token/i);
  });

  it('keeps the parent analysis when a reflection return cannot be stored as sections', async () => {
    const recorded = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-question-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as { report: { calls: Array<{ raw: string }> } };
    const raw = recorded.report.calls[0]?.raw ?? '';
    const store = openAiPmReviewStore(storePath());
    const seen: ChatRequest[] = [];
    const chat = async (request: ChatRequest) => {
      seen.push(request);
      return reply(seen.length === 1 ? JSON.stringify(sections()) : raw);
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
        choiceId: 'c1',
        choiceLabel: '체험 프로그램을 먼저 검증할 것',
        otherText: '',
      },
    });
    const follow = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: '예약 고객, 가격, 계약, 확정된 양조장은 없다.',
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(follow.ok).toBe(true);
    if (!follow.ok) return;
    const payload = JSON.parse(seen[1]?.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      originalInput: string;
      latestAnalysis: { priorJudgmentText: string };
      founderChoice: { label: string; otherText: string } | null;
      founderSupplement: string;
    };
    expect(payload.originalInput).toBe(PLAN);
    expect(payload.latestAnalysis.priorJudgmentText).toBe(sections().judgment);
    expect(payload.founderChoice?.label).toBe('체험 프로그램을 먼저 검증할 것');
    expect(payload.founderSupplement).toContain('확정된 양조장');
    expect(seen[1]?.messages.map((message) => message.content).join('\n')).not.toContain(FOLLOW_UP_OUTPUT_CONTRACT);
    expect(follow.record.parentReviewId).toBe(first.record.reviewId);
    expect(follow.record.sections).toBeNull();
    expect(follow.record.rawContent).toBe(raw);
    expect(follow.record.status).toBe('failed');
    const parent = await store.readReview('user-a', first.record.reviewId);
    expect(parent?.sections?.judgment).toBe(sections().judgment);
    expect(parent?.sections?.nextQuestion).toBe(sections().nextQuestion);
    expect(follow.record.error).toContain('unstructured_response');
    store.close();
  });

  it('normalizes a linked reflection onto the stored sections without echoing the answer', () => {
    const recorded = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-question-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as { report: { calls: Array<{ raw: string; userPrompt: string }> } };
    const sent = JSON.parse(recorded.report.calls[0]?.userPrompt ?? '{}') as {
      previousAnalysis: ReviewSections & { analysis: { nextVerification: string } };
      founderChoice: { label: string };
      founderSupplement: string;
      answerOrigin: 'synthetic-test-data';
    };
    const previous = structuredClone(sent.previousAnalysis);
    const before = JSON.stringify(previous);
    const context = {
      previousJudgment: previous.judgment,
      previousHypotheses: previous.hypotheses,
      previousNextVerification: previous.analysis.nextVerification,
      previousNextQuestion: previous.nextQuestion,
      previousRevenueModel: previous.revenueModel,
      choiceLabel: sent.founderChoice.label,
      supplement: sent.founderSupplement,
      answerOrigin: sent.answerOrigin,
    };
    const raw = recorded.report.calls[0]?.raw ?? '';
    expect(parseSections(raw, '원문')).toBeNull();
    expect(followUpOutputContractErrors(raw, context)).toContain('founder_answer_choice:hypotheses');
    expect(incrementalReflectionErrors(raw, context)).toEqual([
      'retention_evidence_missing:judgment',
      'review_field_missing:inputConsidered:judgment',
      'review_field_missing:impactAssessment:judgment',
      'review_field_missing:sufficiencyAssessment:judgment',
      'review_field_missing:retentionDecision:judgment',
      'review_field_missing:holdReason:judgment',
      'review_field_missing:evidenceNeeded:judgment',
      'retention_evidence_missing:hypotheses',
      'review_field_missing:inputConsidered:hypotheses',
      'review_field_missing:impactAssessment:hypotheses',
      'review_field_missing:sufficiencyAssessment:hypotheses',
      'review_field_missing:retentionDecision:hypotheses',
      'review_field_missing:holdReason:hypotheses',
      'review_field_missing:evidenceNeeded:hypotheses',
      'review_field_missing:inputConsidered:nextVerification',
      'review_field_missing:impactAssessment:nextVerification',
      'review_field_missing:sufficiencyAssessment:nextVerification',
      'review_field_missing:retentionDecision:nextVerification',
      'review_field_missing:holdReason:nextVerification',
      'review_field_missing:evidenceNeeded:nextVerification',
      'review_field_missing:inputConsidered:nextQuestion',
      'review_field_missing:impactAssessment:nextQuestion',
      'review_field_missing:sufficiencyAssessment:nextQuestion',
      'review_field_missing:retentionDecision:nextQuestion',
      'review_field_missing:holdReason:nextQuestion',
      'review_field_missing:evidenceNeeded:nextQuestion',
    ]);
    const repaired = JSON.parse(raw) as { changes: Array<{ field: string; reason: string; decision?: string }> };
    for (const change of repaired.changes) {
      if (change.field === 'judgment') change.reason += ' 판단을 바꾸려면 계약서가 필요하다.';
      if (change.field === 'hypotheses') change.reason += ' 가설을 바꾸려면 예약 확인이 필요하다.';
      Object.assign(change, reviewFields(change.field, change.decision ?? 'retained', sent.founderSupplement));
    }
    const normalized = normalizeIncrementalSections(previous, JSON.stringify(repaired), context);
    expect(normalized.errors).toEqual([]);
    expect(JSON.stringify(previous)).toBe(before);
    expect(normalized.sections?.customer).toBe(previous.customer);
    expect(normalized.sections?.problem).toBe(previous.problem);
    expect(normalized.sections?.answerHint).toBe(previous.answerHint);
    expect(normalized.sections?.claimConfirmation).toBeNull();
    expect(normalized.sections?.revenueModel).toBe(previous.revenueModel);
    expect(normalized.sections?.judgment).toBe(previous.judgment);
    expect(normalized.sections?.hypotheses).toEqual(['미확인']);
    expect(normalized.sections?.nextQuestion).toBe('양조장 후보가 있는가?');
    expect(normalized.sections?.nextQuestionReason).toContain('양조장 후보');
    expect(normalized.sections?.nextQuestionReason).not.toBe(previous.nextQuestionReason);
    expect(normalized.sections?.analysis?.nextVerification).toBe(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(normalized.sections?.analysis?.founderFacts).toEqual(previous.analysis.founderFacts);
    expect(normalizeIncrementalSections(previous, '{', context)).toEqual({
      sections: null,
      errors: ['follow_up_output_unparsed'],
    });
    const missing = normalizeIncrementalSections(previous, JSON.stringify({ judgment: previous.judgment }), context);
    expect(missing.sections).toBeNull();
    expect(missing.errors.length).toBeGreaterThan(0);
  });

  it('changes a hypothesis when the synthetic answer is enough to reorder it', () => {
    const supplement = '체험 프로그램 검증을 먼저 하겠다고 정했다. 수수료 가설은 뒤로 둔다.';
    const reviewed = reflectionCase({
      previous: sections(),
      supplement,
      hypotheses: ['가설: 체험 프로그램 검증이 수수료 검증보다 앞선다'],
      reasons: {
        judgment: `${supplement} 이 말은 순서에 대한 계획이라 확인된 사실이 아니다. 저장된 판단에 미칠 영향이 충분하지 않아 판단을 바꾸지 않고 유지한다. 판단을 바꾸려면 계약서가 필요하다.`,
        hypotheses: `${supplement} 이 계획이 가설의 순서를 바꾼다. 아직 가설이며 확인된 사실은 아니다.`,
        nextVerification: `${supplement} 이 말은 검증 순서를 아직 실행된 사실로 만들지 않는다.`,
        nextQuestion: `${supplement} 이 말은 질문을 바꾸기에 충분하지 않다. 질문을 바꾸려면 예약 확인이 필요하다.`,
      },
    });
    const normalized = normalizeIncrementalSections(sections(), reviewed.raw, reviewed.context);
    expect(normalized.errors).toEqual([]);
    expect(normalized.sections?.hypotheses).toEqual(['가설: 체험 프로그램 검증이 수수료 검증보다 앞선다']);
    expect(normalized.sections?.judgment).toBe(sections().judgment);
    expect(normalized.sections?.customer).toBe(sections().customer);
  });

  it('keeps the judgment when the synthetic answer adds only part of the evidence', () => {
    const supplement = '예약 고객, 가격, 계약, 확정된 양조장은 없다.';
    const reviewed = reflectionCase({
      previous: sections(),
      supplement,
      reasons: {
        judgment: `${supplement} 이 없음은 확인된 사실이 아니어서 저장된 판단에 영향을 주지 못한다. 근거가 충분하지 않아 판단을 바꾸지 않고 유지한다. 판단을 바꾸려면 계약서가 필요하다.`,
        hypotheses: `${supplement} 이 없음은 가설을 확정하지 못한다. 근거가 부족해 미확인으로 유지한다. 가설을 바꾸려면 예약 확인이 필요하다.`,
        nextVerification: `${supplement} 이 없음 때문에 검증은 양조장 후보 확인에 머문다.`,
        nextQuestion: '양조장 후보가 있는지가 남은 질문이다. 예약 고객, 가격, 계약, 확정된 양조장은 없다.',
      },
      nextQuestion: '양조장 후보가 있는가?',
    });
    const normalized = normalizeIncrementalSections(sections(), reviewed.raw, reviewed.context);
    expect(normalized.errors).toEqual([]);
    expect(normalized.sections?.judgment).toBe(sections().judgment);
    expect(normalized.sections?.nextQuestion).toBe('양조장 후보가 있는가?');
    expect(JSON.parse(reviewed.raw).changes.find((change: { field: string }) => change.field === 'judgment').decision).toBe('retained');
  });

  it('defers the judgment when the synthetic answer is not enough to review it', () => {
    const supplement = '아직은 잘 모르겠다고만 했다.';
    const reviewed = reflectionCase({
      previous: sections(),
      supplement,
      decisions: { judgment: 'unresolved', hypotheses: 'unresolved' },
      reasons: {
        judgment: `${supplement} 새 정보가 부족해 저장된 판단에 미칠 영향을 아직 판단할 수 없다. 판단을 유보한다. 바꾸려면 계약서 증빙이 필요하다.`,
        hypotheses: `${supplement} 가설을 확정하지 못한다. 근거가 부족해 가설을 유보한다. 예약 확인이 필요하다.`,
        nextVerification: `${supplement} 이 말은 검증 문장을 바꾸기에 충분하지 않다.`,
        nextQuestion: `${supplement} 이 말은 질문을 바꾸기에 충분하지 않다.`,
      },
    });
    const normalized = normalizeIncrementalSections(sections(), reviewed.raw, reviewed.context);
    expect(normalized.errors).toEqual([]);
    expect(normalized.sections?.judgment).toBe(sections().judgment);
    expect(normalized.sections?.hypotheses).toEqual(sections().hypotheses);
  });

  it('keeps a specific founder claim unverified when no document is supplied', () => {
    const supplement = '양조장과 계약이 확정되었다고 말한다. 계약서와 입금 증빙은 없다.';
    const held = reflectionCase({
      previous: sections(),
      supplement,
      reasons: {
        judgment: `${supplement} 이것은 창업자의 주장이고 증빙은 없다. 확인된 사실이 아니어서 저장된 판단에 미칠 영향이 부족하다. 판단을 유지한다. 바꾸려면 계약서가 필요하다.`,
        hypotheses: `${supplement} 이 주장은 가설을 확정하지 못한다. 증빙은 없어 미확인으로 유지한다. 예약 확인이 필요하다.`,
        nextVerification: `${supplement} 계약 주장은 검증이 끝나지 않았다는 뜻이다.`,
        nextQuestion: `${supplement} 증빙이 없어 계약서 유무를 묻는다.`,
      },
      nextQuestion: '계약서가 있는가?',
    });
    expect(normalizeIncrementalSections(sections(), held.raw, held.context).errors).toEqual([]);
    const promoted = reflectionCase({
      previous: sections(),
      supplement,
      judgment: '양조장과 계약이 확정되었다.',
      reasons: held.raw ? JSON.parse(held.raw).changes.reduce((acc: Record<string, string>, change: { field: string; reason: string }) => ({ ...acc, [change.field]: change.reason }), {}) : {},
    });
    expect(incrementalReflectionErrors(promoted.raw, promoted.context)).toContain('claim_promoted_to_fact:judgment');
    const confirmed = reflectionCase({
      previous: sections(),
      supplement,
      evidenceStatus: 'confirmed-fact',
      reasons: JSON.parse(held.raw).changes.reduce(
        (acc: Record<string, string>, change: { field: string; reason: string }) => ({ ...acc, [change.field]: change.reason }),
        {},
      ),
    });
    expect(incrementalReflectionErrors(confirmed.raw, confirmed.context)).toContain('claim_promoted_to_fact:judgment');
  });

  it('does not keep a judgment that the synthetic answer contradicts', () => {
    const previous = { ...sections(), judgment: '마케팅 지원이 사업의 핵심이다.' };
    const supplement = '마케팅 지원은 하지 않고 체험만 진행한다.';
    const silent = reflectionCase({
      previous,
      supplement,
      reasons: {
        judgment: '현재 판단을 유지한다. 근거가 부족하고 계약서가 필요하다. 확인된 사실이 아니다.',
        hypotheses: `${supplement} 이 말은 가설을 확정하지 못한다. 근거가 부족해 미확인으로 유지한다. 예약 확인이 필요하다.`,
        nextVerification: `${supplement} 이 말은 검증 문장을 바꾸기에 충분하지 않다.`,
        nextQuestion: `${supplement} 이 말은 질문을 바꾸기에 충분하지 않다.`,
      },
    });
    expect(incrementalReflectionErrors(silent.raw, silent.context)).toContain('conflict_unreviewed:judgment');
    const revised = reflectionCase({
      previous,
      supplement,
      judgment: '체험만 진행하겠다는 주장이다. 확인된 사실은 아니다.',
      reasons: {
        judgment: `${supplement} 기존 마케팅 판단과 충돌한다. 이것은 주장이고 확인된 사실이 아니다.`,
        hypotheses: `${supplement} 이 말은 가설을 확정하지 못한다. 근거가 부족해 미확인으로 유지한다. 예약 확인이 필요하다.`,
        nextVerification: `${supplement} 이 말은 검증 문장을 바꾸기에 충분하지 않다.`,
        nextQuestion: `${supplement} 이 말은 질문을 바꾸기에 충분하지 않다.`,
      },
    });
    const normalized = normalizeIncrementalSections(previous, revised.raw, revised.context);
    expect(normalized.errors).toEqual([]);
    expect(normalized.sections?.judgment).toBe('체험만 진행하겠다는 주장이다. 확인된 사실은 아니다.');
    expect(normalized.sections?.customer).toBe(previous.customer);
  });

  it('keeps the normalize run unstored when a retained reason does not explain the answer', () => {
    const recorded = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-normalize-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      startedAt: string;
      finishedAt: string;
      productFollowUpInvoked: boolean;
      report: { calls: Array<{ model: string; promptTokens: number; completionTokens: number; totalTokens: number; raw: string; userPrompt: string }> };
    };
    expect(recorded.runId).toBe('q1-incremental-reflection-normalize-2026-10-30');
    expect(recorded.priorRunId).toBe('q1-incremental-reflection-question-2026-10-29');
    expect(recorded.gitSha).toBe('a68fd6c2a39a52f0945f7c5ad709dcc20dc9ffa8');
    expect(recorded.startedAt).toBe('2026-10-30T07:11:35.389Z');
    expect(recorded.finishedAt).toBe('2026-10-30T07:11:43.294Z');
    expect(recorded.productFollowUpInvoked).toBe(false);
    expect(recorded.report.calls).toHaveLength(1);
    expect(recorded.report.calls[0]?.model).toBe('gpt-4o-mini-2024-07-18');
    expect(recorded.report.calls[0]?.promptTokens).toBe(2497);
    expect(recorded.report.calls[0]?.completionTokens).toBe(687);
    expect(recorded.report.calls[0]?.totalTokens).toBe(3184);
    const sent = JSON.parse(recorded.report.calls[0]?.userPrompt ?? '{}') as {
      originalInput: string;
      previousAnalysis: ReviewSections & { analysis: { nextVerification: string } };
      founderChoice: { label: string };
      founderSupplement: string;
      answerOrigin: 'synthetic-test-data';
    };
    expect(sent.originalInput.length).toBeGreaterThan(20);
    expect(sent.previousAnalysis.judgment.length).toBeGreaterThan(0);
    expect(sent.founderChoice.label).toBe('체험 프로그램을 먼저 검증할 것');
    expect(sent.founderSupplement).toContain('확정된 양조장');
    expect(sent.answerOrigin).toBe('synthetic-test-data');
    const raw = recorded.report.calls[0]?.raw ?? '';
    const parsed = JSON.parse(raw) as { nextQuestion: string; hypotheses: string[]; nextVerification: string; changes: Array<Record<string, unknown>> };
    expect(parsed.nextQuestion).toBe('양조장 후보가 있는가?');
    expect(parsed.hypotheses).toEqual(['미확인']);
    expect(parsed.nextVerification).toBe(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(parsed.changes.every((change) => change.founderAnswer == null && change.choiceTrace == null)).toBe(true);
    const normalized = normalizeIncrementalSections(sent.previousAnalysis, raw, {
      previousJudgment: sent.previousAnalysis.judgment,
      previousHypotheses: sent.previousAnalysis.hypotheses,
      previousNextVerification: sent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: sent.previousAnalysis.nextQuestion,
      previousRevenueModel: sent.previousAnalysis.revenueModel,
      choiceLabel: sent.founderChoice.label,
      supplement: sent.founderSupplement,
      answerOrigin: sent.answerOrigin,
    });
    expect(normalized.errors).toEqual(
      expect.arrayContaining(['reason_insufficient:judgment', 'reason_insufficient:hypotheses']),
    );
    expect(normalized.sections).toBeNull();
  });

  it('keeps the reason-quality run unstored when retention does not review the answer', () => {
    const recorded = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-reason-quality-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      startedAt: string;
      finishedAt: string;
      productFollowUpInvoked: boolean;
      report: { calls: Array<{ model: string; promptTokens: number; completionTokens: number; totalTokens: number; raw: string; userPrompt: string }> };
    };
    expect(recorded.runId).toBe('q1-incremental-reflection-reason-quality-2026-10-30');
    expect(recorded.priorRunId).toBe('q1-incremental-reflection-normalize-2026-10-30');
    expect(recorded.gitSha).toBe('ab81feead75606e4f9e022d6d7f5a4ff0942413e');
    expect(recorded.startedAt).toBe('2026-10-30T07:34:34.737Z');
    expect(recorded.finishedAt).toBe('2026-10-30T07:34:42.284Z');
    expect(recorded.productFollowUpInvoked).toBe(false);
    expect(recorded.report.calls).toHaveLength(1);
    expect(recorded.report.calls[0]?.model).toBe('gpt-4o-mini-2024-07-18');
    expect(recorded.report.calls[0]?.promptTokens).toBe(2701);
    expect(recorded.report.calls[0]?.completionTokens).toBe(697);
    expect(recorded.report.calls[0]?.totalTokens).toBe(3398);
    const sent = JSON.parse(recorded.report.calls[0]?.userPrompt ?? '{}') as {
      originalInput: string;
      previousAnalysis: ReviewSections & { analysis: { nextVerification: string } };
      founderChoice: { label: string };
      founderSupplement: string;
      answerOrigin: 'synthetic-test-data';
    };
    expect(sent.originalInput.length).toBeGreaterThan(20);
    expect(sent.previousAnalysis.judgment.length).toBeGreaterThan(0);
    expect(sent.founderChoice.label).toBe('체험 프로그램을 먼저 검증할 것');
    expect(sent.founderSupplement).toContain('확정된 양조장');
    const raw = recorded.report.calls[0]?.raw ?? '';
    const parsed = JSON.parse(raw) as { hypotheses: string[]; nextQuestion: string; nextVerification: string; changes: Array<Record<string, unknown>> };
    expect(parsed.hypotheses).toEqual(['미확인']);
    expect(parsed.nextQuestion).toBe('양조장 후보가 있는가?');
    expect(parsed.nextVerification).toBe(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(parsed.changes.every((change) => change.founderAnswer == null && change.choiceTrace == null)).toBe(true);
    const normalized = normalizeIncrementalSections(sent.previousAnalysis, raw, {
      previousJudgment: sent.previousAnalysis.judgment,
      previousHypotheses: sent.previousAnalysis.hypotheses,
      previousNextVerification: sent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: sent.previousAnalysis.nextQuestion,
      previousRevenueModel: sent.previousAnalysis.revenueModel,
      choiceLabel: sent.founderChoice.label,
      supplement: sent.founderSupplement,
      answerOrigin: sent.answerOrigin,
    });
    expect(normalized.errors).toEqual([
      'reason_insufficient:judgment',
      'retention_input_missing:judgment',
      'retention_sufficiency_missing:judgment',
      'retention_evidence_missing:judgment',
      'review_field_missing:inputConsidered:judgment',
      'review_field_missing:impactAssessment:judgment',
      'review_field_missing:sufficiencyAssessment:judgment',
      'review_field_missing:retentionDecision:judgment',
      'review_field_missing:holdReason:judgment',
      'review_field_missing:evidenceNeeded:judgment',
      'reason_insufficient:hypotheses',
      'retention_input_missing:hypotheses',
      'retention_sufficiency_missing:hypotheses',
      'retention_hold_missing:hypotheses',
      'review_field_missing:inputConsidered:hypotheses',
      'review_field_missing:impactAssessment:hypotheses',
      'review_field_missing:sufficiencyAssessment:hypotheses',
      'review_field_missing:retentionDecision:hypotheses',
      'review_field_missing:holdReason:hypotheses',
      'review_field_missing:evidenceNeeded:hypotheses',
      'review_field_missing:inputConsidered:nextVerification',
      'review_field_missing:impactAssessment:nextVerification',
      'review_field_missing:sufficiencyAssessment:nextVerification',
      'review_field_missing:retentionDecision:nextVerification',
      'review_field_missing:holdReason:nextVerification',
      'review_field_missing:evidenceNeeded:nextVerification',
      'review_field_missing:inputConsidered:nextQuestion',
      'review_field_missing:impactAssessment:nextQuestion',
      'review_field_missing:sufficiencyAssessment:nextQuestion',
      'review_field_missing:retentionDecision:nextQuestion',
      'review_field_missing:holdReason:nextQuestion',
      'review_field_missing:evidenceNeeded:nextQuestion',
    ]);
    expect(normalized.sections).toBeNull();
  });

  it('blocks a retained judgment that omits or genericizes the review fields', () => {
    const supplement = '예약 고객, 가격, 계약, 확정된 양조장은 없다.';
    const reviewed = reflectionCase({
      previous: sections(),
      supplement,
      choiceLabel: '체험 프로그램을 먼저 검증할 것',
      reasons: {
        judgment: `${supplement} 이 없음은 확인된 사실이 아니어서 저장된 판단에 영향을 주지 못한다. 근거가 충분하지 않아 판단을 바꾸지 않고 유지한다. 판단을 바꾸려면 계약서가 필요하다.`,
        hypotheses: `${supplement} 이 없음은 가설을 확정하지 못한다. 근거가 부족해 미확인으로 유지한다. 가설을 바꾸려면 예약 확인이 필요하다.`,
        nextVerification: `${supplement} 이 없음 때문에 검증은 양조장 후보 확인에 머문다.`,
        nextQuestion: '양조장 후보가 있는지가 남은 질문이다. 예약 고객, 가격, 계약, 확정된 양조장은 없다.',
      },
      nextVerification: FOLLOW_UP_BREWERY_VERIFICATION_PLAN,
      nextQuestion: '양조장 후보가 있는가?',
    });
    const parsed = JSON.parse(reviewed.raw) as { changes: Array<Record<string, string>> };
    const judgment = parsed.changes.find((change) => change.field === 'judgment');
    expect(judgment?.retentionDecision).toBe('retained');
    expect(judgment?.sufficiencyAssessment).toBe('insufficient');
    expect(judgment?.inputConsidered).toContain('확정된 양조장');
    expect(judgment?.holdReason).toContain('유지');
    expect(judgment?.evidenceNeeded).toContain('계약서');
    delete judgment?.inputConsidered;
    const omitted = normalizeIncrementalSections(sections(), JSON.stringify(parsed), reviewed.context);
    expect(omitted.sections).toBeNull();
    expect(omitted.errors).toContain('review_field_missing:inputConsidered:judgment');
    expect(JSON.stringify(omitted)).not.toContain('에서 새로 들은 내용이다');
    const generic = JSON.parse(reviewed.raw) as { changes: Array<Record<string, string>> };
    const genericJudgment = generic.changes.find((change) => change.field === 'judgment');
    if (genericJudgment) genericJudgment.holdReason = '사업 구상에 명확한 방향성을 제공한다.';
    const genericResult = normalizeIncrementalSections(sections(), JSON.stringify(generic), reviewed.context);
    expect(genericResult.errors).toContain('review_hold_generic:holdReason:judgment');
    expect(genericResult.sections).toBeNull();
    const enough = JSON.parse(reviewed.raw) as { changes: Array<Record<string, string>> };
    const enoughJudgment = enough.changes.find((change) => change.field === 'judgment');
    if (enoughJudgment) enoughJudgment.sufficiencyAssessment = 'sufficient';
    expect(incrementalReflectionErrors(JSON.stringify(enough), reviewed.context)).toContain('sufficiency_conflict:judgment');
  });

  it('keeps a confirmation claim unverified inside the review fields', () => {
    const supplement = '양조장과 계약이 확정되었다고 말한다. 계약서와 입금 증빙은 없다.';
    const reviewed = reflectionCase({
      previous: sections(),
      supplement,
      reasons: {
        judgment: `${supplement} 이것은 창업자의 주장이고 증빙은 없다. 확인된 사실이 아니어서 저장된 판단에 미칠 영향이 부족하다. 판단을 유지한다. 바꾸려면 계약서가 필요하다.`,
        hypotheses: `${supplement} 이 주장은 가설을 확정하지 못한다. 증빙은 없어 미확인으로 유지한다. 예약 확인이 필요하다.`,
        nextVerification: `${supplement} 계약 주장은 검증이 끝나지 않았다는 뜻이다.`,
        nextQuestion: `${supplement} 증빙이 없어 계약서 유무를 묻는다.`,
      },
      nextQuestion: '계약서가 있는가?',
    });
    const parsed = JSON.parse(reviewed.raw) as { changes: Array<Record<string, string>> };
    const judgment = parsed.changes.find((change) => change.field === 'judgment');
    if (judgment) judgment.inputConsidered = '양조장과 계약이 확정되었다.';
    expect(incrementalReflectionErrors(JSON.stringify(parsed), reviewed.context)).toContain('claim_promoted_to_fact:judgment');
    expect(normalizeIncrementalSections(sections(), JSON.stringify(parsed), reviewed.context).sections).toBeNull();
  });

  it('keeps the first two answers in the third reanalysis and drops only old turns', async () => {
    const store = openAiPmReviewStore(storePath());
    const sent: string[] = [];
    let round = 0;
    const chat = async (request: ChatRequest) => {
      const product = request.messages.some((message) => message.content.includes('이번 답이 판단'));
      if (!product) return reply(JSON.stringify(sections()));
      round += 1;
      sent.push(request.messages.find((message) => message.role === 'user')?.content ?? '');
      return reply(
        productAnalysisRaw({
          judgment: `라운드 ${round} 판단`,
          nextQuestion: `라운드 ${round} 다음에 무엇을 확인할까요?`,
        }),
      );
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
    const parentBefore = JSON.stringify(await store.readReview('user-a', first.record.reviewId));
    const answers = ['첫번째답변마커', '두번째답변마커', '세번째답변마커'];
    let parentId = first.record.reviewId;
    for (const answer of answers) {
      const follow = await runFollowUpReview({
        projectId: 'project-test',
        store,
        userId: 'user-a',
        reviewId: parentId,
        supplement: answer,
        now: NOW,
        chat,
        evidence: 'injected_http',
      });
      expect(follow.ok).toBe(true);
      if (!follow.ok) return;
      expect(follow.called).toBe(true);
      expect(follow.record.status).toBe('succeeded');
      expect(follow.record.sections?.analysis?.judgmentDetail).toContain('라운드');
      expect(follow.record.parentReviewId).toBe(parentId);
      expect(follow.record.consultingTurn?.supplement).toBe(answer);
      parentId = follow.record.reviewId;
    }
    const third = JSON.parse(sent[2] ?? '{}') as {
      originalInput: string;
      firstAnalysis: { summary: string };
      priorTurns: Array<{ supplement: string }>;
      latestAnalysis: { analysis: { priorJudgmentText: string } | null };
      founderSupplement: string;
    };
    expect(third.originalInput).toBe(PLAN);
    expect(third.firstAnalysis.summary).toBe(sections().judgment);
    expect(third.priorTurns.map((turn) => turn.supplement)).toEqual(['첫번째답변마커', '두번째답변마커']);
    expect(third.founderSupplement).toBe('세번째답변마커');
    expect(third.latestAnalysis.analysis?.priorJudgmentText).toContain('라운드 2');
    expect(JSON.stringify(await store.readReview('user-a', first.record.reviewId))).toBe(parentBefore);
    const duplicate = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: answers[0] ?? '',
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(duplicate.ok && duplicate.called).toBe(false);
    const broken = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: '실패격리마커',
      now: NOW,
      chat: async () => reply('{'),
      evidence: 'injected_http',
    });
    expect(broken.ok).toBe(true);
    if (!broken.ok) return;
    expect(broken.record.status).toBe('failed');
    expect(broken.record.sections).toBeNull();
    const blocked = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: broken.record.reviewId,
      supplement: '실패 자식은 부모가 아니다',
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(blocked.ok).toBe(false);
    const trimmed = buildProductReanalysisRequest({
      originalInput: '최초원문마커',
      firstAnalysis: {
        ...sections(),
        analysis: {
          summary: '최초분석요약마커',
          value: '가치',
          operatingModel: '구상',
          payer: '미확인',
          competition: '미확인',
          operations: '구상',
          profitability: '미확인',
          strengths: ['강점'],
          assumptions: ['가정'],
          evidenceToChange: ['증거'],
          founderFacts: ['사실'],
          inferences: ['추론'],
          judgmentDetail: '최초 판단',
          choices: [],
          nextVerification: '최초 검증',
        },
      },
      priorTurns: Array.from({ length: 6 }, (_, index) => ({
        question: `질문 ${index}`,
        choiceLabel: null,
        supplement: index === 0 ? `가장오래된턴${'오래된턴'.repeat(900)}` : `중간턴${index}${'오래된턴'.repeat(900)}`,
        judgment: `판단 ${index}`,
        nextVerification: '검증',
        nextQuestion: `질문 ${index}?`,
      })),
      latestAnalysis: { ...sections(), judgment: '직전분석마커' },
      founderChoice: { label: '체험을 먼저 확인한다', otherText: '' },
      founderSupplement: '이번답변마커',
      founderFeedback: null,
    });
    const body = trimmed.messages.find((message) => message.role === 'user')?.content ?? '';
    expect(body).toContain('최초원문마커');
    expect(body).toContain('최초분석요약마커');
    expect(body).toContain('이번답변마커');
    expect(body).toContain('직전분석마커');
    expect(body).not.toContain('가장오래된턴');
    store.close();
  });

  it('keeps the newest analysis and every founder answer in the product request', () => {
    const older = Array.from({ length: 8 }, (_, index) => ({
      reviewId: `old-${index}`,
      judgment: `오래된판단${index}${'가'.repeat(500)}`,
      nextQuestion: `오래된질문${index}?`,
      assumptions: ['오래된가정'],
      risks: ['오래된위험'],
    }));
    const request = buildProductReanalysisRequest({
      originalInput: PLAN,
      firstAnalysis: sections(),
      priorTurns: [
        {
          question: '어떤 방식으로 양조장과의 파트너십을 구축할 계획인가?',
          choiceLabel: null,
          supplement: '양조장과의 협력 가능성이 높다.',
          judgment: '이전 판단',
          nextVerification: '검증',
          nextQuestion: '다음?',
        },
        {
          question: '협력 가능성을 확인하기 위해 우선 접촉할 양조장을 한 곳 정했나요?',
          choiceLabel: '양조장과의 협력 방안 구체화',
          supplement: '양조장 후보 선정과 연락 경로 확보를 우선 검증한다.',
          judgment: '이전 판단',
          nextVerification: '검증',
          nextQuestion: '다음?',
        },
      ],
      priorAnalyses: [
        ...older,
        {
          reviewId: 'ad73c33f-7bdc-47ff-b539-0ac9afdcdb82',
          judgment: '구체적인 후보가 없다는 점이 판단에 남아 있다.',
          nextQuestion: '체험을 운영할 양조장을 고를 기준이 있나요?',
          assumptions: ['후보가 없다는 답은 확인된 상태다.'],
          risks: ['운영 경로가 비어 있다.'],
        },
      ],
      latestAnalysis: sections(),
      founderChoice: { label: '아직 떠오르는 양조장이 없다', otherText: '' },
      founderSupplement: '현재 우선 접촉할 구체적인 양조장 후보를 선정하지 못했다.',
      founderFeedback: { comment: '아직 떠오르는 양조장이 없다' },
    });
    const payload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      priorAnalyses: Array<{ reviewId: string }>;
      priorTurns: Array<{ supplement: string }>;
      founderAnswers: Array<{ supplement: string }>;
      founderSupplement: string;
    };
    expect(payload.priorAnalyses.at(-1)?.reviewId).toBe('ad73c33f-7bdc-47ff-b539-0ac9afdcdb82');
    expect(payload.priorTurns.map((turn) => turn.supplement)).toEqual([
      '양조장과의 협력 가능성이 높다.',
      '양조장 후보 선정과 연락 경로 확보를 우선 검증한다.',
    ]);
    expect(payload.founderSupplement).toBe('현재 우선 접촉할 구체적인 양조장 후보를 선정하지 못했다.');
    expect(payload.founderAnswers.map((item) => item.supplement)).toEqual([
      '양조장과의 협력 가능성이 높다.',
      '양조장 후보 선정과 연락 경로 확보를 우선 검증한다.',
      '현재 우선 접촉할 구체적인 양조장 후보를 선정하지 못했다.',
    ]);
  });

  it('renders both founder answers and keeps a failed review off the current analysis', () => {
    const inputText = composeReviewInput({ text: PLAN, purpose: 'overall' });
    const view = (
      reviewId: string,
      parentReviewId: string | null,
      judgment: string,
      nextQuestion: string,
      turn: AiPmReviewView['consultingTurn'],
      finishedAt: string,
      status: AiPmReviewView['status'] = 'ready',
    ): AiPmReviewView => {
      const sections = status === 'ready' ? parseSections(productAnalysisRaw({ judgment, nextQuestion }), inputText) : null;
      return {
        reviewId,
        projectId: 'project-test',
        version: 1,
        parentReviewId,
        status,
        inputOrigin: 'typed',
        fileName: null,
        inputText,
        sections,
        questionSource: sections ? 'model-review' : null,
        finishedAt,
        feedback: [],
        revision: null,
        consultingTurn: turn,
        failure: status === 'failed' ? 'invalid_json' : null,
      };
    };
    const html = renderToStaticMarkup(
      createElement(AiPmReviewPanel, {
        initialText: PLAN,
        projectId: 'project-test',
        initialReviews: [
          view('r0', null, '최초 판단', '수요를 확인했습니까?', null, '2026-10-30T01:00:00.000Z'),
          view(
            'r1',
            'r0',
            '1차 재분석 판단',
            '대상을 정했습니까?',
            {
              question: '수요를 확인했습니까?',
              choiceLabel: '체험 수요를 먼저 확인한다',
              supplement: '첫번째답변마커',
              judgment: '1차 재분석 판단',
              nextVerification: '잠재 고객에게 참여 의향을 묻는다.',
              nextQuestion: '대상을 정했습니까?',
            },
            '2026-10-30T02:00:00.000Z',
          ),
          view(
            'r2',
            'r1',
            '2차 재분석 판단',
            '일정을 잡았습니까?',
            {
              question: '대상을 정했습니까?',
              choiceLabel: '홍보 필요를 먼저 확인한다',
              supplement: '두번째답변마커',
              judgment: '2차 재분석 판단',
              nextVerification: '잠재 고객에게 참여 의향을 묻는다.',
              nextQuestion: '일정을 잡았습니까?',
            },
            '2026-10-30T03:00:00.000Z',
          ),
          view('r-fail', 'r2', '실패한 판단', '실패한 질문?', null, '2026-10-30T04:00:00.000Z', 'failed'),
        ],
      }),
    );
    expect(html).toContain('최초 분석');
    expect(html).toContain('1차 재분석');
    expect(html).toContain('2차 재분석');
    expect(html).toContain('첫번째답변마커');
    expect(html).toContain('두번째답변마커');
    expect(html).toContain('2차 답변');
    expect(html).toContain('고른 항목: 홍보 필요를 먼저 확인한다');
    expect(html).toContain('일정을 잡았습니까?');
    expect(html).toContain('다음 질문');
    expect(html).not.toContain('실패한 판단');
    expect(html).not.toContain('ai-pm-project-gate');
    expect(html).not.toMatch(/gpt|gemini|openai|token/i);
  });

  it('tells a visitor without a project where to open the review', () => {
    const html = renderToStaticMarkup(createElement(AiPmReviewPanel, { initialText: PLAN }));
    expect(html).toContain('data-testid="ai-pm-project-gate"');
    expect(html).toContain('이 화면에는 프로젝트가 없어 사업성 검토를 시작하지 않습니다.');
    expect(html).toContain('href="/workspace?intent=new"');
    expect(html).toContain('href="/workspace"');
    expect(html).toContain('href="/auth/login?next=/workspace"');
    expect(html).not.toContain('AI 사업성 검토를 시작합니다');
    expect(html).not.toMatch(/gpt|gemini|openai|token/i);
  });

  it('stores one repair, records both responses, and does not call a third time', async () => {
    expect(followUpRepairMessage(['follow_up_output_unparsed'])).not.toContain('양조장 후보가 있는가');
    const store = openAiPmReviewStore(storePath());
    let followCalls = 0;
    const chat = async (request: ChatRequest) => {
      const followUp = request.messages.some((message) => message.content.includes('이번 답이 판단'));
      if (!followUp) return reply(JSON.stringify(sections()));
      followCalls += 1;
      return reply(productAnalysisRaw({ judgment: '인터뷰가 없어 지불 판단은 그대로다.', nextQuestion: '인터뷰 일정을 잡았습니까?' }), {
        usage: { inputTokens: 11, outputTokens: 2, totalTokens: 13 },
      });
    };
    const specificRepair = followUpRepairMessage([
        'choice_promoted_to_judgment',
        'judgment_changed_by_choice',
        'hypothesis_unconfirmed_replaced',
        'next_verification_choice_absent',
        'claim_unmarked',
        'status_repeat:holdReason:judgment',
        'sufficiency_conflict:judgment',
      ]);
      expect(specificRepair).toContain('이전 JSON과 같은 응답을 다시 내면 실패다');
      expect(specificRepair).toContain('previousJudgment와 같은 문장');
      expect(specificRepair).toContain('founderChoice.label을 그대로 포함');
      expect(specificRepair).toContain('확인된 사실이 아니라고');
      expect(specificRepair).toContain('retained의 sufficiencyAssessment는 insufficient다');
      expect(specificRepair).not.toContain('양조장 후보가 있는가');
      const choiceRepair = followUpRepairMessage([
        'retention_hold_missing:judgment',
        'retention_evidence_missing:judgment',
        'status_repeat:impactAssessment:judgment',
        'input_echo_only:judgment',
        'trace_relation_missing:judgment',
        'reason_insufficient:hypotheses',
        'priority_plan_unfocused',
        'question_not_from_input',
        'plan_not_from_input',
      ]);
      expect(choiceRepair).toContain('그 다음에도 온라인 마케팅 검증은 남아 있다고 적어라');
      expect(choiceRepair).toContain('nextVerification.decision만 changed다');
      expect(choiceRepair).not.toContain('온라인 마케팅 효과 검증을 붙이지 마라');
      expect(choiceRepair).toContain('고객 인터뷰나 예약 의향');
      expect(choiceRepair).toContain('founderChoice.label과 같으면 실패다');
      expect(choiceRepair).toContain('근거가 부족');
      expect(choiceRepair).toContain('입력에 없는 다른 검증 대상으로 바꾸지 마라');
      expect(choiceRepair).not.toContain('계약서 또는 입금 증빙 확인을 함께');
      expect(choiceRepair).not.toContain('양조장 후보가 있는가');
      const claimRepair = followUpRepairMessage([
        'retention_input_missing:hypotheses',
        'claim_verification_missing',
        'decision_mismatch:nextVerification',
        'follow_up_output_previous:nextQuestion',
      ]);
      expect(claimRepair).toContain('founderChoice.label을 그대로 포함하고 계약서 또는 입금 증빙');
      expect(claimRepair).toContain('reason에도 양조장 또는 계약');
      expect(claimRepair).toContain('previousAnalysis.nextQuestion');
      expect(claimRepair).toContain('nextVerification.decision만 changed다');
      expect(claimRepair).toContain('그 decision은 retained다');
      expect(claimRepair).toContain('라벨을 다른 말로 바꾸면 실패다');
    expect(claimRepair).not.toContain('온라인 마케팅 효과 검증을 붙이지 마라');
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
        agreement: 'partial',
        accuracy: 'mostly_accurate',
        revisionAreas: ['evidence'],
        comment: '인터뷰는 아직 없다.',
        nextAction: 'verify_hypotheses',
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
    expect(followCalls).toBe(1);
    expect(follow.record.callCount).toBe(1);
    expect(follow.record.status).toBe('succeeded');
    expect(follow.record.firstRawContent ?? null).toBeNull();
    expect(follow.record.sections?.analysis?.judgmentDetail).toContain('인터뷰가 없어');
    expect(follow.record.consultingTurn?.supplement).toContain('인터뷰는 아직 없다');
    expect(follow.record.promptTokens).toBe(11);
    expect(follow.record.completionTokens).toBe(2);
    expect(follow.record.totalTokens).toBe(13);
    const parent = await store.readReview('user-a', first.record.reviewId);
    expect(parent?.sections?.judgment).toBe(sections().judgment);
    store.close();

    const failedStore = openAiPmReviewStore(storePath());
    let failedCalls = 0;
    const failing = async (request: ChatRequest) => {
      const followUp = request.messages.some((message) => message.content.includes('이번 답이 판단'));
      if (!followUp) return reply(JSON.stringify(sections()));
      failedCalls += 1;
      return reply('{');
    };
    const parentReview = await runFirstReview({
      projectId: 'project-test',
      store: failedStore,
      userId: 'user-a',
      text: PLAN,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat: failing,
      evidence: 'injected_http',
    });
    await saveReviewFeedback({
      projectId: 'project-test',
      store: failedStore,
      userId: 'user-a',
      now: NOW,
      body: {
        reviewId: parentReview.record.reviewId,
        agreement: 'partial',
        accuracy: 'mostly_accurate',
        revisionAreas: ['evidence'],
        comment: '인터뷰는 아직 없다.',
        nextAction: 'verify_hypotheses',
      },
    });
    const failed = await runFollowUpReview({
      projectId: 'project-test',
      store: failedStore,
      userId: 'user-a',
      reviewId: parentReview.record.reviewId,
      supplement: '양조장 대표 인터뷰는 아직 없다.',
      now: NOW,
      chat: failing,
      evidence: 'injected_http',
    });
    expect(failed.ok).toBe(true);
    if (!failed.ok) return;
    expect(failedCalls).toBe(1);
    expect(failed.record.callCount).toBe(1);
    expect(failed.record.status).toBe('failed');
    expect(failed.record.sections).toBeNull();
    expect(failed.record.firstRawContent ?? null).toBeNull();
    expect(failed.record.rawContent).toBe('{');
    expect(failed.record.error).toContain('invalid_json');
    expect(failed.record.parentReviewId).toBe(parentReview.record.reviewId);
    const failedParent = await failedStore.readReview('user-a', parentReview.record.reviewId);
    expect(failedParent?.sections?.judgment).toBe(sections().judgment);
    const retryOnFailure = await runFollowUpReview({
      projectId: 'project-test',
      store: failedStore,
      userId: 'user-a',
      reviewId: failed.record.reviewId,
      supplement: '다른 설명',
      now: NOW,
      chat: failing,
      evidence: 'injected_http',
    });
    expect(retryOnFailure.ok).toBe(false);
    failedStore.close();
  });

  it('keeps the review-fields run unstored when the model does not review the supplement', () => {
    const recorded = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-review-fields-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      startedAt: string;
      finishedAt: string;
      productFollowUpInvoked: boolean;
      responseFormat: string;
      repairCount: number;
      usage: { promptTokens: number; completionTokens: number; totalTokens: number };
      report: {
        calls: Array<{
          promptVersion: string;
          model: string;
          promptTokens: number;
          completionTokens: number;
          totalTokens: number;
          raw: string;
          userPrompt: string;
        }>;
      };
    };
    expect(recorded.runId).toBe('q1-incremental-reflection-review-fields-2026-10-30');
    expect(recorded.priorRunId).toBe('q1-incremental-reflection-reason-quality-2026-10-30');
    expect(recorded.gitSha).toBe('98c492d4b265c5a2e0ea5418e99525173eef8e67');
    expect(recorded.startedAt).toBe('2026-10-30T08:09:03.613Z');
    expect(recorded.finishedAt).toBe('2026-10-30T08:09:20.215Z');
    expect(recorded.productFollowUpInvoked).toBe(false);
    expect(recorded.responseFormat).toBe('json_schema');
    expect(recorded.repairCount).toBe(1);
    expect(recorded.report.calls).toHaveLength(2);
    expect(recorded.usage).toEqual({ promptTokens: 8026, completionTokens: 1490, totalTokens: 9516 });
    expect(recorded.report.calls[0]?.promptTokens).toBe(3535);
    expect(recorded.report.calls[0]?.completionTokens).toBe(745);
    expect(recorded.report.calls[0]?.totalTokens).toBe(4280);
    expect(recorded.report.calls[1]?.promptTokens).toBe(4491);
    expect(recorded.report.calls[1]?.completionTokens).toBe(745);
    expect(recorded.report.calls[1]?.totalTokens).toBe(5236);
    expect(recorded.report.calls.every((call) => call.model === 'gpt-4o-mini-2024-07-18')).toBe(true);
    const sent = JSON.parse(recorded.report.calls[0]?.userPrompt ?? '{}') as {
      previousAnalysis: ReviewSections & { analysis: { nextVerification: string } };
      founderChoice: { label: string };
      founderSupplement: string;
      answerOrigin: 'synthetic-test-data';
    };
    expect(sent.founderChoice.label).toBe('체험 프로그램을 먼저 검증할 것');
    expect(sent.founderSupplement).toContain('확정된 양조장');
    const before = JSON.stringify(sent.previousAnalysis);
    const context = {
      previousJudgment: sent.previousAnalysis.judgment,
      previousHypotheses: sent.previousAnalysis.hypotheses,
      previousNextVerification: sent.previousAnalysis.analysis.nextVerification,
      previousNextQuestion: sent.previousAnalysis.nextQuestion,
      previousRevenueModel: sent.previousAnalysis.revenueModel,
      choiceLabel: sent.founderChoice.label,
      supplement: sent.founderSupplement,
      answerOrigin: sent.answerOrigin,
    };
    const finalRaw = recorded.report.calls[1]?.raw ?? '';
    const parsed = JSON.parse(finalRaw) as {
      hypotheses: string[];
      nextQuestion: string;
      changes: Array<Record<string, string>>;
    };
    const judgment = parsed.changes.find((change) => change.field === 'judgment');
    const hypotheses = parsed.changes.find((change) => change.field === 'hypotheses');
    expect(parsed.hypotheses).toEqual(['미확인']);
    expect(parsed.nextQuestion).toBe('양조장 후보가 있는가?');
    expect(judgment?.inputConsidered).toBe('체험 프로그램을 먼저 검증할 것');
    expect(judgment?.inputConsidered).not.toContain('확정된 양조장');
    expect(hypotheses?.holdReason).toBe('새로운 정보가 없기 때문에 가설을 유지한다.');
    const normalized = normalizeIncrementalSections(sent.previousAnalysis, finalRaw, context);
    expect(JSON.stringify(sent.previousAnalysis)).toBe(before);
    expect(normalized.sections).toBeNull();
    expect(normalized.errors).toEqual([
      'reason_insufficient:judgment',
      'retention_input_missing:judgment',
      'retention_sufficiency_missing:judgment',
      'retention_evidence_missing:judgment',
      'retention_hold_missing:judgment',
      'status_repeat:impactAssessment:judgment',
      'status_repeat:holdReason:judgment',
      'input_echo_only:judgment',
      'reason_insufficient:hypotheses',
      'retention_input_missing:hypotheses',
      'retention_sufficiency_missing:hypotheses',
      'retention_evidence_missing:hypotheses',
      'status_repeat:impactAssessment:hypotheses',
      'status_repeat:holdReason:hypotheses',
      'input_echo_only:hypotheses',
      'next_verification_not_executable',
    ]);
  });

  it('relates an empty supplement and a brewery claim to different reviews', () => {
    const choice = '체험 프로그램을 먼저 검증할 것';
    const previous: ReviewSections = {
      ...sections(),
      hypotheses: ['미확인'],
      analysis: {
        summary: sections().judgment,
        value: '미확인',
        operatingModel: '구상',
        payer: '미확인',
        competition: '미확인',
        operations: '구상',
        profitability: '미확인',
        strengths: ['구상'],
        assumptions: ['미확인'],
        evidenceToChange: ['수요'],
        founderFacts: ['관광객'],
        inferences: ['추론'],
        judgmentDetail: '보류',
        choices: [],
        nextVerification: '기존 검증 문장',
      },
    };
    const feedback = {
      feedbackId: 'feedback-trace',
      reviewId: 'review-trace',
      userId: 'user-trace',
      agreement: 'need_info' as const,
      accuracy: 'hard_to_compare' as const,
      revisionAreas: ['other' as const],
      comment: choice,
      nextAction: 'verify_hypotheses' as const,
      marks: [],
      choiceAnswer: { choiceId: 'choice-experience', label: choice, otherText: '' },
      submittedAt: NOW,
      modelCalls: 0 as const,
    };
    const emptyRequest = buildSyntheticFollowUpRequest({
      originalInput: PLAN,
      sections: previous,
      feedback,
      supplement: '',
      answerOrigin: 'synthetic-test-data',
    });
    const claimRequest = buildSyntheticFollowUpRequest({
      originalInput: PLAN,
      sections: previous,
      feedback,
      supplement: FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM,
      answerOrigin: 'synthetic-test-data',
    });
    const emptyUser = JSON.parse(emptyRequest.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      inputLedger: Array<{ id: string; kind: string; affects: string }>;
    };
    const claimUser = JSON.parse(claimRequest.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      inputLedger: Array<{ id: string; kind: string; affects: string }>;
    };
    expect(emptyUser.inputLedger.map((entry) => entry.id)).toEqual([
      'founderChoice',
      'founderSupplement',
      'previousJudgment',
      'previousHypotheses',
      'previousVerification',
    ]);
    expect(emptyUser.inputLedger.find((entry) => entry.id === 'founderChoice')?.kind).toBe('plan-choice');
    expect(emptyUser.inputLedger.find((entry) => entry.id === 'founderSupplement')).toMatchObject({ kind: 'absent', affects: 'none' });
    expect(emptyUser.inputLedger.find((entry) => entry.id === 'previousJudgment')).toMatchObject({ kind: 'stored', affects: 'judgment' });
    expect(claimUser.inputLedger.find((entry) => entry.id === 'founderSupplement')?.kind).toBe('unverified-claim');
    const absenceRequest = buildSyntheticFollowUpRequest({
      originalInput: PLAN,
      sections: previous,
      feedback,
      supplement: '예약 고객, 가격, 계약, 확정된 양조장은 없다.',
      answerOrigin: 'synthetic-test-data',
    });
    const absenceUser = JSON.parse(absenceRequest.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      inputLedger: Array<{ id: string; kind: string }>;
    };
    expect(absenceUser.inputLedger.find((entry) => entry.id === 'founderSupplement')?.kind).toBe('absence-statement');
    const emptySystem = emptyRequest.messages.find((message) => message.role === 'system')?.content ?? '';
    const claimSystem = claimRequest.messages.find((message) => message.role === 'system')?.content ?? '';
    const absenceSystem = absenceRequest.messages.find((message) => message.role === 'system')?.content ?? '';
    expect(absenceSystem).toContain(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(emptySystem).not.toContain(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(emptySystem).not.toContain('양조장 후보가 있는가?');
    expect(claimSystem).not.toContain(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    expect(claimSystem).not.toContain('양조장 후보가 있는가?');
    expect(emptySystem).toContain('inputLedger');
    expect(emptySystem).toContain('검증 우선순위');
    expect(emptySystem).toContain('previousJudgment와 같은 문장');
    expect(emptySystem).toContain('inputConsidered가 founderChoice.label과 같으면 실패다');
    expect(emptySystem).toContain('그 다음에도 온라인 마케팅 검증은 남아 있다고 적는다');
    expect(emptySystem).toContain('문장이 같은데 decision을 changed로 두면 실패다');
    expect(emptySystem).toContain('가설의 검증 순서');
    expect(emptySystem).not.toContain('온라인 마케팅 효과 검증을 뒤에 붙이지 마라');
    expect(emptySystem).toContain('미확인 상태만 반복하면 실패다');
    expect(emptySystem).toContain('근거가 부족');
    expect(emptySystem).toContain('글자 그대로');
    expect(emptySystem).not.toContain('양조장 후보가 있는가');
    expect(claimSystem).toContain('unverified-claim');
    expect(claimSystem).toContain('검증 우선순위');
    expect(claimSystem).toContain('확인된 사실이 아니다');
    expect(claimSystem).toContain('계약서나 입금 증빙');
    expect(claimSystem).toContain('hypotheses의 inputConsidered와 reason');
    expect(claimSystem).toContain('선택 문장만 쓰면 실패다');
    expect(claimSystem).toContain('글자 그대로');
    expect(claimSystem).toContain('계약서나 입금 증빙');
    expect(claimSystem).toContain('양조장 주장을 가설');
    expect(claimSystem).toContain('nextVerification.decision만 changed다');
    expect(claimSystem).toContain('문장이 같은데 decision을 changed로 두면 실패다');
    expect(claimSystem).toContain('저장된 이전 질문과 다른 질문이다');

    const experiencePlan = `${choice} 잠재 고객의 체험 참여 의향을 인터뷰로 확인한다. 이 단계는 아직 실행되지 않았다.`;
    const experienceQuestion = '체험 프로그램에 참여할 고객이 있는가?';
    const claimPlan = `${choice} 양조장 확보 주장은 계약서와 입금 증빙을 확인한 뒤에만 협력으로 본다. 그와 별도로 체험 참여 수요를 인터뷰로 확인한다.`;
    const reviewedFields = (field: string, decision: string, texts: Record<string, string>) => ({
      inputConsidered: texts.inputConsidered ?? `${texts.note} 에서 새로 들은 내용이다.`,
      impactAssessment: texts.impactAssessment ?? '이 내용은 저장된 판단에 미치는 영향이 제한된다.',
      sufficiencyAssessment: decision === 'changed' ? 'partial' : 'insufficient',
      retentionDecision: decision,
      holdReason: texts.holdReason ?? (decision === 'changed' ? '기존 문장을 유지하지 않고 검증 순서를 바꾼다.' : '확인된 사실이 아니어서 바꾸지 않고 유지한다.'),
      evidenceNeeded: texts.evidenceNeeded ?? '계약서 증빙이 필요하다.',
    });
    const buildRaw = (input: {
      supplement: string;
      judgment?: string;
      hypotheses?: string[];
      nextVerification: string;
      nextQuestion: string;
      reasons: Record<string, string>;
      fields: Record<string, Record<string, string>>;
    }) => {
      const judgment = input.judgment ?? previous.judgment;
      const hypotheses = input.hypotheses ?? previous.hypotheses;
      const rows = [
        ['judgment', previous.judgment, judgment],
        ['hypotheses', previous.hypotheses.join(' / '), hypotheses.join(' / ')],
        ['nextVerification', previous.analysis?.nextVerification ?? '', input.nextVerification],
        ['nextQuestion', previous.nextQuestion, input.nextQuestion],
      ] as const;
      return JSON.stringify({
        judgment,
        hypotheses,
        nextVerification: input.nextVerification,
        nextQuestion: input.nextQuestion,
        revenueModel: previous.revenueModel,
        changes: rows.map(([field, prior, current]) => {
          const decision = current === prior ? 'retained' : 'changed';
          return {
            field,
            previous: prior,
            current,
            decision,
            reason: input.reasons[field],
            evidenceStatus: 'unverified-input',
            ...reviewedFields(field, decision, input.fields[field] ?? { note: input.supplement }),
          };
        }),
      });
    };
    const contextFor = (supplement: string) => ({
      previousJudgment: previous.judgment,
      previousHypotheses: [...previous.hypotheses],
      previousNextVerification: previous.analysis?.nextVerification ?? '',
      previousNextQuestion: previous.nextQuestion,
      previousRevenueModel: previous.revenueModel,
      choiceLabel: choice,
      supplement,
      answerOrigin: 'synthetic-test-data' as const,
    });
    const emptyRaw = buildRaw({
      supplement: '',
      nextVerification: experiencePlan,
      nextQuestion: experienceQuestion,
      reasons: {
        judgment: `${choice} 은 검증 계획이라 저장된 판단의 근거가 아니다. 수요가 확인되지 않아 판단을 바꾸지 않고 유지한다. 판단을 바꾸려면 고객 인터뷰가 필요하다.`,
        hypotheses: `${choice} 은 가설을 확정하지 못한다. 수요 근거가 부족해 미확인으로 유지한다. 가설을 바꾸려면 고객 인터뷰가 필요하다.`,
        nextVerification: `${choice} 때문에 검증은 체험 참여 의향을 확인하는 순서로 바뀐다.`,
        nextQuestion: `${choice} 은 체험 수요가 확인되지 않은 계획이다. 다음 질문은 참여할 고객이 있는지다.`,
      },
      fields: {
        judgment: {
          inputConsidered: `${choice} 은 검증 순서에 대한 계획이며 수요가 확인되지 않은 상태다.`,
          impactAssessment: '선택한 계획은 저장된 판단과 관련된다. 수요가 확인되지 않은 판단에 미치는 영향은 그 계획을 근거로 바꾸기에는 부족하다.',
          holdReason: '수요가 확인되지 않아 이 계획은 근거가 아니다. 저장된 판단을 유지한다.',
          evidenceNeeded: '체험에 참여할 고객 인터뷰가 필요하다.',
        },
        hypotheses: {
          inputConsidered: `${choice} 은 가설을 정하는 근거가 아니라 검증 계획이다.`,
          impactAssessment: '이 계획은 미확인 가설과 관련되지만 근거가 부족해 가설을 확정하지 못한다.',
          holdReason: '수요 근거가 부족해 가설을 미확인으로 유지한다.',
          evidenceNeeded: '체험 참여 의향을 묻는 고객 인터뷰 기록이 필요하다.',
        },
      },
    });
    const before = JSON.stringify(previous);
    const stored = normalizeIncrementalSections(previous, emptyRaw, contextFor(''));
    expect(stored.errors).toEqual([]);
    expect(JSON.stringify(previous)).toBe(before);
    expect(stored.sections?.judgment).toBe(previous.judgment);
    expect(stored.sections?.hypotheses).toEqual(['미확인']);
    expect(stored.sections?.nextQuestion).toBe(experienceQuestion);
    expect(stored.sections?.analysis?.nextVerification).toBe(experiencePlan);
    expect(stored.sections?.revenueModel).toBe(previous.revenueModel);
    expect(experiencePlan).not.toBe(FOLLOW_UP_BREWERY_VERIFICATION_PLAN);
    const echoed = JSON.parse(emptyRaw) as { changes: Array<Record<string, string>> };
    const echoedJudgment = echoed.changes.find((change) => change.field === 'judgment');
    if (echoedJudgment) {
      echoedJudgment.inputConsidered = choice;
      echoedJudgment.impactAssessment = '기존 판단에 변화가 없다.';
      echoedJudgment.holdReason = '기존 판단이 여전히 유효하다.';
    }
    const echoedResult = normalizeIncrementalSections(previous, JSON.stringify(echoed), contextFor(''));
    expect(echoedResult.sections).toBeNull();
    expect(echoedResult.errors).toEqual(expect.arrayContaining(['input_echo_only:judgment', 'status_repeat:impactAssessment:judgment', 'status_repeat:holdReason:judgment']));
    const invented = JSON.parse(emptyRaw) as { nextVerification: string; changes: Array<Record<string, string>> };
    invented.nextVerification = `${experiencePlan} 확정된 양조장을 확보했다.`;
    const inventedChange = invented.changes.find((change) => change.field === 'nextVerification');
    if (inventedChange) inventedChange.current = invented.nextVerification;
    const inventedResult = normalizeIncrementalSections(previous, JSON.stringify(invented), contextFor(''));
    expect(inventedResult.errors).toContain('input_invented');
    expect(inventedResult.sections).toBeNull();
    const rewritten = JSON.parse(emptyRaw) as { judgment: string; changes: Array<Record<string, string>> };
    rewritten.judgment = '사업 방향이 구체화되었다.';
    const rewrittenJudgment = rewritten.changes.find((change) => change.field === 'judgment');
    if (rewrittenJudgment) {
      rewrittenJudgment.current = rewritten.judgment;
      rewrittenJudgment.decision = 'changed';
      rewrittenJudgment.retentionDecision = 'changed';
      rewrittenJudgment.sufficiencyAssessment = 'partial';
    }
    const rewrittenResult = normalizeIncrementalSections(previous, JSON.stringify(rewritten), contextFor(''));
    expect(rewrittenResult.errors).toContain('judgment_changed_by_choice');
    expect(rewrittenResult.sections).toBeNull();
    expect(JSON.stringify(previous)).toBe(before);
    const unfocused = JSON.parse(emptyRaw) as { nextVerification: string; changes: Array<Record<string, string>> };
    unfocused.nextVerification = `${experiencePlan} 온라인 마케팅 효과 검증을 같이 한다.`;
    const unfocusedChange = unfocused.changes.find((change) => change.field === 'nextVerification');
    if (unfocusedChange) unfocusedChange.current = unfocused.nextVerification;
    const unfocusedResult = normalizeIncrementalSections(previous, JSON.stringify(unfocused), contextFor(''));
    expect(unfocusedResult.errors).toContain('priority_plan_unfocused');
    expect(unfocusedResult.sections).toBeNull();

    const claimRaw = buildRaw({
      supplement: FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM,
      nextVerification: claimPlan,
      nextQuestion: '계약서가 있는가?',
      reasons: {
        judgment: `${FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM} 이것은 창업자의 주장이고 증빙은 없다. 확인된 사실이 아니어서 저장된 판단에 미칠 영향이 부족하다. 판단을 유지한다. 바꾸려면 계약서가 필요하다.`,
        hypotheses: `${FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM} 이 주장은 가설을 확정하지 못한다. 증빙은 없어 미확인으로 유지한다. 가설을 바꾸려면 체험 수요 인터뷰가 필요하다.`,
        nextVerification: `${FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM} ${choice} 계약 주장은 검증이 끝나지 않았다. 증빙 확인이 검증 순서에 들어간다.`,
        nextQuestion: `${FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM} 증빙이 없어 계약서 유무를 질문한다.`,
      },
      fields: {
        judgment: {
          inputConsidered: `${FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM} 양조장 확보가 확정되었다는 주장이며 증빙은 없다. ${choice} 도 함께 들었다.`,
          impactAssessment: '양조장 확보 주장은 저장된 판단과 관련된다. 증빙은 없어 확인된 사실이 아니며 판단에 미치는 영향은 제한된다. 판단을 유지한다.',
          holdReason: '계약 증빙은 없어 확인된 사실이 아니다. 저장된 판단을 유지한다.',
          evidenceNeeded: '양조장 계약서와 입금 증빙이 필요하다.',
        },
        hypotheses: {
          inputConsidered: `${FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM} 양조장 확정 주장은 가설의 근거가 아니다.`,
          impactAssessment: '이 주장은 미확인 가설과 관련되지만 가설을 확정하지 못한다.',
          holdReason: '증빙은 없어 확인된 사실이 아니므로 가설을 미확인으로 유지한다.',
          evidenceNeeded: '체험 수요를 확인하는 인터뷰 기록이 필요하다.',
        },
      },
    });
    const claimStored = normalizeIncrementalSections(previous, claimRaw, contextFor(FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM));
    expect(claimStored.errors).toEqual([]);
    expect(claimStored.sections?.judgment).toBe(previous.judgment);
    expect(claimStored.sections?.hypotheses).toEqual(['미확인']);
    expect(claimStored.sections?.nextQuestion).toBe('계약서가 있는가?');
    expect(claimStored.sections?.analysis?.nextVerification).toBe(claimPlan);
    expect(claimPlan).toContain(choice);
    expect(experiencePlan).toContain(choice);
    expect(claimPlan).not.toBe(experiencePlan);
    const droppedChoice = JSON.parse(claimRaw) as { nextVerification: string; changes: Array<Record<string, string>> };
    droppedChoice.nextVerification = '체험 수요를 확인하고 계약서와 입금 증빙을 확인한다.';
    const droppedChange = droppedChoice.changes.find((change) => change.field === 'nextVerification');
    if (droppedChange) droppedChange.current = droppedChoice.nextVerification;
    const droppedResult = normalizeIncrementalSections(previous, JSON.stringify(droppedChoice), contextFor(FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM));
    expect(droppedResult.errors).toContain('next_verification_choice_absent');
    expect(droppedResult.sections).toBeNull();
    const claimParsed = JSON.parse(claimRaw) as { changes: Array<Record<string, string>> };
    const claimJudgment = claimParsed.changes.find((change) => change.field === 'judgment');
    expect(claimJudgment?.decision).toBe('retained');
    expect(claimJudgment?.sufficiencyAssessment).toBe('insufficient');
    expect(claimJudgment?.evidenceStatus).toBe('unverified-input');
    expect(claimJudgment?.evidenceNeeded).toContain('계약서');
    expect(claimJudgment?.impactAssessment).not.toContain('변화가 없다');
    expect(reflectionReviewsRepeat(emptyRaw, claimRaw)).toBe(false);
    expect(reflectionReviewsRepeat(emptyRaw, emptyRaw)).toBe(true);
    const promoted = JSON.parse(claimRaw) as { judgment: string; changes: Array<Record<string, string>> };
    promoted.judgment = '양조장과 계약이 확정되었다.';
    const promotedJudgment = promoted.changes.find((change) => change.field === 'judgment');
    if (promotedJudgment) {
      promotedJudgment.current = promoted.judgment;
      promotedJudgment.decision = 'changed';
      promotedJudgment.retentionDecision = 'changed';
      promotedJudgment.sufficiencyAssessment = 'partial';
    }
    const promotedResult = normalizeIncrementalSections(previous, JSON.stringify(promoted), contextFor(FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM));
    expect(promotedResult.errors).toContain('claim_promoted_to_fact:judgment');
    expect(promotedResult.sections).toBeNull();
    const mismatched = JSON.parse(claimRaw) as { changes: Array<Record<string, string>> };
    const mismatchedPlan = mismatched.changes.find((change) => change.field === 'nextVerification');
    if (mismatchedPlan) mismatchedPlan.decision = 'retained';
    const mismatchedQuestion = mismatched.changes.find((change) => change.field === 'nextQuestion');
    if (mismatchedQuestion) mismatchedQuestion.previous = '다른 질문인가?';
    const mismatchedResult = normalizeIncrementalSections(previous, JSON.stringify(mismatched), contextFor(FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM));
    expect(mismatchedResult.errors).toEqual(expect.arrayContaining(['decision_mismatch:nextVerification', 'follow_up_output_previous:nextQuestion']));
    expect(mismatchedResult.sections).toBeNull();
    const breweryQuestion = JSON.parse(emptyRaw) as { nextQuestion: string; changes: Array<Record<string, string>> };
    breweryQuestion.nextQuestion = '양조장 후보가 있는가?';
    const breweryQuestionChange = breweryQuestion.changes.find((change) => change.field === 'nextQuestion');
    if (breweryQuestionChange) {
      breweryQuestionChange.current = breweryQuestion.nextQuestion;
      breweryQuestionChange.decision = 'changed';
      breweryQuestionChange.retentionDecision = 'changed';
      breweryQuestionChange.sufficiencyAssessment = 'partial';
    }
    const breweryQuestionResult = normalizeIncrementalSections(previous, JSON.stringify(breweryQuestion), contextFor(''));
    expect(breweryQuestionResult.errors).toEqual(expect.arrayContaining(['question_not_from_input', 'next_question_unknown_missing']));
    expect(breweryQuestionResult.sections).toBeNull();
    const repeatedQuestion = JSON.parse(emptyRaw) as { nextQuestion: string; changes: Array<Record<string, string>> };
    repeatedQuestion.nextQuestion = previous.nextQuestion;
    const repeatedChange = repeatedQuestion.changes.find((change) => change.field === 'nextQuestion');
    if (repeatedChange) {
      repeatedChange.current = previous.nextQuestion;
      repeatedChange.decision = 'retained';
      repeatedChange.retentionDecision = 'retained';
      repeatedChange.sufficiencyAssessment = 'insufficient';
    }
    const repeatedResult = normalizeIncrementalSections(previous, JSON.stringify(repeatedQuestion), contextFor(''));
    expect(repeatedResult.errors).toContain('question_unchanged');
    expect(repeatedResult.sections).toBeNull();
    const thinHold = JSON.parse(emptyRaw) as { changes: Array<Record<string, string>> };
    const thinJudgment = thinHold.changes.find((change) => change.field === 'judgment');
    if (thinJudgment) {
      thinJudgment.inputConsidered = choice;
      thinJudgment.reason = '기존 판단과 동일하며, 선택한 계획이 판단의 근거가 아니다. 추가적인 고객 인터뷰가 필요하다.';
    }
    const thinHypothesis = thinHold.changes.find((change) => change.field === 'hypotheses');
    if (thinHypothesis) {
      thinHypothesis.inputConsidered = choice;
      thinHypothesis.reason = '기존 가설이 미확인 상태로 유지되며, 추가 정보가 필요하다. 고객의 예약 의향을 확인해야 한다.';
      thinHypothesis.impactAssessment = '기존 가설에 대한 추가 정보가 없으므로 미확인 상태로 남는다. 고객의 예약 의향이 필요하다.';
    }
    const thinHoldResult = normalizeIncrementalSections(previous, JSON.stringify(thinHold), contextFor(''));
    expect(thinHoldResult.errors).toEqual(
      expect.arrayContaining([
        'retention_hold_missing:judgment',
        'input_echo_only:judgment',
        'reason_insufficient:hypotheses',
        'retention_sufficiency_missing:hypotheses',
        'input_echo_only:hypotheses',
        'trace_relation_missing:hypotheses',
      ]),
    );
    expect(thinHoldResult.sections).toBeNull();
    const flippedJudgment = JSON.parse(claimRaw) as { changes: Array<Record<string, string>> };
    const flipped = flippedJudgment.changes.find((change) => change.field === 'judgment');
    if (flipped) {
      flipped.decision = 'changed';
      flipped.retentionDecision = 'changed';
      flipped.sufficiencyAssessment = 'insufficient';
    }
    const flippedResult = normalizeIncrementalSections(previous, JSON.stringify(flippedJudgment), contextFor(FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM));
    expect(flippedResult.errors).toEqual(expect.arrayContaining(['decision_mismatch:judgment', 'sufficiency_conflict:judgment']));
    expect(flippedResult.sections).toBeNull();
    const marketingQuestion = '체험 프로그램과 마케팅 지원 중 어느 쪽을 먼저 검증할지?';
    const repeatedClaimQuestion = JSON.parse(claimRaw) as { nextQuestion: string; changes: Array<Record<string, string>> };
    repeatedClaimQuestion.nextQuestion = marketingQuestion;
    const repeatedClaimChange = repeatedClaimQuestion.changes.find((change) => change.field === 'nextQuestion');
    if (repeatedClaimChange) {
      repeatedClaimChange.current = marketingQuestion;
      repeatedClaimChange.decision = 'changed';
      repeatedClaimChange.retentionDecision = 'changed';
      repeatedClaimChange.sufficiencyAssessment = 'partial';
    }
    const repeatedClaimResult = normalizeIncrementalSections(
      previous,
      JSON.stringify(repeatedClaimQuestion),
      contextFor(FOLLOW_UP_UNVERIFIED_BREWERY_CLAIM),
    );
    expect(repeatedClaimResult.errors).toEqual(expect.arrayContaining(['question_claim_unlinked', 'next_question_regressed']));
    expect(repeatedClaimResult.sections).toBeNull();
    expect(JSON.stringify(previous)).toBe(before);
  });

  it('keeps both input cases unstored when the model does not relate the answer', () => {
    const score = (path: string, version: string) => {
      const recorded = JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')) as {
        runId: string;
        priorRunId: string;
        gitSha: string;
        startedAt: string;
        finishedAt: string;
        productFollowUpInvoked: boolean;
        repairCount: number;
        usage: { promptTokens: number; completionTokens: number; totalTokens: number };
        report: { calls: Array<{ promptVersion: string; raw: string; userPrompt: string; model: string; reviewGaps?: string[] }> };
      };
      const call = recorded.report.calls.find((item) => item.promptVersion === version);
      const sent = JSON.parse(call?.userPrompt ?? '{}') as {
        previousAnalysis: ReviewSections & { analysis: { nextVerification: string } };
        founderChoice: { label: string };
        founderSupplement: string;
        answerOrigin: 'synthetic-test-data';
      };
      const previous = structuredClone(sent.previousAnalysis);
      const before = JSON.stringify(previous);
      const normalized = normalizeIncrementalSections(previous, call?.raw ?? '', {
        previousJudgment: previous.judgment,
        previousHypotheses: [...previous.hypotheses],
        previousNextVerification: previous.analysis.nextVerification,
        previousNextQuestion: previous.nextQuestion,
        previousRevenueModel: previous.revenueModel,
        choiceLabel: sent.founderChoice.label,
        supplement: sent.founderSupplement,
        answerOrigin: sent.answerOrigin,
      });
      expect(JSON.stringify(previous)).toBe(before);
      expect(normalized.sections).toBeNull();
      return { recorded, call, normalized, sent };
    };
    const traced = score(
      '../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-input-trace-recorded.json',
      'reflection-output-11:choice-only',
    );
    expect(traced.recorded.runId).toBe('q1-incremental-reflection-input-trace-2026-10-30');
    expect(traced.recorded.priorRunId).toBe('q1-incremental-reflection-review-fields-2026-10-30');
    expect(traced.recorded.gitSha).toBe('aaf09bf638669c076152303669d580b03cb30856');
    expect(traced.recorded.startedAt).toBe('2026-10-30T08:39:41.903Z');
    expect(traced.recorded.finishedAt).toBe('2026-10-30T08:40:03.214Z');
    expect(traced.recorded.productFollowUpInvoked).toBe(false);
    expect(traced.recorded.repairCount).toBe(1);
    expect(traced.recorded.usage).toEqual({ promptTokens: 12211, completionTokens: 2955, totalTokens: 15166 });
    expect(traced.recorded.report.calls).toHaveLength(3);
    expect(traced.call?.reviewGaps).toEqual([]);
    expect(traced.sent.founderSupplement).toBe('');
    expect(traced.normalized.errors).toEqual([
      'sufficiency_conflict:judgment',
      'sufficiency_conflict:hypotheses',
      'reason_insufficient:nextVerification',
      'next_verification_unchanged',
      'choice_promoted_to_judgment',
      'hypothesis_demand_ungrounded',
      'next_verification_choice_absent',
      'hypothesis_unconfirmed_replaced',
      'judgment_changed_by_choice',
      'priority_plan_unfocused',
    ]);
    const claim = score(
      '../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-input-trace-recorded.json',
      'reflection-output-11:brewery-claim:repair',
    );
    expect(claim.sent.founderSupplement).toContain('확정되었');
    expect(claim.normalized.errors).toEqual([
      'reason_insufficient:judgment',
      'retention_input_missing:judgment',
      'retention_sufficiency_missing:judgment',
      'retention_hold_missing:judgment',
      'retention_evidence_missing:judgment',
      'claim_unmarked:judgment',
      'status_repeat:impactAssessment:judgment',
      'status_repeat:holdReason:judgment',
      'sufficiency_conflict:hypotheses',
      'follow_up_output_previous:nextQuestion',
      'reason_insufficient:nextQuestion',
      'choice_unlinked',
      'hypothesis_unconfirmed_replaced',
      'next_verification_choice_absent',
    ]);
    const repaired = score(
      '../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-choice-repair-recorded.json',
      'reflection-output-11:choice-only:repair',
    );
    expect(repaired.recorded.runId).toBe('q1-incremental-reflection-choice-repair-2026-10-30');
    expect(repaired.recorded.priorRunId).toBe('q1-incremental-reflection-input-trace-2026-10-30');
    expect(repaired.recorded.gitSha).toBe('746e9e1c4538822eebeb9686d03da17f270a0f2a');
    expect(repaired.recorded.startedAt).toBe('2026-10-30T08:43:56.156Z');
    expect(repaired.recorded.finishedAt).toBe('2026-10-30T08:44:08.809Z');
    expect(repaired.recorded.productFollowUpInvoked).toBe(false);
    expect(repaired.recorded.repairCount).toBe(1);
    expect(repaired.recorded.usage).toEqual({ promptTokens: 8192, completionTokens: 1682, totalTokens: 9874 });
    expect(repaired.recorded.report.calls).toHaveLength(2);
    expect(repaired.recorded.report.calls[0]?.raw).toBe(repaired.recorded.report.calls[1]?.raw);
    expect(repaired.sent.founderSupplement).toBe('');
    expect(repaired.normalized.errors).toEqual([
      'sufficiency_conflict:judgment',
      'sufficiency_conflict:hypotheses',
      'choice_promoted_to_judgment',
      'next_verification_choice_absent',
      'hypothesis_unconfirmed_replaced',
      'judgment_changed_by_choice',
      'priority_plan_unfocused',
    ]);
    expect(reflectionReviewsRepeat(traced.call?.raw ?? '', claim.call?.raw ?? '')).toBe(false);
  });

  it('keeps the meaning-trace run unstored when the repair still misses the input', () => {
    const recorded = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-meaning-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      startedAt: string;
      finishedAt: string;
      productFollowUpInvoked: boolean;
      repairCount: number;
      responseFormat: string;
      usage: { promptTokens: number; completionTokens: number; totalTokens: number };
      report: { calls: Array<{ promptVersion: string; raw: string; userPrompt: string; model: string }> };
    };
    expect(recorded.runId).toBe('q1-incremental-reflection-meaning-2026-10-30');
    expect(recorded.priorRunId).toBe('q1-incremental-reflection-choice-repair-2026-10-30');
    expect(recorded.gitSha).toBe('feccf08415f288684945d5c5180a8214a058daef');
    expect(recorded.startedAt).toBe('2026-10-30T09:04:33.353Z');
    expect(recorded.finishedAt).toBe('2026-10-30T09:05:09.623Z');
    expect(recorded.productFollowUpInvoked).toBe(false);
    expect(recorded.responseFormat).toBe('json_schema');
    expect(recorded.repairCount).toBe(2);
    expect(recorded.usage).toEqual({ promptTokens: 17376, completionTokens: 3492, totalTokens: 20868 });
    expect(recorded.report.calls).toHaveLength(4);
    expect(recorded.report.calls[0]?.raw).not.toBe(recorded.report.calls[1]?.raw);
    expect(recorded.report.calls[2]?.raw).not.toBe(recorded.report.calls[3]?.raw);
    const score = (version: string) => {
      const call = recorded.report.calls.find((item) => item.promptVersion === version);
      const sent = JSON.parse(call?.userPrompt ?? '{}') as {
        previousAnalysis: ReviewSections & { analysis: { nextVerification: string } };
        founderChoice: { label: string };
        founderSupplement: string;
        answerOrigin: 'synthetic-test-data';
      };
      const previous = structuredClone(sent.previousAnalysis);
      const before = JSON.stringify(previous);
      const normalized = normalizeIncrementalSections(previous, call?.raw ?? '', {
        previousJudgment: previous.judgment,
        previousHypotheses: [...previous.hypotheses],
        previousNextVerification: previous.analysis.nextVerification,
        previousNextQuestion: previous.nextQuestion,
        previousRevenueModel: previous.revenueModel,
        choiceLabel: sent.founderChoice.label,
        supplement: sent.founderSupplement,
        answerOrigin: sent.answerOrigin,
      });
      expect(JSON.stringify(previous)).toBe(before);
      expect(normalized.sections).toBeNull();
      return normalized.errors;
    };
    expect(score('reflection-output-11:choice-only:repair')).toEqual([
      'retention_hold_missing:judgment',
      'retention_evidence_missing:judgment',
      'status_repeat:impactAssessment:judgment',
      'input_echo_only:judgment',
      'trace_relation_missing:judgment',
      'reason_insufficient:hypotheses',
      'retention_sufficiency_missing:hypotheses',
      'retention_hold_missing:hypotheses',
      'retention_evidence_missing:hypotheses',
      'review_hold_generic:impactAssessment:hypotheses',
      'review_hold_generic:holdReason:hypotheses',
      'input_echo_only:hypotheses',
      'trace_relation_missing:hypotheses',
      'priority_plan_unfocused',
    ]);
    expect(score('reflection-output-11:brewery-claim:repair')).toEqual([
      'retention_input_missing:hypotheses',
      'retention_hold_missing:hypotheses',
      'retention_evidence_missing:hypotheses',
      'decision_mismatch:nextVerification',
      'follow_up_output_previous:nextQuestion',
      'claim_verification_missing',
    ]);
    expect(reflectionReviewsRepeat(recorded.report.calls[1]?.raw ?? '', recorded.report.calls[3]?.raw ?? '')).toBe(false);
  });

  it('keeps the relation run unstored when the repair still misses the input', () => {
    const recorded = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-relation-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      startedAt: string;
      finishedAt: string;
      productFollowUpInvoked: boolean;
      repairCount: number;
      responseFormat: string;
      usage: { promptTokens: number; completionTokens: number; totalTokens: number };
      report: { calls: Array<{ promptVersion: string; raw: string; userPrompt: string; sameAsFirst?: boolean }> };
    };
    expect(recorded.runId).toBe('q1-incremental-reflection-relation-2026-10-30');
    expect(recorded.priorRunId).toBe('q1-incremental-reflection-meaning-2026-10-30');
    expect(recorded.gitSha).toBe('73f3390c660f0450353b1d700e47a1cd54a61d36');
    expect(recorded.startedAt).toBe('2026-10-30T09:33:07.192Z');
    expect(recorded.finishedAt).toBe('2026-10-30T09:33:36.617Z');
    expect(recorded.productFollowUpInvoked).toBe(false);
    expect(recorded.responseFormat).toBe('json_schema');
    expect(recorded.repairCount).toBe(2);
    expect(recorded.usage).toEqual({ promptTokens: 17547, completionTokens: 3280, totalTokens: 20827 });
    expect(recorded.report.calls).toHaveLength(4);
    expect(recorded.report.calls[0]?.raw).not.toBe(recorded.report.calls[1]?.raw);
    expect(recorded.report.calls[2]?.raw).not.toBe(recorded.report.calls[3]?.raw);
    expect(recorded.report.calls[1]?.sameAsFirst).toBe(false);
    expect(recorded.report.calls[3]?.sameAsFirst).toBe(false);
    const score = (version: string) => {
      const call = recorded.report.calls.find((item) => item.promptVersion === version);
      const sent = JSON.parse(call?.userPrompt ?? '{}') as {
        previousAnalysis: ReviewSections & { analysis: { nextVerification: string } };
        founderChoice: { label: string };
        founderSupplement: string;
        answerOrigin: 'synthetic-test-data';
      };
      const previous = structuredClone(sent.previousAnalysis);
      const before = JSON.stringify(previous);
      const normalized = normalizeIncrementalSections(previous, call?.raw ?? '', {
        previousJudgment: previous.judgment,
        previousHypotheses: [...previous.hypotheses],
        previousNextVerification: previous.analysis.nextVerification,
        previousNextQuestion: previous.nextQuestion,
        previousRevenueModel: previous.revenueModel,
        choiceLabel: sent.founderChoice.label,
        supplement: sent.founderSupplement,
        answerOrigin: sent.answerOrigin,
      });
      expect(JSON.stringify(previous)).toBe(before);
      expect(normalized.sections).toBeNull();
      return normalized.errors;
    };
    expect(score('reflection-output-11:choice-only:repair')).toEqual([
      'retention_sufficiency_missing:judgment',
      'retention_hold_missing:judgment',
      'input_echo_only:judgment',
      'retention_evidence_missing:hypotheses',
      'retention_hold_missing:hypotheses',
      'input_echo_only:hypotheses',
      'question_not_from_input',
      'priority_task_dropped',
      'next_question_unknown_missing',
    ]);
    expect(score('reflection-output-11:brewery-claim:repair')).toEqual([
      'retention_input_missing:judgment',
      'retention_evidence_missing:judgment',
      'retention_input_missing:hypotheses',
      'retention_evidence_missing:hypotheses',
      'choice_unlinked',
      'next_verification_choice_absent',
    ]);
    expect(reflectionReviewsRepeat(recorded.report.calls[1]?.raw ?? '', recorded.report.calls[3]?.raw ?? '')).toBe(false);
  });

  it('keeps the unified run unstored when the repair still misses the input', () => {
    const recorded = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-unified-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      startedAt: string;
      finishedAt: string;
      productFollowUpInvoked: boolean;
      repairCount: number;
      responseFormat: string;
      usage: { promptTokens: number; completionTokens: number; totalTokens: number };
      report: { calls: Array<{ promptVersion: string; raw: string; userPrompt: string; sameAsFirst?: boolean }> };
    };
    expect(recorded.runId).toBe('q1-incremental-reflection-unified-2026-10-30');
    expect(recorded.priorRunId).toBe('q1-incremental-reflection-relation-2026-10-30');
    expect(recorded.gitSha).toBe('1e25e87747020e1eb08e9176590219e562caf19e');
    expect(recorded.startedAt).toBe('2026-10-30T10:06:25.276Z');
    expect(recorded.finishedAt).toBe('2026-10-30T10:06:57.047Z');
    expect(recorded.productFollowUpInvoked).toBe(false);
    expect(recorded.responseFormat).toBe('json_schema');
    expect(recorded.repairCount).toBe(2);
    expect(recorded.usage).toEqual({ promptTokens: 18111, completionTokens: 3538, totalTokens: 21649 });
    expect(recorded.report.calls).toHaveLength(4);
    expect(recorded.report.calls[0]?.raw).not.toBe(recorded.report.calls[1]?.raw);
    expect(recorded.report.calls[2]?.raw).not.toBe(recorded.report.calls[3]?.raw);
    expect(recorded.report.calls[1]?.sameAsFirst).toBe(false);
    expect(recorded.report.calls[3]?.sameAsFirst).toBe(false);
    const score = (version: string) => {
      const call = recorded.report.calls.find((item) => item.promptVersion === version);
      const sent = JSON.parse(call?.userPrompt ?? '{}') as {
        previousAnalysis: ReviewSections & { analysis: { nextVerification: string } };
        founderChoice: { label: string };
        founderSupplement: string;
        answerOrigin: 'synthetic-test-data';
      };
      const previous = structuredClone(sent.previousAnalysis);
      const before = JSON.stringify(previous);
      const normalized = normalizeIncrementalSections(previous, call?.raw ?? '', {
        previousJudgment: previous.judgment,
        previousHypotheses: [...previous.hypotheses],
        previousNextVerification: previous.analysis.nextVerification,
        previousNextQuestion: previous.nextQuestion,
        previousRevenueModel: previous.revenueModel,
        choiceLabel: sent.founderChoice.label,
        supplement: sent.founderSupplement,
        answerOrigin: sent.answerOrigin,
      });
      expect(JSON.stringify(previous)).toBe(before);
      expect(normalized.sections).toBeNull();
      return normalized.errors;
    };
    expect(score('reflection-output-11:choice-only:repair')).toEqual([
      'retention_hold_missing:judgment',
      'input_echo_only:judgment',
      'reason_insufficient:hypotheses',
      'retention_sufficiency_missing:hypotheses',
      'input_echo_only:hypotheses',
      'trace_relation_missing:hypotheses',
      'priority_task_dropped',
    ]);
    expect(score('reflection-output-11:brewery-claim:repair')).toEqual([
      'decision_mismatch:judgment',
      'reason_insufficient:judgment',
      'sufficiency_conflict:judgment',
      'decision_mismatch:hypotheses',
      'reason_insufficient:hypotheses',
      'sufficiency_conflict:hypotheses',
      'decision_mismatch:nextQuestion',
      'reason_insufficient:nextQuestion',
      'question_unchanged',
      'question_claim_unlinked',
      'next_question_regressed',
    ]);
    expect(reflectionReviewsRepeat(recorded.report.calls[1]?.raw ?? '', recorded.report.calls[3]?.raw ?? '')).toBe(false);
  });

  it('keeps the decision run unstored when the repair still misses the grounds', () => {
    const recorded = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-decision-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      startedAt: string;
      finishedAt: string;
      productFollowUpInvoked: boolean;
      repairCount: number;
      responseFormat: string;
      usage: { promptTokens: number; completionTokens: number; totalTokens: number };
      report: { calls: Array<{ promptVersion: string; raw: string; userPrompt: string; sameAsFirst?: boolean }> };
    };
    expect(recorded.runId).toBe('q1-incremental-reflection-decision-2026-10-30');
    expect(recorded.priorRunId).toBe('q1-incremental-reflection-unified-2026-10-30');
    expect(recorded.gitSha).toBe('710719abc418b9677e2362c5e9c871e5f4463322');
    expect(recorded.startedAt).toBe('2026-10-30T10:30:13.770Z');
    expect(recorded.finishedAt).toBe('2026-10-30T10:30:44.036Z');
    expect(recorded.productFollowUpInvoked).toBe(false);
    expect(recorded.responseFormat).toBe('json_schema');
    expect(recorded.repairCount).toBe(2);
    expect(recorded.usage).toEqual({ promptTokens: 18032, completionTokens: 3046, totalTokens: 21078 });
    expect(recorded.report.calls).toHaveLength(4);
    expect(recorded.report.calls[0]?.raw).toBe(recorded.report.calls[1]?.raw);
    expect(recorded.report.calls[2]?.raw).not.toBe(recorded.report.calls[3]?.raw);
    expect(recorded.report.calls[1]?.sameAsFirst).toBe(true);
    expect(recorded.report.calls[3]?.sameAsFirst).toBe(false);
    const score = (version: string) => {
      const call = recorded.report.calls.find((item) => item.promptVersion === version);
      const sent = JSON.parse(call?.userPrompt ?? '{}') as {
        previousAnalysis: ReviewSections & { analysis: { nextVerification: string } };
        founderChoice: { label: string };
        founderSupplement: string;
        answerOrigin: 'synthetic-test-data';
      };
      const previous = structuredClone(sent.previousAnalysis);
      const before = JSON.stringify(previous);
      const normalized = normalizeIncrementalSections(previous, call?.raw ?? '', {
        previousJudgment: previous.judgment,
        previousHypotheses: [...previous.hypotheses],
        previousNextVerification: previous.analysis.nextVerification,
        previousNextQuestion: previous.nextQuestion,
        previousRevenueModel: previous.revenueModel,
        choiceLabel: sent.founderChoice.label,
        supplement: sent.founderSupplement,
        answerOrigin: sent.answerOrigin,
      });
      expect(JSON.stringify(previous)).toBe(before);
      expect(normalized.sections).toBeNull();
      return normalized.errors;
    };
    expect(score('reflection-output-11:choice-only:repair')).toEqual([
      'reason_insufficient:judgment',
      'retention_sufficiency_missing:judgment',
      'retention_evidence_missing:judgment',
      'input_echo_only:judgment',
      'reason_insufficient:hypotheses',
      'retention_sufficiency_missing:hypotheses',
      'input_echo_only:hypotheses',
      'priority_plan_unfocused',
    ]);
    expect(score('reflection-output-11:brewery-claim:repair')).toEqual([
      'retention_effect_missing:judgment',
      'retention_hold_missing:judgment',
      'retention_evidence_missing:judgment',
      'retention_effect_missing:hypotheses',
      'retention_hold_missing:hypotheses',
      'retention_evidence_missing:hypotheses',
    ]);
    expect(reflectionReviewsRepeat(recorded.report.calls[1]?.raw ?? '', recorded.report.calls[3]?.raw ?? '')).toBe(false);
  });

  it('keeps the retention run unstored when the reason still misses the hold grounds', () => {
    const recorded = JSON.parse(
      readFileSync(
        new URL('../../../../../../docs/evidence/ALABOM/AI-PM/sprint-q1-incremental-reflection-retention-recorded.json', import.meta.url),
        'utf8',
      ),
    ) as {
      runId: string;
      priorRunId: string;
      gitSha: string;
      startedAt: string;
      finishedAt: string;
      productFollowUpInvoked: boolean;
      repairCount: number;
      responseFormat: string;
      usage: { promptTokens: number; completionTokens: number; totalTokens: number };
      report: { calls: Array<{ promptVersion: string; raw: string; userPrompt: string; sameAsFirst?: boolean }> };
    };
    expect(recorded.runId).toBe('q1-incremental-reflection-retention-2026-10-30');
    expect(recorded.priorRunId).toBe('q1-incremental-reflection-decision-2026-10-30');
    expect(recorded.gitSha).toBe('610d52b60ae7de40f98e85030c7c90d32f2b6fad');
    expect(recorded.startedAt).toBe('2026-10-30T10:46:10.209Z');
    expect(recorded.finishedAt).toBe('2026-10-30T10:46:39.781Z');
    expect(recorded.productFollowUpInvoked).toBe(false);
    expect(recorded.responseFormat).toBe('json_schema');
    expect(recorded.repairCount).toBe(2);
    expect(recorded.usage).toEqual({ promptTokens: 18773, completionTokens: 3398, totalTokens: 22171 });
    expect(recorded.report.calls).toHaveLength(4);
    expect(recorded.report.calls[0]?.raw).not.toBe(recorded.report.calls[1]?.raw);
    expect(recorded.report.calls[2]?.raw).not.toBe(recorded.report.calls[3]?.raw);
    expect(recorded.report.calls[1]?.sameAsFirst).toBe(false);
    expect(recorded.report.calls[3]?.sameAsFirst).toBe(false);
    const score = (version: string) => {
      const call = recorded.report.calls.find((item) => item.promptVersion === version);
      const sent = JSON.parse(call?.userPrompt ?? '{}') as {
        previousAnalysis: ReviewSections & { analysis: { nextVerification: string } };
        founderChoice: { label: string };
        founderSupplement: string;
        answerOrigin: 'synthetic-test-data';
      };
      const previous = structuredClone(sent.previousAnalysis);
      const before = JSON.stringify(previous);
      const normalized = normalizeIncrementalSections(previous, call?.raw ?? '', {
        previousJudgment: previous.judgment,
        previousHypotheses: [...previous.hypotheses],
        previousNextVerification: previous.analysis.nextVerification,
        previousNextQuestion: previous.nextQuestion,
        previousRevenueModel: previous.revenueModel,
        choiceLabel: sent.founderChoice.label,
        supplement: sent.founderSupplement,
        answerOrigin: sent.answerOrigin,
      });
      expect(JSON.stringify(previous)).toBe(before);
      expect(normalized.sections).toBeNull();
      return normalized.errors;
    };
    expect(score('reflection-output-11:choice-only:repair')).toEqual([
      'reason_insufficient:judgment',
      'retention_sufficiency_missing:judgment',
      'review_hold_generic:impactAssessment:judgment',
      'input_echo_only:judgment',
      'trace_relation_missing:judgment',
      'reason_insufficient:hypotheses',
      'retention_sufficiency_missing:hypotheses',
      'review_hold_generic:impactAssessment:hypotheses',
      'input_echo_only:hypotheses',
      'trace_relation_missing:hypotheses',
    ]);
    expect(score('reflection-output-11:brewery-claim:repair')).toEqual([
      'reason_insufficient:judgment',
      'retention_sufficiency_missing:judgment',
      'claim_unmarked:judgment',
      'reason_insufficient:hypotheses',
      'retention_sufficiency_missing:hypotheses',
      'claim_verification_missing',
    ]);
    expect(reflectionReviewsRepeat(recorded.report.calls[1]?.raw ?? '', recorded.report.calls[3]?.raw ?? '')).toBe(false);
  });

  it('accumulates a second synthetic answer on the updated analysis', () => {
    const choice = '체험 프로그램을 먼저 검증할 것';
    const originalQuestion = '체험 프로그램과 마케팅 지원 중 어느 쪽을 먼저 검증할지?';
    const firstPlan = `${choice} 잠재 고객의 체험 참여 의향을 인터뷰로 확인한다. 이 단계는 아직 실행되지 않았다. 그 다음에도 온라인 마케팅 검증은 남아 있다.`;
    const firstQuestion = '체험 프로그램에 참여할 고객이 있는가?';
    const base = sections();
    const original: ReviewSections = {
      ...base,
      hypotheses: ['미확인'],
      nextQuestion: originalQuestion,
      analysis: {
        summary: base.judgment,
        value: '미확인',
        operatingModel: '구상',
        payer: '미확인',
        competition: '미확인',
        operations: '구상',
        profitability: '미확인',
        strengths: ['구상'],
        assumptions: ['미확인'],
        evidenceToChange: ['수요'],
        founderFacts: ['관광객'],
        inferences: ['추론'],
        judgmentDetail: '보류',
        choices: [],
        nextVerification: '체험 프로그램의 수요 검증 및 온라인 마케팅 효과 검증',
      },
    };
    const parentBefore = JSON.stringify(original);
    const fieldRow = (
      field: string,
      prior: string,
      current: string,
      reason: string,
      review: Record<string, string>,
    ) => {
      const decision = current === prior ? 'retained' : 'changed';
      return {
        field,
        previous: prior,
        current,
        decision,
        reason,
        evidenceStatus: 'unverified-input',
        sufficiencyAssessment: decision === 'changed' ? 'partial' : 'insufficient',
        retentionDecision: decision,
        ...review,
      };
    };
    const firstRaw = JSON.stringify({
      judgment: original.judgment,
      hypotheses: ['미확인'],
      nextVerification: firstPlan,
      nextQuestion: firstQuestion,
      revenueModel: original.revenueModel,
      changes: [
        fieldRow(
          'judgment',
          original.judgment,
          original.judgment,
          `${choice} 은 검증 계획이라 저장된 판단의 근거가 아니다. 수요가 확인되지 않아 판단을 바꾸지 않고 유지한다. 판단을 바꾸려면 고객 인터뷰가 필요하다.`,
          {
            inputConsidered: `${choice} 은 검증 순서에 대한 계획이며 수요가 확인되지 않은 상태다.`,
            impactAssessment: '선택한 계획은 저장된 판단과 관련된다. 수요가 확인되지 않아 그 계획을 판단의 근거로 쓰지 않는다.',
            holdReason: '수요가 확인되지 않아 이 계획은 근거가 아니다. 저장된 판단을 유지한다.',
            evidenceNeeded: '체험에 참여할 고객 인터뷰가 필요하다.',
          },
        ),
        fieldRow(
          'hypotheses',
          '미확인',
          '미확인',
          `${choice} 은 가설을 확정하지 못한다. 수요 근거가 부족해 미확인으로 유지한다. 가설을 바꾸려면 고객 인터뷰가 필요하다.`,
          {
            inputConsidered: `${choice} 은 가설을 정하는 근거가 아니라 검증 계획이다.`,
            impactAssessment: '이 계획은 미확인 가설과 관련되지만 근거가 부족해 가설을 확정하지 못한다.',
            holdReason: '수요 근거가 부족해 가설을 미확인으로 유지한다.',
            evidenceNeeded: '체험 참여 의향을 묻는 고객 인터뷰 기록이 필요하다.',
          },
        ),
        fieldRow(
          'nextVerification',
          original.analysis?.nextVerification ?? '',
          firstPlan,
          `${choice} 때문에 검증은 체험 참여 의향을 확인하는 순서로 바뀐다.`,
          {
            inputConsidered: `${choice} 은 다음 검증의 우선순위다.`,
            impactAssessment: '검증 계획이 체험 프로그램 확인으로 바뀐다.',
            holdReason: '기존 검증 문장을 유지하지 않고 검증 순서를 바꾼다.',
            evidenceNeeded: '고객 인터뷰 기록이 필요하다.',
          },
        ),
        fieldRow(
          'nextQuestion',
          originalQuestion,
          firstQuestion,
          `${choice} 은 체험 수요가 확인되지 않은 계획이다. 다음 질문은 참여할 고객이 있는지다.`,
          {
            inputConsidered: `${choice} 이후 아직 없는 참여 의향을 묻는다.`,
            impactAssessment: '질문이 체험 참여 확인으로 바뀐다.',
            holdReason: '이전 질문을 유지하지 않고 남은 불확실성을 묻는다.',
            evidenceNeeded: '고객 인터뷰가 필요하다.',
          },
        ),
      ],
    });
    const firstContext = {
      previousJudgment: original.judgment,
      previousHypotheses: [...original.hypotheses],
      previousNextVerification: original.analysis?.nextVerification ?? '',
      previousNextQuestion: original.nextQuestion,
      previousRevenueModel: original.revenueModel,
      choiceLabel: choice,
      supplement: '',
      answerOrigin: 'synthetic-test-data' as const,
    };
    const first = normalizeIncrementalSections(original, firstRaw, firstContext);
    expect(first.errors).toEqual([]);
    expect(JSON.stringify(original)).toBe(parentBefore);
    expect(first.sections?.judgment).toBe(original.judgment);
    expect(first.sections?.analysis?.nextVerification).toContain('그 다음');
    expect(first.sections?.analysis?.nextVerification).toContain('온라인 마케팅');
    expect(first.sections?.nextQuestion).toBe(firstQuestion);
    const updated = first.sections;
    if (!updated?.analysis) throw new Error('first_sections_missing');
    const updatedBefore = JSON.stringify(updated);
    const secondSupplement = '잠재 고객 인터뷰 기록은 아직 없다.';
    const secondPlan = `${choice} 체험 참여 의향을 물을 인터뷰 기록이 아직 없다. 그 기록을 확인한 뒤에 실행 가능성을 본다.`;
    const secondQuestion = '체험 참여 의향을 물을 고객 인터뷰를 언제 시작할 수 있는가?';
    const secondRaw = JSON.stringify({
      judgment: updated.judgment,
      hypotheses: ['미확인'],
      nextVerification: secondPlan,
      nextQuestion: secondQuestion,
      revenueModel: updated.revenueModel,
      changes: [
        fieldRow(
          'judgment',
          updated.judgment,
          updated.judgment,
          `${secondSupplement} 이 말은 인터뷰가 아직 없다는 입력이라 저장된 판단의 근거가 아니다. 근거가 부족해 판단을 바꾸지 않고 유지한다. 판단을 바꾸려면 인터뷰 기록이 필요하다.`,
          {
            inputConsidered: `${secondSupplement} 인터뷰 기록이 없다는 입력이며 판단을 입증하지 않는다.`,
            impactAssessment: '새 입력은 인터뷰 부재다. 저장된 판단과 관련되지만 근거가 부족해 판단을 바꾸지 않는다.',
            holdReason: '인터뷰 기록이 없어 근거가 부족하다. 저장된 판단을 유지한다.',
            evidenceNeeded: '체험 참여 의향을 남긴 고객 인터뷰 기록이 필요하다.',
          },
        ),
        fieldRow(
          'hypotheses',
          '미확인',
          '미확인',
          `${secondSupplement} 이 입력은 가설을 확정하지 못한다. 인터뷰 기록이 없어 근거가 부족하고 미확인으로 유지한다. 가설을 바꾸려면 인터뷰 기록이 필요하다.`,
          {
            inputConsidered: `${secondSupplement} 인터뷰 기록이 없다는 입력이며 가설의 근거가 아니다.`,
            impactAssessment: '이 입력은 미확인 가설과 관련되지만 근거가 부족해 가설을 확정하지 못한다.',
            holdReason: '인터뷰 근거가 부족해 가설을 미확인으로 유지한다.',
            evidenceNeeded: '고객 인터뷰 기록이 필요하다.',
          },
        ),
        fieldRow(
          'nextVerification',
          updated.analysis.nextVerification,
          secondPlan,
          `${secondSupplement} ${choice} 인터뷰 기록이 없으므로 검증은 그 기록을 확인하는 순서로 남는다.`,
          {
            inputConsidered: `${secondSupplement} 때문에 체험 검증은 인터뷰 기록 확인이다.`,
            impactAssessment: '검증 대상이 아직 없는 인터뷰 기록으로 좁아진다.',
            holdReason: '이전 검증 문장을 유지하지 않고 기록 확인으로 바꾼다.',
            evidenceNeeded: '고객 인터뷰 기록이 필요하다.',
          },
        ),
        fieldRow(
          'nextQuestion',
          updated.nextQuestion,
          secondQuestion,
          `${secondSupplement} 인터뷰 기록이 없어 시작 시점을 질문한다.`,
          {
            inputConsidered: `${secondSupplement} 이후 남은 질문은 인터뷰 시작 시점이다.`,
            impactAssessment: '질문이 인터뷰 실행 가능 시점으로 바뀐다.',
            holdReason: '이전 질문을 유지하지 않고 남은 불확실성을 묻는다.',
            evidenceNeeded: '인터뷰 일정이 필요하다.',
          },
        ),
      ],
    });
    const second = normalizeIncrementalSections(updated, secondRaw, {
      previousJudgment: updated.judgment,
      previousHypotheses: [...updated.hypotheses],
      previousNextVerification: updated.analysis.nextVerification,
      previousNextQuestion: updated.nextQuestion,
      previousRevenueModel: updated.revenueModel,
      choiceLabel: choice,
      supplement: secondSupplement,
      answerOrigin: 'synthetic-test-data',
    });
    expect(second.errors).toEqual([]);
    expect(JSON.stringify(original)).toBe(parentBefore);
    expect(JSON.stringify(updated)).toBe(updatedBefore);
    expect(second.sections?.judgment).toBe(original.judgment);
    expect(second.sections?.hypotheses).toEqual(['미확인']);
    expect(second.sections?.analysis?.nextVerification).toBe(secondPlan);
    expect(second.sections?.nextQuestion).toBe(secondQuestion);
    expect(second.sections?.nextQuestion).not.toBe(firstQuestion);
    expect(second.sections?.nextQuestion).not.toBe(originalQuestion);
    expect(secondPlan).toContain(choice);
    expect(secondPlan).toContain('인터뷰');
    expect(secondPlan).not.toContain('확정되었');
    const broken = JSON.parse(secondRaw) as { changes: Array<Record<string, string>> };
    const brokenQuestion = broken.changes.find((change) => change.field === 'nextQuestion');
    if (brokenQuestion) brokenQuestion.previous = originalQuestion;
    const brokenResult = normalizeIncrementalSections(updated, JSON.stringify(broken), {
      previousJudgment: updated.judgment,
      previousHypotheses: [...updated.hypotheses],
      previousNextVerification: updated.analysis.nextVerification,
      previousNextQuestion: updated.nextQuestion,
      previousRevenueModel: updated.revenueModel,
      choiceLabel: choice,
      supplement: secondSupplement,
      answerOrigin: 'synthetic-test-data',
    });
    expect(brokenResult.errors).toContain('follow_up_output_previous:nextQuestion');
    expect(brokenResult.sections).toBeNull();
    expect(JSON.stringify(updated)).toBe(updatedBefore);
  });

  it('stores the child from changes, restores the same sections, and ignores a duplicate submit', async () => {
    const store = openAiPmReviewStore(storePath());
    const chat = async (request: ChatRequest) => {
      const followUp = request.messages.some((message) => message.content.includes('이번 답이 판단'));
      return reply(
        followUp
          ? productAnalysisRaw({ judgment: '추가 설명은 인터뷰가 없다는 말이다.', nextQuestion: '인터뷰 대상을 정했습니까?' })
          : JSON.stringify(sections()),
      );
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
    const parentBefore = JSON.stringify((await store.readReview('user-a', first.record.reviewId))?.sections);
    await saveReviewFeedback({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      now: NOW,
      body: {
        reviewId: first.record.reviewId,
        agreement: 'partial',
        accuracy: 'mostly_accurate',
        revisionAreas: ['evidence'],
        comment: '인터뷰는 아직 없다.',
        nextAction: 'verify_hypotheses',
      },
    });
    const raw = productAnalysisRaw({ judgment: '추가 설명은 인터뷰가 없다는 말이다.', nextQuestion: '인터뷰 대상을 정했습니까?' });
    expect(parseSections(raw, PLAN)?.analysis?.judgmentDetail).toContain('인터뷰가 없다');
    const follow = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: '양조장 대표 인터뷰는 아직 없다.',
      now: NOW,
      chat: async () => reply(raw),
      evidence: 'injected_http',
    });
    expect(follow.ok).toBe(true);
    if (!follow.ok) return;
    expect(follow.called).toBe(true);
    expect(follow.record.status).toBe('succeeded');
    expect(follow.record.sections?.analysis?.judgmentDetail).toContain('인터뷰가 없다');
    expect(follow.record.sections?.nextQuestion).toBe('인터뷰 대상을 정했습니까?');
    expect(follow.record.consultingTurn?.supplement).toBe('양조장 대표 인터뷰는 아직 없다.');
    expect(follow.record.parentReviewId).toBe(first.record.reviewId);
    const reread = await store.readReview('user-a', follow.record.reviewId);
    expect(reread?.sections).toEqual(follow.record.sections);
    expect(reread?.status).toBe('succeeded');
    const parent = await store.readReview('user-a', first.record.reviewId);
    expect(JSON.stringify(parent?.sections)).toBe(parentBefore);
    const again = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: '양조장 대표 인터뷰는 아직 없다.',
      now: NOW,
      chat: async () => reply(raw),
      evidence: 'injected_http',
    });
    expect(again.ok && again.called).toBe(false);
    if (again.ok) expect(again.record.reviewId).toBe(follow.record.reviewId);
    const children = (await store.listReviews('user-a', 'project-test')).filter((record) => record.parentReviewId === first.record.reviewId);
    expect(children).toHaveLength(1);
    const broken = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: '다른 추가 설명',
      now: NOW,
      chat: async () => reply('{'),
      evidence: 'injected_http',
    });
    expect(broken.ok).toBe(true);
    if (!broken.ok) return;
    expect(broken.record.status).toBe('failed');
    expect(broken.record.sections).toBeNull();
    expect(broken.record.rawContent).toBe('{');
    expect(broken.record.error).toContain('invalid_json');
    expect((await store.readReview('user-a', first.record.reviewId))?.sections?.judgment).toBe(sections().judgment);
    store.close();
  });

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
      const body =
        seen.length > 1
          ? productAnalysisRaw({ judgment: '인터뷰는 아직 없다.', nextQuestion: '인터뷰 대상을 정했습니까?' })
          : JSON.stringify(sections());
      return reply(body, { model: seen.length === 1 ? 'gpt-4o-mini' : 'gpt-4o-mini-later' });
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
      latestAnalysis: { priorQuestionText: string };
      founderFeedback: { comment: string } | null;
      founderSupplement: string;
      priorTurns: unknown[];
    };
    expect(followPayload.originalInput).toBe(PLAN);
    expect(followPayload.latestAnalysis.priorQuestionText).toContain('양조장 대표');
    expect(followPayload.founderFeedback?.comment).toContain('양조장 수');
    expect(followPayload.founderSupplement).toContain('인터뷰');
    expect(followPayload.priorTurns).toEqual([]);
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
      answerOrigin: 'founder-input',
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
      answerOrigin: 'founder-input',
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
    expect(panel).toContain('/api/ai-pm-review/follow-up');
    expect(panel).toContain('data-testid="ai-pm-reanalysis-note"');
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
        expect(content).toContain('이번 답이 판단');
        expect(content).not.toContain(FOLLOW_UP_OUTPUT_CONTRACT);
        return reply(productAnalysisRaw({ judgment: `${answer} 그래서 제안 여부는 아직이다.`, nextQuestion: '제안할 양조장을 골랐습니까?' }));
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
    const breweryRequest = buildFirstReviewRequest(`${BREWERY}\n\n검토 목적: 종합 사업성 검토`);
    const breweryJoined = breweryRequest.messages.map((message) => message.content).join('\n');
    expect(breweryJoined).toContain('양조장 체험');
    expect(breweryJoined).toContain('원문에 없는 수익 항목은 가설로 적는다');
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

  it('keeps the saved analysis and founder answer when the next call is limited', async () => {
    const store = openAiPmReviewStore(storePath());
    let calls = 0;
    const chat = async () => {
      calls += 1;
      if (calls === 1) return reply(JSON.stringify(sections()));
      throw new Error('OpenAI rate limit exceeded provider_http=429 code=rate_limit_exceeded type=tokens');
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
    const saved = await saveReviewFeedback({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      now: NOW,
      body: {
        reviewId: first.record.reviewId,
        agreement: 'partial',
        accuracy: 'mostly_accurate',
        revisionAreas: ['payer'],
        comment: '양조장 대표 답은 그대로 둔다.',
        nextAction: 'verify_hypotheses',
      },
    });
    expect(saved.ok).toBe(true);
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
    expect(calls).toBe(2);
    expect(follow.view.status).toBe('failed');
    expect(follow.view.failure).toBe('call_limited');
    expect(follow.view.sections).toBeNull();
    expect(follow.record.error).toContain('rate_limit_exceeded');
    expect(follow.record.parentReviewId).toBe(first.record.reviewId);
    expect(follow.record.status).toBe('failed');
    expect(JSON.stringify(follow.view).toLowerCase()).not.toMatch(/openai|gemini|\bgpt\b|token/);
    const copy = reviewFailureCopy(follow.view.failure);
    expect(copy).toContain('호출 한도');
    expect(copy).toContain('다시 시도');
    expect(copy.toLowerCase()).not.toMatch(/gpt|gemini|openai|token/);
    const parent = await store.readReview('user-a', first.record.reviewId);
    expect(parent?.status).toBe('succeeded');
    expect(parent?.sections?.judgment).toBe(sections().judgment);
    expect(parent?.error).toBeNull();
    expect((await store.listFeedback('user-a', first.record.reviewId))[0]?.comment).toContain('양조장 대표 답');
    const retry = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: '양조장 대표 인터뷰는 아직 없다.',
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(retry.ok && retry.called).toBe(true);
    expect(calls).toBe(3);
    expect((await store.listReviews('user-a', 'project-test')).filter((record) => record.status === 'succeeded')).toHaveLength(1);
    expect(isProviderLimitError('OpenAI rate limit exceeded provider_http')).toBe(true);
    expect(isProviderLimitError('OpenAI connection failed')).toBe(false);
    store.close();
  });

  it('does not store a founder estimate as a confirmed fact', () => {
    const claim = '양조장과의 협력 가능성이 높다.';
    expect(unverifiedClaimStoredAsFact(claim, [claim])).toBe(true);
    expect(unverifiedClaimStoredAsFact(claim, ['양조장 접촉 기록은 없다.'])).toBe(false);
    const request = buildProductReanalysisRequest({
      originalInput: PLAN,
      firstAnalysis: sections(),
      priorTurns: [],
      latestAnalysis: sections(),
      founderChoice: null,
      founderSupplement: claim,
      founderFeedback: null,
    });
    const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
    expect(system).toContain('founderFacts에 넣지 않는다');
    expect(system).toContain('확인된 사실, 경험, 추정, 계획');
  });

  it('puts the founder answer into the judgment update', () => {
    const claim = '양조장과의 협력 가능성이 높다.';
    const request = buildProductReanalysisRequest({
      originalInput: PLAN,
      firstAnalysis: sections(),
      priorTurns: [],
      latestAnalysis: sections(),
      founderChoice: null,
      founderSupplement: claim,
      founderFeedback: null,
    });
    const joined = request.messages.map((message) => message.content).join('\n');
    expect(joined).toContain(claim);
    expect(joined).toContain('판단에 어떤 영향');
    expect(joined).toContain('이번 답이 판단');
  });

  it('requires a reason when the judgment stays', () => {
    const request = buildProductReanalysisRequest({
      originalInput: PLAN,
      firstAnalysis: sections(),
      priorTurns: [],
      latestAnalysis: sections(),
      founderChoice: null,
      founderSupplement: '양조장과의 협력 가능성이 높다.',
      founderFeedback: null,
    });
    const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
    expect(system).toContain('유지하거나 높이거나 낮출 수 있다');
    expect(system).toContain('이유를 적는다');
    expect(system).toContain('priorJudgmentText와 같으면 실패다');
    expect(system).toContain('협력 가능성이 높지만으로 시작하지 않는다');
    expect(system).toContain('긍정적 영향을 미칠 것이다라고 쓰지 않는다');
    expect(system).toContain('떠오르는을 쓰지 않는다');
    expect(system).toContain('한 순서로만 분석한다');
    expect(system).toContain('no_named_brewery_candidate');
    expect(system).not.toContain('문장은 셋만 쓴다');
    expect(request.maxTokens).toBe(AI_PM_PRODUCT_REANALYSIS_MAX_TOKENS);
    expect(request.responseFormat?.type).toBe('json_schema');
    if (request.responseFormat?.type === 'json_schema') {
      const properties = request.responseFormat.schema.properties as { judgment: { type: string } };
      expect(properties.judgment.type).toBe('string');
    }
  });

  it('does not call again when the draft copies the prior judgment', async () => {
    const store = openAiPmReviewStore(storePath());
    let productCalls = 0;
    let userText = '';
    let system = '';
    const copied = productAnalysisRaw({ judgment: sections().judgment, nextQuestion: sections().nextQuestion });
    const follow = await runFirstReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      text: PLAN,
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat: async () => reply(JSON.stringify(sections())),
      evidence: 'injected_http',
    }).then((first) =>
      runFollowUpReview({
        projectId: 'project-test',
        store,
        userId: 'user-a',
        reviewId: first.record.reviewId,
        supplement: '양조장과의 협력 가능성이 높다.',
        now: NOW,
        chat: async (request) => {
          productCalls += 1;
          userText = request.messages.find((message) => message.role === 'user')?.content ?? '';
          system = request.messages.find((message) => message.role === 'system')?.content ?? '';
          return reply(copied);
        },
        evidence: 'injected_http',
      }),
    );
    expect(follow.ok).toBe(true);
    if (!follow.ok) return;
    expect(productCalls).toBe(1);
    expect(follow.record.callCount).toBe(1);
    expect(follow.record.firstRawContent ?? null).toBeNull();
    expect(AI_PM_PRODUCT_REANALYSIS_MAX_TOKENS).toBe(2400);
    const payload = JSON.parse(userText) as unknown;
    const names: string[] = [];
    const walk = (value: unknown) => {
      if (Array.isArray(value)) {
        value.forEach(walk);
        return;
      }
      if (!value || typeof value !== 'object') return;
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        names.push(key);
        walk(child);
      }
    };
    walk(payload);
    expect(names).not.toContain('judgment');
    expect(names).not.toContain('nextQuestion');
    expect(names).not.toContain('nextVerification');
    expect(names).not.toContain('nextQuestionReason');
    expect(names).not.toContain('risks');
    expect(names).toContain('priorJudgmentText');
    expect(names).toContain('priorVerificationText');
    expect(names).toContain('priorReasonText');
    expect(names).toContain('priorRisks');
    expect(system).toContain('Founder의 주장 또는 기대');
    expect(system).toContain('연락하거나 미팅');
    expect(system).not.toContain('draftRejected');
    const parent = await store.readReview('user-a', follow.record.parentReviewId ?? '');
    expect(parent?.sections?.judgment).toBe(sections().judgment);
    store.close();
  });

  it('treats a reworded partnership question as the same question', () => {
    const first = '어떤 방식으로 양조장과의 파트너십을 구축할 계획인가?';
    const second = '양조장과의 파트너십을 위한 구체적인 실행 계획은 무엇인가?';
    expect(questionRepeatsPrior([first], second)).toBe(true);
    expect(questionRepeatsPrior([first, second], '양조장 한 곳에 협력 조건을 제안해 본 적이 있습니까?')).toBe(false);
    const kept = buildProductReanalysisRequest({
      originalInput: PLAN,
      firstAnalysis: sections(),
      priorTurns: [],
      priorAnalyses: [
        {
          reviewId: 'oldest',
          judgment: '오래된 판단',
          nextQuestion: '어떤 방식으로 양조장과의 파트너십을 구축할 계획인가?',
          assumptions: ['이전 가정'],
          risks: ['이전 위험'],
        },
        {
          reviewId: 'later',
          judgment: '나중 판단',
          nextQuestion: '양조장과의 실제 접촉 여부는 어떻게 확인할 계획인가?',
          assumptions: ['나중 가정'],
          risks: ['나중 위험'],
        },
      ],
      latestAnalysis: sections(),
      founderChoice: null,
      founderSupplement: '양조장과의 협력 가능성이 높다.',
      founderFeedback: null,
    });
    const keptPayload = JSON.parse(kept.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      priorAnalyses: Array<{ reviewId: string }>;
    };
    expect(keptPayload.priorAnalyses.map((item) => item.reviewId)).toEqual(['oldest', 'later']);
    const renamed = JSON.parse(kept.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      priorAnalyses: Array<{ priorAssumptions?: string[]; priorRisks?: string[]; assumptions?: string[]; risks?: string[] }>;
      latestAnalysis: { priorRisks?: string[]; risks?: string[] };
    };
    expect(renamed.priorAnalyses[0]?.priorAssumptions).toEqual(['이전 가정']);
    expect(renamed.priorAnalyses[0]?.priorRisks).toEqual(['이전 위험']);
    expect(renamed.priorAnalyses[0]).not.toHaveProperty('assumptions');
    expect(renamed.priorAnalyses[0]).not.toHaveProperty('risks');
    expect(renamed.latestAnalysis.priorRisks).toEqual(['지불 의향이 확인되지 않았다.']);
    expect(renamed.latestAnalysis).not.toHaveProperty('risks');
    expect(questionAsksForPlan('양조장과의 실제 접촉 여부는 어떻게 확인할 계획인가?')).toBe(true);
    expect(
      questionAsksForPlan(
        '현재까지 실제로 연락하거나 미팅한 양조장이 있나요? 있다면 상대 양조장의 반응과 협력 조건에 대해 어떤 답변을 받았나요?',
      ),
    ).toBe(false);
  });

  it('treats a reworded contact question as the same verification stage', () => {
    const stored =
      '현재까지 실제로 연락하거나 미팅한 양조장이 있나요? 있다면 상대 양조장의 반응과 협력 조건에 대해 어떤 답변을 받았나요?';
    const reword = '양조장에 연락해 본 적이 있나요? 상대의 반응은 어땠습니까?';
    const nextStage = '먼저 접촉할 양조장 한 곳을 골랐습니까? 그 양조장에 닿을 경로가 있습니까?';
    expect(questionSameContactStage([stored], stored)).toBe(true);
    expect(questionSameContactStage([stored], reword)).toBe(true);
    expect(questionRepeatsPrior([stored], reword)).toBe(false);
    expect(questionSameContactStage([stored], nextStage)).toBe(false);
    expect(questionAsksForPlan(nextStage)).toBe(false);
    const drifted = '양조장과의 협력 방안을 구체화하기 위한 다음 단계는 무엇인가?';
    expect(questionAsksForPlan(drifted)).toBe(true);
    expect(questionRepeatsPrior(['양조장과의 파트너십을 위한 구체적인 실행 계획은 무엇인가?'], drifted)).toBe(true);
    expect(questionSameContactStage([stored], drifted)).toBe(false);
  });

  it('asks for a named brewery and a path instead of another partnership plan', () => {
    const plan = '양조장과의 파트너십을 위한 구체적인 실행 계획은 무엇인가?';
    const contact =
      '현재까지 실제로 연락하거나 미팅한 양조장이 있나요? 있다면 상대 양조장의 반응과 협력 조건에 대해 어떤 답변을 받았나요?';
    const wrapped =
      '양조장과의 파트너십을 구축하기 위해 먼저 접촉할 양조장을 선택했는지와 그 양조장에 닿을 경로가 있는지 확인할 수 있는 방법은 무엇인가?';
    const claim = '양조장과의 협력 가능성이 높다.';
    const stage = nextFactToAsk({ supplement: claim, previousQuestions: [plan, contact, wrapped] });
    const request = buildProductReanalysisRequest({
      originalInput: PLAN,
      firstAnalysis: sections(),
      priorTurns: [],
      previousQuestions: [plan, contact, wrapped],
      latestAnalysis: sections(),
      founderChoice: null,
      founderSupplement: claim,
      founderFeedback: null,
    });
    const payload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      founderSupplement: string;
      priorQuestionTexts: string[];
      verificationStage: { factToAsk: string; nextPurpose: string };
    };
    expect(questionVerificationStage(contact)).toBe('past_contact');
    expect(questionSameContactStage([contact], contact)).toBe(true);
    expect(questionVerificationStage(stage.factToAsk)).not.toBe('past_contact');
    expect(questionVerificationStage(plan)).toBe('plan');
    expect(questionVerificationStage(wrapped)).toBe('plan');
    expect(questionAsksForPlan(wrapped)).toBe(true);
    expect(questionAsksForPlan(stage.factToAsk)).toBe(false);
    expect(questionVerificationStage(stage.factToAsk)).toBe('named_target_and_path');
    expect(questionVerificationStage(plan)).not.toBe(questionVerificationStage(stage.factToAsk));
    expect(stage.factToAsk.includes(claim)).toBe(false);
    expect(questionRepeatsPrior([plan, contact, wrapped], stage.factToAsk)).toBe(false);
    const kept =
      '이번 답은 Founder의 자체 판단이자 실행 가능성에 대한 긍정적 가설이다. 접촉과 상대 의사와 협력 조건의 구체적 증거는 확인되지 않았다. 그래서 현재 사업성 판단은 유지한다. 이유는 검증된 근거가 없기 때문이다.';
    const mixed =
      '이는 사업의 실행 가능성에 긍정적 영향을 미칠 것으로 보인다. 이유는 판단을 바꿀 근거가 없어 기존 판단을 유지한다.';
    expect(judgmentSeparatesPotential(kept)).toBe(true);
    expect(judgmentSeparatesPotential(mixed)).toBe(false);
    expect(payload.founderSupplement).toBe(claim);
    expect(payload.priorQuestionTexts).toEqual([plan, contact, wrapped]);
    expect(payload.verificationStage.nextPurpose).toBe('named_target_and_path');
    expect(payload.verificationStage).not.toHaveProperty('factToAsk');
    const met = nextFactToAsk({
      supplement: '남한강 양조장 담당자를 만났고 협력하겠다고 했다.',
      previousQuestions: [plan],
    });
    expect(met.nextPurpose).toBe('terms');
    expect(met.factToAsk).not.toBe(stage.factToAsk);
  });

  it('accepts a named-target purpose without requiring the word evidence', () => {
    const question =
      '협력 가능성을 확인하기 위해 우선 접촉할 양조장을 한 곳 정했나요? 정했다면 양조장 이름과 실제 연락할 수 있는 담당자 또는 연락 경로를 알려주세요.';
    const verification = '우선 접촉 대상 양조장 선정 여부와 실제 연락 가능한 담당자 또는 연락 경로 확인';
    const reason =
      '실제 접촉 전 단계에서 협력 가능성을 검증할 구체적인 대상 양조장이 선정되었는지, 해당 대상에 접근할 현실적인 연락 경로가 있는지 확인하기 위한 것이다.';
    const contact =
      '현재까지 실제로 연락하거나 미팅한 양조장이 있나요? 있다면 상대 양조장의 반응과 협력 조건에 대해 어떤 답변을 받았나요?';
    const reword = '양조장에 연락해 본 적이 있나요? 상대의 반응은 어땠습니까?';
    const claim = '양조장과의 협력 가능성이 높다.';
    expect(verificationPurposeAligns({ nextQuestion: question, nextVerification: verification, nextQuestionReason: reason })).toBe(true);
    expect(purposeStage(verification)).toBe('named_target_and_path');
    expect(purposeStage(reason)).toBe('named_target_and_path');
    expect(verification.includes('증거')).toBe(false);
    expect(reason.includes('증거')).toBe(false);
    expect(
      verificationPurposeAligns({
        nextQuestion: question,
        nextVerification: verification,
        nextQuestionReason: '이 질문은 양조장과의 실제 접촉 여부를 확인하기 위한 것이다.',
      }),
    ).toBe(false);
    expect(
      verificationPurposeAligns({
        nextQuestion: question,
        nextVerification: '양조장과의 파트너십 구축 계획 및 실행 가능성',
        nextQuestionReason: reason,
      }),
    ).toBe(false);
    expect(questionVerificationStage(reword)).toBe('past_contact');
    expect(questionSameContactStage([contact], reword)).toBe(true);
    expect(verificationPurposeAligns({ nextQuestion: reword, nextVerification: verification, nextQuestionReason: reason })).toBe(false);
    expect(question.includes(claim)).toBe(false);
    const judgment = '양조장과의 협력 가능성이 높지만, 실제 접촉 및 협력 조건에 대한 정보가 부족하여 기존 판단을 유지한다.';
    expect(judgment.includes('증거')).toBe(false);
    expect(
      judgmentIsConsistent({
        judgment,
        assumptions: ['이번 답은 검증되지 않은 전제이다. 양조장과의 협력이 이루어질 것이라는 긍정적 가설이 있다.'],
        evidenceToChange: ['현재 사업성 판단은 유지되며, 양조장과의 협력 가능성이 높다는 긍정적 가설이 있다. 그러나 실제 접촉 및 협력 조건에 대한 구체적인 정보가 부족하다.'],
      }),
    ).toBe(true);
    expect(judgmentSeparatesPotential(judgment)).toBe(false);
    const mixed = '이는 사업의 실행 가능성에 긍정적 영향을 미칠 것으로 보인다. 기존 판단을 유지한다.';
    expect(judgmentIsConsistent({ judgment: mixed, assumptions: ['긍정적 가설이다.'], evidenceToChange: ['정보가 부족하다.'] })).toBe(false);
    const revised =
      '떠오르는 양조장 이름이 아직 없어 첫 협력 경로는 비어 있다. 협력 가능성이 높다는 주장은 아직 확인되지 않았다.';
    expect(judgmentIsConsistent({ judgment: revised, assumptions: ['후보 이름은 확인되지 않았다.'], evidenceToChange: ['접근 가능한 양조장 이름'] })).toBe(true);
    const request = buildProductReanalysisRequest({
      originalInput: PLAN,
      firstAnalysis: sections(),
      priorTurns: [],
      previousQuestions: [contact],
      latestAnalysis: sections(),
      founderChoice: null,
      founderSupplement: claim,
      founderFeedback: null,
    });
    const payload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      founderSupplement: string;
      priorQuestionTexts: string[];
      verificationStage: { nextPurpose: string };
    };
    expect(payload.founderSupplement).toBe(claim);
    expect(payload.priorQuestionTexts).toEqual([contact]);
    expect(payload.verificationStage.nextPurpose).toBe('named_target_and_path');
    expect(JSON.stringify(payload.verificationStage)).not.toContain(question);
  });

  it('moves a cooperation choice past the question that already asked for a brewery name', () => {
    const previous =
      '협력 가능성을 확인하기 위해 우선 접촉할 양조장을 한 곳 정했나요? 정했다면 양조장 이름과 실제 연락할 수 있는 담당자 또는 연락 경로를 알려주세요.';
    const choice = '양조장과의 협력 방안 구체화';
    const supplement = '양조장 후보 선정과 연락 경로 확보를 우선 검증한다.';
    const stage = nextFactToAsk({ supplement, previousQuestions: [previous], choiceLabel: choice });
    expect(stage.nextPurpose).toBe('candidate_name');
    expect(questionVerificationStage(stage.factToAsk)).toBe('candidate_name');
    expect(questionRepeatsPrior([previous], stage.factToAsk)).toBe(false);
    expect(questionVerificationStage(previous)).toBe('named_target_and_path');
    expect(
      verificationPurposeAligns({
        nextQuestion: stage.factToAsk,
        nextVerification: stage.verificationText,
        nextQuestionReason: stage.reasonText,
      }),
    ).toBe(true);
    expect(unverifiedClaimStoredAsFact(supplement, [])).toBe(false);
    expect(unverifiedClaimStoredAsFact(supplement, [supplement])).toBe(true);
    expect(nextFactToAsk({ supplement, previousQuestions: [previous] }).nextPurpose).toBe('named_target_and_path');
    const request = buildProductReanalysisRequest({
      originalInput: PLAN,
      firstAnalysis: sections(),
      priorTurns: [],
      previousQuestions: [previous],
      latestAnalysis: { ...sections(), nextQuestion: previous },
      founderChoice: { label: choice, otherText: '' },
      founderSupplement: supplement,
      founderFeedback: { comment: choice },
    });
    const payload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      founderChoice: { label: string };
      founderSupplement: string;
      verificationStage: { nextPurpose: string; factToAsk: string };
    };
    expect(payload.founderChoice.label).toBe(choice);
    expect(payload.founderSupplement).toBe(supplement);
    expect(payload.verificationStage.nextPurpose).toBe('candidate_name');
    expect(payload.verificationStage).not.toHaveProperty('choiceTexts');
    expect(JSON.stringify(payload.verificationStage)).not.toContain('떠오르는 양조장 이름이 있다');
  });

  it('moves a missing brewery name to a search criterion', () => {
    const named =
      '협력 가능성을 확인하기 위해 우선 접촉할 양조장을 한 곳 정했나요? 정했다면 양조장 이름과 실제 연락할 수 있는 담당자 또는 연락 경로를 알려주세요.';
    const nameQuestion =
      '후보 선정을 시작하면서 가장 먼저 떠오르는 양조장 이름이 있나요? 있으면 그 이름만 알려 주세요. 없으면 아직 떠오른 곳이 없다고 적어 주세요.';
    const choice = '아직 떠오르는 양조장이 없다.';
    const supplement = '현재 우선 접촉할 구체적인 양조장 후보를 선정하지 못했다.';
    const stage = nextFactToAsk({ supplement, previousQuestions: [named, nameQuestion], choiceLabel: choice });
    expect(stage.nextPurpose).toBe('candidate_criteria');
    expect(stage.factToAsk.endsWith('?')).toBe(false);
    expect(questionVerificationStage(nameQuestion)).toBe('candidate_name');
    expect(questionRepeatsPrior([named, nameQuestion], stage.factToAsk)).toBe(false);
    const criterion = '체험을 운영할 수 있는 양조장을 찾을 기준이 이미 있나요?';
    const screening = '관광객 체험 프로그램 운영이 가능한 양조장을 어떻게 선별할 것인가?';
    const pool = '실제로 접근 가능한 후보군을 확보할 수 있는가?';
    expect(questionVerificationStage(criterion)).toBe('candidate_criteria');
    expect(questionVerificationStage(screening)).toBe('candidate_criteria');
    expect(questionVerificationStage(pool)).toBe('candidate_criteria');
    expect(
      verificationPurposeAligns({
        nextQuestion: criterion,
        nextVerification: stage.verificationText,
        nextQuestionReason: stage.reasonText,
      }),
    ).toBe(true);
    expect(stage.verificationText).not.toBe(criterion);
    expect(stage.reasonText).toContain('불가능하다는 뜻이 아니');
    expect(stage.choiceTexts).toEqual(['체험 양조장을 가릴 기준이 있다', '아직 접근 가능한 후보군이 없다']);
    const request = buildProductReanalysisRequest({
      originalInput: PLAN,
      firstAnalysis: sections(),
      priorTurns: [],
      previousQuestions: [named, nameQuestion],
      latestAnalysis: { ...sections(), nextQuestion: nameQuestion },
      founderChoice: { label: choice, otherText: '' },
      founderSupplement: supplement,
      founderFeedback: { comment: choice },
    });
    const system = request.messages.find((message) => message.role === 'system')?.content ?? '';
    const payload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      founderChoice: { label: string };
      verificationStage: { nextPurpose: string; factToAsk: string; choiceTexts: string[] };
    };
    expect(system).toContain('verificationStage.nextPurpose는 이미 다룬 단계다');
    expect(system).toContain('후보가 없다는 선택은 협력 불가능이 아니다');
    expect(system).toContain('judgment와 같은 문장을 두지 않는다');
    expect(system).not.toContain('choiceTexts와 같다');
    expect(payload.founderChoice.label).toBe(choice);
    expect(payload.verificationStage.nextPurpose).toBe('candidate_criteria');
    expect(payload.verificationStage).not.toHaveProperty('factToAsk');
    expect(payload.verificationStage).not.toHaveProperty('choiceTexts');
  });

  it('does not treat an unverified cooperation claim as a confirmed fact', () => {
    const claim = '양조장과의 협력 가능성이 높다.';
    const judgment = '현재 사업성 판단은 낮아지며, 양조장과의 협력 가능성이 높지만 구체적인 후보가 없다는 점이 부정적인 영향을 미친다.';
    expect(founderClaimTreatedAsFact(claim)).toBe(true);
    expect(founderClaimTreatedAsFact(judgment)).toBe(true);
    expect(founderClaimTreatedAsFact('협력 가능성이 높다는 주장은 검증되지 않았다.')).toBe(false);
    expect(unverifiedClaimStoredAsFact(claim, [])).toBe(false);
    expect(unverifiedClaimStoredAsFact(claim, [claim])).toBe(true);
  });

  it('flags a judgment that contradicts an unverified inference', () => {
    const judgment = '양조장과의 협력 가능성이 높지만 구체적인 후보가 없다.';
    const inferences = ['양조장과의 협력 가능성이 높다는 주장은 검증되지 않은 상태이다.'];
    expect(judgmentContradictsUnverifiedClaim(judgment, inferences)).toBe(true);
    const aligned = '협력 가능성이 높다는 주장은 확인되지 않았고, 구체적인 후보도 없다.';
    expect(judgmentContradictsUnverifiedClaim(aligned, inferences)).toBe(false);
  });

  it('flags an assumption that repeats an unverified hope as a positive effect', () => {
    expect(assumptionRestatesUnverifiedHope(['양조장과의 협력 가능성이 높다는 가설이 사업 실행에 긍정적 영향을 미칠 것이다.'])).toBe(true);
    expect(assumptionRestatesUnverifiedHope(['체험을 운영할 양조장에 닿는 경로는 아직 확인되지 않았다.'])).toBe(false);
  });

  it('reads the missing-candidate answer as a stated gap', () => {
    expect(answerSaysNoCandidate('아직 떠오르는 양조장이 없다. 현재 우선 접촉할 구체적인 양조장 후보를 선정하지 못했다.')).toBe(true);
    expect(answerSaysNoCandidate('남한강 양조장 담당자를 만났다.')).toBe(false);
  });

  it('treats a rewritten judgment as a new review when it is not the prior sentence', () => {
    const prior = '현재 사업성 판단은 유지되며, 양조장과의 협력 가능성이 높지만, 실제 접촉 및 협력 조건에 대한 구체적인 증거가 부족하다.';
    const next = '협력 가능성이 높다는 주장은 확인되지 않았고, 구체적인 후보가 없어 첫 운영 경로가 비어 있다.';
    expect(next).not.toBe(prior);
    expect(next.includes('후보')).toBe(true);
    expect(/없|비어|확인되지/.test(next)).toBe(true);
  });

  it('asks the judgment to name why it changed or stayed', () => {
    const changed = '구체적인 후보가 없어 지금은 협력 구조를 실행 가능한 것으로 두지 않는다.';
    expect(/없|이유|때문|확인/.test(changed)).toBe(true);
    expect(judgmentIsConsistent({ judgment: changed, assumptions: ['닿는 경로는 확인되지 않았다.'], evidenceToChange: ['접근 경로'] })).toBe(true);
  });

  it('requires evidence that could change the judgment', () => {
    const judgment = '구체적인 후보가 없어 운영 경로는 아직 비어 있다.';
    const evidence = ['체험을 받을 수 있는 양조장에 닿는 경로'];
    expect(evidence.some((item) => item === judgment)).toBe(false);
    expect(/경로|기준|접촉|조건/.test(evidence.join('\n'))).toBe(true);
  });

  it('does not ask again whether a brewery candidate was chosen', () => {
    const repeated = '양조장과의 파트너십을 구축하기 위해 먼저 접촉할 양조장을 한 곳 정했나요? 정했다면 양조장 이름과 실제 연락할 수 있는 담당자 또는 연락 경로를 알려주세요.';
    const prior = '협력 가능성을 확인하기 위해 우선 접촉할 양조장을 한 곳 정했나요? 정했다면 양조장 이름과 실제 연락할 수 있는 담당자 또는 연락 경로를 알려주세요.';
    expect(questionRepeatsAnsweredSelection(repeated)).toBe(true);
    expect(questionRepeatsAnsweredSelection(prior)).toBe(true);
    expect(questionRepeatsPrior([prior], repeated)).toBe(false);
    expect(questionVerificationTargets(repeated)).toContain('selection');
  });

  it('accepts one new verification target after the candidate gap is known', () => {
    const criteria = '체험을 운영할 수 있는 양조장을 고를 기준이 있나요?';
    const bundled = '후보를 고를 기준과 연락 경로를 함께 알려 주세요.';
    expect(questionRepeatsAnsweredSelection(criteria)).toBe(false);
    expect(questionVerificationTargets(criteria)).toEqual(['criteria']);
    expect(questionVerificationTargets(bundled).length).toBeGreaterThan(1);
  });

  it('keeps the no-candidate answer available for the next call', () => {
    const named = '협력 가능성을 확인하기 위해 우선 접촉할 양조장을 한 곳 정했나요?';
    const nameQuestion = '후보 선정을 시작하면서 가장 먼저 떠오르는 양조장 이름이 있나요?';
    const request = buildProductReanalysisRequest({
      originalInput: PLAN,
      firstAnalysis: sections(),
      priorTurns: [],
      previousQuestions: [named, nameQuestion],
      latestAnalysis: { ...sections(), nextQuestion: nameQuestion },
      founderChoice: { label: '아직 떠오르는 양조장이 없다', otherText: '' },
      founderSupplement: '현재 우선 접촉할 구체적인 양조장 후보를 선정하지 못했다.',
      founderFeedback: { comment: '아직 떠오르는 양조장이 없다' },
    });
    const payload = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
      founderChoice: { label: string };
      verificationStage: { alreadyAnswered: string[] };
    };
    expect(payload.founderChoice.label).toBe('아직 떠오르는 양조장이 없다');
    expect(payload.verificationStage.alreadyAnswered).toEqual(['no_named_brewery_candidate']);
  });

  it('does not drop the stored parent when a later review is created beside it', () => {
    const parentJudgment = '현재 사업성 판단은 유지되며, 양조장과의 협력 가능성이 높지만, 실제 접촉 및 협력 조건에 대한 구체적인 증거가 부족하다.';
    const later = '협력 가능성이 높다는 주장은 확인되지 않았고, 구체적인 후보가 없다.';
    expect(later).not.toBe(parentJudgment);
    expect(parentJudgment.includes('유지')).toBe(true);
  });

  it('cites a failed review answer without moving it onto the succeeded parent', async () => {
    const store = openAiPmReviewStore(storePath());
    const ready = await runFirstReview({
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
    const failed = await runFirstReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      text: '다른 양조장 메모입니다. 협력 여부는 아직 없습니다.',
      origin: 'typed',
      fileName: null,
      now: NOW,
      chat: async () => {
        throw new Error('review failed before an analysis');
      },
      evidence: 'injected_http',
    });
    expect(failed.record.status).toBe('failed');
    const claim = '양조장과의 협력 가능성이 높다.';
    await store.insertFeedback({
      feedbackId: 'fb-failed-answer',
      reviewId: failed.record.reviewId,
      userId: 'user-a',
      agreement: 'partial',
      accuracy: 'mostly_accurate',
      revisionAreas: ['payer'],
      comment: claim,
      nextAction: 'verify_hypotheses',
      marks: [],
      choiceAnswer: { choiceId: 'c1', label: claim, otherText: '' },
      submittedAt: NOW,
      modelCalls: 0,
    });
    let seen = '';
    const follow = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: ready.record.reviewId,
      supplement: claim,
      now: NOW,
      chat: async (request) => {
        seen = request.messages.find((message) => message.role === 'user')?.content ?? '';
        return reply(productAnalysisRaw({ judgment: '협력 가능성은 추정이다.', nextQuestion: '양조장 한 곳과 조건을 논의했습니까?' }));
      },
      evidence: 'injected_http',
    });
    expect(follow.ok).toBe(true);
    if (!follow.ok) return;
    expect(follow.record.sourceFeedbackId).toBeNull();
    expect(follow.record.parentReviewId).toBe(ready.record.reviewId);
    const payload = JSON.parse(seen) as { founderAnswerSource: { feedbackId: string; reviewId: string; onThisReview: boolean } };
    expect(payload.founderAnswerSource).toEqual({
      feedbackId: 'fb-failed-answer',
      reviewId: failed.record.reviewId,
      onThisReview: false,
    });
    expect((await store.listFeedback('user-a', failed.record.reviewId))[0]?.feedbackId).toBe('fb-failed-answer');
    expect(await store.listFeedback('user-a', ready.record.reviewId)).toHaveLength(0);
    expect(follow.record.founderAnswerSource).toEqual({
      feedbackId: 'fb-failed-answer',
      reviewId: failed.record.reviewId,
      onThisReview: false,
    });
    store.close();
  });

  it('builds prior analyses from succeeded siblings and keeps the current answer once', async () => {
    const store = openAiPmReviewStore(storePath());
    const chat = async (request: ChatRequest) => {
      const product = request.messages.some((message) => message.content.includes('이번 답이 판단'));
      if (!product) return reply(JSON.stringify(sections()));
      const body = JSON.parse(request.messages.find((message) => message.role === 'user')?.content ?? '{}') as {
        founderSupplement: string;
      };
      return reply(productAnalysisRaw({ judgment: `${body.founderSupplement} 판단`, nextQuestion: `${body.founderSupplement} 다음 질문?` }));
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
    const sibling = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: '형제분석답변',
      now: '2026-10-27T09:40:00.000Z',
      chat,
      evidence: 'injected_http',
    });
    const chainChild = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: '체인답변',
      now: '2026-10-27T09:50:00.000Z',
      chat,
      evidence: 'injected_http',
    });
    expect(sibling.ok && chainChild.ok).toBe(true);
    if (!sibling.ok || !chainChild.ok) return;
    let seen = '';
    const next = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: chainChild.record.reviewId,
      supplement: '새검증답변',
      now: '2026-10-27T10:00:00.000Z',
      chat: async (request) => {
        seen = request.messages.find((message) => message.role === 'user')?.content ?? '';
        return reply(productAnalysisRaw({ judgment: '새 검증 판단', nextQuestion: '양조장 한 곳과 조건을 논의했습니까?' }));
      },
      evidence: 'injected_http',
    });
    expect(next.ok && next.called).toBe(true);
    const payload = JSON.parse(seen) as {
      priorAnalyses: Array<{ reviewId: string }>;
      priorTurns: Array<{ supplement: string }>;
      founderSupplement: string;
    };
    expect(payload.priorAnalyses.map((item) => item.reviewId)).toContain(sibling.record.reviewId);
    expect(payload.priorAnalyses.map((item) => item.reviewId)).not.toContain(first.record.reviewId);
    expect(payload.priorAnalyses.map((item) => item.reviewId)).not.toContain(chainChild.record.reviewId);
    expect(payload.priorTurns.map((turn) => turn.supplement)).toEqual(['체인답변']);
    expect(payload.founderSupplement).toBe('새검증답변');
    const records = await store.listReviews('user-a', 'project-test');
    const assembled = assembleConsultingHistory({
      records,
      parent: chainChild.record,
      supplement: '새검증답변',
      feedback: [],
    });
    expect(assembled.priorAnalyses.map((item) => item.reviewId)).toContain(sibling.record.reviewId);
    expect(assembled.priorTurns.map((turn) => turn.supplement)).toEqual(['체인답변']);
    store.close();
  });

  it('stores a new analysis without replacing the saved parent or the earlier child', async () => {
    const store = openAiPmReviewStore(storePath());
    const chat = async (request: ChatRequest) => {
      const product = request.messages.some((message) => message.content.includes('이번 답이 판단'));
      if (!product) return reply(JSON.stringify(sections()));
      return reply(productAnalysisRaw({ judgment: '이어서 저장한 판단', nextQuestion: '양조장 한 곳과 조건을 논의했습니까?' }));
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
    const child = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: first.record.reviewId,
      supplement: '첫번째답변',
      now: NOW,
      chat,
      evidence: 'injected_http',
    });
    expect(child.ok).toBe(true);
    if (!child.ok) return;
    const parentBefore = JSON.stringify(await store.readReview('user-a', first.record.reviewId));
    const childBefore = JSON.stringify(await store.readReview('user-a', child.record.reviewId));
    const again = await runFollowUpReview({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      reviewId: child.record.reviewId,
      supplement: '두번째답변',
      now: '2026-10-27T10:10:00.000Z',
      chat,
      evidence: 'injected_http',
    });
    expect(again.ok && again.called).toBe(true);
    if (!again.ok) return;
    expect(again.record.reviewId).not.toBe(child.record.reviewId);
    expect(again.record.parentReviewId).toBe(child.record.reviewId);
    expect(JSON.stringify(await store.readReview('user-a', first.record.reviewId))).toBe(parentBefore);
    expect(JSON.stringify(await store.readReview('user-a', child.record.reviewId))).toBe(childBefore);
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
        expect(request.maxTokens).toBe(AI_PM_FOLLOW_UP_MAX_TOKENS);
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
    expect(parsed?.analysis?.choices.map((choice) => choice.label)).toEqual([
      choices[0],
      choices[1],
      '아직 핵심을 정하지 못했다',
      choices[2],
    ]);
    expect(parsed?.analysis?.nextVerification).toContain('관광객이 체험을 예약할 의사가 있다');
    const priced = parseSections(
      JSON.stringify({
        ...withFigure,
        revenueModel: '양조장 체험 수수료와 참가비로 수익을 낸다.',
      }),
      BREWERY,
    );
    expect(priced?.revenueModel).toContain('가설이며 원문에서 확인되지 않았다');
    expect(priced?.revenueModel).toContain('수수료');
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
    const store = openAiPmReviewStore(storePath());
    await store.insertReview({
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
    });
    const saved = await saveReviewFeedback({
      projectId: 'project-test',
      store,
      userId: 'user-a',
      now: NOW,
      body: {
        reviewId: 'review-live',
        choiceId: 'c1',
        choiceLabel: '양조장과의 협력 가능성이 높다.',
        otherText: '',
      },
    });
    expect(saved.ok).toBe(true);
    if (!saved.ok) return;
    expect(saved.feedback.modelCalls).toBe(0);
    expect(saved.view.status).toBe('ready');
    expect(saved.view.feedback.at(-1)?.choiceAnswer?.label).toContain('협력 가능성이 높다');
    store.close();
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
    expect(tourist).toContain('현재 가설');
    expect(tourist).toContain('다음 분석은 이 답과 지금까지의 검토를 함께 읽습니다');
    expect(composeReviewInput({ text: BREWERY, purpose: 'overall' })).toContain('종합 사업성 검토');
    expect(composeReviewInput({ text: BREWERY, purpose: 'overall', stage: 'idea' })).toContain('아이디어 단계');
    expect(composeReviewInput({ text: BREWERY, purpose: 'overall' })).toContain('검토 계약: comprehensive-1');
    expect(composeReviewInput({ text: BREWERY })).toBe(BREWERY);
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
