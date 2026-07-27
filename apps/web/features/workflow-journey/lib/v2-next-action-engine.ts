import type { V2ValidationEvidence } from './v2-validation-store';
import { isEvidenceFieldFilled } from './v2-validation-store';
import { isReviewStale } from './v2-review-dirty-state';

export type InvestigationTopic = 'market' | 'competition' | 'pricing' | 'differentiation';

export type NextActionKind =
  | 'fill-idea'
  | 'fill-pricing'
  | 'fill-customer'
  | 'start-review'
  | 're-review'
  | 'view-investigation'
  | 'customer-validation';

export type NextAction = {
  kind: NextActionKind;
  topic?: InvestigationTopic;
};

export type NextActionContext = {
  evidence: V2ValidationEvidence;
  reviewCount: number;
  hasIdea: boolean;
  investigationViewed: boolean;
};

export function getNextAction(ctx: NextActionContext): NextAction {
  const { evidence, reviewCount, hasIdea, investigationViewed } = ctx;
  const stale = isReviewStale(evidence, reviewCount);

  if (stale && reviewCount > 0) {
    return { kind: 're-review' };
  }

  if (!hasIdea) {
    return { kind: 'fill-idea' };
  }

  if (reviewCount === 0) {
    return { kind: 'start-review' };
  }

  if (!isEvidenceFieldFilled('pricing', evidence)) {
    return { kind: 'fill-pricing', topic: 'pricing' };
  }

  if (!investigationViewed) {
    return { kind: 'view-investigation' };
  }

  if (!isEvidenceFieldFilled('customer', evidence)) {
    return { kind: 'customer-validation' };
  }

  return { kind: 'view-investigation', topic: 'market' };
}

export function buildStatusLines(
  evidence: V2ValidationEvidence,
  reviewCount: number,
): Array<{ key: string; done: boolean }> {
  return [
    { key: 'market', done: reviewCount > 0 },
    { key: 'competition', done: reviewCount > 0 },
    {
      key: 'pricing',
      done: isEvidenceFieldFilled('pricing', evidence),
    },
    {
      key: 'differentiation',
      done: isEvidenceFieldFilled('mvp', evidence),
    },
  ];
}
