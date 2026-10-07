/**
 * Question Alignment Holdout — measure only.
 * Not imported by the analyzer. Not a persist SoT. Not a question generator.
 */
import type { BatchScore } from './score-si-post-negative-batch';
import { isGenericAsk, type PostNegSnap } from './score-si-post-negative-batch';

export type HoldoutPattern = 'next_cu_generic' | 'stake_weave_off' | 'control_bind';

export type HoldoutFailure =
  | 'generic_ask_after_specific_cu'
  | 'stake_weave_off_cu'
  | 'question_off_cu_priority'
  | 'cu_purpose_lost';

const STAKE_Q = /(no-show|노쇼|반품률|이탈 수치|누락|부하|미스매치|불일치)/i;
const STAKE_CU = /(no-show|노쇼|반품|이탈|누락|부하|미스매치|불일치)/i;

export function isNextUnresolvedCu(text: string): boolean {
  return /다음 고객|다음 기간/.test(text);
}

export function isRepeatabilityCu(text: string): boolean {
  return /반복 가능/.test(text);
}

export function stakeWeavedOffCu(snap: PostNegSnap): boolean {
  return STAKE_Q.test(snap.question) && !STAKE_CU.test(snap.criticalUnknown);
}

export function questionPreservesCuPurpose(snap: PostNegSnap): boolean {
  const cu = snap.criticalUnknown;
  const q = snap.question;
  if (isNextUnresolvedCu(cu)) return /다음 고객|다음 기간/.test(q);
  if (isRepeatabilityCu(cu)) {
    return /(두 번째|재구매|반복 가능|재판매|두 번째 행동)/.test(q) && !stakeWeavedOffCu(snap);
  }
  if (/세그먼트/.test(cu)) return /(고객 그룹|세그먼트|돈을 낸)/.test(q);
  if (/직무|Job/.test(cu)) return /(직무|Job|돈을 내는|지불)/i.test(q);
  if (/결제자|돈을 내는 사람/.test(cu)) return /(쓰는 사람|결제자|돈을 내는)/.test(q);
  return /습니까|알려주세요/.test(q) && !isGenericAsk(snap);
}

/**
 * PASS: spoken question keeps the next CU's verification object.
 * PARTIAL: related validation ask, but generalizes away the CU object.
 * FAIL: question moves to another axis or is unrelated to the CU.
 */
export function scoreSpokenAlignment(snap: PostNegSnap): {
  score: BatchScore;
  failure: HoldoutFailure | null;
  note: string;
} {
  const cu = snap.criticalUnknown;
  const preserves = questionPreservesCuPurpose(snap);
  const generic = isGenericAsk(snap);
  const weave = stakeWeavedOffCu(snap);

  if (preserves) {
    return { score: 'PASS', failure: null, note: `kind=${snap.kind} preserves CU object` };
  }
  if (isNextUnresolvedCu(cu) && generic) {
    return {
      score: 'PARTIAL',
      failure: 'generic_ask_after_specific_cu',
      note: 'generic ask generalizes 다음 고객/기간',
    };
  }
  if (isRepeatabilityCu(cu) && weave) {
    return {
      score: 'FAIL',
      failure: 'stake_weave_off_cu',
      note: 'question moved onto a stake noun that is not the CU',
    };
  }
  if (generic) {
    return {
      score: 'PARTIAL',
      failure: 'generic_ask_after_specific_cu',
      note: `generic ask on CU=${cu.slice(0, 24)}`,
    };
  }
  return {
    score: 'FAIL',
    failure: weave ? 'stake_weave_off_cu' : 'question_off_cu_priority',
    note: `kind=${snap.kind} off CU object`,
  };
}

export function detectPattern(snap: PostNegSnap): HoldoutPattern {
  if (isNextUnresolvedCu(snap.criticalUnknown) && isGenericAsk(snap)) return 'next_cu_generic';
  if (isRepeatabilityCu(snap.criticalUnknown) && stakeWeavedOffCu(snap)) return 'stake_weave_off';
  return 'control_bind';
}

export function scoreHoldoutAxis(
  id: string,
  score: BatchScore,
  note: string,
  failure: HoldoutFailure | null = null,
) {
  return { id, score, note, failure };
}
