/**
 * DAY 8-I — Project consulting state store (sessionStorage cache + DB via v2Workspace).
 */

import {
  appendProjectSnapshot,
  createEmptyProjectConsultingState,
  createProjectSnapshot,
  syncConsultingStateFromLoop,
  type ProjectConsultingSnapshot,
  type ProjectConsultingState,
  type ProjectSnapshotTrigger,
} from './project-consulting-state';
import type { AiPmLoopState } from './workspace-ai-pm-loop-types';
import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';

const CONSULTING_KEY = 'launchlens.projectConsulting';

function storageKey(projectId: string): string {
  return `${CONSULTING_KEY}.${projectId}`;
}

export function loadProjectConsultingState(projectId: string): ProjectConsultingState {
  if (typeof window === 'undefined') return createEmptyProjectConsultingState(projectId);
  try {
    const raw = sessionStorage.getItem(storageKey(projectId));
    if (!raw) return createEmptyProjectConsultingState(projectId);
    const parsed = JSON.parse(raw) as ProjectConsultingState;
    if (parsed.version !== 1 || parsed.projectId !== projectId) {
      return createEmptyProjectConsultingState(projectId);
    }
    return {
      ...createEmptyProjectConsultingState(projectId),
      ...parsed,
      snapshots: Array.isArray(parsed.snapshots) ? parsed.snapshots : [],
    };
  } catch {
    return createEmptyProjectConsultingState(projectId);
  }
}

export function saveProjectConsultingState(state: ProjectConsultingState): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(storageKey(state.projectId), JSON.stringify(state));
}

export function clearProjectConsultingState(projectId: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(storageKey(projectId));
}

export function patchProjectConsultingState(
  projectId: string,
  patch: Partial<ProjectConsultingState>,
): ProjectConsultingState {
  const current = loadProjectConsultingState(projectId);
  const next = { ...current, ...patch, projectId, updatedAt: new Date().toISOString() };
  saveProjectConsultingState(next);
  return next;
}

export function recordProjectSnapshot(input: {
  projectId: string;
  trigger: ProjectSnapshotTrigger;
  loop: AiPmLoopState;
  documentText?: string;
  projectName?: string;
  understanding?: string;
  businessReview?: ProjectConsultingSnapshot['businessReview'];
  nextAction?: string | null;
}): ProjectConsultingState {
  let state = loadProjectConsultingState(input.projectId);
  state = syncConsultingStateFromLoop({
    state,
    loop: input.loop,
    documentText: input.documentText,
    projectName: input.projectName,
    understanding: input.understanding,
    businessReview: input.businessReview,
    nextAction: input.nextAction,
  });

  const snapshot = createProjectSnapshot({
    projectId: input.projectId,
    trigger: input.trigger,
    businessProfile: state.businessProfile,
    judgment: input.loop.ceoJudgment,
    understanding: input.understanding,
    businessReview: input.businessReview,
    nextAction: input.nextAction,
    judgmentTraces: input.loop.judgmentTraces,
  });

  state = appendProjectSnapshot(state, snapshot);
  saveProjectConsultingState(state);
  return state;
}

/** Restore loop + consulting from persisted snapshot (new session continuity). */
export function restoreProjectConsultingContext(input: {
  projectId: string;
  loop: AiPmLoopState;
  documentText?: string;
}): {
  consulting: ProjectConsultingState;
  judgment: CeoJudgmentState | null;
  canResume: boolean;
} {
  const consulting = loadProjectConsultingState(input.projectId);

  if (consulting.conversationTurnCount === 0 && input.loop.turns.length > 0) {
    const synced = syncConsultingStateFromLoop({
      state: consulting,
      loop: input.loop,
      documentText: input.documentText,
    });
    saveProjectConsultingState(synced);
    return {
      consulting: synced,
      judgment: input.loop.ceoJudgment ?? null,
      canResume: input.loop.turns.length > 0,
    };
  }

  const judgment = input.loop.ceoJudgment ?? consulting.judgmentState ?? null;
  return {
    consulting,
    judgment,
    canResume: Boolean(judgment && input.loop.turns.length > 0),
  };
}

export type { ProjectConsultingState, ProjectConsultingSnapshot, ProjectSnapshotTrigger };
