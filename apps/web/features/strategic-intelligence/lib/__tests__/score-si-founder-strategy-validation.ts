/**
 * Founder Strategy Validation — measure only.
 * Not imported by the analyzer. Not a persist SoT. Not a question generator.
 */
import { SI_VERDICT_LABELS } from '@repo/types/domain/strategic-intelligence';

import { classifyFounderEvidenceClass } from '../classify-founder-evidence';
import type { BatchScore } from './score-si-post-negative-batch';
import {
  declined,
  founderFour,
  isGenericAsk,
  rose,
} from './score-si-post-negative-batch';
import { scoreSpokenAlignment } from './score-si-question-alignment-holdout';

export type StrategyAxisId =
  | 'core_loop'
  | 'positive'
  | 'partial'
  | 'negative'
  | 'conflict'
  | 'cu'
  | 'question'
  | 'founder_outcome';

export type StrategySnap = {
  verdictId: string;
  verdictLabel: string;
  stageId: string;
  judgment: string;
  whyPossible: string;
  whyFail: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  question: string;
  whyAsking: string;
  kind: string;
  evidenceClass: string | null;
  evidenceClasses: string[];
  risks: string[];
  strengths: string[];
};

export function founderVisible(snap: StrategySnap): string {
  return [
    `현재 판단: ${snap.verdictLabel}`,
    snap.judgment,
    snap.whyPossible,
    snap.whyFail,
    snap.criticalUnknown,
    snap.decisionChangingEvidence,
    snap.validationPriority,
    snap.question,
    snap.whyAsking,
    ...snap.risks,
    ...snap.strengths,
  ].join('\n');
}

export function leaksInternalIds(text: string): boolean {
  return /targetGap|scoreId|internalKey|axisId=/.test(text) || /\b\d{1,3}\s*점\b/.test(text);
}

export function scoreExecutiveJudgment(snap: StrategySnap): BatchScore {
  const hasVerdict = Boolean(SI_VERDICT_LABELS[snap.verdictId as keyof typeof SI_VERDICT_LABELS]);
  const isJudgment = snap.judgment.startsWith('현재 판단:');
  const hasRisk = snap.whyFail.length > 8 || snap.risks.length > 0;
  if (hasVerdict && isJudgment && hasRisk) return 'PASS';
  if (hasVerdict || isJudgment) return 'PARTIAL';
  return 'FAIL';
}

export function scoreWhy(snap: StrategySnap): BatchScore {
  if (snap.whyPossible.length < 8 || snap.whyFail.length < 8) return 'FAIL';
  if (snap.evidenceClasses.length === 0) return 'PARTIAL';
  return 'PASS';
}

export function scoreCuSurface(snap: StrategySnap): BatchScore {
  const blocker = /없으면|확정할 수 없|아니면|아니다|그대로면/.test(snap.criticalUnknown);
  if (snap.criticalUnknown.length > 12 && blocker) return 'PASS';
  if (snap.criticalUnknown.length > 12) return 'PARTIAL';
  return 'FAIL';
}

export function scoreDceSurface(snap: StrategySnap): BatchScore {
  return /올리|내리|유지/.test(snap.decisionChangingEvidence) ? 'PASS' : 'FAIL';
}

export function scoreQuestionSurface(snap: StrategySnap): BatchScore {
  if (snap.question.trim() === snap.criticalUnknown.trim()) return 'FAIL';
  const spoken = scoreSpokenAlignment({
    verdictId: snap.verdictId,
    stageId: snap.stageId,
    judgment: snap.judgment,
    criticalUnknown: snap.criticalUnknown,
    decisionChangingEvidence: snap.decisionChangingEvidence,
    validationPriority: snap.validationPriority,
    question: snap.question,
    kind: snap.kind,
    evidenceClass: snap.evidenceClass,
  });
  return spoken.score;
}

export function scoreFounderOutcomeSurface(snaps: StrategySnap[]): BatchScore {
  for (const snap of snaps) {
    const four = founderFour({
      verdictId: snap.verdictId,
      stageId: snap.stageId,
      judgment: snap.judgment,
      criticalUnknown: snap.criticalUnknown,
      decisionChangingEvidence: snap.decisionChangingEvidence,
      validationPriority: snap.validationPriority,
      question: snap.question,
      kind: snap.kind,
      evidenceClass: snap.evidenceClass,
    });
    if (four.leftoverPositive) return 'FAIL';
    if (!four.readable) return 'FAIL';
    if (leaksInternalIds(founderVisible(snap))) return 'FAIL';
  }
  const ask = snaps[0];
  if (ask && isGenericAsk({
    verdictId: ask.verdictId,
    stageId: ask.stageId,
    judgment: ask.judgment,
    criticalUnknown: ask.criticalUnknown,
    decisionChangingEvidence: ask.decisionChangingEvidence,
    validationPriority: ask.validationPriority,
    question: ask.question,
    kind: ask.kind,
    evidenceClass: ask.evidenceClass,
  })) {
    return /다음 고객|다음 기간/.test(`${ask.whyAsking} ${ask.criticalUnknown}`) ? 'PARTIAL' : 'FAIL';
  }
  return 'PASS';
}

export function scoreCoreLoop(t0: StrategySnap, after: StrategySnap, answerClass: string | null): BatchScore {
  const t0Ok =
    scoreExecutiveJudgment(t0) !== 'FAIL' &&
    scoreCuSurface(t0) !== 'FAIL' &&
    scoreDceSurface(t0) === 'PASS' &&
    /습니까|알려주세요/.test(t0.question);
  const linked = Boolean(answerClass) && after.judgment.length > 8 && after.criticalUnknown.length > 12;
  if (t0Ok && linked) return 'PASS';
  if (t0Ok || linked) return 'PARTIAL';
  return 'FAIL';
}

export function scorePositive(t0: StrategySnap, upgraded: StrategySnap): BatchScore {
  const t0Four = {
    verdictId: t0.verdictId,
    stageId: t0.stageId,
    judgment: t0.judgment,
    criticalUnknown: t0.criticalUnknown,
    decisionChangingEvidence: t0.decisionChangingEvidence,
    validationPriority: t0.validationPriority,
    question: t0.question,
    kind: t0.kind,
    evidenceClass: t0.evidenceClass,
  };
  const upFour = { ...t0Four, ...upgraded };
  const roseOk = rose(t0Four, upFour) || t0.stageId === 'S3' || t0.stageId === 'S4';
  const cuMoved = upgraded.criticalUnknown !== t0.criticalUnknown || t0.stageId === 'S3' || t0.stageId === 'S4';
  if (roseOk && cuMoved) return 'PASS';
  if (roseOk) return 'PARTIAL';
  return 'FAIL';
}

export function scorePartial(
  t0: StrategySnap,
  paidOnly: StrategySnap,
  intentClass: string,
  planClass: string,
  yesClass: string,
  dceTwoTwo: boolean,
): BatchScore {
  const paidPromoted =
    dceTwoTwo && (paidOnly.stageId === 'S3' || paidOnly.stageId === 'S4' || paidOnly.verdictId === 'viable');
  const intentValidated = intentClass === 'VALIDATED' || planClass === 'VALIDATED' || yesClass === 'VALIDATED';
  if (paidPromoted || intentValidated) return 'FAIL';
  return 'PASS';
}

export function scoreNegativeAxis(upgraded: StrategySnap, downgraded: StrategySnap): BatchScore {
  const left = {
    verdictId: upgraded.verdictId,
    stageId: upgraded.stageId,
    judgment: upgraded.judgment,
    criticalUnknown: upgraded.criticalUnknown,
    decisionChangingEvidence: upgraded.decisionChangingEvidence,
    validationPriority: upgraded.validationPriority,
    question: upgraded.question,
    kind: upgraded.kind,
    evidenceClass: upgraded.evidenceClass,
  };
  const right = { ...left, ...downgraded };
  const four = founderFour(right);
  if (declined(left, right) && !four.leftoverPositive) return 'PASS';
  if (declined(left, right)) return 'PARTIAL';
  return 'FAIL';
}

export function scoreCuAxis(t0: StrategySnap, upgraded: StrategySnap): BatchScore {
  if (upgraded.criticalUnknown !== t0.criticalUnknown) return 'PASS';
  return 'FAIL';
}

export function scoreQuestionAxis(t0: StrategySnap, upgraded: StrategySnap): BatchScore {
  return rollup([scoreQuestionSurface(t0), scoreQuestionSurface(upgraded)]);
}

export function scoreConflictAxis(upgraded: StrategySnap, conflicted: StrategySnap): BatchScore {
  const left = {
    verdictId: upgraded.verdictId,
    stageId: upgraded.stageId,
    judgment: upgraded.judgment,
    criticalUnknown: upgraded.criticalUnknown,
    decisionChangingEvidence: upgraded.decisionChangingEvidence,
    validationPriority: upgraded.validationPriority,
    question: upgraded.question,
    kind: upgraded.kind,
    evidenceClass: upgraded.evidenceClass,
  };
  const right = { ...left, ...conflicted };
  if (conflicted.evidenceClass === 'CONFLICT' && declined(left, right)) return 'PASS';
  if (conflicted.evidenceClass === 'CONFLICT' || declined(left, right)) return 'PARTIAL';
  return 'FAIL';
}

export function rollup(scores: BatchScore[]): BatchScore {
  if (scores.includes('FAIL')) return 'FAIL';
  if (scores.includes('PARTIAL')) return 'PARTIAL';
  return 'PASS';
}

export { classifyFounderEvidenceClass };
