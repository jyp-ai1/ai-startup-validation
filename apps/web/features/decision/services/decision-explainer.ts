import type {
  DecisionExplanation,
  DecisionInput,
  DecisionScores,
  DecisionVerdict,
  EvidenceCoverage,
  MissingEvidenceItem,
  ScoreBreakdown,
  SupportingEvidenceRef,
} from './decision-types';
import type { FrameworkAnalysisResult } from '@/features/framework/services/framework-types';
import type { MarketAnalysisResult } from '@/features/market-intelligence/services/market-types';
import {
  calculateDataCompleteness,
  calculateScoreBreakdown,
  getConfidenceFactors,
} from './decision-score';

const FRAMEWORK_DRIVER_LABELS: Record<string, string> = {
  SWOT: 'frameworkSwot',
  PESTEL: 'frameworkPestel',
  PORTER: 'frameworkPorter',
  THREE_C: 'frameworkThreeC',
  STP: 'frameworkStp',
  BCG: 'frameworkBcg',
  ANSOFF: 'frameworkAnsoff',
  VALUE_CHAIN: 'frameworkValueChain',
  BMC: 'frameworkBmc',
  LEAN_CANVAS: 'frameworkLeanCanvas',
  JTBD: 'frameworkJtbd',
};

function scaleComponent(raw: number, weight: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((raw * weight) / total);
}

export function buildExplainScore(
  input: DecisionInput,
  scores: DecisionScores,
  breakdown: ScoreBreakdown,
): DecisionExplanation['explainScore'] {
  const weights = {
    research: 0.35,
    evidence: 0.25,
    competitor: 0.2,
    voc: 0.2,
  };

  const components = [
    {
      id: 'research',
      labelKey: 'research',
      value: scaleComponent(breakdown.researchScore, weights.research, scores.executionReadiness || 1),
    },
    {
      id: 'evidence',
      labelKey: 'evidence',
      value: scaleComponent(breakdown.evidenceScore, weights.evidence, scores.executionReadiness || 1),
    },
    {
      id: 'voc',
      labelKey: 'voc',
      value: scaleComponent(breakdown.vocScore, weights.voc, scores.executionReadiness || 1),
    },
    {
      id: 'competitor',
      labelKey: 'competitor',
      value: scaleComponent(breakdown.competitorScore, weights.competitor, scores.executionReadiness || 1),
    },
    {
      id: 'government',
      labelKey: 'government',
      value: scaleComponent(breakdown.grantScore, 0.15, scores.investmentReadiness || 1),
    },
  ];

  return {
    labelKey: 'startupReadiness',
    total: scores.executionReadiness,
    components,
  };
}

export function buildDecisionDrivers(
  input: DecisionInput,
  breakdown: ScoreBreakdown,
  frameworkAnalysis?: FrameworkAnalysisResult | null,
): DecisionExplanation['drivers'] {
  const drivers: DecisionExplanation['drivers'] = [];

  const marketImpact = Math.round(breakdown.researchScore * 0.18);
  if (marketImpact > 0) {
    drivers.push({
      id: 'market-growth',
      labelKey: 'marketGrowth',
      impact: marketImpact,
      direction: 'positive',
    });
  }

  if (input.grants.total > 0) {
    drivers.push({
      id: 'grant-fit',
      labelKey: 'grantFit',
      impact: Math.round(breakdown.grantScore * 0.12),
      direction: 'positive',
    });
  }

  if (input.voc.total < 10) {
    drivers.push({
      id: 'voc-gap',
      labelKey: 'vocGap',
      impact: -Math.round((10 - input.voc.total) * 1.5),
      direction: 'negative',
    });
  }

  if (input.competitors.total >= 4) {
    drivers.push({
      id: 'competition',
      labelKey: 'competitionIntensity',
      impact: -Math.round(input.competitors.total * 2.5),
      direction: 'negative',
    });
  } else if (input.competitors.total === 0) {
    drivers.push({
      id: 'competition-blind',
      labelKey: 'competitionBlindSpot',
      impact: -10,
      direction: 'negative',
    });
  }

  if (input.evidence.highConfidence < 5) {
    drivers.push({
      id: 'evidence-weak',
      labelKey: 'weakEvidence',
      impact: -Math.round((5 - input.evidence.highConfidence) * 3),
      direction: 'negative',
    });
  }

  if (input.validationScore && input.validationScore.executionScore < 10) {
    drivers.push({
      id: 'tech-difficulty',
      labelKey: 'techDifficulty',
      impact: -Math.round((10 - input.validationScore.executionScore) * 0.8),
      direction: 'negative',
    });
  }

  if (breakdown.evidenceScore >= 60) {
    drivers.push({
      id: 'evidence-strong',
      labelKey: 'strongEvidence',
      impact: Math.round(breakdown.evidenceScore * 0.1),
      direction: 'positive',
    });
  }

  if (frameworkAnalysis) {
    for (const fw of frameworkAnalysis.frameworks) {
      drivers.push({
        id: `framework-${fw.id}`,
        labelKey: FRAMEWORK_DRIVER_LABELS[fw.id] ?? 'frameworkSwot',
        impact: fw.decisionImpact,
        direction: fw.decisionImpact >= 0 ? 'positive' : 'negative',
      });
    }
  }

  if (input.marketAnalysis) {
    for (const driver of input.marketAnalysis.result.decisionDrivers) {
      drivers.push({
        id: `market-${driver.id}`,
        labelKey: driver.labelKey,
        impact: driver.impact,
        direction: driver.direction,
      });
    }
  }

  return drivers
    .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
    .slice(0, 8);
}

export function buildEvidenceCoverage(
  input: DecisionInput,
  missingEvidence: MissingEvidenceItem[],
): EvidenceCoverage {
  const projectId = input.projectId;

  const dimensions: EvidenceCoverage['dimensions'] = [
    {
      id: 'research',
      labelKey: 'research',
      current: input.research.total,
      required: 3,
      percent: Math.min(100, Math.round((input.research.total / 3) * 100)),
      completed: input.research.total >= 3 && input.research.progressPercent >= 50,
      href: `/projects/${projectId}/research`,
    },
    {
      id: 'evidence',
      labelKey: 'evidence',
      current: input.evidence.highConfidence,
      required: 5,
      percent: Math.min(100, Math.round((input.evidence.highConfidence / 5) * 100)),
      completed: input.evidence.highConfidence >= 5,
      href: `/projects/${projectId}/evidence`,
    },
    {
      id: 'voc',
      labelKey: 'voc',
      current: input.voc.total,
      required: 10,
      percent: Math.min(100, Math.round((input.voc.total / 10) * 100)),
      completed: input.voc.total >= 10,
      href: `/projects/${projectId}/voc`,
    },
    {
      id: 'competitors',
      labelKey: 'competitors',
      current: input.competitors.total,
      required: 2,
      percent: Math.min(100, Math.round((input.competitors.total / 2) * 100)),
      completed: input.competitors.total >= 2,
      href: `/projects/${projectId}/competitors`,
    },
    {
      id: 'grants',
      labelKey: 'grants',
      current: input.grants.total,
      required: 1,
      percent: Math.min(100, input.grants.total >= 1 ? 100 : 0),
      completed: input.grants.total >= 1,
      href: `/projects/${projectId}/grants`,
    },
    {
      id: 'validation',
      labelKey: 'validation',
      current:
        input.validationScore && input.validationScore.decision !== 'DRAFT' ? 1 : 0,
      required: 1,
      percent:
        input.validationScore && input.validationScore.decision !== 'DRAFT' ? 100 : 0,
      completed:
        input.validationScore !== null && input.validationScore.decision !== 'DRAFT',
      href: `/projects/${projectId}/validation`,
    },
  ];

  const overallPercent = Math.round(calculateDataCompleteness(input) * 100);

  return { overallPercent, dimensions };
}

export function buildSupportingEvidence(input: DecisionInput): SupportingEvidenceRef[] {
  const projectId = input.projectId;
  const items: SupportingEvidenceRef[] = [];
  const refs = input.supportingItems;

  if (refs?.research.length) {
    for (const r of refs.research.slice(0, 3)) {
      items.push({
        id: `research-${r.id}`,
        type: 'RESEARCH',
        title: r.title,
        href: `/projects/${projectId}/research/${r.id}`,
        metaKey: 'research',
      });
    }
  } else if (input.research.total > 0) {
    items.push({
      id: 'research-all',
      type: 'RESEARCH',
      title: `${input.research.total}`,
      href: `/projects/${projectId}/research`,
      metaKey: 'researchCount',
      metaParams: { count: input.research.total },
    });
  }

  if (refs?.evidence.length) {
    for (const e of refs.evidence.slice(0, 3)) {
      items.push({
        id: `evidence-${e.id}`,
        type: 'EVIDENCE',
        title: e.title,
        href: `/projects/${projectId}/evidence/${e.id}`,
        metaKey: 'evidence',
      });
    }
  } else if (input.evidence.total > 0) {
    items.push({
      id: 'evidence-all',
      type: 'EVIDENCE',
      title: `${input.evidence.total}`,
      href: `/projects/${projectId}/evidence`,
      metaKey: 'evidenceCount',
      metaParams: { count: input.evidence.total, high: input.evidence.highConfidence },
    });
  }

  if (refs?.voc.length) {
    for (const v of refs.voc.slice(0, 3)) {
      items.push({
        id: `voc-${v.id}`,
        type: 'VOC',
        title: v.title,
        href: `/projects/${projectId}/voc/${v.id}`,
        metaKey: 'voc',
      });
    }
  } else if (input.voc.total > 0) {
    items.push({
      id: 'voc-all',
      type: 'VOC',
      title: `${input.voc.total}`,
      href: `/projects/${projectId}/voc`,
      metaKey: 'vocCount',
      metaParams: { count: input.voc.total },
    });
  }

  if (refs?.competitors.length) {
    for (const c of refs.competitors.slice(0, 3)) {
      items.push({
        id: `competitor-${c.id}`,
        type: 'COMPETITOR',
        title: c.title,
        href: `/projects/${projectId}/competitors/${c.id}`,
        metaKey: 'competitor',
      });
    }
  } else if (input.competitors.total > 0) {
    items.push({
      id: 'competitors-all',
      type: 'COMPETITOR',
      title: `${input.competitors.total}`,
      href: `/projects/${projectId}/competitors`,
      metaKey: 'competitorCount',
      metaParams: { count: input.competitors.total },
    });
  }

  if (refs?.grants.length) {
    for (const g of refs.grants.slice(0, 2)) {
      items.push({
        id: `grant-${g.id}`,
        type: 'GRANT',
        title: g.title,
        href: `/projects/${projectId}/grants/${g.id}`,
        metaKey: 'grant',
      });
    }
  } else if (input.grants.total > 0) {
    items.push({
      id: 'grants-all',
      type: 'GRANT',
      title: `${input.grants.total}`,
      href: `/projects/${projectId}/grants`,
      metaKey: 'grantCount',
      metaParams: { count: input.grants.total },
    });
  }

  if (input.validationScore && input.validationScore.decision !== 'DRAFT') {
    items.push({
      id: 'validation-score',
      type: 'VALIDATION',
      title: `${input.validationScore.totalScore}`,
      href: `/projects/${projectId}/validation`,
      metaKey: 'validationScore',
      metaParams: { score: input.validationScore.totalScore },
    });
  }

  return items;
}

export function buildDecisionLogic(
  input: DecisionInput,
  scores: DecisionScores,
  verdict: DecisionVerdict,
  completeness: number,
  frameworkAnalysis?: FrameworkAnalysisResult | null,
  marketAnalysis?: MarketAnalysisResult | null,
): DecisionExplanation['decisionLogic'] {
  const steps: DecisionExplanation['decisionLogic'] = [
    {
      id: 'step-data',
      labelKey: 'stepData',
      detailKey: 'stepDataDetail',
      params: { percent: Math.round(completeness * 100) },
    },
    {
      id: 'step-score',
      labelKey: 'stepScore',
      detailKey: 'stepScoreDetail',
      params: { score: scores.decisionScore },
    },
    {
      id: 'step-confidence',
      labelKey: 'stepConfidence',
      detailKey: 'stepConfidenceDetail',
      params: { confidence: scores.confidence },
    },
    {
      id: 'step-verdict',
      labelKey: 'stepVerdict',
      detailKey:
        verdict === 'GO'
          ? 'stepVerdictGo'
          : verdict === 'NO_GO'
            ? 'stepVerdictNoGo'
            : 'stepVerdictHold',
      params: { verdict },
    },
  ];

  if (marketAnalysis) {
    steps.splice(1, 0, {
      id: 'step-market',
      labelKey: 'stepMarket',
      detailKey: 'stepMarketDetail',
      params: {
        score: marketAnalysis.result.marketScore,
        impact: marketAnalysis.result.aggregateImpact,
        growth: marketAnalysis.result.growthRate,
      },
    });
  }

  if (frameworkAnalysis && frameworkAnalysis.frameworks.length > 0) {
    steps.splice(2, 0, {
      id: 'step-framework',
      labelKey: 'stepFramework',
      detailKey: 'stepFrameworkDetail',
      params: {
        count: frameworkAnalysis.frameworks.length,
        impact: frameworkAnalysis.aggregateImpact,
        names: frameworkAnalysis.selectedIds.join(', '),
      },
    });
  }

  return steps;
}

export function buildDecisionExplanation(
  input: DecisionInput,
  scores: DecisionScores,
  verdict: DecisionVerdict,
  missingEvidence: MissingEvidenceItem[],
): DecisionExplanation {
  const breakdown = calculateScoreBreakdown(input);
  const completeness = calculateDataCompleteness(input);

  return {
    drivers: buildDecisionDrivers(input, breakdown, input.frameworkAnalysis),
    explainScore: buildExplainScore(input, scores, breakdown),
    evidenceCoverage: buildEvidenceCoverage(input, missingEvidence),
    supportingEvidence: buildSupportingEvidence(input),
    decisionLogic: buildDecisionLogic(
      input,
      scores,
      verdict,
      completeness,
      input.frameworkAnalysis,
      input.marketAnalysis,
    ),
    confidenceFactors: getConfidenceFactors(input),
  };
}
