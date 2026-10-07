/**
 * Question Alignment Batch — measure only.
 * Not imported by the analyzer. Not a persist SoT. Not a question generator.
 */
import type { BatchScore } from './score-si-post-negative-batch';
import {
  isGenericAsk,
  questionTracksCuPriority,
  type PostNegSnap,
} from './score-si-post-negative-batch';

export type QaAxisId =
  | 'cu_resolved'
  | 'next_cu_specific'
  | 'question_binds_cu'
  | 'not_generic_after_specific'
  | 'negative_question_realigns';

export type QaFailure =
  | 'stale_cu_after_dce'
  | 'next_cu_empty'
  | 'generic_ask_after_specific_cu'
  | 'question_off_cu_priority'
  | 'stake_weave_off_cu'
  | 'generic_after_downgrade';

export function isNextUnresolvedCu(text: string): boolean {
  return /다음 고객|다음 기간/.test(text);
}

export function stakeWeavedOffCu(snap: PostNegSnap): boolean {
  const stakeInQuestion = /(no-show|노쇼|반품률|이탈 수치)/i.test(snap.question);
  const stakeInCu = /(no-show|노쇼|반품|이탈)/i.test(snap.criticalUnknown);
  return stakeInQuestion && !stakeInCu;
}

export function questionReflectsCu(snap: PostNegSnap): boolean {
  if (isGenericAsk(snap) && isNextUnresolvedCu(snap.criticalUnknown)) return false;
  if (isNextUnresolvedCu(snap.criticalUnknown)) {
    return /다음 고객|다음 기간|같은 성과|반복/.test(snap.question);
  }
  if (stakeWeavedOffCu(snap)) return false;
  return questionTracksCuPriority(snap) && !isGenericAsk(snap);
}

export function scoreQaAxis(
  id: QaAxisId,
  score: BatchScore,
  note: string,
  failure: QaFailure | null = null,
) {
  return { id, score, note, failure };
}
