/**
 * Founder Decision Presentation — measure only.
 * Not imported by the analyzer. Not a persist SoT.
 */
import type { BatchScore } from './score-si-post-negative-batch';
import { declined, rose } from './score-si-post-negative-batch';
import { presentSiFounderHeadline } from '../present-si-founder-judgment';

export type PresentationAxisId =
  | 'positive_promotion'
  | 'partial_evidence'
  | 'direct_conflict'
  | 's4_to_s3'
  | 'headline_stage'
  | 'cu_headline'
  | 'actionability';

export type PresentationSnap = {
  verdictId: string;
  stageId: string;
  judgment: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  question: string;
  whyAsking: string;
  kind: string;
  evidenceClass: string | null;
  evidenceClasses: string[];
};

export function presentedHeadline(snap: Pick<PresentationSnap, 'stageId' | 'verdictId'>): string {
  return presentSiFounderHeadline({
    stageId: snap.stageId as 'S0' | 'S1' | 'S2' | 'S3' | 'S4',
    verdictId: snap.verdictId as
      | 'viable'
      | 'conditionally_viable'
      | 'judgment_deferred'
      | 'insufficient_basis',
  });
}

export function headlineContradictsStage(snap: PresentationSnap): boolean {
  const headline = presentedHeadline(snap);
  if (snap.stageId === 'S4' && snap.verdictId === 'viable') {
    return !/가능성이 높음/.test(headline);
  }
  if (snap.stageId === 'S3' && snap.verdictId === 'viable') {
    return /가능성이 높음/.test(headline) && !/반복 검증은 아직/.test(headline);
  }
  if (snap.verdictId === 'judgment_deferred' || snap.verdictId === 'insufficient_basis') {
    return /가능성이 높음/.test(headline);
  }
  return false;
}

export function headlineContradictsCu(snap: PresentationSnap): boolean {
  const headline = presentedHeadline(snap);
  const cuOpenRepeat = /반복|재판매|재구매|다음 고객|다음 기간/.test(snap.criticalUnknown);
  if (cuOpenRepeat && /가능성이 높음/.test(headline) && !/아직/.test(headline) && snap.stageId !== 'S4') {
    return true;
  }
  if (snap.stageId === 'S4' && snap.verdictId === 'viable' && /보류|부족하다/.test(headline)) {
    return true;
  }
  return false;
}

export function scorePositivePromotion(before: PresentationSnap, after: PresentationSnap): BatchScore {
  if (!rose(before, after)) return 'FAIL';
  if (headlineContradictsStage(after)) return 'FAIL';
  if (presentedHeadline(before) === presentedHeadline(after) && before.stageId !== after.stageId) {
    return 'PARTIAL';
  }
  return 'PASS';
}

export function scorePartialEvidence(t0: PresentationSnap, paidOnly: PresentationSnap, dceTwoTwo: boolean): BatchScore {
  const promoted =
    dceTwoTwo && (paidOnly.stageId === 'S3' || paidOnly.stageId === 'S4' || paidOnly.verdictId === 'viable');
  if (promoted) return 'FAIL';
  if (dceTwoTwo && /가능성이 높음/.test(presentedHeadline(paidOnly))) return 'FAIL';
  if (headlineContradictsStage(paidOnly)) return 'FAIL';
  return 'PASS';
}

export function scoreDirectConflict(upgraded: PresentationSnap, conflicted: PresentationSnap): BatchScore {
  if (!declined(upgraded, conflicted)) return 'FAIL';
  if (conflicted.evidenceClass !== 'CONFLICT') return 'FAIL';
  if (/가능성이 높음/.test(presentedHeadline(conflicted))) return 'FAIL';
  if (headlineContradictsStage(conflicted)) return 'FAIL';
  return 'PASS';
}

export function scoreS4ToS3(upgraded: PresentationSnap, downgraded: PresentationSnap): BatchScore {
  if (upgraded.stageId !== 'S4' || downgraded.stageId !== 'S3') return 'N/A';
  if (downgraded.evidenceClass === 'CONFLICT') return 'FAIL';
  if (presentedHeadline(upgraded) === presentedHeadline(downgraded)) return 'FAIL';
  if (/가능성이 높음/.test(presentedHeadline(downgraded)) && !/아직/.test(presentedHeadline(downgraded))) {
    return 'FAIL';
  }
  if (!/반복|재판매|재구매/.test(downgraded.criticalUnknown)) return 'PARTIAL';
  return 'PASS';
}

export function scoreHeadlineStage(snaps: PresentationSnap[]): BatchScore {
  if (snaps.some((snap) => headlineContradictsStage(snap))) return 'FAIL';
  return 'PASS';
}

export function scoreCuHeadline(snaps: PresentationSnap[]): BatchScore {
  if (snaps.some((snap) => headlineContradictsCu(snap))) return 'FAIL';
  return 'PASS';
}

export function scoreActionability(snap: PresentationSnap): BatchScore {
  const whyVisible = snap.criticalUnknown.length > 12;
  const nextVisible =
    snap.validationPriority.length > 8 && /습니까|알려주세요/.test(snap.question);
  const dceVisible = /올리|내리|유지/.test(snap.decisionChangingEvidence);
  if (whyVisible && nextVisible && dceVisible) return 'PASS';
  if (nextVisible || whyVisible) return 'PARTIAL';
  return 'FAIL';
}

export function rollup(scores: BatchScore[]): BatchScore {
  const real = scores.filter((score) => score !== 'N/A');
  if (real.includes('FAIL')) return 'FAIL';
  if (real.includes('PARTIAL')) return 'PARTIAL';
  return 'PASS';
}
