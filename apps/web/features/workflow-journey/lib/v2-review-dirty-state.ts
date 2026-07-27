import type { V2ValidationEvidence } from './v2-validation-store';

const REVIEW_SNAPSHOT_KEY = 'll_v2_review_snapshot';

export function serializeEvidenceSnapshot(evidence: V2ValidationEvidence): string {
  return JSON.stringify({
    idea: evidence.idea.trim(),
    problem: evidence.problem?.trim() ?? '',
    customer: evidence.customer?.trim() ?? '',
    mvp: evidence.mvp?.trim() ?? '',
    pricing: evidence.pricing?.trim() ?? '',
  });
}

export function saveReviewSnapshot(evidence: V2ValidationEvidence): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(REVIEW_SNAPSHOT_KEY, serializeEvidenceSnapshot(evidence));
}

export function loadReviewSnapshot(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(REVIEW_SNAPSHOT_KEY);
}

export function isReviewStale(
  evidence: V2ValidationEvidence,
  reviewCount: number,
): boolean {
  if (reviewCount < 1) return false;
  const snapshot = loadReviewSnapshot();
  if (!snapshot) return true;
  return snapshot !== serializeEvidenceSnapshot(evidence);
}

export type ReviewFreshness = 'none' | 'current' | 'stale';

export function getReviewFreshness(
  evidence: V2ValidationEvidence,
  reviewCount: number,
): ReviewFreshness {
  if (reviewCount < 1) return 'none';
  return isReviewStale(evidence, reviewCount) ? 'stale' : 'current';
}
