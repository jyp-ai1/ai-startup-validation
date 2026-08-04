import type { WorkspaceBusinessState } from './build-ai-pm-business-clarity';
import type { WorkspaceSidebarSnapshot } from '../../components/project-workspace-shell/workspace-shell-types';

import type { WorkspaceReviewGate, WorkspaceState } from './workspace-state';
import type { WorkspaceSharedUnderstanding } from './build-shared-understanding';

/** S7-2 — format-only views. No secondary state builders. */

export function presentWorkspaceHeader(state: WorkspaceState): WorkspaceBusinessState | null {
  return state.header;
}

export function presentWorkspaceSidebar(state: WorkspaceState): WorkspaceSidebarSnapshot {
  return state.sidebar;
}

export function presentWorkspaceReviewGate(state: WorkspaceState): WorkspaceReviewGate {
  return state.review;
}

export function presentDocumentReadable(state: WorkspaceState): boolean {
  return state.document.readable;
}

/** S8-1 — Shared Understanding spine (business · customer · problem). */
export function presentSharedUnderstanding(
  state: WorkspaceState,
): WorkspaceSharedUnderstanding | null {
  return state.sharedUnderstanding;
}
