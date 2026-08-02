import type {
  BusinessUnderstanding,
  UnderstandingField,
} from '@repo/types/domain/business-understanding';

export type WorkspaceScoreDimensionId =
  | 'marketFit'
  | 'problemDefinition'
  | 'customerClarity'
  | 'revenueModel'
  | 'execution';

export type WorkspaceScoreDimension = {
  id: WorkspaceScoreDimensionId;
  score: number;
};

export type WorkspaceReviewScore = {
  total: number | null;
  dimensions: WorkspaceScoreDimension[];
};

function scoreFromField(field: UnderstandingField, bonus = 0): number {
  if (field.status === 'document' && field.value?.trim()) {
    return Math.min(95, 82 + bonus);
  }
  if (field.status === 'needs_confirmation') {
    return Math.min(78, 64 + bonus);
  }
  if (field.value?.trim()) {
    return 52 + bonus;
  }
  return 38;
}

/** Derive review score from Business Understanding — replaces hardcoded placeholder. */
export function buildWorkspaceReviewScore(
  understanding: BusinessUnderstanding | null | undefined,
  reviewCount: number,
): WorkspaceReviewScore {
  if (!understanding || reviewCount <= 0) {
    return { total: null, dimensions: [] };
  }

  const customerBonus = understanding.customerMentions.length > 0 ? 4 : 0;
  const marketFit = Math.round(
    (scoreFromField(understanding.business) + scoreFromField(understanding.problem)) / 2,
  );

  const dimensions: WorkspaceScoreDimension[] = [
    { id: 'marketFit', score: marketFit },
    { id: 'problemDefinition', score: scoreFromField(understanding.problem) },
    {
      id: 'customerClarity',
      score: scoreFromField(understanding.customer, customerBonus),
    },
    { id: 'revenueModel', score: scoreFromField(understanding.revenue) },
    {
      id: 'execution',
      score: Math.round(
        (scoreFromField(understanding.founder) + scoreFromField(understanding.solution)) / 2,
      ),
    },
  ];

  const total = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);

  return { total, dimensions };
}
