import type {
  BarrierLevel,
  CompetitionIntensity,
  DemandLevel,
  MarketAnalysisInput,
  MarketAnalysisResult,
  MarketDecisionDriver,
  MarketMaturity,
  MarketProvider,
  MarketResult,
  TrendDirection,
} from '../services/market-types';

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function calcImpact(score: number): number {
  return Math.min(15, Math.max(-15, Math.round((score - 50) / 4)));
}

function dataCompleteness(input: MarketAnalysisInput): number {
  const checks = [
    input.research.total >= 2,
    input.evidence.total >= 3,
    input.voc.total >= 5,
    input.competitors.total >= 1,
    input.industry !== null,
    input.targetMarket !== null,
  ];
  return checks.filter(Boolean).length / checks.length;
}

function deriveMarketSize(input: MarketAnalysisInput): number {
  const base = 500 + input.research.total * 120 + input.evidence.highConfidence * 80;
  const industryBoost = input.industry?.includes('ai') ? 800 : 0;
  return clamp(base + industryBoost, 50, 5000);
}

function deriveGrowth(input: MarketAnalysisInput): number {
  const base = 8 + input.research.progressPercent * 0.12 + Math.min(input.voc.total, 15) * 0.4;
  return Math.round(base * 10) / 10;
}

function deriveCompetition(input: MarketAnalysisInput): CompetitionIntensity {
  if (input.competitors.total >= 5) return 'VERY_HIGH';
  if (input.competitors.total >= 3) return 'HIGH';
  if (input.competitors.total >= 1) return 'MODERATE';
  return 'LOW';
}

function deriveMaturity(input: MarketAnalysisInput): MarketMaturity {
  if (input.projectType === 'STARTUP') return 'EMERGING';
  if (input.projectType === 'MARKET_EXPANSION') return 'GROWTH';
  if (input.research.progressPercent >= 70) return 'MATURE';
  return 'GROWTH';
}

function deriveDemand(input: MarketAnalysisInput): DemandLevel {
  if (input.voc.total >= 15) return 'VERY_HIGH';
  if (input.voc.total >= 8) return 'HIGH';
  if (input.voc.total >= 3) return 'MODERATE';
  return 'LOW';
}

function deriveTrend(score: number): TrendDirection {
  if (score >= 65) return 'RISING';
  if (score >= 40) return 'STABLE';
  return 'DECLINING';
}

function buildDrivers(
  growthRate: number,
  competition: CompetitionIntensity,
  regulation: TrendDirection,
  demand: DemandLevel,
): MarketDecisionDriver[] {
  const drivers: MarketDecisionDriver[] = [];

  const growthImpact = clamp(growthRate * 1.2, 0, 15);
  if (growthImpact >= 6) {
    drivers.push({
      id: 'market-growth',
      labelKey: 'marketGrowth',
      impact: growthImpact,
      direction: 'positive',
    });
  }

  const competitionImpact =
    competition === 'VERY_HIGH'
      ? -12
      : competition === 'HIGH'
        ? -8
        : competition === 'MODERATE'
          ? -3
          : 4;
  drivers.push({
    id: 'competition-intensity',
    labelKey: 'highCompetition',
    impact: competitionImpact,
    direction: competitionImpact >= 0 ? 'positive' : 'negative',
  });

  if (regulation === 'DECLINING' || regulation === 'STABLE') {
    drivers.push({
      id: 'regulation',
      labelKey: 'regulation',
      impact: regulation === 'DECLINING' ? -5 : -2,
      direction: 'negative',
    });
  } else {
    drivers.push({
      id: 'regulation-tailwind',
      labelKey: 'regulationTailwind',
      impact: 4,
      direction: 'positive',
    });
  }

  if (demand === 'HIGH' || demand === 'VERY_HIGH') {
    drivers.push({
      id: 'customer-demand',
      labelKey: 'customerDemand',
      impact: demand === 'VERY_HIGH' ? 10 : 6,
      direction: 'positive',
    });
  } else if (demand === 'LOW') {
    drivers.push({
      id: 'demand-gap',
      labelKey: 'demandGap',
      impact: -7,
      direction: 'negative',
    });
  }

  return drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact)).slice(0, 5);
}

function buildMarketResult(input: MarketAnalysisInput): MarketResult {
  const completeness = dataCompleteness(input);
  const marketSize = deriveMarketSize(input);
  const tam = Math.round(marketSize * 1.4);
  const sam = Math.round(marketSize * 0.35);
  const som = Math.round(marketSize * 0.08);
  const growthRate = deriveGrowth(input);
  const competitionIntensity = deriveCompetition(input);
  const marketMaturity = deriveMaturity(input);
  const customerDemand = deriveDemand(input);
  const technologyTrend = deriveTrend(
    50 + (input.industry?.includes('ai') ? 20 : 0) + input.evidence.highConfidence * 2,
  );
  const investmentTrend = deriveTrend(
    45 + (input.grants.total > 0 ? 15 : 0) + growthRate * 2,
  );
  const regulation =
    input.grants.total >= 1 ? ('RISING' as TrendDirection) : ('STABLE' as TrendDirection);
  const entryBarrier: BarrierLevel =
    competitionIntensity === 'VERY_HIGH' || competitionIntensity === 'HIGH' ? 'HIGH' : 'MODERATE';

  const marketScore = clamp(
    growthRate * 3 +
      (customerDemand === 'VERY_HIGH' ? 25 : customerDemand === 'HIGH' ? 18 : 8) +
      (competitionIntensity === 'LOW' ? 15 : competitionIntensity === 'MODERATE' ? 8 : 0) +
      completeness * 20,
  );

  const confidence = clamp(completeness * 60 + input.evidence.highConfidence * 4 + 20);
  const decisionDrivers = buildDrivers(growthRate, competitionIntensity, regulation, customerDemand);
  const aggregateImpact =
    calcImpact(marketScore) +
    decisionDrivers.reduce((sum, d) => sum + Math.round(d.impact * 0.15), 0);

  return {
    marketSize,
    tam,
    sam,
    som,
    growthRate,
    marketMaturity,
    competitionIntensity,
    technologyTrend: technologyTrend,
    investmentTrend,
    regulation,
    entryBarrier,
    customerDemand,
    topPlayers: [
      { id: 'p1', nameKey: 'players.incumbent', roleKey: 'players.leader' },
      { id: 'p2', nameKey: 'players.challenger', roleKey: 'players.challenger' },
      { id: 'p3', nameKey: 'players.newcomer', roleKey: 'players.newcomer' },
    ],
    topInvestors: [
      { id: 'i1', nameKey: 'investors.vc', roleKey: 'investors.seriesA' },
      { id: 'i2', nameKey: 'investors.corporate', roleKey: 'investors.strategic' },
    ],
    emergingTechnologyKey: input.industry?.includes('ai')
      ? 'emergingTech.aiAgents'
      : 'emergingTech.digitalPlatforms',
    opportunities: [
      {
        id: 'o1',
        labelKey: 'opportunities.growth.label',
        textKey: 'opportunities.growth.text',
      },
      {
        id: 'o2',
        labelKey: 'opportunities.segment.label',
        textKey: 'opportunities.segment.text',
      },
    ],
    threats: [
      {
        id: 't1',
        labelKey: 'threats.competition.label',
        textKey: 'threats.competition.text',
      },
      {
        id: 't2',
        labelKey: 'threats.regulation.label',
        textKey: 'threats.regulation.text',
      },
    ],
    sources: [
      { id: 's1', labelKey: 'sources.research', sourceKey: 'sources.researchDetail' },
      { id: 's2', labelKey: 'sources.industry', sourceKey: 'sources.industryDetail' },
      { id: 's3', labelKey: 'sources.competitor', sourceKey: 'sources.competitorDetail' },
    ],
    confidence,
    marketScore,
    aggregateImpact: clamp(aggregateImpact, -15, 15),
    decisionDrivers,
    analyzedAt: new Date().toISOString(),
  };
}

export class MockMarketProvider implements MarketProvider {
  readonly id = 'mock' as const;

  async analyze(input: MarketAnalysisInput): Promise<MarketAnalysisResult> {
    const result = buildMarketResult(input);
    return {
      result,
      selectedModules: [],
      executionDurationMs: 0,
      providerId: 'mock',
    };
  }
}

export const mockMarketProvider = new MockMarketProvider();
