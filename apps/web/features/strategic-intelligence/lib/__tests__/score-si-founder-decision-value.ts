/**
 * Founder Decision Value — measure only.
 * Not imported by the analyzer. Not a persist SoT. Not a question generator.
 */
import { SI_VERDICT_LABELS } from '@repo/types/domain/strategic-intelligence';

import type { BatchScore } from './score-si-post-negative-batch';
import { declined, founderFour, keysOf, rose, sharesKey } from './score-si-post-negative-batch';

export type DecisionAxisId =
  | 'judgment_clarity'
  | 'risk_clarity'
  | 'validation_clarity'
  | 'actionability';

export type DecisionScenario = 'GO' | 'HOLD' | 'STOP';

export type DecisionSnap = {
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

export type FounderRead = {
  understoodJudgment: string;
  understoodWhy: string;
  understoodUnknown: string;
  understoodDce: string;
  chosenNextAction: string;
};

const VAGUE = /정보가 부족합니다|잘 모르겠습니다|확인이 필요합니다\.?$/;
const ACTION_VERB = /확인|검증|한 명|한 건|알려주세요|습니까|지불|결제|줄었|등록|재구매|재판매/;

export function firstSentence(text: string): string {
  const match = text.replace(/\s+/g, ' ').trim().match(/^(.+?[.。]|현재 판단:[^.。]+)/);
  return (match?.[1] ?? text).trim();
}

export function readAsFounder(snap: DecisionSnap): FounderRead {
  return {
    understoodJudgment: firstSentence(snap.judgment) || `현재 판단: ${snap.verdictLabel}`,
    understoodWhy: [snap.whyPossible, snap.whyFail, snap.evidenceClasses.join(' / ')].filter(Boolean).join(' · '),
    understoodUnknown: snap.criticalUnknown,
    understoodDce: snap.decisionChangingEvidence,
    chosenNextAction: [snap.validationPriority, snap.question].filter(Boolean).join(' → '),
  };
}

export function leaksInternalIds(text: string): boolean {
  return /targetGap|scoreId|internalKey|axisId=/.test(text) || /\b\d{1,3}\s*점\b/.test(text);
}

export function founderVisible(snap: DecisionSnap): string {
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

export function verdictMatchesProse(snap: DecisionSnap): boolean {
  const label = SI_VERDICT_LABELS[snap.verdictId as keyof typeof SI_VERDICT_LABELS];
  if (!label) return false;
  return snap.judgment.includes(label) && snap.verdictLabel === label;
}

export function inducesOppositeDecision(scenario: DecisionScenario, snap: DecisionSnap): boolean {
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
  if (four.leftoverPositive) return true;
  if (scenario === 'HOLD' && /가능성이 높음/.test(snap.judgment) && snap.stageId !== 'S3' && snap.stageId !== 'S4') {
    return true;
  }
  if (scenario === 'STOP' && snap.verdictId === 'viable' && !/CONFLICT/.test(snap.evidenceClasses.join(' '))) {
    return true;
  }
  if (scenario === 'GO' && (snap.verdictId === 'insufficient_basis' || snap.stageId === 'S0')) {
    return true;
  }
  return false;
}

export function scoreJudgmentClarity(scenario: DecisionScenario, snap: DecisionSnap, read: FounderRead): BatchScore {
  if (!verdictMatchesProse(snap)) return 'FAIL';
  if (leaksInternalIds(read.understoodJudgment)) return 'FAIL';
  if (VAGUE.test(read.understoodJudgment) && read.understoodJudgment.length < 24) return 'FAIL';
  if (!read.understoodJudgment.startsWith('현재 판단:') && !snap.judgment.startsWith('현재 판단:')) return 'FAIL';
  if (scenario === 'HOLD' && !/보류|부족|않으면|확인되지|검증되지/.test(read.understoodJudgment + snap.judgment)) {
    return 'PARTIAL';
  }
  if (scenario === 'GO' && snap.verdictId === 'judgment_deferred' && snap.stageId !== 'S3' && snap.stageId !== 'S4') {
    return 'PARTIAL';
  }
  if (scenario === 'STOP' && /가능성이 높음/.test(read.understoodJudgment)) return 'FAIL';
  return 'PASS';
}

export function scoreRiskClarity(snap: DecisionSnap, read: FounderRead): BatchScore {
  const risk = `${snap.whyFail} ${snap.risks.join(' ')} ${read.understoodUnknown}`;
  if (risk.trim().length < 16) return 'FAIL';
  if (VAGUE.test(snap.whyFail) && snap.risks.length === 0) return 'FAIL';
  const cuKeys = keysOf(snap.criticalUnknown);
  const riskKeys = keysOf(risk);
  if (cuKeys.length > 0 && riskKeys.length > 0 && !sharesKey(snap.criticalUnknown, risk)) return 'PARTIAL';
  return 'PASS';
}

export function scoreValidationClarity(snap: DecisionSnap, read: FounderRead): BatchScore {
  if (read.understoodUnknown.length < 12) return 'FAIL';
  if (!/올리|내리|유지/.test(read.understoodDce)) return 'FAIL';
  if (read.understoodUnknown.trim() === snap.question.trim()) return 'FAIL';
  const connected =
    sharesKey(snap.criticalUnknown, snap.decisionChangingEvidence) ||
    sharesKey(snap.criticalUnknown, snap.validationPriority) ||
    keysOf(snap.criticalUnknown).length === 0;
  if (!connected) return 'PARTIAL';
  return 'PASS';
}

export function scoreActionability(scenario: DecisionScenario, snap: DecisionSnap, read: FounderRead): BatchScore {
  if (!ACTION_VERB.test(read.chosenNextAction)) return 'FAIL';
  if (VAGUE.test(snap.validationPriority)) return 'FAIL';
  if (!/습니까|알려주세요/.test(snap.question)) return 'FAIL';
  if (scenario === 'HOLD' && /정보가 부족/.test(read.chosenNextAction) && !ACTION_VERB.test(snap.validationPriority)) {
    return 'FAIL';
  }
  const tracks =
    sharesKey(snap.criticalUnknown, `${snap.validationPriority} ${snap.question} ${snap.whyAsking}`) ||
    /다음 고객|다음 기간|확인|검증/.test(read.chosenNextAction);
  if (!tracks) return 'PARTIAL';
  return 'PASS';
}

export function scoreDecisionValue(scores: BatchScore[]): BatchScore {
  if (scores.includes('FAIL')) return 'FAIL';
  if (scores.includes('PARTIAL')) return 'PARTIAL';
  return 'PASS';
}

export function rollup(scores: BatchScore[]): BatchScore {
  return scoreDecisionValue(scores);
}

export function snapAsPostNeg(snap: DecisionSnap) {
  return {
    verdictId: snap.verdictId,
    stageId: snap.stageId,
    judgment: snap.judgment,
    criticalUnknown: snap.criticalUnknown,
    decisionChangingEvidence: snap.decisionChangingEvidence,
    validationPriority: snap.validationPriority,
    question: snap.question,
    kind: snap.kind,
    evidenceClass: snap.evidenceClass,
  };
}

export { declined, rose };
