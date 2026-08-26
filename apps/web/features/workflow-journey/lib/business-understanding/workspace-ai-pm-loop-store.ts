import {
  AI_PM_LOOP_MIN_TURNS,
  type AiPmLoopIssueId,
  type AiPmLoopPhase,
  type AiPmLoopState,
  type AiPmLoopTurn,
} from './workspace-ai-pm-loop-types';

const LOOP_KEY = 'launchlens.aiPmLoop';

function loopKey(projectId?: string): string {
  return projectId ? `${LOOP_KEY}.${projectId}` : LOOP_KEY;
}

export function createInitialAiPmLoopState(): AiPmLoopState {
  return {
    version: 1,
    phase: 'read_ack',
    turns: [],
    currentIssueId: null,
    readingCompleted: false,
    dismissedReadAck: false,
  };
}

export function loadAiPmLoopState(projectId?: string): AiPmLoopState {
  if (typeof window === 'undefined') return createInitialAiPmLoopState();
  try {
    const raw = sessionStorage.getItem(loopKey(projectId));
    if (!raw) return createInitialAiPmLoopState();
    const parsed = JSON.parse(raw) as AiPmLoopState;
    if (parsed.version !== 1 || !Array.isArray(parsed.turns)) {
      return createInitialAiPmLoopState();
    }
    return {
      ...createInitialAiPmLoopState(),
      ...parsed,
      readingCompleted:
        parsed.readingCompleted ??
        (parsed.dismissedReadAck || parsed.turns.length > 0),
    };
  } catch {
    return createInitialAiPmLoopState();
  }
}

export function saveAiPmLoopState(state: AiPmLoopState, projectId?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(loopKey(projectId), JSON.stringify(state));
}

export function clearAiPmLoopState(projectId?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(loopKey(projectId));
}

/**
 * Loop "complete" for UI handoff.
 * Long Sprint W9: answer-count alone does NOT complete — phase must be `complete`
 * when Stage Transition / no-next-issue path decides.
 */
export function isAiPmLoopComplete(state: AiPmLoopState): boolean {
  if (state.phase === 'complete') return true;
  // Soft ceiling for legacy: enough turns and idle (no active issue/answer)
  return (
    state.turns.length >= AI_PM_LOOP_MIN_TURNS &&
    state.currentIssueId === null &&
    state.phase !== 'issue' &&
    state.phase !== 'answer' &&
    state.phase !== 'reanalyze'
  );
}

/** Issues resolved by mergeable business facts only — why/mid/nonsense do not resolve. */
export function getResolvedIssueIds(state: AiPmLoopState): AiPmLoopIssueId[] {
  return state.turns
    .filter((turn) => {
      if (turn.superseded) return false;
      if (
        turn.intent === 'why_meta' ||
        turn.intent === 'mid_judgment' ||
        turn.intent === 'nonsense' ||
        turn.intent === 'unknown_signal'
      ) {
        return false;
      }
      // Legacy turns without intent still count
      return true;
    })
    .map((turn) => turn.issueId);
}

/** Mark turn superseded and trim downstream turns after prior-answer edit. */
export function supersedeTurnAndInvalidateDownstream(
  editedIssueId: AiPmLoopIssueId,
  issueOrder: AiPmLoopIssueId[],
  projectId?: string,
): AiPmLoopState {
  const current = loadAiPmLoopState(projectId);
  const editIndex = issueOrder.indexOf(editedIssueId);
  const downstream =
    editIndex >= 0 ? new Set(issueOrder.slice(editIndex + 1)) : new Set<AiPmLoopIssueId>();

  const turns = current.turns.map((turn) => {
    if (turn.issueId === editedIssueId && !turn.superseded) {
      return { ...turn, superseded: true };
    }
    if (downstream.has(turn.issueId)) {
      return { ...turn, superseded: true };
    }
    return turn;
  });

  const next: AiPmLoopState = {
    ...current,
    turns,
    phase: 'answer',
    currentIssueId: editedIssueId,
  };
  saveAiPmLoopState(next, projectId);
  return next;
}

export function patchAiPmLoopState(
  patch: Partial<AiPmLoopState>,
  projectId?: string,
): AiPmLoopState {
  const next = { ...loadAiPmLoopState(projectId), ...patch };
  saveAiPmLoopState(next, projectId);
  return next;
}

export function appendAiPmLoopTurn(
  turn: AiPmLoopTurn,
  projectId?: string,
): AiPmLoopState {
  const current = loadAiPmLoopState(projectId);
  const turns = [...current.turns, turn];
  // Keep phase stable here — caller sets `reanalyze` only after Memory merge succeeds.
  // (Prevents durable stuck "AI 검토 중" when apply is rejected after append.)
  const next: AiPmLoopState = {
    ...current,
    turns,
    currentIssueId: current.currentIssueId,
  };
  saveAiPmLoopState(next, projectId);
  return next;
}

export function setAiPmLoopPhase(phase: AiPmLoopPhase, projectId?: string): AiPmLoopState {
  return patchAiPmLoopState({ phase }, projectId);
}
