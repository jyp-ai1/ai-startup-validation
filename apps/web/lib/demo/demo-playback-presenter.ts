import { resolveGapQuestionBinding } from '@/features/workflow-journey/lib/business-understanding/gap-question-map';
import type { NextQuestionDecision } from '@/features/workflow-journey/lib/business-understanding/decide-next-question-from-review';
import { captureLockedAskSurface } from '@/features/workflow-journey/lib/business-understanding/question-transition-lock';
import { patchAiPmLoopState } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-store';

import type { DemoScenarioFrame } from './demo-scenario-types';

/** Stock V3 ask copy for Sample playback — never probe/clarify variants. */
export function canonicalPlaybackQuestionForGap(targetGap: string): string | null {
  return resolveGapQuestionBinding(targetGap)?.questionText ?? null;
}

function buildPlaybackDecision(targetGap: string): NextQuestionDecision | null {
  const binding = resolveGapQuestionBinding(targetGap);
  if (!binding) return null;
  return {
    targetGap: binding.targetGap,
    targetGapId: binding.targetGap,
    issueId: binding.issueId,
    questionText: binding.questionText,
    whyNow: binding.whyNow,
    rationale: binding.whyNow,
    actionRationale: binding.whyNow,
    score: 0,
    reframed: false,
    excludedGaps: [],
    drivenByReview: true as const,
    sourceAnswerId: 'demo-playback',
    sourceReviewId: 'demo-playback',
    reviewAction: 'advance',
    action: 'advance',
    reason: `demo-playback:${targetGap}`,
  };
}

/** Pin ask surface to canonical gap question (Sample playback only). */
export function pinDemoPlaybackAskSurface(projectId: string, targetGap: string): void {
  const binding = resolveGapQuestionBinding(targetGap);
  if (!binding) return;

  const decision = buildPlaybackDecision(targetGap);
  const lock = captureLockedAskSurface({
    issueId: binding.issueId,
    targetGap: binding.targetGap,
    questionText: binding.questionText,
    whyNow: binding.whyNow,
    rationale: binding.whyNow,
    score: 0,
    fallbackIssueId: binding.issueId,
  });

  patchAiPmLoopState(
    {
      lockedAskSurface: lock,
      lastDecision: decision ?? undefined,
      viewMode: 'question',
      phase: 'answer',
      currentIssueId: binding.issueId,
    },
    projectId,
  );
}

/** Apply frame presenter overrides after snapshot hydrate (fixes probe repeat on remount). */
export function applyDemoPlaybackPresenter(projectId: string, frame: DemoScenarioFrame): void {
  if (frame.surface === 'judgment') {
    patchAiPmLoopState({ viewMode: 'judgment', lockedAskSurface: null }, projectId);
    return;
  }
  if (frame.surface === 'final_review') {
    patchAiPmLoopState(
      { viewMode: 'review', reviewDecisionShown: true, lockedAskSurface: null },
      projectId,
    );
    return;
  }

  const targetGap = frame.presenter?.targetGap?.trim();
  if (targetGap) {
    pinDemoPlaybackAskSurface(projectId, targetGap);
  }
}
