import { buildConversationMemoryFromSources } from './build-conversation-memory';
import { buildLivingUnderstandingState } from './living-understanding-state';
import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';
import { captureLockedAskSurface, type LockedAskSurface } from './question-transition-lock';
import { resolveNextQuestionDecision } from './resolve-next-question-decision';
import { enforceQuestionPurity } from './question-purity';
import { loadAiPmLoopState, patchAiPmLoopState } from './workspace-ai-pm-loop-store';
import type { AiPmLoopState } from './workspace-ai-pm-loop-types';
import { loadConversationMemory } from './conversation-memory-store';

/**
 * P0-3B — Atomic first-ask transition after Shared Understanding confirm.
 * Clears stale lockedAskSurface / lastDecision before committing the next question.
 */
export function commitFirstAskAfterUnderstandingConfirm(input: {
  projectId?: string;
  documentText: string;
  understanding: BusinessUnderstanding;
  entities: LaunchLensDomainContext | null;
}): AiPmLoopState {
  const projectId = input.projectId;
  const loop = loadAiPmLoopState(projectId);

  if (loop.turns.length > 0) {
    return loop;
  }

  if (!loop.readingCompleted) {
    return loop;
  }

  const memory = buildConversationMemoryFromSources({
    projectId: projectId ?? 'default',
    documentText: input.documentText,
    turns: loop.turns,
    entities: input.entities,
    previous: loadConversationMemory(projectId),
  });

  const living = buildLivingUnderstandingState({
    documentText: input.documentText,
    understanding: input.understanding,
    entities: input.entities,
    turns: loop.turns,
    memory,
  });

  patchAiPmLoopState(
    {
      lockedAskSurface: null,
      lastDecision: undefined,
    },
    projectId,
  );

  const decision = resolveNextQuestionDecision({
    living,
    turns: loop.turns,
    memory,
    projectId,
    gapState: loop.gapState,
    persistLastDecision: true,
  });

  if (!decision) {
    return patchAiPmLoopState(
      {
        phase: 'issue',
        currentIssueId: loop.currentIssueId,
      },
      projectId,
    );
  }

  const purity = enforceQuestionPurity({
    questionText: decision.questionText,
    targetGap: decision.targetGap,
  });

  const missingField: LockedAskSurface['missingField'] = (() => {
    if (!('missingField' in decision) || !decision.missingField) return 'business';
    const field = decision.missingField;
    if (
      field === 'business' ||
      field === 'customer' ||
      field === 'problem' ||
      field === 'market' ||
      field === 'competitor' ||
      field === 'bm'
    ) {
      return field;
    }
    return 'business';
  })();

  const lockedAskSurface = captureLockedAskSurface({
    issueId: decision.issueId,
    targetGap: decision.targetGap,
    questionText: purity.sanitizedText,
    whyNow: decision.whyNow,
    rationale: decision.rationale,
    score: decision.score,
    missingField,
    fallbackIssueId: decision.issueId,
  });

  return patchAiPmLoopState(
    {
      phase: 'answer',
      currentIssueId: decision.issueId,
      dismissedReadAck: true,
      lockedAskSurface,
    },
    projectId,
  );
}
