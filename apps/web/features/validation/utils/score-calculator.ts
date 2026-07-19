import type { ValidationDecision, ValidationScoreCategory } from '@repo/types/validation';

export const SCORE_CATEGORIES: ValidationScoreCategory[] = [
  {
    key: 'marketScore',
    label: 'Market',
    description: '시장 규모, 시장 성장성',
    maxScore: 20,
  },
  {
    key: 'problemScore',
    label: 'Problem',
    description: 'Pain Point 명확성, VOC 근거',
    maxScore: 20,
  },
  {
    key: 'competitionScore',
    label: 'Competition',
    description: '경쟁 강도, 차별 가능성',
    maxScore: 15,
  },
  {
    key: 'businessModelScore',
    label: 'Business Model',
    description: '수익 구조, 가격 가능성',
    maxScore: 15,
  },
  {
    key: 'executionScore',
    label: 'Execution',
    description: '개발 난이도, 운영 가능성',
    maxScore: 15,
  },
  {
    key: 'founderFitScore',
    label: 'Founder Fit',
    description: '경험 적합성, 네트워크, 도메인 이해도',
    maxScore: 15,
  },
];

export const VALIDATION_DECISION_LABELS: Record<ValidationDecision, string> = {
  DRAFT: 'Draft',
  GO: 'GO',
  CONDITIONAL_GO: 'Conditional GO',
  NO_GO: 'NO GO',
};

export function calculateTotalScore(scores: {
  marketScore: number;
  problemScore: number;
  competitionScore: number;
  businessModelScore: number;
  executionScore: number;
  founderFitScore: number;
}): number {
  return (
    scores.marketScore +
    scores.problemScore +
    scores.competitionScore +
    scores.businessModelScore +
    scores.executionScore +
    scores.founderFitScore
  );
}

export function calculateDecision(totalScore: number): ValidationDecision {
  if (totalScore >= 80) return 'GO';
  if (totalScore >= 60) return 'CONDITIONAL_GO';
  return 'NO_GO';
}

export function getScorePercentage(score: number, maxScore: number): number {
  if (maxScore === 0) return 0;
  return Math.round((score / maxScore) * 100);
}
