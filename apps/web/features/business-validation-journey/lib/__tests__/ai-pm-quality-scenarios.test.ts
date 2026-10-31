import type { ChatRequest, ChatResponse } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import { AI_PM_FIRST_PROMPT_VERSION, buildFirstReviewRequest, buildFollowUpRequest } from '../ai-pm-review';
import {
  AI_PM_QUALITY_SIMULATION_VERSION,
  BASELINE_FIRST_SYSTEM_PROMPT,
  BASELINE_PROMPT_VERSION,
  BREWERY_QUALITY_BODY,
  KNOWN_FAILURE_A,
  KNOWN_FAILURE_B,
  QUALITY_CRITERIA_VERSION,
  QUALITY_SCENARIOS,
  buildBaselineFirstRequest,
  buildScenarioSimulationRequest,
  evaluateQualityText,
  executeQualityMatrix,
  liveModelAvailable,
  type CriterionResult,
  type QualityCriterionId,
  type QualityScenario,
} from '../ai-pm-quality-scenarios';

const FIRST_QUESTION = 'Q-UNIQUE-FIRST-FORK-양조장체험의수요와공급중무엇을먼저확인할지';

function criterion(criteria: CriterionResult[], id: QualityCriterionId): CriterionResult {
  const found = criteria.find((item) => item.id === id);
  if (!found) throw new Error(`missing criterion ${id}`);
  return found;
}

function scenario(id: QualityScenario['id']): QualityScenario {
  const found = QUALITY_SCENARIOS.find((item) => item.id === id);
  if (!found) throw new Error(`missing scenario ${id}`);
  return found;
}

function cleanFirst() {
  return {
    summary: '전통주에 관심 있는 관광객에게 양조장 체험을 안내하고 양조장 온라인 마케팅을 지원하려는 구상이다.',
    customer: '전통주와 양조장 체험에 관심 있는 내국인·외국인 관광객.',
    problem: '체험을 찾고 예약하는 경로가 원문만으로 갈리지 않는다.',
    value: '체험 안내와 마케팅 지원을 함께 구상한다.',
    revenueModel: '수익 구조는 원문에 없다.',
    assumptions: ['체험 수요와 양조장 공급이 모두 미확인이다.'],
    nextVerification: '양조장 한 곳에 체험 안내 파일럿을 제안한다.',
    nextQuestion: FIRST_QUESTION,
    choices: [
      '관광객이 양조장 체험을 찾거나 예약하기 어렵다',
      '양조장 홍보가 방문이나 예약으로 이어지기 어렵다',
      '아직 누구의 문제를 먼저 풀지 정하지 못했다',
      '기타 / 직접 입력',
    ],
  };
}

function cleanTurn(founderAnswer: string) {
  return {
    founderClaim: `${founderAnswer} 이것은 창업자 주장이며 가설이다.`,
    changed: `${founderAnswer} 때문에 다음 확인 순서를 가설로 다시 적는다.`,
    unchanged: '시장 규모와 가격은 여전히 미확인이다.',
    priority: founderAnswer,
    cheapExperiment: `${founderAnswer} 를 적은 비용의 파일럿으로 확인한다.`,
    nextQuestion: '다음에 가장 싸게 확인할 사실은 무엇인가?',
    choices: [
      '공급 양조장과의 파일럿을 먼저 본다',
      '관광객의 유료 지불 의향을 먼저 본다',
      '외국인 예약과 언어 장벽을 먼저 본다',
      '기타 / 직접 입력',
    ],
  };
}

function injectedResponse(content: string): ChatResponse {
  return {
    id: 'injected',
    model: 'injected-not-a-live-model',
    provider: 'openai',
    content,
    finishReason: 'stop',
    usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
    usageKnown: false,
    latencyMs: 0,
  };
}

describe('brewery quality rubric', () => {
  it('keeps eight fixtures and does not call a model from the harness alone', async () => {
    expect(QUALITY_SCENARIOS.map((item) => item.id)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8']);
    expect(QUALITY_SCENARIOS.every((item) => item.criteriaVersion === QUALITY_CRITERIA_VERSION)).toBe(true);
    expect(scenario('S1').founderAnswer).toBeNull();
    expect(QUALITY_SCENARIOS.filter((item) => item.id !== 'S1').every((item) => item.founderAnswer && item.expected && item.forbidden)).toBe(true);
    const runs = await executeQualityMatrix({ currentFirstRequest: buildFirstReviewRequest(BREWERY_QUALITY_BODY) });
    expect(runs).toHaveLength(9);
    expect(runs.map((run) => `${run.id}:${run.promptVersion}`)).toEqual([
      `S1:${BASELINE_PROMPT_VERSION}`,
      `S1:${AI_PM_FIRST_PROMPT_VERSION}`,
      'S2:scenario-sim-1',
      'S3:scenario-sim-1',
      'S4:scenario-sim-1',
      'S5:scenario-sim-1',
      'S6:scenario-sim-1',
      'S7:scenario-sim-1',
      'S8:scenario-sim-1',
    ]);
    expect(runs.every((run) => run.status === 'not_run' && run.source === 'not_called' && run.raw === null && run.criteriaVersion === 'rubric-2')).toBe(true);
    expect(liveModelAvailable()).toBe(false);
  });

  it('fails the stored partnership question and the unsourced fee, and does not offset either', () => {
    const stored = JSON.stringify({
      ...cleanFirst(),
      nextQuestion: '양조장과의 협력 가능성은 어떻게 되는가?',
      choices: [
        '양조장과의 협력 가능성이 높다.',
        '양조장과의 협력 가능성이 낮다.',
        '양조장과의 협력 여부는 미정이다.',
        '기타 / 직접 입력',
      ],
      revenueModel: KNOWN_FAILURE_B,
      judgment: '고객과 문제와 가치와 차별점과 시장과 운영과 경쟁을 넓게 적었다.',
    });
    const evaluated = evaluateQualityText({ scenario: scenario('S1'), raw: stored });
    expect(criterion(evaluated.criteria, 'regression_A').status).toBe('fail');
    expect(criterion(evaluated.criteria, 'regression_A').evidence).toContain('협력 가능성');
    expect(criterion(evaluated.criteria, 'regression_B').status).toBe('fail');
    expect(criterion(evaluated.criteria, 'regression_B').evidence).toContain('수수료');
    expect(criterion(evaluated.criteria, 'next_step_quality').status).toBe('pass');
    expect(evaluated.status).toBe('fail');
    expect(evaluateQualityText({ scenario: scenario('S1'), raw: KNOWN_FAILURE_A }).status).toBe('fail');
    expect(criterion(evaluateQualityText({ scenario: scenario('S1'), raw: KNOWN_FAILURE_B }).criteria, 'regression_B').status).toBe('fail');
  });

  it('does not treat a quoted undecided revenue sentence as a stated fee', () => {
    const s6 = scenario('S6');
    const quoted = evaluateQualityText({
      scenario: s6,
      raw: JSON.stringify(cleanTurn(s6.founderAnswer ?? '')),
      previousQuestion: FIRST_QUESTION,
    });
    expect(criterion(quoted.criteria, 'regression_B').status).toBe('pass');
    expect(criterion(quoted.criteria, 'context_retention').status).toBe('pass');
    const mixed = `가설인 수수료를 후보로 적는다. ${KNOWN_FAILURE_B}`;
    expect(criterion(evaluateQualityText({ scenario: s6, raw: mixed, previousQuestion: FIRST_QUESTION }).criteria, 'regression_B').status).toBe('fail');
  });

  it('passes mechanical rules on an authored reading and leaves semantic quality not_run', () => {
    const evaluated = evaluateQualityText({ scenario: scenario('S1'), raw: JSON.stringify(cleanFirst()) });
    for (const id of ['fact_grounding', 'choice_quality', 'next_step_quality', 'regression_A', 'regression_B'] as const) {
      expect(criterion(evaluated.criteria, id).status, id).toBe('pass');
    }
    for (const id of ['business_understanding', 'analysis_coverage', 'assumption_quality', 'question_quality'] as const) {
      expect(criterion(evaluated.criteria, id).status, id).toBe('not_run');
      expect(criterion(evaluated.criteria, id).kind).toBe('semantic');
    }
    expect(criterion(evaluated.criteria, 'context_retention').status).toBe('not_run');
    expect(evaluated.status).toBe('not_run');
    expect(evaluated.error).toBeNull();
  });

  it('fails an empty response, a parse failure, and a thrown model error', async () => {
    expect(evaluateQualityText({ scenario: scenario('S1'), raw: '   ' })).toMatchObject({ status: 'fail', error: 'empty_response' });
    const unparsed = evaluateQualityText({ scenario: scenario('S1'), raw: 'not json' });
    expect(unparsed.error).toBe('parse_failed');
    expect(unparsed.status).toBe('fail');
    const [failed] = await executeQualityMatrix({
      source: 'injected_chat',
      now: () => '2026-10-29T03:00:00.000Z',
      currentFirstRequest: buildFirstReviewRequest(BREWERY_QUALITY_BODY),
      chat: async () => {
        throw new Error('quota exceeded');
      },
    });
    expect(failed?.status).toBe('fail');
    expect(failed?.error).toContain('quota exceeded');
    expect(failed?.raw).toBeNull();
    expect(failed?.source).toBe('injected_chat');
  });

  it('records an injected matrix without treating it as a live model pass', async () => {
    const calls: ChatRequest[] = [];
    const runs = await executeQualityMatrix({
      source: 'injected_chat',
      now: () => '2026-10-29T03:00:00.000Z',
      businessText: BREWERY_QUALITY_BODY,
      currentFirstRequest: buildFirstReviewRequest(BREWERY_QUALITY_BODY),
      chat: async (request) => {
        calls.push(request);
        const text = request.messages.map((message) => message.content).join('\n');
        if (text.includes('품질 시뮬레이션')) {
          const payload = JSON.parse(request.messages[1]?.content ?? '{}') as { founderAnswer?: string };
          return injectedResponse(JSON.stringify(cleanTurn(payload.founderAnswer ?? '')));
        }
        return injectedResponse(JSON.stringify(cleanFirst()));
      },
    });
    expect(calls).toHaveLength(9);
    expect(runs).toHaveLength(9);
    expect(runs.every((run) => run.source === 'injected_chat' && run.model === 'injected-not-a-live-model')).toBe(true);
    expect(runs.every((run) => run.requestedAt === '2026-10-29T03:00:00.000Z' && run.raw && run.requestText)).toBe(true);
    expect(runs[0]?.promptVersion).toBe(BASELINE_PROMPT_VERSION);
    expect(runs[0]?.requestText).toContain(BASELINE_FIRST_SYSTEM_PROMPT.slice(0, 24));
    expect(runs[0]?.requestText).not.toContain('프롬프트 버전 quality-2');
    expect(runs[1]?.promptVersion).toBe('quality-2');
    expect(runs[1]?.requestText).toContain('양조장 체험');
    expect(runs.slice(2).every((run) => run.promptVersion === AI_PM_QUALITY_SIMULATION_VERSION && run.status === 'not_run')).toBe(true);
    expect(runs.slice(2).every((run) => criterion(run.criteria, 'context_retention').status === 'pass')).toBe(true);
    expect(runs.every((run) => run.status !== 'pass')).toBe(true);
    expect(runs.every((run) => !run.requestText?.includes('sk-') && !run.requestText?.includes('GPT_API_KEY'))).toBe(true);
  });

  it('keeps the frozen baseline distinct and the simulation prompt out of product follow-up', () => {
    const baseline = buildBaselineFirstRequest(BREWERY_QUALITY_BODY);
    const current = buildFirstReviewRequest(BREWERY_QUALITY_BODY);
    expect(baseline.messages[0]?.content).not.toContain('프롬프트 버전 quality-2');
    expect(current.messages[0]?.content).toContain('창업자가 아직 고르지 않은 답을 사실로 만들지 않는다');
    expect(baseline.messages[0]?.content).not.toBe(current.messages[0]?.content);
    const simulation = buildScenarioSimulationRequest({
      businessText: BREWERY_QUALITY_BODY,
      previousQuestion: FIRST_QUESTION,
      previousSummary: '양조장 체험 안내',
      founderAnswer: '아직 협력 양조장이 없다.',
    });
    const simulationText = simulation.messages.map((message) => message.content).join('\n');
    expect(simulationText).toContain(AI_PM_QUALITY_SIMULATION_VERSION);
    expect(simulationText).toContain('제품의 후속 검토 경로가 아니다');
    const followUp = buildFollowUpRequest({
      originalInput: BREWERY_QUALITY_BODY,
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
        nextQuestion: FIRST_QUESTION,
        nextQuestionReason: '갈림길',
        answerHint: '',
        claimConfirmation: null,
      },
      feedback: null,
      supplement: '아직 협력 양조장이 없다.',
      answerOrigin: 'founder-input',
    });
    const followText = followUp.messages.map((message) => message.content).join('\n');
    expect(followText).not.toContain('품질 시뮬레이션');
    expect(followText).not.toContain(AI_PM_QUALITY_SIMULATION_VERSION);
  });
});
