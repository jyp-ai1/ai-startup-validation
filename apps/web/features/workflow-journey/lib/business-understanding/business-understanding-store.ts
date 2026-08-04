import type { UnderstandingConfirmMode } from '@repo/types/domain/business-understanding';

const PHASE_KEY = 'launchlens.businessUnderstanding.phase';
const MODE_KEY = 'launchlens.businessUnderstanding.mode';

/** pending → card · edit/together → fields · edit_confirm → AI ack · aligning → founder baseline · review-ready → viability */
export type UnderstandingPhase =
  | 'pending'
  | UnderstandingConfirmMode
  | 'edit_confirm'
  | 'aligning'
  | 'review-ready';

function phaseKey(projectId?: string): string {
  return projectId ? `${PHASE_KEY}.${projectId}` : PHASE_KEY;
}

function modeKey(projectId?: string): string {
  return projectId ? `${MODE_KEY}.${projectId}` : MODE_KEY;
}

export function loadUnderstandingPhase(projectId?: string): UnderstandingPhase {
  if (typeof window === 'undefined') return 'pending';
  const raw = sessionStorage.getItem(phaseKey(projectId));
  if (
    raw === 'accepted' ||
    raw === 'edit' ||
    raw === 'together' ||
    raw === 'edit_confirm' ||
    raw === 'aligning' ||
    raw === 'review-ready'
  ) {
    return raw;
  }
  return 'pending';
}

export function saveUnderstandingPhase(phase: UnderstandingPhase, projectId?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(phaseKey(projectId), phase);
}

export function loadUnderstandingConfirmMode(projectId?: string): UnderstandingConfirmMode | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(modeKey(projectId));
  if (raw === 'accepted' || raw === 'edit' || raw === 'together') return raw;
  return null;
}

export function saveUnderstandingConfirmMode(
  mode: UnderstandingConfirmMode,
  projectId?: string,
): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(modeKey(projectId), mode);
}

/** Legacy — true once founder has responded to the understanding card */
export function loadBusinessUnderstandingConfirmed(projectId?: string): boolean {
  return loadUnderstandingPhase(projectId) !== 'pending';
}

export function saveBusinessUnderstandingConfirmed(projectId?: string): void {
  saveUnderstandingPhase('accepted', projectId);
  saveUnderstandingConfirmMode('accepted', projectId);
}

export function isReviewTransitionReady(projectId?: string): boolean {
  return loadUnderstandingPhase(projectId) === 'review-ready';
}

export function markReviewTransitionReady(projectId?: string): void {
  saveUnderstandingPhase('review-ready', projectId);
}

export function clearBusinessUnderstandingConfirmed(projectId?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(phaseKey(projectId));
  sessionStorage.removeItem(modeKey(projectId));
}
