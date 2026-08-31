import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

/** Pinned ask surface — uses targetGap + questionText identity (no generationId). */
export type LockedAskSurface = {
  issueId: AiPmLoopIssueId;
  targetGap: string;
  questionText: string;
  whyNow: string;
  rationale: string;
  score: number;
  missingField: 'business' | 'customer' | 'problem' | 'market' | 'competitor' | 'bm';
};

export type AskSurfaceCandidate = {
  issueId?: AiPmLoopIssueId | null;
  targetGap?: string | null;
  questionText?: string | null;
  whyNow?: string | null;
  rationale?: string | null;
  score?: number;
  missingField?: LockedAskSurface['missingField'];
};

const DEFAULT_MISSING_FIELD: LockedAskSurface['missingField'] = 'business';

/** Build a lock snapshot from the currently rendered ask surface. */
export function captureLockedAskSurface(
  input: AskSurfaceCandidate & { fallbackIssueId: AiPmLoopIssueId },
): LockedAskSurface | null {
  const questionText = input.questionText?.trim();
  const targetGap = input.targetGap?.trim();
  if (!questionText || !targetGap) return null;

  return {
    issueId: input.issueId ?? input.fallbackIssueId,
    targetGap,
    questionText,
    whyNow: input.whyNow?.trim() || input.rationale?.trim() || '',
    rationale: input.rationale?.trim() || input.whyNow?.trim() || '',
    score: input.score ?? 0,
    missingField: input.missingField ?? DEFAULT_MISSING_FIELD,
  };
}

/**
 * Lock is honored on answer surface and through submit/processing until finishProcessing
 * commits the next question (replaces lock).
 */
export function isQuestionTransitionLockActive(input: {
  lock: LockedAskSurface | null;
  phase: string;
  reanalyzing: boolean;
}): boolean {
  if (!input.lock) return false;
  if (input.reanalyzing || input.phase === 'reanalyze') return true;
  return input.phase === 'answer';
}

/**
 * When lock is active, external writers (hydrate resync, decideNextQuestion) must not
 * replace the visible ask surface.
 */
export function resolveWhyThisQuestionWithLock<T extends LockedAskSurface>(
  lock: LockedAskSurface | null,
  lockActive: boolean,
  fresh: T | null,
): T | LockedAskSurface | null {
  if (lockActive && lock) return lock;
  return fresh;
}

/** Prefer locked question text over recomputed engine / i18n fallback. */
export function resolveDisplayQuestionWithLock(input: {
  lock: LockedAskSurface | null;
  lockActive: boolean;
  fromEngine: string;
  fromSurface: string;
  fromRef: string;
  issueFallback: string;
}): string {
  if (input.lockActive && input.lock?.questionText.trim()) {
    return input.lock.questionText.trim();
  }
  return (
    input.fromEngine ||
    input.fromSurface ||
    input.fromRef ||
    input.issueFallback
  );
}

/** Stale async callback must not regress to a different gap/question identity. */
export function shouldRejectStaleAskSurfaceUpdate(input: {
  committedLock: LockedAskSurface | null;
  incoming: AskSurfaceCandidate | null;
}): boolean {
  if (!input.committedLock || !input.incoming?.targetGap || !input.incoming.questionText) {
    return false;
  }
  const incomingGap = input.incoming.targetGap.trim();
  const incomingText = input.incoming.questionText.trim();
  if (!incomingGap || !incomingText) return false;
  return (
    incomingGap !== input.committedLock.targetGap ||
    incomingText !== input.committedLock.questionText
  );
}
