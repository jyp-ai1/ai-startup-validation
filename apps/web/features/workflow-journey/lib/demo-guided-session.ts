import { clearBusinessUnderstandingConfirmed } from './business-understanding/business-understanding-store';
import { loadReviewSnapshot } from './v2-review-dirty-state';
import { loadMeetingNotes } from './v2-ai-pm-meeting-store';

const REVIEW_COUNT_KEY = 'launchlens.reviewCount';

function reviewCountStorageKey(projectId: string): string {
  return `${REVIEW_COUNT_KEY}.${projectId}`;
}

export function clearDemoGuidedWorkspaceSession(projectId: string): void {
  if (typeof window === 'undefined') return;

  clearBusinessUnderstandingConfirmed(projectId);

  const sessionPrefixes = [
    `launchlens.businessUnderstanding.phase.${projectId}`,
    `launchlens.businessUnderstanding.mode.${projectId}`,
    `launchlens.decisionAlignment.${projectId}`,
    `launchlens.decisionWorkshop.${projectId}`,
    `launchlens.domain.${projectId}`,
    `launchlens.entities.${projectId}`,
    `launchlens.document.${projectId}`,
    `launchlens.reason.${projectId}`,
    `launchlens.evidence.${projectId}`,
    reviewCountStorageKey(projectId),
  ];

  for (const key of sessionPrefixes) {
    sessionStorage.removeItem(key);
  }

  for (let i = sessionStorage.length - 1; i >= 0; i -= 1) {
    const key = sessionStorage.key(i);
    if (!key?.startsWith('launchlens.')) continue;
    if (key.includes('.demo') || key.endsWith('demo')) {
      sessionStorage.removeItem(key);
    }
  }

  const localKeys = [`launchlens:ai-pm-meeting:${projectId}`, `launchlens:ai-pm-meeting:default`];
  for (const key of localKeys) {
    localStorage.removeItem(key);
  }
}

export function savePersistedReviewCount(count: number, projectId?: string): void {
  if (typeof window === 'undefined' || !projectId) return;
  sessionStorage.setItem(reviewCountStorageKey(projectId), String(count));
}

export function loadPersistedReviewCount(projectId?: string): number {
  if (typeof window === 'undefined' || !projectId) return 0;

  const stored = sessionStorage.getItem(reviewCountStorageKey(projectId));
  if (stored) {
    const parsed = Number.parseInt(stored, 10);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }

  const meetings = loadMeetingNotes(projectId).length;
  if (meetings > 0) return meetings;

  return loadReviewSnapshot(projectId) ? 1 : 0;
}
