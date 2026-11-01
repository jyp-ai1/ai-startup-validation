import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { ChatResponse } from '@repo/ai';

import {
  EXPERIMENT_B_PRODUCT_MODEL,
  buildSelectionRequest,
  buildStateRequest,
  experimentPurposeKey,
  parseCall1,
  questionReword,
  runExperimentBFollowUp,
  scoreExperimentB,
  choicesReused,
  type Call1Fields,
  type Call2Fields,
} from '../ai-pm-experiment-b';
import { AI_PM_REVIEW_MODEL } from '../ai-pm-review';
import { openAiPmReviewStore, type StoredReview } from '../ai-pm-review-store';

const ANSWER = 'SIMULATION. 실제 예약과 지불은 없다. 누가 비용을 낼지는 정하지 않았다. 이 답은 연습 입력이고 확인된 기록이 아니다.';
const CLOSED = '공급 계약의 가능성을 어떻게 확인할 것인가?';
const PRIOR_CHOICES = [['양조장과의 직접 협상', '양조장 협력 의사 조사']];
const PRIOR_RISKS = ['양조장과의 협력 실패 가능성'];

describe('experiment B quality', () => {
  it('keeps the product model and leaves the product stage path alone', () => {
    expect(EXPERIMENT_B_PRODUCT_MODEL).toBe('gpt-4o-mini');
    expect(AI_PM_REVIEW_MODEL).toBe('gpt-4o-mini');
    const source = readFileSync(new URL('../ai-pm-experiment-b.ts', import.meta.url), 'utf8');
    expect(source).not.toContain('runStageReanalysis');
    expect(source).not.toContain('점포와 조건');
  });

  it('sends the state call without the echoed analysis channels', () => {
    const request = buildStateRequest({
      originalIdea: '전통주 양조장 체험',
      priorAnswers: [],
      currentAnswer: ANSWER,
      priorJudgment: '공급 계약의 부재가 가장 중요한 미해결 위험이다.',
      priorRisks: PRIOR_RISKS,
      openUncertainties: [],
      closedQuestions: [CLOSED],
      unresolved: ['점포와 조건이 없다는 현재 빈칸이다.'],
    });
    const user = request.messages.find((message) => message.role === 'user')?.content ?? '';
    const parsed = JSON.parse(user) as Record<string, unknown>;
    expect(parsed.latestAnalysis).toBeUndefined();
    expect(parsed.priorAnalyses).toBeUndefined();
    expect(parsed.consultingPath).toBeUndefined();
    expect(parsed.doNotCopy).toBeUndefined();
    expect(parsed.areaOrderIsNotPriority).toBe(true);
    expect(user).toContain('예약');
    expect(request.messages[0]?.content).not.toContain('점포와 조건');
    expect(request.model).toBe('gpt-4o');
    const selection = buildSelectionRequest({
      ledger: call1(),
      currentAnswer: ANSWER,
      priorJudgment: '공급 계약의 부재가 가장 중요한 미해결 위험이다.',
      closedQuestions: [CLOSED],
      priorChoiceLabels: PRIOR_CHOICES,
    });
    const selectionUser = selection.messages.find((message) => message.role === 'user')?.content ?? '';
    expect(selectionUser).not.toContain('latestAnalysis');
    expect(selection.messages[0]?.content).toContain('코드는 후보를 고르지 않는다');
  });

  it('accepts a kept judgment when the new answer is cited', () => {
    const report = scoreExperimentB({
      call1: call1(),
      call2: call2(),
      call2Ran: true,
      answer: ANSWER,
      originalIdea: '전통주 양조장 체험',
      priorAnswers: [],
      priorRisks: PRIOR_RISKS,
      closedQuestions: [CLOSED],
      priorChoiceLabels: PRIOR_CHOICES,
    });
    expect(report.qualityPass).toBe(true);
    expect(report.chainContinues).toBe(true);
  });

  it('stops before the second call when the simulation answer is promoted', () => {
    const report = scoreExperimentB({
      call1: { ...call1(), confirmedFacts: ['예약이 확인되었다'] },
      call2: null,
      call2Ran: false,
      answer: ANSWER,
      originalIdea: '전통주',
      priorAnswers: [],
      priorRisks: PRIOR_RISKS,
      closedQuestions: [CLOSED],
      priorChoiceLabels: PRIOR_CHOICES,
    });
    expect(report.failures).toContain('simulation_promoted');
    expect(report.call2Ran).toBe(false);
    expect(report.chainContinues).toBe(false);
  });

  it('rejects a shop sentence that is not in the answer', () => {
    const report = scoreExperimentB({
      call1: { ...call1(), newUncertainties: ['점포와 조건이 없다'] },
      call2: null,
      call2Ran: false,
      answer: ANSWER,
      originalIdea: '전통주 양조장 체험',
      priorAnswers: [],
      priorRisks: PRIOR_RISKS,
      closedQuestions: [],
      priorChoiceLabels: [],
    });
    expect(report.failures).toContain('invented_shop_or_contact');
  });

  it('rejects a selection reason that repeats the prior ranking without the new answer', () => {
    const report = scoreExperimentB({
      call1: call1(),
      call2: {
        ...call2(),
        selectionReason: '공급 계약의 부재가 사업 실행의 가장 큰 위험 요소이기 때문이다.',
      },
      call2Ran: true,
      answer: ANSWER,
      originalIdea: '전통주',
      priorAnswers: [],
      priorRisks: PRIOR_RISKS,
      closedQuestions: [CLOSED],
      priorChoiceLabels: PRIOR_CHOICES,
    });
    expect(report.failures).toContain('selection_comparison_missing');
    expect(report.qualityPass).toBe(false);
  });

  it('rejects a reworded supply question and the previous brewery choices', () => {
    const reword = '공급 계약의 구체적인 가능성을 확인하기 위해 어떤 방법을 사용할 것인가?';
    expect(experimentPurposeKey(reword)).toBe(experimentPurposeKey(CLOSED));
    expect(questionReword(reword, [CLOSED])).toBe(true);
    expect(choicesReused(PRIOR_CHOICES, ['양조장과의 직접 협상', '양조장 협력 의사 조사'])).toBe(true);
    const report = scoreExperimentB({
      call1: call1(),
      call2: {
        ...call2(),
        nextQuestions: [
          {
            text: reword,
            verificationPurpose: '공급 계약',
            choices: ['양조장과의 직접 협상', '양조장 협력 의사 조사'],
          },
        ],
      },
      call2Ran: true,
      answer: ANSWER,
      originalIdea: '전통주',
      priorAnswers: [],
      priorRisks: PRIOR_RISKS,
      closedQuestions: [CLOSED],
      priorChoiceLabels: PRIOR_CHOICES,
    });
    expect(report.failures).toContain('question_reword');
    expect(report.failures).toContain('choices_reused');
  });

  it('does not call the selection model after a failed state call, and reuses the stored row', async () => {
    const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'experiment-b-')), 'reviews.sqlite'));
    let calls = 0;
    const chat = async () => {
      calls += 1;
      return modelResponse(JSON.stringify({ ...call1(), confirmedFacts: ['예약이 확인되었다'] }), 'chatcmpl-state');
    };
    const first = await runExperimentBFollowUp({
      store,
      userId: 'user',
      projectId: 'project',
      parent: parent(),
      answer: ANSWER,
      now: '2026-11-01T11:45:00.000Z',
      chat,
      sourceFeedbackId: null,
      originalIdea: '전통주',
      priorAnswers: [],
      priorJudgment: '공급 계약의 부재가 가장 중요한 미해결 위험이다.',
      priorRisks: PRIOR_RISKS,
      openUncertainties: [],
      closedQuestions: [CLOSED],
      priorChoiceLabels: PRIOR_CHOICES,
      unresolved: [],
    });
    expect(calls).toBe(1);
    expect(first.called).toBe(true);
    expect(first.quality.failures).toContain('simulation_promoted');
    expect(first.record.callCount).toBe(1);
    expect(first.record.status).toBe('failed');
    expect(first.record.rawContent).toContain('예약이 확인되었다');
    const second = await runExperimentBFollowUp({
      store,
      userId: 'user',
      projectId: 'project',
      parent: parent(),
      answer: ANSWER,
      now: '2026-11-01T11:46:00.000Z',
      chat: async () => {
        throw new Error('duplicate_called_model');
      },
      sourceFeedbackId: null,
      originalIdea: '전통주',
      priorAnswers: [],
      priorJudgment: '공급 계약의 부재가 가장 중요한 미해결 위험이다.',
      priorRisks: PRIOR_RISKS,
      openUncertainties: [],
      closedQuestions: [CLOSED],
      priorChoiceLabels: PRIOR_CHOICES,
      unresolved: [],
    });
    expect(second.called).toBe(false);
    expect(second.record.reviewId).toBe(first.record.reviewId);
    store.close();
  });

  it('stores both raws when the selection compares the new answer with the prior risk', async () => {
    const store = openAiPmReviewStore(join(mkdtempSync(join(tmpdir(), 'experiment-b-pass-')), 'reviews.sqlite'));
    const payloads = [JSON.stringify(call1()), JSON.stringify(call2())];
    let calls = 0;
    const passed = await runExperimentBFollowUp({
      store,
      userId: 'user',
      projectId: 'project',
      parent: parent(),
      answer: ANSWER,
      now: '2026-11-01T11:45:00.000Z',
      chat: async () => {
        const content = payloads[calls] ?? '{}';
        calls += 1;
        return modelResponse(content, `chatcmpl-${calls}`);
      },
      sourceFeedbackId: 'feedback-1',
      originalIdea: '전통주',
      priorAnswers: [],
      priorJudgment: '공급 계약의 부재가 가장 중요한 미해결 위험이다.',
      priorRisks: PRIOR_RISKS,
      openUncertainties: [],
      closedQuestions: [CLOSED],
      priorChoiceLabels: PRIOR_CHOICES,
      unresolved: [],
    });
    expect(calls).toBe(2);
    expect(passed.quality.qualityPass).toBe(true);
    expect(passed.record.status).toBe('succeeded');
    expect(passed.record.callCount).toBe(2);
    expect(passed.record.firstRawContent).toContain('answerImpact');
    expect(passed.record.rawContent).toContain('selectionReason');
    expect(passed.record.sections?.analysis?.questions?.[0]?.text).toContain('비용');
    expect(parseCall1(passed.calls[0]?.raw ?? '')?.judgmentKept).toBe(true);
    store.close();
  });
});

function call1(): Call1Fields {
  return {
    answerDelta: '실제 예약과 지불은 없다. 비용 부담 주체는 정하지 않았다.',
    confirmedFacts: [],
    claims: ['예약은 없다', '지불은 없다', '비용 부담은 미정이다'],
    priorRisksRemaining: ['양조장과의 협력 실패 가능성'],
    newUncertainties: ['누가 비용을 낼지 정하지 않았다'],
    unanalyzedAreaIds: ['product', 'price'],
    judgmentKept: true,
    judgmentText: '공급 계약의 부재가 가장 중요한 미해결 위험이다.',
    answerImpact: '이번 답의 예약과 지불과 비용은 그 결론을 확인된 사실로 바꾸지 않는다.',
  };
}

function call2(): Call2Fields {
  return {
    candidates: [
      {
        candidateId: '1',
        areaId: 'supply',
        judgmentTarget: '공급 계약이 없으면 이번 검증을 진행할 수 없다',
        fromNewAnswer: false,
        priorRiskItChallenges: '협력 실패',
        whyNow: '이전 위험',
        overlapsReviewedObjective: false,
      },
      {
        candidateId: '2',
        areaId: 'operations',
        judgmentTarget: '비용 부담 주체를 정해야 실행 비용을 가른다',
        fromNewAnswer: true,
        priorRiskItChallenges: '협력 실패',
        whyNow: '이번 답에서 비용 부담 주체가 없다',
        overlapsReviewedObjective: false,
      },
    ],
    selectedCandidateId: '2',
    selectionReason: '이번 답의 비용 부담이 비어 있다. 협력 실패는 남아 있으나 비용 주체를 먼저 가른다.',
    nextQuestions: [
      {
        text: '이번 체험의 비용은 누가 부담하는가?',
        verificationPurpose: '비용 주체',
        choices: ['고객이 전액 부담한다', '양조장과 나누어 부담한다'],
      },
    ],
  };
}

function parent(): StoredReview {
  return {
    reviewId: 'parent-1',
    userId: 'user',
    version: 1,
    parentReviewId: null,
    sourceFeedbackId: null,
    supplementSha: null,
    projectId: 'project',
    inputSha: 'sha',
    inputText: 'idea',
    inputOrigin: 'typed',
    fileName: null,
    status: 'succeeded',
    evidence: 'live_network',
    provider: 'openai',
    model: 'gpt-4o-2024-08-06',
    sections: null,
    rawContent: null,
    promptTokens: 1,
    completionTokens: 1,
    totalTokens: 2,
    usageKnown: true,
    callCount: 1,
    latencyMs: 1,
    error: null,
    requestedAt: '2026-11-01T00:00:00.000Z',
    finishedAt: '2026-11-01T00:00:00.000Z',
  };
}

function modelResponse(content: string, id: string): ChatResponse {
  return {
    id,
    model: 'gpt-4o-2024-08-06',
    provider: 'openai',
    content,
    finishReason: 'stop',
    usage: { inputTokens: 100, outputTokens: 40, totalTokens: 140 },
    usageKnown: true,
    latencyMs: 5,
  };
}
