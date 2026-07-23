import type {
  FrameworkAnalysisInput,
  FrameworkId,
  FrameworkProvider,
  FrameworkResult,
} from '../services/framework-types';

function clampScore(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function calcDecisionImpact(score: number): number {
  return Math.min(15, Math.max(-15, Math.round((score - 50) / 5)));
}

function computeDataScore(input: FrameworkAnalysisInput): number {
  const checks = [
    input.research.total >= 3,
    input.research.progressPercent >= 50,
    input.evidence.total >= 5,
    input.evidence.highConfidence >= 3,
    input.voc.total >= 10,
    input.competitors.total >= 2,
    input.grants.total >= 1,
  ];
  return (checks.filter(Boolean).length / checks.length) * 100;
}

function computeConfidence(input: FrameworkAnalysisInput, score: number): number {
  const volume = Math.min(input.evidence.total, 15) * 4;
  const quality =
    input.evidence.total === 0
      ? 0
      : (input.evidence.highConfidence / input.evidence.total) * 100;
  return clampScore(score * 0.35 + volume * 0.25 + quality * 0.4);
}

type FrameworkModifier = (base: number, input: FrameworkAnalysisInput) => number;

const FRAMEWORK_MODIFIERS: Record<FrameworkId, FrameworkModifier> = {
  SWOT: (base, input) =>
    base +
    (input.evidence.highConfidence >= 5 ? 8 : -5) +
    (input.competitors.total >= 3 ? -6 : 4),
  PESTEL: (base, input) =>
    base + (input.grants.total > 0 ? 6 : -3) + (input.research.progressPercent >= 60 ? 5 : -4),
  PORTER: (base, input) =>
    base - input.competitors.total * 4 + (input.competitors.total === 0 ? -12 : 0),
  THREE_C: (base, input) =>
    base + Math.min(input.voc.total, 15) * 1.2 - (input.competitors.total >= 4 ? 8 : 0),
  STP: (base, input) =>
    base + (input.voc.total >= 10 ? 10 : -8) + (input.research.total >= 2 ? 4 : 0),
  BCG: (base, input) =>
    base +
    (input.grants.avgFitScore ?? 40) * 0.15 +
    (input.evidence.highConfidence >= 3 ? 8 : -5),
  ANSOFF: (base, input) =>
    base + (input.research.progressPercent >= 50 ? 7 : -6) + (input.competitors.total <= 2 ? 5 : -4),
  VALUE_CHAIN: (base, input) =>
    base + input.evidence.mediumConfidence * 2 + (input.research.completed >= 2 ? 6 : -5),
  BMC: (base, input) =>
    base + (input.voc.total >= 5 ? 8 : -6) + (input.evidence.total >= 3 ? 4 : 0),
  LEAN_CANVAS: (base, input) =>
    base + (input.voc.total >= 8 ? 12 : -4) + (input.research.total >= 1 ? 5 : -8),
  JTBD: (base, input) =>
    base + Math.min(input.voc.total, 20) * 2 - (input.voc.total < 5 ? 15 : 0),
};

function frameworkSlug(id: FrameworkId): string {
  return id.toLowerCase().replace(/_/g, '');
}

function buildFrameworkResult(
  id: FrameworkId,
  input: FrameworkAnalysisInput,
): FrameworkResult {
  const slug = frameworkSlug(id);
  const dataScore = computeDataScore(input);
  const modifier = FRAMEWORK_MODIFIERS[id];
  const score = clampScore(modifier(dataScore, input));
  const confidence = computeConfidence(input, score);
  const decisionImpact = calcDecisionImpact(score);

  return {
    id,
    titleKey: `names.${slug}`,
    summaryKey: `summaries.${slug}`,
    summaryParams: {
      score,
      project: input.projectTitle,
      evidence: input.evidence.total,
      voc: input.voc.total,
    },
    score,
    confidence,
    decisionImpact,
    insights: [
      {
        id: `${slug}-i1`,
        labelKey: `insights.${slug}.i1Label`,
        textKey: `insights.${slug}.i1Text`,
      },
      {
        id: `${slug}-i2`,
        labelKey: `insights.${slug}.i2Label`,
        textKey: `insights.${slug}.i2Text`,
      },
    ],
    evidence: [
      {
        id: `${slug}-e1`,
        labelKey: `evidence.research`,
        sourceKey: `evidence.${slug}Research`,
      },
      {
        id: `${slug}-e2`,
        labelKey: `evidence.voc`,
        sourceKey: `evidence.${slug}Voc`,
      },
    ],
    recommendations: [
      {
        id: `${slug}-r1`,
        labelKey: `recommendations.${slug}.r1Label`,
        textKey: `recommendations.${slug}.r1Text`,
        priority: 1,
      },
      {
        id: `${slug}-r2`,
        labelKey: `recommendations.${slug}.r2Label`,
        textKey: `recommendations.${slug}.r2Text`,
        priority: 2,
      },
    ],
    executedAt: new Date().toISOString(),
  };
}

export class MockFrameworkProvider implements FrameworkProvider {
  readonly id = 'mock' as const;

  async analyze(
    frameworkId: FrameworkId,
    input: FrameworkAnalysisInput,
  ): Promise<FrameworkResult> {
    return buildFrameworkResult(frameworkId, input);
  }
}

export const mockFrameworkProvider = new MockFrameworkProvider();
