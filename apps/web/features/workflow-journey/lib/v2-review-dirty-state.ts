import { getActiveProjectId } from '@/lib/project/project-context-store';

import type { V2ValidationEvidence } from './v2-validation-store';

function resolveProjectId(projectId?: string): string {
  return projectId ?? getActiveProjectId() ?? 'demo';
}

function reviewSnapshotKey(projectId?: string): string {
  return `launchlens.reason.${resolveProjectId(projectId)}.reviewSnapshot`;
}

export function serializeEvidenceSnapshot(evidence: V2ValidationEvidence): string {
  return JSON.stringify({
    idea: evidence.idea.trim(),
    problem: evidence.problem?.trim() ?? '',
    customer: evidence.customer?.trim() ?? '',
    mvp: evidence.mvp?.trim() ?? '',
    pricing: evidence.pricing?.trim() ?? '',
  });
}

export function saveReviewSnapshot(evidence: V2ValidationEvidence, projectId?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(reviewSnapshotKey(projectId), serializeEvidenceSnapshot(evidence));
}

export function loadReviewSnapshot(projectId?: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(reviewSnapshotKey(projectId));
}

export function isReviewStale(
  evidence: V2ValidationEvidence,
  reviewCount: number,
  projectId?: string,
): boolean {
  if (reviewCount < 1) return false;
  const snapshot = loadReviewSnapshot(projectId);
  if (!snapshot) return true;
  return snapshot !== serializeEvidenceSnapshot(evidence);
}

export type ReviewFreshness = 'none' | 'current' | 'stale';

export function getReviewFreshness(
  evidence: V2ValidationEvidence,
  reviewCount: number,
  projectId?: string,
): ReviewFreshness {
  if (reviewCount < 1) return 'none';
  return isReviewStale(evidence, reviewCount, projectId) ? 'stale' : 'current';
}
