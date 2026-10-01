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

export function demoMyBusinessPreviewComplete(projectId: string | undefined): boolean {
  if (!isDemoMyBusinessPreviewCap(projectId)) return false;
  const loop = loadAiPmLoopState(projectId);
  return (
    loop.readingCompleted &&
    loop.turns.length >= 1 &&
    Boolean(loop.lastDecision?.questionText || loop.lockedAskSurface?.questionText)
  );
}
