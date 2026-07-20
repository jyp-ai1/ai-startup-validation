import type { ValidationDecision } from '@repo/types/validation';

export type IntelligenceVerdict = 'GO' | 'REVIEW' | 'HOLD' | 'INSUFFICIENT';

export type IntelligenceReasoningItem = {
  key: string;
  score: number;
  maxScore: number;
};

export type IntelligenceExpertScore = {
  role: 'vc' | 'pm' | 'cto' | 'marketing';
  labelKey: string;
  score: number;
  stars: number;
  sentimentLabelKey: string;
  opinionKey: string;
};

export type IntelligenceTimelinePoint = {
  label: string;
  value: number;
};

export type IntelligenceCategoryChip = {
  key: string;
  labelKey: string;
  value: number;
};

export type IntelligenceInsightBundle = {
  verdict: IntelligenceVerdict;
  fundingProbability: number;
  topPercent: number | null;
  confidence: number;
  stars: number;
  summaryKey: string;
  insightKeys: string[];
  reasoning: IntelligenceReasoningItem[];
  experts: IntelligenceExpertScore[];
  timeline: IntelligenceTimelinePoint[];
  categories?: IntelligenceCategoryChip[];
};

export function decisionToVerdict(decision: ValidationDecision | null | undefined): IntelligenceVerdict {
  switch (decision) {
    case 'GO':
      return 'GO';
    case 'CONDITIONAL_GO':
      return 'REVIEW';
    case 'NO_GO':
      return 'HOLD';
    default:
      return 'INSUFFICIENT';
  }
}

export function scoreToStars(score: number): number {
  return Math.min(5, Math.max(0, Math.round(score / 20)));
}

export function clampPercent(n: number): number {
  return Math.min(100, Math.max(0, Math.round(n)));
}
