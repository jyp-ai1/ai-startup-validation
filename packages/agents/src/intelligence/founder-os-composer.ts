import type {
  BusinessDeltaJudgment,
  FounderOsBrief,
  ResearchDomain,
  StrategyPipelineResult,
} from '../types';

function findingConfidence(
  research: StrategyPipelineResult['research'],
  domain: ResearchDomain,
): number {
  return research.findings.find((f) => f.domain === domain)?.confidence ?? 0;
}

function buildBusinessDeltas(result: StrategyPipelineResult): BusinessDeltaJudgment[] {
  const { research, decision } = result;
  const deltas: BusinessDeltaJudgment[] = [];

  const trend = research.findings.find((f) => f.domain === 'trend');
  if (trend) {
    deltas.push({
      id: 'market-trend',
      category: 'market',
      change: trend.summary,
      recommendation: 'Scan 3 trending signals in your category today',
      reason: 'Founder OS category capital inflow creates timing advantage',
      goImpact: 2,
    });
  }

  const competitor = research.findings.find((f) => f.domain === 'competitor');
  if (competitor) {
    deltas.push({
      id: 'competitor-price',
      category: 'competitor',
      change: `${competitor.title}: ${competitor.summary}`,
      recommendation:
        decision.verdict === 'GO'
          ? 'Maintain price — differentiate on trust and speed'
          : 'Keep price while completing VOC before any price change',
      reason: 'Your ICP values trust over price at this stage',
      goImpact: 4,
    });
  }

  const investment = research.findings.find((f) => f.domain === 'investment');
  if (investment) {
    deltas.push({
      id: 'investment-flow',
      category: 'investment',
      change: investment.summary,
      recommendation: 'Defer IR 4 weeks — validate PMF signals first',
      reason: 'Pre-PMF fundraising increases dilution without traction proof',
      goImpact: 1,
    });
  }

  const government = research.findings.find((f) => f.domain === 'government');
  if (government) {
    deltas.push({
      id: 'grant-new',
      category: 'government',
      change: government.summary,
      recommendation: 'Check TIPS eligibility today — 15 min fit assessment',
      reason: 'Non-dilutive runway extends validation window',
      goImpact: 3,
    });
  }

  return deltas.slice(0, 4);
}

function buildDailyReview(result: StrategyPipelineResult, totalEtaMinutes: number): FounderOsBrief['dailyReview'] {
  const { decision, plan, growth } = result;
  const metrics = growth.metrics;
  const advances: string[] = [];
  const pending: string[] = decision.missingData.slice(0, 2);

  if (findingConfidence(result.research, 'market') >= 65) {
    advances.push('Market evidence strengthened');
  } else {
    pending.unshift('Market size validation');
  }

  if (findingConfidence(result.research, 'customer') >= 60) {
    advances.push('Customer signal captured');
  }

  if (decision.intelligence) {
    advances.push(decision.intelligence.expectedEffect);
  }

  const tomorrowFocus =
    plan.missingDomains[0] === 'customer'
      ? 'Customer interviews (VOC)'
      : plan.missingDomains[0] === 'competitor'
        ? 'Competitive differentiation'
        : plan.missingDomains[0] === 'pricing'
          ? 'Pricing validation'
          : 'Market validation';

  return {
    scoreDelta: metrics?.successDelta ?? 3,
    advances: advances.length > 0 ? advances : ['AI pipeline analysis complete'],
    pending: pending.length > 0 ? pending : ['Continue daily Founder loop'],
    tomorrowFocus,
    totalMinutesInvested: totalEtaMinutes,
  };
}

export type ComposeFounderOsOptions = {
  previousSuccessScore?: number;
};

/** Synthesizes Founder Daily OS from agent pipeline — UI reads this, not hardcoded tables. */
export function composeFounderOsBrief(
  result: StrategyPipelineResult,
  options: ComposeFounderOsOptions = {},
): FounderOsBrief {
  const { plan, decision, execution, growth, memory, mentor } = result;
  const metrics = growth.metrics;

  const businessProgress = metrics
    ? [
        { key: 'market' as const, percent: metrics.businessProgress.market },
        { key: 'customer' as const, percent: metrics.businessProgress.customer },
        { key: 'pricing' as const, percent: metrics.businessProgress.pricing },
        { key: 'investment' as const, percent: metrics.businessProgress.investment },
      ]
    : [
        { key: 'market' as const, percent: findingConfidence(result.research, 'market') },
        { key: 'customer' as const, percent: findingConfidence(result.research, 'customer') },
        { key: 'pricing' as const, percent: findingConfidence(result.research, 'pricing') },
        { key: 'investment' as const, percent: findingConfidence(result.research, 'investment') },
      ];

  const todayActions =
    plan.todayActions?.map((action, index) => ({
      id: action.id,
      title: action.title,
      etaMinutes: action.etaMinutes,
      goImpact: action.goImpact,
      order: index + 1,
    })) ??
    execution.tasks.slice(0, 3).map((task, index) => ({
      id: task.id,
      title: task.title,
      etaMinutes: task.etaMinutes,
      goImpact: task.confidenceImpact,
      order: index + 1,
    }));

  const totalEtaMinutes = todayActions.reduce((sum, a) => sum + a.etaMinutes, 0);

  const successPercent =
    metrics?.successScore ??
    Math.min(99, Math.round((decision.confidence + result.research.overallConfidence) / 2));
  const successDelta =
    options.previousSuccessScore != null
      ? Math.max(0, successPercent - options.previousSuccessScore)
      : (metrics?.successDelta ?? 3);

  const reasons = [
    ...decision.reasons.slice(0, 2),
    mentor.coachingFocus,
    memory.weekInsight,
  ].filter(Boolean);

  const morningBrief =
    plan.morningBrief ??
    `${mentor.note} Today: ${decision.nextAction.title} (${decision.nextAction.etaMinutes} min).`;

  return {
    morningBrief,
    successScore: {
      percent: successPercent,
      delta: successDelta > 0 ? successDelta : 3,
      reasons: reasons.slice(0, 4),
    },
    businessProgress,
    todayActions,
    totalEtaMinutes,
    businessDeltas: buildBusinessDeltas(result),
    dailyReview: buildDailyReview(result, totalEtaMinutes),
  };
}
