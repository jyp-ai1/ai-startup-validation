import {
  DEMO_CUSTOM_DOCUMENT_KEY,
  DEMO_SESSION_PROJECT_ID,
} from './demo-samples';
import { clearBusinessUnderstandingConfirmed } from './business-understanding/business-understanding-store';
import { loadReviewSnapshot } from './v2-review-dirty-state';
import { loadMeetingNotes } from './v2-ai-pm-meeting-store';
import {
  DEMO_PROJECT_DRAFT_KEY,
  DEMO_WORKFLOW_SNAPSHOT_KEY,
} from './v2-demo-project-store';

const REVIEW_COUNT_KEY = 'launchlens.reviewCount';

function reviewCountStorageKey(projectId: string): string {
  return `${REVIEW_COUNT_KEY}.${projectId}`;
}

function removeKeysContaining(storage: Storage, fragment: string): void {
  const toRemove: string[] = [];
  for (let i = 0; i < storage.length; i += 1) {
    const key = storage.key(i);
    if (key?.includes(fragment)) toRemove.push(key);
  }
  toRemove.forEach((key) => storage.removeItem(key));
}

/** Wipe all demo client state — must run before every demo entry. */
export function clearAllDemoClientState(projectId = DEMO_SESSION_PROJECT_ID): void {
  if (typeof window === 'undefined') return;

  clearDemoGuidedWorkspaceSession(projectId);

  sessionStorage.removeItem(DEMO_PROJECT_DRAFT_KEY);
  sessionStorage.removeItem(DEMO_WORKFLOW_SNAPSHOT_KEY);
  sessionStorage.removeItem(DEMO_CUSTOM_DOCUMENT_KEY);

  removeKeysContaining(sessionStorage, '.demo');
  removeKeysContaining(localStorage, '.demo');

  document.cookie = 'll_demo_project_draft=; path=/; max-age=0; SameSite=Lax';
}

export function clearDemoGuidedWorkspaceSession(projectId: string): void {
  if (typeof window === 'undefined') return;

  clearBusinessUnderstandingConfirmed(projectId);

  const sessionKeys = [
    `launchlens.businessUnderstanding.phase.${projectId}`,
    `launchlens.businessUnderstanding.mode.${projectId}`,
    `launchlens.decisionAlignment.${projectId}`,
    `launchlens.decisionWorkshop.${projectId}`,
    `launchlens.domain.${projectId}.workspace`,
    `launchlens.entities.${projectId}.workspace`,
    `launchlens.document.${projectId}.raw`,
    `launchlens.reason.${projectId}.reviewSnapshot`,
    `launchlens.evidence.${projectId}.validation`,
    `launchlens.project.${projectId}.registration`,
    reviewCountStorageKey(projectId),
  ];

  for (const key of sessionKeys) {
    sessionStorage.removeItem(key);
  }

  removeKeysContaining(sessionStorage, projectId);

  const localKeys = [
    `launchlens:ai-pm-meeting:${projectId}`,
    `launchlens:ai-pm-meeting:default`,
    `ll_v2_decision_memory_${projectId}`,
  ];
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
