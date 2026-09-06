/**
 * DAY 8-F — Prior answer edit binding (last actionable CEO turn only).
 */

import type { AiPmLoopIssueId, AiPmLoopTurn } from './workspace-ai-pm-loop-types';

export type EditablePriorTurn = {
  issueId: AiPmLoopIssueId;
  answer: string;
  appliedAt: string;
};

/** F-3 — bind edit to the immediately prior CEO answer, not first turn per issue. */
export function resolveEditablePriorTurns(turns: AiPmLoopTurn[]): EditablePriorTurn[] {
  const actionable = turns.filter(
    (turn) =>
      !turn.superseded &&
      turn.intent !== 'why_meta' &&
      turn.intent !== 'mid_judgment' &&
      turn.intent !== 'nonsense' &&
      Boolean(turn.answer?.trim()),
  );
  const last = actionable[actionable.length - 1];
  if (!last) return [];
  return [{ issueId: last.issueId, answer: last.answer, appliedAt: last.appliedAt }];
}
