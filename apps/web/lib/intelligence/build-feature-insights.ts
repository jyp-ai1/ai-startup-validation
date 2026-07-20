import type { Competitor, Evidence, EvidenceConfidence, GovernmentGrant, KnowledgeDocument, ResearchPlan, VOC } from '@repo/types/validation';
import type { ValidationReport } from '@repo/types/validation';

import type { IntelligenceCategoryChip, IntelligenceInsightBundle, IntelligenceTimelinePoint } from './types';
import { clampPercent, scoreToStars } from './types';

function monthTimeline(items: { updatedAt: string }[], baseValue: number): IntelligenceTimelinePoint[] {
  const buckets = new Map<string, number>();
  const now = new Date();
  for (let i = 5; i >= 0; i -= 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(d.toLocaleDateString(undefined, { month: 'short' }), 0);
  }
  for (const item of items) {
    const key = new Date(item.updatedAt).toLocaleDateString(undefined, { month: 'short' });
    if (buckets.has(key)) buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  let running = baseValue;
  return [...buckets.entries()].map(([label, count]) => {
    running += count;
    return { label, value: running };
  });
}

function evidenceConfidence(items: Evidence[]): number {
  if (items.length === 0) return 0;
  const weights: Record<EvidenceConfidence, number> = { HIGH: 5, MEDIUM: 3, LOW: 1 };
  const sum = items.reduce((acc, e) => acc + weights[e.confidence], 0);
  return clampPercent((sum / items.length / 5) * 100);
}

function verdictFromPercent(p: number): IntelligenceInsightBundle['verdict'] {
  if (p >= 75) return 'GO';
  if (p >= 55) return 'REVIEW';
  if (p >= 30) return 'HOLD';
  return 'INSUFFICIENT';
}

export function buildEvidenceInsights(items: Evidence[]): IntelligenceInsightBundle {
  const confidence = evidenceConfidence(items);
  const high = items.filter((e) => e.confidence === 'HIGH').length;
  const verdict = verdictFromPercent(confidence);

  const categories: IntelligenceCategoryChip[] = [
    { key: 'startup', labelKey: 'intelligence.categories.startup', value: items.filter((e) => e.category === 'MARKET').length },
    { key: 'investment', labelKey: 'intelligence.categories.investment', value: items.filter((e) => e.category === 'BUSINESS').length },
    { key: 'technology', labelKey: 'intelligence.categories.technology', value: items.filter((e) => e.category === 'TECHNOLOGY').length },
    { key: 'government', labelKey: 'intelligence.categories.government', value: items.filter((e) => e.category === 'REGULATION').length },
  ];

  return {
    verdict,
    fundingProbability: clampPercent(confidence * 0.85 + high * 2),
    topPercent: confidence >= 60 ? clampPercent(100 - confidence) : null,
    confidence,
    stars: scoreToStars(confidence),
    summaryKey:
      confidence >= 70
        ? 'intelligence.evidence.summary.strong'
        : confidence >= 45
          ? 'intelligence.evidence.summary.moderate'
          : 'intelligence.evidence.summary.weak',
    insightKeys: [
      high >= 5 ? 'intelligence.evidence.insights.sufficient' : 'intelligence.evidence.insights.needMore',
      high >= 10 ? 'intelligence.insights.vcInterest' : 'intelligence.evidence.insights.addHigh',
      items.length >= 20 ? 'intelligence.evidence.insights.depth' : 'intelligence.evidence.insights.volume',
    ],
    reasoning: [
      { key: 'intelligence.reasoning.market', score: items.filter((e) => e.category === 'MARKET').length, maxScore: 20 },
      { key: 'intelligence.reasoning.competition', score: high, maxScore: 15 },
      { key: 'intelligence.reasoning.execution', score: items.filter((e) => e.category === 'TECHNOLOGY').length, maxScore: 15 },
      { key: 'intelligence.reasoning.funding', score: confidence, maxScore: 100 },
    ],
    experts: [],
    timeline: monthTimeline(items, Math.max(0, items.length - 6)),
    categories,
  };
}

export function buildVocInsights(entries: VOC[]): IntelligenceInsightBundle {
  const critical = entries.filter((e) => e.severity === 'CRITICAL' || e.severity === 'HIGH').length;
  const payment = entries.filter((e) => e.willingnessToPay === 'HIGH' || e.willingnessToPay === 'MEDIUM').length;
  const confidence = clampPercent(Math.min(entries.length, 30) * 2.5 + payment * 4 + critical * 2);
  const verdict = entries.length >= 20 && payment >= 5 ? 'GO' : entries.length >= 10 ? 'REVIEW' : 'INSUFFICIENT';

  return {
    verdict,
    fundingProbability: clampPercent(payment * 8 + critical * 2),
    topPercent: confidence >= 55 ? clampPercent(100 - confidence) : null,
    confidence,
    stars: scoreToStars(confidence),
    summaryKey:
      entries.length >= 20
        ? 'intelligence.voc.summary.strong'
        : entries.length >= 8
          ? 'intelligence.voc.summary.moderate'
          : 'intelligence.voc.summary.weak',
    insightKeys: [
      critical >= 3 ? 'intelligence.voc.insights.pain' : 'intelligence.voc.insights.needPain',
      payment >= 5 ? 'intelligence.insights.pmfPossible' : 'intelligence.voc.insights.payment',
      entries.filter((e) => e.sourceType === 'INTERVIEW').length >= 5
        ? 'intelligence.voc.insights.interviews'
        : 'intelligence.voc.insights.needInterviews',
    ],
    reasoning: [
      { key: 'intelligence.reasoning.market', score: entries.length, maxScore: 30 },
      { key: 'intelligence.reasoning.competition', score: critical, maxScore: 15 },
      { key: 'intelligence.reasoning.execution', score: payment, maxScore: 15 },
      { key: 'intelligence.reasoning.funding', score: confidence, maxScore: 100 },
    ],
    experts: [],
    timeline: monthTimeline(entries, Math.max(0, entries.length - 4)),
  };
}

export function buildResearchInsights(plans: ResearchPlan[]): IntelligenceInsightBundle {
  const completed = plans.filter((p) => p.status === 'COMPLETED').length;
  const inProgress = plans.filter((p) => p.status === 'IN_PROGRESS').length;
  const completionRate = plans.length === 0 ? 0 : Math.round((completed / plans.length) * 100);
  const confidence = clampPercent(completionRate * 0.75 + plans.length * 4 + inProgress * 3);
  const verdict =
    completionRate >= 70 ? 'GO' : completionRate >= 40 ? 'REVIEW' : plans.length > 0 ? 'HOLD' : 'INSUFFICIENT';

  const categories: IntelligenceCategoryChip[] = [
    { key: 'market', labelKey: 'intelligence.categories.market', value: plans.filter((p) => p.researchType === 'MARKET_SIZE').length },
    { key: 'customer', labelKey: 'intelligence.categories.problem', value: plans.filter((p) => p.researchType === 'CUSTOMER').length },
    { key: 'competition', labelKey: 'intelligence.categories.competition', value: plans.filter((p) => p.researchType === 'COMPETITOR').length },
    { key: 'business', labelKey: 'intelligence.categories.businessModel', value: plans.filter((p) => p.researchType === 'BUSINESS_MODEL').length },
  ];

  return {
    verdict,
    fundingProbability: clampPercent(completionRate * 0.85),
    topPercent: completionRate >= 50 ? clampPercent(100 - completionRate) : null,
    confidence,
    stars: scoreToStars(confidence),
    summaryKey:
      completionRate >= 65
        ? 'intelligence.research.summary.strong'
        : plans.length > 0
          ? 'intelligence.research.summary.moderate'
          : 'intelligence.research.summary.weak',
    insightKeys: [
      completed >= 3 ? 'intelligence.research.insights.coverage' : 'intelligence.research.insights.expand',
      plans.some((p) => p.researchType === 'COMPETITOR' && p.status === 'COMPLETED')
        ? 'intelligence.research.insights.competitor'
        : 'intelligence.research.insights.needCompetitor',
      inProgress >= 1 ? 'intelligence.research.insights.inProgress' : 'intelligence.research.insights.start',
    ],
    reasoning: [
      { key: 'intelligence.reasoning.market', score: plans.filter((p) => p.researchType === 'MARKET_SIZE').length, maxScore: 10 },
      { key: 'intelligence.reasoning.competition', score: completed, maxScore: 15 },
      { key: 'intelligence.reasoning.execution', score: inProgress, maxScore: 10 },
      { key: 'intelligence.reasoning.funding', score: completionRate, maxScore: 100 },
    ],
    experts: [],
    timeline: monthTimeline(plans, Math.max(0, plans.length - completed)),
    categories,
  };
}

export function buildCompetitorInsights(competitors: Competitor[]): IntelligenceInsightBundle {
  const direct = competitors.filter((c) => c.category === 'DIRECT').length;
  const mapped = competitors.filter((c) => c.marketPosition !== null).length;
  const leaders = competitors.filter((c) => c.marketPosition === 'LEADER').length;
  const confidence = clampPercent(competitors.length * 8 + direct * 6 + mapped * 5);
  const verdict =
    direct >= 3 && mapped >= 2 ? 'GO' : competitors.length >= 2 ? 'REVIEW' : competitors.length > 0 ? 'HOLD' : 'INSUFFICIENT';

  const categories: IntelligenceCategoryChip[] = [
    { key: 'direct', labelKey: 'intelligence.competitors.categories.direct', value: direct },
    { key: 'indirect', labelKey: 'intelligence.competitors.categories.indirect', value: competitors.filter((c) => c.category === 'INDIRECT').length },
    { key: 'substitute', labelKey: 'intelligence.competitors.categories.substitute', value: competitors.filter((c) => c.category === 'SUBSTITUTE').length },
    { key: 'leaders', labelKey: 'intelligence.competitors.categories.leaders', value: leaders },
  ];

  return {
    verdict,
    fundingProbability: clampPercent(confidence * 0.8),
    topPercent: confidence >= 55 ? clampPercent(100 - confidence) : null,
    confidence,
    stars: scoreToStars(confidence),
    summaryKey:
      direct >= 3
        ? 'intelligence.competitors.summary.strong'
        : competitors.length > 0
          ? 'intelligence.competitors.summary.moderate'
          : 'intelligence.competitors.summary.weak',
    insightKeys: [
      direct >= 2 ? 'intelligence.competitors.insights.landscape' : 'intelligence.competitors.insights.needDirect',
      mapped >= 2 ? 'intelligence.competitors.insights.positioned' : 'intelligence.competitors.insights.mapPosition',
      leaders >= 1 ? 'intelligence.competitors.insights.leaders' : 'intelligence.competitors.insights.identifyLeaders',
    ],
    reasoning: [
      { key: 'intelligence.reasoning.market', score: competitors.length, maxScore: 15 },
      { key: 'intelligence.reasoning.competition', score: direct, maxScore: 10 },
      { key: 'intelligence.reasoning.execution', score: mapped, maxScore: 10 },
      { key: 'intelligence.reasoning.funding', score: confidence, maxScore: 100 },
    ],
    experts: [],
    timeline: monthTimeline(competitors, Math.max(0, competitors.length - 2)),
    categories,
  };
}

export function buildGrantInsights(grants: GovernmentGrant[]): IntelligenceInsightBundle {
  const avgFit =
    grants.length === 0 ? 0 : Math.round(grants.reduce((s, g) => s + (g.fitScore ?? 0), 0) / grants.length);
  const open = grants.filter((g) => g.status === 'OPEN').length;
  const confidence = clampPercent(avgFit * 0.7 + open * 8 + grants.length * 3);
  const verdict = avgFit >= 70 ? 'GO' : avgFit >= 50 ? 'REVIEW' : grants.length > 0 ? 'HOLD' : 'INSUFFICIENT';

  return {
    verdict,
    fundingProbability: clampPercent(avgFit * 0.9),
    topPercent: avgFit >= 60 ? clampPercent(100 - avgFit) : null,
    confidence,
    stars: scoreToStars(confidence),
    summaryKey:
      avgFit >= 65
        ? 'intelligence.grants.summary.strong'
        : grants.length > 0
          ? 'intelligence.grants.summary.moderate'
          : 'intelligence.grants.summary.weak',
    insightKeys: [
      avgFit >= 60 ? 'intelligence.insights.grantFit' : 'intelligence.grants.insights.fit',
      open >= 2 ? 'intelligence.grants.insights.deadlines' : 'intelligence.grants.insights.programs',
      grants.filter((g) => g.supportType === 'FUNDING').length >= 1
        ? 'intelligence.grants.insights.funding'
        : 'intelligence.grants.insights.rnd',
    ],
    reasoning: [
      { key: 'intelligence.reasoning.market', score: grants.length, maxScore: 20 },
      { key: 'intelligence.reasoning.competition', score: avgFit, maxScore: 100 },
      { key: 'intelligence.reasoning.execution', score: open, maxScore: 15 },
      { key: 'intelligence.reasoning.funding', score: confidence, maxScore: 100 },
    ],
    experts: [],
    timeline: monthTimeline(grants, Math.max(0, grants.length - 2)),
  };
}

type DocumentLike = { status: string; updatedAt: string };

function buildDocumentInsights(
  items: DocumentLike[],
  strongKey: string,
  moderateKey: string,
  weakKey: string,
): IntelligenceInsightBundle {
  const completed = items.filter((i) => i.status === 'COMPLETED').length;
  const confidence = clampPercent(completed * 25 + items.length * 10);
  const verdict = completed >= 1 ? 'GO' : items.length > 0 ? 'REVIEW' : 'INSUFFICIENT';

  return {
    verdict,
    fundingProbability: confidence,
    topPercent: confidence >= 50 ? clampPercent(100 - confidence) : null,
    confidence,
    stars: scoreToStars(confidence),
    summaryKey: completed >= 1 ? strongKey : items.length > 0 ? moderateKey : weakKey,
    insightKeys: [
      completed >= 1 ? 'intelligence.documents.insights.ready' : 'intelligence.documents.insights.draft',
      items.some((i) => i.status === 'GENERATING')
        ? 'intelligence.documents.insights.generating'
        : 'intelligence.documents.insights.generate',
    ],
    reasoning: [
      { key: 'intelligence.reasoning.market', score: items.length, maxScore: 10 },
      { key: 'intelligence.reasoning.competition', score: completed, maxScore: 5 },
      { key: 'intelligence.reasoning.execution', score: confidence, maxScore: 100 },
      { key: 'intelligence.reasoning.funding', score: confidence, maxScore: 100 },
    ],
    experts: [],
    timeline: monthTimeline(items, 0),
  };
}

export function buildReportInsights(reports: ValidationReport[]) {
  return buildDocumentInsights(
    reports,
    'intelligence.reports.summary.strong',
    'intelligence.reports.summary.moderate',
    'intelligence.reports.summary.weak',
  );
}

export function buildBusinessPlanInsights(plans: DocumentLike[]) {
  return buildDocumentInsights(
    plans,
    'intelligence.businessPlan.summary.strong',
    'intelligence.businessPlan.summary.moderate',
    'intelligence.businessPlan.summary.weak',
  );
}

export function buildPrdInsights(prds: DocumentLike[]) {
  return buildDocumentInsights(
    prds,
    'intelligence.prd.summary.strong',
    'intelligence.prd.summary.moderate',
    'intelligence.prd.summary.weak',
  );
}

export function buildDevSpecInsights(specs: DocumentLike[]) {
  return buildDocumentInsights(
    specs,
    'intelligence.devSpec.summary.strong',
    'intelligence.devSpec.summary.moderate',
    'intelligence.devSpec.summary.weak',
  );
}

export function buildAiStudioInsights(counts: {
  reports: number;
  businessPlans: number;
  prds: number;
  devSpecs: number;
}): IntelligenceInsightBundle {
  const total = counts.reports + counts.businessPlans + counts.prds + counts.devSpecs;
  const confidence = clampPercent(total * 18 + counts.reports * 10);
  const verdict = total >= 3 ? 'GO' : total >= 1 ? 'REVIEW' : 'INSUFFICIENT';

  return {
    verdict,
    fundingProbability: clampPercent(confidence * 0.9),
    topPercent: confidence >= 50 ? clampPercent(100 - confidence) : null,
    confidence,
    stars: scoreToStars(confidence),
    summaryKey:
      total >= 3
        ? 'intelligence.aiStudio.summary.strong'
        : total >= 1
          ? 'intelligence.aiStudio.summary.moderate'
          : 'intelligence.aiStudio.summary.weak',
    insightKeys: [
      counts.reports >= 1 ? 'intelligence.aiStudio.insights.report' : 'intelligence.aiStudio.insights.needReport',
      counts.businessPlans >= 1 ? 'intelligence.aiStudio.insights.plan' : 'intelligence.aiStudio.insights.needPlan',
      total >= 2 ? 'intelligence.aiStudio.insights.portfolio' : 'intelligence.aiStudio.insights.start',
    ],
    reasoning: [
      { key: 'intelligence.reasoning.market', score: counts.reports, maxScore: 5 },
      { key: 'intelligence.reasoning.competition', score: counts.businessPlans, maxScore: 5 },
      { key: 'intelligence.reasoning.execution', score: counts.prds + counts.devSpecs, maxScore: 10 },
      { key: 'intelligence.reasoning.funding', score: confidence, maxScore: 100 },
    ],
    experts: [],
    timeline: [],
  };
}

export function buildKnowledgeInsights(documents: KnowledgeDocument[]) {
  const ready = documents.filter((d) => d.status === 'COMPLETED').length;
  const confidence = clampPercent(ready * 20 + documents.length * 8);

  return {
    verdict: ready >= 3 ? 'GO' as const : documents.length > 0 ? 'REVIEW' as const : 'INSUFFICIENT' as const,
    fundingProbability: confidence,
    topPercent: null,
    confidence,
    stars: scoreToStars(confidence),
    summaryKey:
      ready >= 3
        ? 'intelligence.knowledge.summary.strong'
        : documents.length > 0
          ? 'intelligence.knowledge.summary.moderate'
          : 'intelligence.knowledge.summary.weak',
    insightKeys: [
      ready >= 1 ? 'intelligence.knowledge.insights.ready' : 'intelligence.knowledge.insights.process',
      documents.length >= 5 ? 'intelligence.knowledge.insights.chunks' : 'intelligence.knowledge.insights.more',
    ],
    reasoning: [
      { key: 'intelligence.reasoning.market', score: documents.length, maxScore: 20 },
      { key: 'intelligence.reasoning.competition', score: ready, maxScore: 15 },
      { key: 'intelligence.reasoning.execution', score: confidence, maxScore: 100 },
      { key: 'intelligence.reasoning.funding', score: confidence, maxScore: 100 },
    ],
    experts: [],
    timeline: monthTimeline(documents, 0),
  };
}

export function buildValidationInsights(score: {
  totalScore: number;
  decision: string;
  marketScore: number;
  competitionScore: number;
  executionScore: number;
  founderFitScore: number;
} | null): IntelligenceInsightBundle {
  if (!score) {
    return {
      verdict: 'INSUFFICIENT',
      fundingProbability: 0,
      topPercent: null,
      confidence: 0,
      stars: 0,
      summaryKey: 'intelligence.validation.summary.empty',
      insightKeys: ['intelligence.validation.insights.run'],
      reasoning: [],
      experts: [],
      timeline: [],
    };
  }

  const confidence = clampPercent(score.totalScore * 0.85);
  const verdict =
    score.decision === 'GO'
      ? 'GO'
      : score.decision === 'CONDITIONAL_GO'
        ? 'REVIEW'
        : score.decision === 'NO_GO'
          ? 'HOLD'
          : 'INSUFFICIENT';

  return {
    verdict: verdict as IntelligenceInsightBundle['verdict'],
    fundingProbability: clampPercent(score.totalScore * 0.9),
    topPercent: score.totalScore >= 50 ? clampPercent(100 - score.totalScore) : null,
    confidence,
    stars: scoreToStars(score.totalScore),
    summaryKey:
      score.decision === 'GO'
        ? 'intelligence.validation.summary.go'
        : score.decision === 'CONDITIONAL_GO'
          ? 'intelligence.validation.summary.review'
          : 'intelligence.validation.summary.hold',
    insightKeys: [
      score.marketScore >= 14 ? 'intelligence.insights.marketStrong' : 'intelligence.insights.marketReview',
      score.founderFitScore >= 12 ? 'intelligence.validation.insights.founder' : 'intelligence.validation.insights.founderReview',
      score.competitionScore >= 10 ? 'intelligence.insights.competitionLow' : 'intelligence.insights.competitionReview',
    ],
    reasoning: [
      { key: 'intelligence.reasoning.market', score: score.marketScore, maxScore: 20 },
      { key: 'intelligence.reasoning.competition', score: score.competitionScore, maxScore: 15 },
      { key: 'intelligence.reasoning.execution', score: score.executionScore, maxScore: 15 },
      { key: 'intelligence.reasoning.funding', score: score.totalScore, maxScore: 100 },
    ],
    experts: [],
    timeline: [],
  };
}
