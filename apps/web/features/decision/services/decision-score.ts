import type { DecisionInput, DecisionScores, DecisionVerdict } from './decision-types';

function clamp(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)));
}

/** Data completeness ratio (0–1) across core validation dimensions. */
export function calculateDataCompleteness(input: DecisionInput): number {
  const checks = [
    input.research.total >= 3,
    input.research.progressPercent >= 50,
    input.evidence.total >= 5,
    input.evidence.highConfidence >= 3,
    input.voc.total >= 10,
    input.competitors.total >= 2,
    input.grants.total >= 1,
    input.validationScore !== null && input.validationScore.decision !== 'DRAFT',
  ];
  return checks.filter(Boolean).length / checks.length;
}

export function calculateDecisionScores(input: DecisionInput): DecisionScores {
  const completeness = calculateDataCompleteness(input);

  const researchScore =
    input.research.total === 0
      ? 0
      : clamp(input.research.progressPercent * 0.7 + Math.min(input.research.total, 5) * 6);

  const evidenceScore = clamp(
    input.evidence.total * 4 +
      input.evidence.highConfidence * 8 +
      input.evidence.mediumConfidence * 3,
  );

  const vocScore = clamp(Math.min(input.voc.total, 25) * 3.2);

  const competitionPenalty =
    input.competitors.total >= 4 ? 8 : input.competitors.total === 0 ? -15 : 0;
  const competitorScore = clamp(55 + input.competitors.total * 5 - competitionPenalty);

  const grantBoost = input.grants.total > 0 ? 10 : 0;
  const grantFitBoost = input.grants.avgFitScore ? input.grants.avgFitScore * 0.15 : 0;
  const grantScore = clamp(40 + grantBoost + grantFitBoost);

  const validationBoost = input.validationScore
    ? input.validationScore.totalScore * 0.35
    : completeness * 25;

  const decisionScore = clamp(
    researchScore * 0.15 +
      evidenceScore * 0.2 +
      vocScore * 0.2 +
      competitorScore * 0.15 +
      grantScore * 0.1 +
      validationBoost * 0.2,
  );

  const confidence = clamp(completeness * 100);

  const investmentReadiness = clamp(
    (input.validationScore?.totalScore ?? decisionScore * 0.6) * 0.5 +
      grantScore * 0.25 +
      evidenceScore * 0.15 +
      vocScore * 0.1,
  );

  const executionReadiness = clamp(
    researchScore * 0.35 + evidenceScore * 0.25 + competitorScore * 0.2 + vocScore * 0.2,
  );

  return {
    decisionScore,
    confidence,
    investmentReadiness,
    executionReadiness,
  };
}

export function resolveVerdict(
  scores: DecisionScores,
  completeness: number,
): DecisionVerdict {
  if (completeness < 0.35) return 'HOLD';
  if (scores.decisionScore >= 75 && scores.confidence >= 55) return 'GO';
  if (scores.decisionScore < 45 && completeness >= 0.5) return 'NO_GO';
  return 'HOLD';
}
