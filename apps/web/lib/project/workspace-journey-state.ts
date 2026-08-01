import { loadUnderstandingPhase } from '@/features/workflow-journey/lib/business-understanding/business-understanding-store';
import { loadPersistedReviewCount } from '@/features/workflow-journey/lib/demo-guided-session';
import { loadWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';
import { loadV2Validation } from '@/features/workflow-journey/lib/v2-validation-store';

/** True when client already has journey progress for this owned project. */
export function hasWorkspaceJourneyState(projectId: string): boolean {
  if (typeof window === 'undefined' || !projectId) return false;

  if (loadPersistedReviewCount(projectId) > 0) return true;
  if (loadV2Validation(projectId)) return true;

  const document = loadWorkspaceDocumentText(projectId);
  if (document && document.trim().length >= 8) return true;

  if (loadUnderstandingPhase(projectId) !== 'pending') return true;

  return false;
}
