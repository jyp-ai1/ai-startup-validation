/**
 * Measure-only referee for Judgment transition discovery.
 * Not imported by the analyzer. Not a persist SoT.
 */

export type TransitionScore = 'PASS' | 'PARTIAL' | 'FAIL' | 'N/A';

export type TransitionAxisId =
  | 'stage_consistency'
  | 'judgment_downgrade'
  | 'evidence_conflict'
  | 'evidence_supersession'
  | 's4_overpromote'
  | 'negative_evidence'
  | 'contradictory_answer';

export type TransitionFailureKind =
  | 'missed_downgrade'
  | 'ignored_conflict'
  | 'stale_after_supersession'
  | 'worsening_as_improved'
  | 's4_on_single_repeat'
  | 'ignored_negative'
  | 'ignored_contradiction'
  | 'state_inconsistent';

const STAGE_RANK = { S0: 0, S1: 1, S2: 2, S3: 3, S4: 4 } as const;
const VERDICT_RANK = {
  insufficient_basis: 0,
  judgment_deferred: 1,
  conditionally_viable: 2,
  viable: 3,
} as const;

export function stageRank(stageId: string): number {
  return STAGE_RANK[stageId as keyof typeof STAGE_RANK] ?? -1;
}

export function verdictRank(verdictId: string): number {
  return VERDICT_RANK[verdictId as keyof typeof VERDICT_RANK] ?? -1;
}

export function declined(before: { stageId: string; verdictId: string }, after: { stageId: string; verdictId: string }) {
  return stageRank(after.stageId) < stageRank(before.stageId) || verdictRank(after.verdictId) < verdictRank(before.verdictId);
}

export function namesConflict(text: string): boolean {
  return /충돌|모순|상충|취소|거절|아니다|멈췄|늘었|해지/.test(text);
}

export function staleFulfilledStake(text: string): boolean {
  return /지불만|실제로 줄었는가|전후를 한 번 잰다|얼마나 줄였/.test(text);
}

export function scoreTransitionAxis(
  id: TransitionAxisId,
  score: TransitionScore,
  note: string,
  failure?: TransitionFailureKind,
) {
  return { id, score, note, failure: failure ?? null };
}
