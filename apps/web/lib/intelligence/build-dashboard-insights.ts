import type { ProjectDashboardStats } from '@/features/dashboard/types';
import { buildExpertOpinions } from '@/features/dashboard/utils/expert-opinions';
import { buildReadinessMetrics, getTopPercent } from '@/features/dashboard/utils/readiness-calculator';

import type { IntelligenceInsightBundle, IntelligenceTimelinePoint } from './types';
import { clampPercent, decisionToVerdict, scoreToStars } from './types';

const SENTIMENT_SCORE = { positive: 86, neutral: 71, negative: 49 } as const;
const SENTIMENT_LABEL = {
  positive: 'intelligence.sentiment.positive',
  neutral: 'intelligence.sentiment.neutral',
  negative: 'intelligence.sentiment.negative',
} as const;

function buildTimelineFromActivity(
  stats: ProjectDashboardStats,
): IntelligenceTimelinePoint[] {
  const buckets = new Map<string, number>();
  const now = new Date();

  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString(undefined, { month: 'short' });
    buckets.set(key, 0);
  }

  for (const item of stats.recentActivity) {
    const d = new Date(item.occurredAt);
    const key = d.toLocaleDateString(undefined, { month: 'short' });
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + 1);
    }
  }

  let cumulative = stats.evidence.total + stats.voc.total;
  const points: IntelligenceTimelinePoint[] = [];
  for (const [label, delta] of Array.from(buckets.entries())) {
    cumulative = Math.max(0, cumulative - delta + Math.floor(cumulative * 0.05));
    points.push({ label, value: clampPercent(cumulative + delta * 3) });
  }

  return points.length > 0
    ? points
    : Array.from(buckets.entries()).map(([label]) => ({ label, value: 10 }));
}

function pickSummaryKey(stats: ProjectDashboardStats): string {
  const { validationScore, evidence, voc, grants, competitors } = stats;
  if (!validationScore || validationScore.decision === 'DRAFT') {
    return 'intelligence.summary.insufficient';
  }
  if (validationScore.decision === 'GO' && evidence.byConfidence.HIGH >= 5) {
    return 'intelligence.summary.goStrong';
  }
  if (validationScore.decision === 'GO') {
    return 'intelligence.summary.go';
  }
  if (validationScore.decision === 'CONDITIONAL_GO') {
    return 'intelligence.summary.review';
  }
  if (validationScore.decision === 'NO_GO') {
    return 'intelligence.summary.hold';
  }
  if (voc.total < 10) {
    return 'intelligence.summary.needVoc';
  }
  if (grants.total === 0) {
    return 'intelligence.summary.needGrants';
  }
  if (competitors.total < 2) {
    return 'intelligence.summary.needCompetitors';
  }
  return 'intelligence.summary.default';
}

function pickInsightKeys(stats: ProjectDashboardStats): string[] {
  const keys: string[] = [];
  const { validationScore, evidence, voc, grants, competitors } = stats;

  if (validationScore && validationScore.marketScore >= 14) {
    keys.push('intelligence.insights.marketStrong');
  } else {
    keys.push('intelligence.insights.marketReview');
  }

  if (competitors.total >= 2 && validationScore && validationScore.competitionScore >= 10) {
    keys.push('intelligence.insights.competitionLow');
  } else {
    keys.push('intelligence.insights.competitionReview');
  }

  if (grants.total >= 2) {
    keys.push('intelligence.insights.grantFit');
  }

  if (voc.total >= 10) {
    keys.push('intelligence.insights.pmfPossible');
  } else {
    keys.push('intelligence.insights.customerRisk');
  }

  if (evidence.byConfidence.HIGH >= 8) {
    keys.push('intelligence.insights.vcInterest');
  }

  return keys.slice(0, 4);
}

export function buildDashboardInsights(stats: ProjectDashboardStats): IntelligenceInsightBundle {
  const { validationScore } = stats;
  const score = validationScore?.totalScore ?? null;
  const readiness = buildReadinessMetrics(stats);
  const investment = readiness.find((r) => r.key === 'investment')!;
  const expertOpinions = buildExpertOpinions(stats);

  const confidence = clampPercent(
    (score ?? 0) * 0.4 +
      stats.evidence.byConfidence.HIGH * 6 +
      Math.min(stats.voc.total, 20) * 1.5,
  );

  const reasoning = validationScore
    ? [
        { key: 'intelligence.reasoning.market', score: validationScore.marketScore, maxScore: 20 },
        { key: 'intelligence.reasoning.competition', score: validationScore.competitionScore, maxScore: 15 },
        { key: 'intelligence.reasoning.execution', score: validationScore.executionScore, maxScore: 15 },
        { key: 'intelligence.reasoning.funding', score: investment.percent, maxScore: 100 },
      ]
    : [
        { key: 'intelligence.reasoning.market', score: 0, maxScore: 20 },
        { key: 'intelligence.reasoning.competition', score: 0, maxScore: 15 },
        { key: 'intelligence.reasoning.execution', score: 0, maxScore: 15 },
        { key: 'intelligence.reasoning.funding', score: investment.percent, maxScore: 100 },
      ];

  return {
    verdict: decisionToVerdict(validationScore?.decision),
    fundingProbability: investment.percent,
    topPercent: getTopPercent(score),
    confidence,
    stars: scoreToStars(confidence),
    summaryKey: pickSummaryKey(stats),
    insightKeys: pickInsightKeys(stats),
    reasoning,
    experts: expertOpinions.map((o) => ({
      role: o.role,
      labelKey: o.labelKey,
      score: SENTIMENT_SCORE[o.sentiment],
      stars: scoreToStars(SENTIMENT_SCORE[o.sentiment]),
      sentimentLabelKey: SENTIMENT_LABEL[o.sentiment],
      opinionKey: o.opinionKey,
    })),
    timeline: buildTimelineFromActivity(stats),
  };
}
