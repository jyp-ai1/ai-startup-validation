import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import type { UnderstandingPhase } from '../../lib/business-understanding/business-understanding-store';
import { deriveWorkspaceState } from '../../lib/business-understanding/workspace-state';
import { loadAiPmLoopState } from '../../lib/business-understanding/workspace-ai-pm-loop-store';
import type { WorkspaceDomainEvidence } from '../../lib/workspace-ai-pm-messages';

import type { WorkspaceSidebarSnapshot } from './workspace-shell-types';

/**
 * @deprecated S7-2 — use `deriveWorkspaceState()` + `presentWorkspaceSidebar()` instead.
 * Kept for backward-compatible imports; delegates to the workspace aggregate.
 */
export function buildWorkspaceSidebarSnapshot(
  domain: WorkspaceDomainEvidence,
  reviewCount: number,
  entities?: LaunchLensDomainContext | null,
  understandingConfirmed = true,
  understanding?: BusinessUnderstanding | null,
  understandingPhase: UnderstandingPhase = 'pending',
  aiPmLoopInProgress = false,
  projectId?: string,
): WorkspaceSidebarSnapshot {
  void understandingConfirmed;
  void aiPmLoopInProgress;

  return deriveWorkspaceState({
    projectId,
    loop: loadAiPmLoopState(projectId),
    understandingPhase,
    reviewCount,
    domain,
    entities,
  }).sidebar;
}
