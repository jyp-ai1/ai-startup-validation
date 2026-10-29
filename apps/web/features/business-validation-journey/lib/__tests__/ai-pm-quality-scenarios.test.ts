import type { ChatRequest } from '@repo/ai';
import { describe, expect, it } from 'vitest';

import { buildFirstReviewRequest, buildFollowUpRequest, parseSections } from '../ai-pm-review';
import {
  AI_PM_QUALITY_SIMULATION_VERSION,
  BREWERY_QUALITY_BODY,
  BREWERY_SCENARIOS,
  buildScenarioSimulationRequest,
  evaluateFirstAnalysis,
  evaluateScenarioTurn,
  executeBreweryScenarios,
  liveModelAvailable,
  parseScenarioTurn,
  type ScenarioTurn,
} from '../ai-pm-quality-scenarios';

const PREVIOUS_QUESTION = '이 사업을 처음 시작할 때, 가장 먼저 해결하려는 문제는 무엇인가요?';

function firstPayload(choices: string[], revenueModel: string) {
  return {
    summary: '전통주에 관심 있는 관광객에게 양조장 체험을 안내하고, 양조장 온라인 마케팅을 지원하려는 사업이다.',
    customer: '전통주와 양조장 체험에 관심 있는 내국인·외국인 관광객.',
    problem: '체험을 찾고 예약하는 경로와, 양조장 홍보가 방문으로 이어지는지가 원문만으로 갈리지 않는다.',
    alternatives: '관광객은 개별 검색과 기존 관광 상품에 의존한다.',
    value: '체험 안내와 양조장 마케팅 지원을 함께 구상한다.',
    differentiation: '체험과 주변 관광, 온라인 마케팅 지원을 한 흐름으로 보려는 가설이다.',
    operatingModel: '양조장과 함께 체험 안내를 운영하려는 구상이며, 제휴는 확정되지 않았다.',
    payer: '누가 비용을 내는지는 원문에 없다.',
    revenueModel,
    market: '개인 경험을 중시하는 관광객이 늘고 있다는 진술이 있다. 시장 규모는 원문만으로 확정할 수 없다.',
    competition: '대체 수단은 원문에 없다.',
    operations: '공급 양조장과 예약 운영은 아직 없다.',
    profitability: '매출은 원문만으로 확정할 수 없다.',
    strengths: ['체험과 마케팅 지원을 함께 말한다.'],
    risks: ['체험 수요와 양조장의 비용 부담이 확인되지 않았다.'],
    assumptions: ['관광객이 체험을 찾는지와, 양조장이 협력할지가 갈린다.'],
    evidenceToChange: ['파일럿으로 확인한 예약 한 건'],
    founderFacts: ['양조장 체험 안내와 온라인 마케팅 지원을 구상한다.'],
    inferences: ['지불자는 아직 가설이다.'],
    judgment: '수요와 공급 협력이 확인되기 전에는 사업 성립을 확정할 수 없다.',
    nextVerification: '양조장 한 곳에 체험 안내 파일럿을 제안해 참여 의사를 듣는다.',
    nextQuestion: PREVIOUS_QUESTION,
    nextQuestionReason: '누구의 문제를 먼저 풀지에 따라 다음 검증이 달라진다.',
    choices,
  };
}

const AUTHORED_SIGNAL =
  '공급 확보와 파일럿, 참여 의사, 운영과 체험 상품과 예약, 관심과 유료 지불을 가르는 실험, 언어와 이동과 이해를 우선 본다. 수수료와 체험과 마케팅은 가설이며 미정이고 아직 정하지 못했다. 근거가 되는 증거를 확인한다. 수익 가설의 대안은 다른 관광객 체험이다. 관광객과 양조장 사이 병목을 먼저 순서로 정한다.';

function authoredTurn(text: string): ScenarioTurn {
  const body = `${text} ${AUTHORED_SIGNAL}`;
  return {
    founderClaim: `${body} 이것은 창업자 주장이며 가설이다.`,
    changed: body,
    unchanged: '시장 규모와 가격은 여전히 미확인 가설이다.',
    priority: body,
    cheapExperiment: body,
    nextQuestion: '다음에 가장 싸게 확인할 사실은 무엇인가?',
    choices: [
      '공급 양조장과의 파일럿을 먼저 본다',
      '관광객의 유료 지불 의향을 먼저 본다',
      '외국인 예약과 언어 장벽을 먼저 본다',
      '기타 / 직접 입력',
    ],
  };
}

describe('brewery quality scenarios', () => {
  it('keeps eight founder answers and does not call a model from the harness alone', async () => {
    expect(BREWERY_SCENARIOS.map((scenario) => scenario.id)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
    const runs = await executeBreweryScenarios({
      previousQuestion: PREVIOUS_QUESTION,
      previousSummary: '양조장 체험과 마케팅 지원을 구상 중이다.',
    });
    expect(runs).toHaveLength(8);
    expect(runs.every((run) => run.status === 'not_run' && run.source === 'not_called' && run.raw === null)).toBe(true);
    expect(liveModelAvailable()).toBe(false);
  });

  it('fails the recorded partnership question and passes a wider authored reading', () => {
    const polarity = parseSections(
      JSON.stringify(
        firstPayload(
          [
            '양조장과의 협력 가능성이 높다.',
            '양조장과의 협력 가능성이 낮다.',
            '양조장과의 협력 여부는 미정이다.',
            '기타 / 직접 입력',
          ],
          '수익 구조는 원문에 없다.',
        ),
      ),
      BREWERY_QUALITY_BODY,
    );
    expect(evaluateFirstAnalysis(BREWERY_QUALITY_BODY, polarity).failures).toContain('polarity_choices');
    const wide = parseSections(
      JSON.stringify(
        firstPayload(
          [
            '관광객이 양조장 체험을 찾거나 예약하기 어렵다',
            '양조장 홍보가 방문이나 예약으로 이어지기 어렵다',
            '아직 누구의 문제를 먼저 풀지 정하지 못했다',
            '기타 / 직접 입력',
          ],
          '가능한 수익은 가설이며 원문에서 확인되지 않았다. 수수료나 참가비는 적혀 있지 않다.',
        ),
      ),
      BREWERY_QUALITY_BODY,
    );
    expect(evaluateFirstAnalysis(BREWERY_QUALITY_BODY, wide)).toEqual({ status: 'pass', failures: [] });
    const statedFee = wide ? { ...wide, revenueModel: '양조장 수수료와 참가비로 수익을 낸다.' } : null;
    expect(evaluateFirstAnalysis(BREWERY_QUALITY_BODY, statedFee).failures).toContain('unsourced_revenue_as_fact');
  });

  it('scores authored scenario turns without treating them as model passes', () => {
    for (const scenario of BREWERY_SCENARIOS) {
      const passed = evaluateScenarioTurn({
        scenario,
        previousQuestion: PREVIOUS_QUESTION,
        turn: authoredTurn(`${scenario.founderAnswer} ${scenario.title}`),
      });
      expect(passed.status, scenario.id).toBe('pass');
      const repeated = evaluateScenarioTurn({
        scenario,
        previousQuestion: PREVIOUS_QUESTION,
        turn: { ...authoredTurn(scenario.founderAnswer), nextQuestion: PREVIOUS_QUESTION, changed: '확정된 사실이다.' },
      });
      expect(repeated.status, scenario.id).toBe('fail');
      expect(repeated.failures).toContain('repeated_question');
    }
    const raw = JSON.stringify(authoredTurn('아직 협력 양조장이 없다. 공급 확보와 파일럿이 우선인 가설이다.'));
    expect(parseScenarioTurn(raw)?.founderClaim).toContain('가설');
  });

  it('keeps the simulation prompt out of the product follow-up request', () => {
    const first = buildFirstReviewRequest(BREWERY_QUALITY_BODY);
    const firstText = first.messages.map((message) => message.content).join('\n');
    expect(firstText).toContain('quality-2');
    expect(firstText).toContain('양조장 체험');
    const simulation = buildScenarioSimulationRequest({
      businessText: BREWERY_QUALITY_BODY,
      previousQuestion: PREVIOUS_QUESTION,
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
        nextQuestion: PREVIOUS_QUESTION,
        nextQuestionReason: '갈림길',
        answerHint: '',
        claimConfirmation: null,
      },
      feedback: null,
      supplement: '아직 협력 양조장이 없다.',
    });
    const followText = followUp.messages.map((message) => message.content).join('\n');
    expect(followText).not.toContain('품질 시뮬레이션');
    expect(followText).not.toContain(AI_PM_QUALITY_SIMULATION_VERSION);
    const requests: ChatRequest[] = [first, simulation, followUp];
    expect(requests).toHaveLength(3);
  });
});
