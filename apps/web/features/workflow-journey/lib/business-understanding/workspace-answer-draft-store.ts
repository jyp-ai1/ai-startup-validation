/**
 * DAY 8-B P0-1 — Persist in-progress answer draft per project (sessionStorage only).
 * Survives refresh/remount; cleared on successful submit.
 */

const DRAFT_KEY_PREFIX = 'launchlens.aiPmAnswerDraft';

function draftKey(projectId?: string): string {
  return projectId ? `${DRAFT_KEY_PREFIX}.${projectId}` : DRAFT_KEY_PREFIX;
}

export function loadAnswerDraft(projectId?: string): string {
  if (typeof window === 'undefined') return '';
  try {
    return sessionStorage.getItem(draftKey(projectId)) ?? '';
  } catch {
    return '';
  }
}

export function saveAnswerDraft(text: string, projectId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = draftKey(projectId);
    const trimmed = text.trim();
    if (!trimmed) {
      sessionStorage.removeItem(key);
      return;
    }
    sessionStorage.setItem(key, text);
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearAnswerDraft(projectId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(draftKey(projectId));
  } catch {
    /* ignore */
  }
}
