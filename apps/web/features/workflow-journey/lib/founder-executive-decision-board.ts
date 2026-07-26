import type { StrategyPipelineResult } from '@repo/agents';

import { loadProjectRegistration } from '../components/project-registration-panel';
import type { CompetitiveIntelligenceBrief } from './founder-competitive-intelligence';
import type { ExplainableJudgment } from './founder-explainable-judgment';
import type { BusinessProgressDimension } from './founder-intelligence-engine';
import type { GeneratedTodayAction } from './founder-intelligence-engine';
import type { FounderBehaviorProfile } from './founder-behavior-store';

export type ExecutiveVerdict = 'GO' | 'HOLD' | 'NO_GO';

export type StrategyOptionId = 'A' | 'B' | 'C';

export type ExecutiveDecisionBoardData = {
  projectName: string;
  decisionEngine: {
    verdict: ExecutiveVerdict;
    scorePercent: number;
    stars: number;
    recommendation: string;
    condition: string;
    todayReasons: Array<{ key: string; status: 'done' | 'partial' | 'gap' }>;
    approval: {
      actionId: string;
      title: string;
      scoreBefore: number;
      scoreAfter: number;
      impact: number;
      roiStars: number;
      minutes: number;
    } | null;
    strategyOptions: Array<{
      id: StrategyOptionId;
      title: string;
      successPercent: number;
      recommended: boolean;
      notRecommended?: boolean;
    }>;
  };
  businessCanvas: {
    customer: string;
    problem: string;
    solution: string;
    revenue: string;
    differentiation: string;
    currentStage: { labelKey: string; percent: number };
  };
  marketMetrics: {
    marketSize: string;
    cagr: string;
    tam: string;
    sam: string;
    som: string;
  };
  summary: {
    verdict: ExecutiveVerdict;
    scorePercent: number;
    stars: number;
    headline: string;
    caveat: string;
    todayAction: {
      id: string;
      title: string;
      impact: number;
      minutes: number;
    } | null;
  };
  why: Array<{
    key: string;
    stars: number;
    percent: number;
    summary: string;
    status: 'strong' | 'gap';
  }>;
  prioritizedSwot: {
    strengths: Array<{ id: string; label: string; stars: number }>;
    weaknesses: Array<{ id: string; label: string; stars: number }>;
    opportunities: Array<{ id: string; label: string; stars: number }>;
    threats: Array<{ id: string; label: string; stars: number }>;
  };
  hypothesis: {
    statement: string;
    confidence: number;
    reasons: string[];
    falsifyItems: Array<{ key: string; checked: boolean }>;
  };
  competitorMatrix: {
    competitorNames: string[];
    rows: Array<{ featureKey: string; us: string; them: string[] }>;
  };
  competitorTable: Array<{
    name: string;
    price: string;
    aiStars: number;
    opsStars: number;
    isUs?: boolean;
  }>;
  position: {
    ourLabel: string;
    points: Array<{ name: string; automation: number; isUs?: boolean }>;
  };
  riskHeatmap: Array<{ key: string; level: 'low' | 'medium' | 'high' }>;
  scenarios: Array<{
    id: string;
    titleKey: string;
    change: string;
    scoreImpact: number;
    resultingScore: number;
  }>;
  strategy: Array<{
    key: 'pricing' | 'customer' | 'bm' | 'gtm';
    headline: string;
    detail: string;
  }>;
  execution: Array<{ id: string; title: string; impact: number }>;
  decisionTree: Array<{
    id: string;
    labelKey: string;
    status: 'verdict' | 'branch' | 'ok' | 'gap' | 'action';
    detail?: string;
  }>;
  autonomousBrief: {
    changes: string[];
    dataBacked: boolean;
  };
};

type BuildExecutiveDecisionBoardInput = {
  projectName: string;
  scorePercent: number;
  businessProgress: BusinessProgressDimension[];
  explainableJudgment: ExplainableJudgment;
  competitiveIntelligence: CompetitiveIntelligenceBrief;
  pipeline: StrategyPipelineResult | null;
  behavior: FounderBehaviorProfile | null;
  todayActions: GeneratedTodayAction[];
  resolveTitle: (action: GeneratedTodayAction) => string;
};

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function starsFromPercent(percent: number): number {
  return Math.max(1, Math.min(5, Math.round(percent / 20)));
}

export function starsDisplay(count: number): string {
  return '★'.repeat(count) + '☆'.repeat(Math.max(0, 5 - count));
}

function resolveVerdict(
  pipeline: StrategyPipelineResult | null,
  scorePercent: number,
): ExecutiveVerdict {
  const raw = pipeline?.decision.verdict ?? (scorePercent >= 70 ? 'GO' : 'HOLD');
  if (raw === 'GO' || raw === 'HOLD' || raw === 'NO_GO') return raw;
  return scorePercent >= 70 ? 'GO' : 'HOLD';
}

function buildHypothesisStatement(
  projectName: string,
  competitiveIntelligence: CompetitiveIntelligenceBrief,
): string {
  const reg = loadProjectRegistration();
  const customer = reg?.targetMarket ?? '중소기업·1인 창업';
  const price = competitiveIntelligence.pricing.recommended;
  return `${customer} 대상으로 ${projectName}을(를) ${price}에 판매하면 성공 가능성이 가장 높습니다.`;
}

function buildDecisionTree(
  verdict: ExecutiveVerdict,
  why: ExecutiveDecisionBoardData['why'],
  todayAction: ExecutiveDecisionBoardData['summary']['todayAction'],
): ExecutiveDecisionBoardData['decisionTree'] {
  const market = why.find((w) => w.key === 'market');
  const pricing = why.find((w) => w.key === 'pricing');
  const competitor = why.find((w) => w.key === 'competitor');

  const nodes: ExecutiveDecisionBoardData['decisionTree'] = [
    { id: 'verdict', labelKey: verdict, status: 'verdict' },
    { id: 'why', labelKey: 'whyBranch', status: 'branch' },
  ];

  if (market) {
    nodes.push({
      id: 'market',
      labelKey: 'market',
      status: market.status === 'strong' ? 'ok' : 'gap',
      detail: market.summary,
    });
  }
  if (competitor) {
    nodes.push({
      id: 'competitor',
      labelKey: 'competitor',
      status: competitor.status === 'strong' ? 'ok' : 'gap',
      detail: competitor.summary,
    });
  }
  if (pricing) {
    nodes.push({
      id: 'pricing',
      labelKey: 'pricing',
      status: pricing.status === 'strong' ? 'ok' : 'gap',
      detail: pricing.summary,
    });
  }

  nodes.push({ id: 'therefore', labelKey: 'therefore', status: 'branch' });
  nodes.push({
    id: 'action',
    labelKey: todayAction?.title ?? 'validateNext',
    status: 'action',
    detail: todayAction ? `+${todayAction.impact}%` : undefined,
  });

  return nodes;
}

function inferMarketMetrics(scorePercent: number, competitiveIntelligence: CompetitiveIntelligenceBrief) {
  const base = Math.max(80, scorePercent + 38);
  const tam = `${Math.round(base * 1.2)}억`;
  const sam = `${Math.round(base * 0.32)}억`;
  const som = `${Math.round(base * 0.018 * 10) / 10}억`;
  return {
    marketSize: competitiveIntelligence.marketGap.saturatedLabel || `${Math.round(base * 1.2)}억`,
    cagr: `${Math.max(12, Math.round(scorePercent / 4))}%`,
    tam,
    sam,
    som,
  };
}

export function buildExecutiveDecisionBoardData(
  input: BuildExecutiveDecisionBoardInput,
): ExecutiveDecisionBoardData {
  const {
    projectName,
    scorePercent,
    explainableJudgment,
    competitiveIntelligence,
    pipeline,
    todayActions,
    resolveTitle,
  } = input;

  const reg = loadProjectRegistration();
  const verdict = resolveVerdict(pipeline, scorePercent);
  const stars = starsFromPercent(scorePercent);

  const whyKeys = ['market', 'competitor', 'pricing', 'mvp'] as const;
  const mvpPercent = clampPercent(
    ((explainableJudgment.validationCoverage.find((v) => v.key === 'mvp')?.percent ?? 0) +
      (explainableJudgment.validationCoverage.find((v) => v.key === 'customerProblem')?.percent ?? 0)) /
      2,
  );

  const why = whyKeys.map((key) => {
    if (key === 'mvp') {
      const starsCount = starsFromPercent(mvpPercent);
      return {
        key,
        stars: starsCount,
        percent: mvpPercent,
        summary:
          mvpPercent >= 55
            ? 'MVP·실행 준비 신호가 확인되었습니다.'
            : 'MVP와 실행 검증이 아직 부족합니다.',
        status: (mvpPercent >= 55 ? 'strong' : 'gap') as 'strong' | 'gap',
      };
    }
    const dimKey = key === 'competitor' ? 'competitor' : key;
    const dim = explainableJudgment.dimensions.find((d) => d.key === dimKey);
    return {
      key,
      stars: dim?.stars ?? starsFromPercent(40),
      percent: dim?.percent ?? 40,
      summary: dim?.summary ?? '',
      status: dim?.status ?? ('gap' as const),
    };
  });

  const primaryAction = todayActions[0];
  const todayAction = primaryAction
    ? {
        id: primaryAction.id,
        title: resolveTitle(primaryAction),
        impact: primaryAction.goImpact ?? 5,
        minutes: primaryAction.etaMinutes ?? 15,
      }
    : null;

  const weakest = why.filter((w) => w.status === 'gap').sort((a, b) => a.percent - b.percent)[0];

  const headline =
    verdict === 'GO'
      ? '이 사업은 진행 가능합니다.'
      : verdict === 'HOLD'
        ? '조건부로 진행 가능합니다.'
        : '재검토가 필요합니다.';

  const caveat = weakest
    ? `${weakest.key === 'pricing' ? '가격 검증' : weakest.key === 'mvp' ? 'MVP 검증' : '핵심 검증'}만 완료하면 GO 확률이 크게 상승합니다.`
    : '현재 근거가 충분합니다. 실행 단계로 넘어갈 수 있습니다.';

  const competitorNames = competitiveIntelligence.competitors.slice(0, 2).map((c) => c.name);

  const competitorMatrix = {
    competitorNames,
    rows: [
      { featureKey: 'aiPm', us: starsDisplay(5), them: competitorNames.map(() => '없음') },
      { featureKey: 'marketResearch', us: '자동', them: competitorNames.map(() => '수동') },
      { featureKey: 'strategyRec', us: '자동', them: competitorNames.map(() => '없음') },
      { featureKey: 'businessOps', us: '자동', them: competitorNames.map(() => '없음') },
    ],
  };

  const competitorTable = [
    {
      name: projectName,
      price: competitiveIntelligence.pricing.recommended,
      aiStars: 5,
      opsStars: 5,
      isUs: true,
    },
    ...competitiveIntelligence.competitors.slice(0, 2).map((c, index) => ({
      name: c.name,
      price: c.price.split('~')[0] ?? c.price,
      aiStars: Math.max(1, 2 - index),
      opsStars: Math.max(1, 2 - index),
    })),
  ];

  const hypothesis = {
    statement: buildHypothesisStatement(projectName, competitiveIntelligence),
    confidence: clampPercent(Math.round((scorePercent + explainableJudgment.dataCoveragePercent) / 2)),
    reasons: [
      competitiveIntelligence.winStrategy.weCompeteOn,
      competitiveIntelligence.marketGap.gapLabel,
      competitiveIntelligence.strategy.headline,
    ].filter(Boolean),
    falsifyItems: [
      { key: 'price', checked: (why.find((w) => w.key === 'pricing')?.percent ?? 0) >= 55 },
      {
        key: 'purchaseIntent',
        checked: (explainableJudgment.dimensions.find((d) => d.key === 'customer')?.percent ?? 0) >= 55,
      },
      { key: 'retention', checked: mvpPercent >= 55 },
    ],
  };

  const strongDims = explainableJudgment.dimensions.filter((d) => d.status === 'strong');
  const gapDims = explainableJudgment.dimensions.filter((d) => d.status === 'gap');

  const prioritizedSwot = {
    strengths: strongDims.slice(0, 2).map((d, i) => ({
      id: `s${i + 1}`,
      label: d.key === 'competitor' ? 'aiPm' : d.key,
      stars: d.stars,
    })),
    weaknesses: gapDims.slice(0, 2).map((d, i) => ({
      id: `w${i + 1}`,
      label: d.key,
      stars: d.stars,
    })),
    opportunities: [
      { id: 'o1', label: 'government', stars: 4 },
      { id: 'o2', label: 'marketGap', stars: 3 },
    ],
    threats: competitiveIntelligence.competitors.slice(0, 2).map((c, i) => ({
      id: `t${i + 1}`,
      label: c.id,
      stars: 2,
    })),
  };

  const strategy = [
    { key: 'pricing' as const, headline: competitiveIntelligence.pricing.recommended, detail: competitiveIntelligence.pricing.reason },
    { key: 'customer' as const, headline: competitiveIntelligence.winStrategy.weCompeteOn, detail: competitiveIntelligence.marketGap.recommendation },
    { key: 'bm' as const, headline: competitiveIntelligence.strategy.headline, detail: competitiveIntelligence.strategy.example },
    { key: 'gtm' as const, headline: competitiveIntelligence.winStrategy.competitorCompetesOn, detail: competitiveIntelligence.strategy.body },
  ];

  const execution = todayActions.slice(0, 3).map((action) => ({
    id: action.id,
    title: resolveTitle(action),
    impact: action.goImpact ?? 5,
  }));

  const summary = { verdict, scorePercent, stars, headline, caveat, todayAction };

  const impact = todayAction?.impact ?? 7;
  const scoreAfter = clampPercent(scorePercent + impact);

  const todayReasons = why.slice(0, 3).map((item) => ({
    key: item.key,
    status:
      item.status === 'strong'
        ? ('done' as const)
        : item.percent >= 45
          ? ('partial' as const)
          : ('gap' as const),
  }));

  const strategyOptions: ExecutiveDecisionBoardData['decisionEngine']['strategyOptions'] = [
    {
      id: 'A',
      title: todayAction?.title ?? '가격 인터뷰 5명',
      successPercent: scoreAfter,
      recommended: true,
    },
    {
      id: 'B',
      title: 'B2B 전환',
      successPercent: clampPercent(scorePercent + 9),
      recommended: false,
    },
    {
      id: 'C',
      title: '학생 시장',
      successPercent: clampPercent(Math.max(35, scorePercent - 40)),
      recommended: false,
      notRecommended: true,
    },
  ];

  const decisionEngine: ExecutiveDecisionBoardData['decisionEngine'] = {
    verdict,
    scorePercent,
    stars,
    recommendation: verdict === 'GO' ? 'startNow' : verdict === 'HOLD' ? 'conditionalGo' : 'revisit',
    condition: weakest
      ? weakest.key === 'pricing'
        ? 'priceValidationForGo'
        : 'keyValidationForGo'
      : 'readyForGo',
    todayReasons,
    approval: todayAction
      ? {
          actionId: todayAction.id,
          title: todayAction.title,
          scoreBefore: scorePercent,
          scoreAfter,
          impact,
          roiStars: starsFromPercent(scoreAfter),
          minutes: todayAction.minutes,
        }
      : null,
    strategyOptions,
  };

  const businessCanvas: ExecutiveDecisionBoardData['businessCanvas'] = {
    customer: reg?.targetMarket ?? '중소기업·1인 창업',
    problem: reg?.ideaOneLiner?.includes('PM') ? 'PM 없음' : '전략·운영 리소스 부족',
    solution: 'AI PM',
    revenue: competitiveIntelligence.pricing.recommended,
    differentiation: '24시간 AI 운영',
    currentStage: {
      labelKey: 'marketValidation',
      percent: why.find((w) => w.key === 'market')?.percent ?? scorePercent,
    },
  };

  const marketMetrics = inferMarketMetrics(scorePercent, competitiveIntelligence);

  const riskHeatmap: ExecutiveDecisionBoardData['riskHeatmap'] = gapDims.slice(0, 3).map((d) => ({
    key: d.key,
    level: d.percent < 35 ? 'high' : d.percent < 50 ? 'medium' : 'low',
  }));

  const scenarios: ExecutiveDecisionBoardData['scenarios'] = [
    {
      id: 'price-down',
      titleKey: 'priceDown',
      change: competitiveIntelligence.pricing.recommended,
      scoreImpact: -4,
      resultingScore: clampPercent(scorePercent - 4),
    },
    {
      id: 'b2b',
      titleKey: 'b2bPivot',
      change: 'B2B',
      scoreImpact: 9,
      resultingScore: clampPercent(scorePercent + 9),
    },
    {
      id: 'feature',
      titleKey: 'addFeature',
      change: 'CEO Dashboard',
      scoreImpact: 5,
      resultingScore: clampPercent(scorePercent + 5),
    },
    {
      id: 'funding',
      titleKey: 'raiseSeed',
      change: 'Seed',
      scoreImpact: 6,
      resultingScore: clampPercent(scorePercent + 6),
    },
  ];

  return {
    projectName,
    decisionEngine,
    businessCanvas,
    marketMetrics,
    summary,
    why,
    prioritizedSwot,
    hypothesis,
    competitorMatrix,
    competitorTable,
    position: {
      ourLabel: competitiveIntelligence.ourIdeaLabel,
      points: competitiveIntelligence.positionMap.points.map((p) => ({
        name: p.name,
        automation: p.automation,
        isUs: p.isUs,
      })),
    },
    riskHeatmap,
    scenarios,
    strategy,
    execution,
    decisionTree: buildDecisionTree(verdict, why, todayAction),
    autonomousBrief: {
      changes: [
        competitiveIntelligence.marketGap.gapLabel,
        competitorFindingSummary(pipeline),
      ].filter(Boolean),
      dataBacked: Boolean(pipeline?.research.findings.length),
    },
  };
}

function competitorFindingSummary(pipeline: StrategyPipelineResult | null): string {
  return pipeline?.research.findings.find((f) => f.domain === 'competitor')?.summary ?? '';
}
