import { isDemoMyBusinessProjectId } from './demo-isolation';
import { loadAiPmLoopState } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-store';

/** My Business demo stops before Judgment / Final Review (Production-only). */
export function isDemoMyBusinessPreviewCap(projectId: string | undefined): boolean {
  return isDemoMyBusinessProjectId(projectId);
}

export function shouldBlockDemoMyBusinessJudgment(projectId: string | undefined): boolean {
  if (!isDemoMyBusinessPreviewCap(projectId)) return false;
  const loop = loadAiPmLoopState(projectId);
  return loop.viewMode === 'judgment' || loop.viewMode === 'review' || loop.viewMode === 'supplement';
}

/** Show My Business preview surface after document read (before Production full loop). */
export function shouldShowDemoMyBusinessPreview(
  projectId: string | undefined,
  understandingPhase: string,
): boolean {
  if (!isDemoMyBusinessPreviewCap(projectId)) return false;
  const loop = loadAiPmLoopState(projectId);
  if (!loop.readingCompleted) return false;
  return understandingPhase === 'pending' || understandingPhase === 'accepted';
}

/** @deprecated use shouldShowDemoMyBusinessPreview */
export function demoMyBusinessPreviewComplete(projectId: string | undefined): boolean {
  return shouldShowDemoMyBusinessPreview(projectId, 'accepted');
}
