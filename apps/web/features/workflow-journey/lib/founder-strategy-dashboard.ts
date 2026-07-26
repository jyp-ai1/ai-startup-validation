import type { StrategyPipelineResult } from '@repo/agents';

import type { CompetitiveIntelligenceBrief } from './founder-competitive-intelligence';
import type { ExplainableJudgment } from './founder-explainable-judgment';
import type { BusinessProgressDimension } from './founder-intelligence-engine';
import type { GeneratedTodayAction } from './founder-intelligence-engine';
import type { FounderBehaviorProfile } from './founder-behavior-store';

export type SwotItem = { label: string; detail: string };

export type StrategyDashboardData = {
  projectName: string;
  scorePercent: number;
  scoreTrend: number[];
  viabilityBreakdown: Array<{ key: string; percent: number }>;
  validationProgress: Array<{ key: string; percent: number }>;
  swot: {
    strengths: SwotItem[];
    weaknesses: SwotItem[];
    opportunities: SwotItem[];
    threats: SwotItem[];
  };
  competitors: Array<{ name: string; score: number }>;
  positioning: {
    ourLabel: string;
    points: Array<{ name: string; automation: number; price: number; isUs?: boolean }>;
  };
  pricing: {
    recommended: string;
    average: string;
    reason: string;
  };
  recommendedBm: string;
  marketSize: string;
  topRisks: string[];
  recommendedStrategies: string[];
  todayActions: Array<{ id: string; title: string; impact: number; minutes: number }>;
  researchInsight: string;
  discoveryInsight: string;
  judgmentSummary: string;
  strategyHeadline: string;
};

type BuildStrategyDashboardInput = {
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

export function buildStrategyDashboardData(
  input: BuildStrategyDashboardInput,
): StrategyDashboardData {
  const {
    projectName,
    scorePercent,
    businessProgress,
    explainableJudgment,
    competitiveIntelligence,
    pipeline,
    behavior,
    todayActions,
    resolveTitle,
  } = input;

  const progressMap = Object.fromEntries(
    businessProgress.map((item) => [item.key, item.percent]),
  ) as Record<string, number>;

  const mvpPercent = clampPercent(
    ((progressMap.customer ?? 0) + (progressMap.pricing ?? 0)) / 2,
  );

  const viabilityBreakdown = [
    { key: 'market', percent: progressMap.market ?? explainableJudgment.dimensions.find((d) => d.key === 'market')?.percent ?? 0 },
    { key: 'customer', percent: progressMap.customer ?? explainableJudgment.dimensions.find((d) => d.key === 'customer')?.percent ?? 0 },
    { key: 'pricing', percent: progressMap.pricing ?? explainableJudgment.dimensions.find((d) => d.key === 'pricing')?.percent ?? 0 },
    { key: 'mvp', percent: mvpPercent },
  ];

  const validationProgress = explainableJudgment.validationCoverage.map((item) => ({
    key: item.key,
    percent: item.percent,
  }));

  const snapshots = behavior?.scoreSnapshots ?? [];
  const scoreTrend =
    snapshots.length >= 2
      ? snapshots.slice(-4).map((s) => s.score)
      : [
          Math.max(30, scorePercent - 31),
          Math.max(35, scorePercent - 14),
          Math.max(40, scorePercent - 9),
          scorePercent,
        ];

  const marketFinding = pipeline?.research.findings.find((f) => f.domain === 'market');
  const competitorFinding = pipeline?.research.findings.find((f) => f.domain === 'competitor');

  const researchInsight =
    marketFinding?.summary ??
    competitiveIntelligence.marketGap.recommendation ??
    '시장 조사 결과, 카테고리 수요는 확인되었으나 포지셔닝 차별화가 필요합니다.';

  const discoveryInsight =
    competitorFinding?.summary ??
    competitiveIntelligence.strategy.body ??
    'AI PM 운영형 포지셔닝은 직접 경쟁이 거의 없습니다. 기능이 아닌 운영을 팔아야 합니다.';

  const judgmentSummary =
    explainableJudgment.scoreBasisNote ||
    `${explainableJudgment.verdict} · 데이터 커버리지 ${explainableJudgment.dataCoveragePercent}%`;

  const swot = {
    strengths: explainableJudgment.dimensions
      .filter((d) => d.status === 'strong')
      .slice(0, 2)
      .map((d) => ({ label: d.key, detail: d.summary })),
    weaknesses: explainableJudgment.dimensions
      .filter((d) => d.status === 'gap')
      .slice(0, 2)
      .map((d) => ({ label: d.key, detail: d.summary })),
    opportunities: [
      {
        label: '정부지원',
        detail: competitiveIntelligence.marketGap.gapLabel,
      },
      {
        label: '시장 공백',
        detail: competitiveIntelligence.winStrategy.weCompeteOn,
      },
    ],
    threats: competitiveIntelligence.competitors.slice(0, 2).map((c) => ({
      label: c.name,
      detail: c.cons,
    })),
  };

  const competitors = competitiveIntelligence.competitors.slice(0, 4).map((c, index) => ({
    name: c.name,
    score: clampPercent(90 - index * 18 - (c.cons.length > 20 ? 5 : 0)),
  }));

  competitors.unshift({
    name: projectName,
    score: clampPercent(scorePercent + 8),
  });

  const recommendedStrategies = [
    competitiveIntelligence.strategy.headline,
    competitiveIntelligence.winStrategy.weCompeteOn,
    'CEO Dashboard · 실행 루프',
  ].filter(Boolean);

  const topRisks = explainableJudgment.gaps.slice(0, 3).map((g) => g.key);

  return {
    projectName,
    scorePercent,
    scoreTrend,
    viabilityBreakdown,
    validationProgress,
    swot,
    competitors,
    positioning: {
      ourLabel: competitiveIntelligence.ourIdeaLabel,
      points: competitiveIntelligence.positionMap.points,
    },
    pricing: {
      recommended: competitiveIntelligence.pricing.recommended,
      average: competitiveIntelligence.pricing.average,
      reason: competitiveIntelligence.pricing.reason,
    },
    recommendedBm: competitiveIntelligence.strategy.example,
    marketSize: competitiveIntelligence.marketGap.saturatedLabel,
    topRisks: topRisks.length > 0 ? topRisks : ['가격 검증 부족', 'MVP 미완성', '경쟁사 대응'],
    recommendedStrategies,
    todayActions: todayActions.slice(0, 3).map((action) => ({
      id: action.id,
      title: resolveTitle(action),
      impact: action.goImpact ?? 5,
      minutes: action.etaMinutes ?? 15,
    })),
    researchInsight,
    discoveryInsight,
    judgmentSummary,
    strategyHeadline: competitiveIntelligence.strategy.headline,
  };
}
