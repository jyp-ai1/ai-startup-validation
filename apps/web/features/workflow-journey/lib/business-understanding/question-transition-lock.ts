import {
  isGenericGapQuestionText,
  resolveGapQuestionBinding,
} from './gap-question-map';
import type { AiPmLoopIssueId, AiPmLoopState } from './workspace-ai-pm-loop-types';

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

function firstVisibleQuestion(...candidates: (string | null | undefined)[]): string {
  for (const candidate of candidates) {
    const text = candidate?.trim();
    if (text && !isGenericGapQuestionText(text)) return text;
  }
  return '';
}

/** Prefer locked question text over recomputed engine / i18n fallback. */
export function resolveDisplayQuestionWithLock(input: {
  lock: LockedAskSurface | null;
  lockActive: boolean;
  /** Validation reframe / conflict clarify — wins over stale engine generic. */
  fromOverride?: string;
  fromEngine: string;
  fromSurface: string;
  fromRef: string;
  issueFallback: string;
  targetGap?: string | null;
  fallbackIssueId?: AiPmLoopIssueId | null;
}): string {
  const fromGapBinding =
    input.targetGap?.trim()
      ? resolveGapQuestionBinding(
          input.targetGap,
          input.fallbackIssueId ?? undefined,
        ).questionText
      : '';

  if (input.lockActive && input.lock?.questionText.trim()) {
    const locked = input.lock.questionText.trim();
    if (!isGenericGapQuestionText(locked)) return locked;
  }

  return (
    firstVisibleQuestion(
      input.fromOverride,
      input.fromEngine,
      input.fromSurface,
      input.fromRef,
      fromGapBinding,
      input.issueFallback,
    ) ||
    (input.lockActive ? input.lock?.questionText.trim() : '') ||
    ''
  );
}

/** True when sessionStorage carries an active display lock (FIX 2b). */
export function hasPersistedQuestionTransitionLock(state: AiPmLoopState): boolean {
  const lock = state.lockedAskSurface;
  if (!lock?.questionText?.trim() || !lock?.targetGap?.trim()) return false;
  return state.phase === 'answer' || state.phase === 'reanalyze';
}

/**
 * FIX 2b — when client holds a durable lock, hydrate merge must not revert to stale DB ask.
 */
export function mergeAiPmLoopHonoringQuestionLock(
  client: AiPmLoopState,
  db: AiPmLoopState,
  clientAhead: boolean,
): AiPmLoopState {
  const base = clientAhead
    ? client
    : {
        ...db,
        readingCompleted: client.readingCompleted || db.readingCompleted,
        dismissedReadAck: client.dismissedReadAck || db.dismissedReadAck,
        lockedAskSurface: client.lockedAskSurface ?? db.lockedAskSurface ?? null,
      };

  if (!hasPersistedQuestionTransitionLock(client)) {
    return base;
  }

  const lock = client.lockedAskSurface!;
  return {
    ...base,
    lockedAskSurface: lock,
    phase: client.phase === 'reanalyze' ? 'reanalyze' : 'answer',
    currentIssueId: lock.issueId ?? client.currentIssueId ?? base.currentIssueId,
    turns: clientAhead || client.turns.length >= db.turns.length ? client.turns : base.turns,
    readingCompleted: client.readingCompleted || db.readingCompleted,
    dismissedReadAck: client.dismissedReadAck || db.dismissedReadAck,
  };
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
