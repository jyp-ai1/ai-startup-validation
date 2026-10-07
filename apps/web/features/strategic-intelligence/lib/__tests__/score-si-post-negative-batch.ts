/**
 * Post-Negative-Judgment Accuracy Batch — measure only.
 * Not imported by the analyzer. Not a persist SoT.
 */

export type BatchScore = 'PASS' | 'PARTIAL' | 'FAIL' | 'N/A';

export type PostNegAxisId =
  | 'judgment'
  | 'evidence'
  | 'state'
  | 'negative_contradictory'
  | 'cu_priority'
  | 'question'
  | 'founder_outcome';

export type PostNegFailure =
  | 'missed_downgrade'
  | 'missed_upgrade'
  | 'ignored_conflict'
  | 'false_conflict'
  | 's4_stuck'
  | 'stale_cu'
  | 'stale_priority'
  | 'generic_ask_after_specific_cu'
  | 'question_off_cu_priority'
  | 'leaked_stake_ask'
  | 'leftover_positive_headline'
  | 'founder_four_break'
  | 'payment_only_promoted';

export type PostNegSnap = {
  verdictId: string;
  stageId: string;
  judgment: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  question: string;
  kind: string;
  evidenceClass: string | null;
};

const STAGE_RANK = { S0: 0, S1: 1, S2: 2, S3: 3, S4: 4 } as const;
const VERDICT_RANK = {
  insufficient_basis: 0,
  judgment_deferred: 1,
  conditionally_viable: 2,
  viable: 3,
} as const;

const KEY_RULES: Array<[string, RegExp]> = [
  ['noshow', /no-show|노쇼/i],
  ['return', /반품/],
  ['churn', /이탈/],
  ['payer', /결제자|돈을 내는|쓰는 사람/],
  ['job', /직무|Job/i],
  ['resale', /재판매|C2C|재구매/],
  ['next', /다음 고객|다음 기간/],
  ['stake_open', /지불만|전후|얼마나 줄였|실제로 줄었/],
];

export function stageRank(stageId: string): number {
  return STAGE_RANK[stageId as keyof typeof STAGE_RANK] ?? -1;
}

export function verdictRank(verdictId: string): number {
  return VERDICT_RANK[verdictId as keyof typeof VERDICT_RANK] ?? -1;
}

export function declined(before: PostNegSnap, after: PostNegSnap): boolean {
  return (
    stageRank(after.stageId) < stageRank(before.stageId) ||
    verdictRank(after.verdictId) < verdictRank(before.verdictId)
  );
}

export function rose(before: PostNegSnap, after: PostNegSnap): boolean {
  return (
    stageRank(after.stageId) > stageRank(before.stageId) ||
    verdictRank(after.verdictId) > verdictRank(before.verdictId)
  );
}

export function keysOf(text: string): string[] {
  return KEY_RULES.filter(([, pattern]) => pattern.test(text)).map(([id]) => id);
}

export function sharesKey(left: string, right: string): boolean {
  const rightKeys = keysOf(right);
  return keysOf(left).some((key) => rightKeys.includes(key));
}

export function founderFour(snap: PostNegSnap): { readable: boolean; leftoverPositive: boolean } {
  return {
    readable:
      snap.judgment.startsWith('현재 판단:') &&
      snap.criticalUnknown.length > 12 &&
      /올리|내리|유지/.test(snap.decisionChangingEvidence) &&
      snap.validationPriority.length > 8 &&
      /습니까|알려주세요/.test(snap.question),
    leftoverPositive:
      /가능성이 높음/.test(snap.judgment) &&
      (snap.verdictId === 'judgment_deferred' || snap.verdictId === 'insufficient_basis'),
  };
}

export function questionTracksCuPriority(snap: PostNegSnap): boolean {
  const state = `${snap.criticalUnknown} ${snap.validationPriority} ${snap.decisionChangingEvidence}`;
  const qKeys = keysOf(snap.question);
  const sKeys = keysOf(state);
  const leaked = ['noshow', 'return', 'churn'].filter((key) => qKeys.includes(key) && !sKeys.includes(key));
  if (leaked.length > 0) return false;
  if (sKeys.length === 0) return /습니까|알려주세요/.test(snap.question);
  return sharesKey(state, snap.question);
}

export function isGenericAsk(snap: PostNegSnap): boolean {
  return snap.kind === 'generic' || /지금 판단을 바꾸려면 실제 행동 증거/.test(snap.question);
}

export function scoreAxis(id: PostNegAxisId, score: BatchScore, note: string, failure?: PostNegFailure) {
  return { id, score, note, failure: failure ?? null };
}
