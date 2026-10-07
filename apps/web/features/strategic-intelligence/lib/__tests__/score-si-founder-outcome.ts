import type { SiAiPmQuestion, SiStrategicJudgment } from '@repo/types/domain/strategic-intelligence';

import { scoreSiFirstPass } from './score-si-first-pass';
import { FIRST_PASS_REFEREE } from './si-first-pass-referee';
import type { FounderOutcomeReferee } from './si-founder-outcome-referee';
import type { SiCalibrationCaseId } from '../si-calibration-cases';

export type FounderOutcomeAxisId =
  | 'judgmentClarity'
  | 'riskActionable'
  | 'cuBlocksDecision'
  | 'dceNamesMove'
  | 'priorityOneAction'
  | 'questionAsksProof'
  | 'rejudgmentHonest'
  | 'founderNextStep';

export type FounderOutcomeScore = 'PASS' | 'PARTIAL' | 'FAIL';

export type FounderOutcomeAxis = {
  id: FounderOutcomeAxisId;
  score: FounderOutcomeScore;
  note: string;
};

function hits(patterns: RegExp[], text: string): number {
  return patterns.filter((pattern) => pattern.test(text)).length;
}

function rollup(scores: FounderOutcomeScore[]): FounderOutcomeScore {
  if (scores.includes('FAIL')) return 'FAIL';
  if (scores.includes('PARTIAL')) return 'PARTIAL';
  return 'PASS';
}

export function scoreSiFounderOutcome(input: {
  id: SiCalibrationCaseId;
  t0: SiStrategicJudgment;
  question: SiAiPmQuestion;
  answer: string;
  t1: SiStrategicJudgment;
  answerEnteredEvidence: boolean;
  referee: FounderOutcomeReferee;
}): {
  axes: FounderOutcomeAxis[];
  overall: FounderOutcomeScore;
  directionMatch: FounderOutcomeScore;
  brief: { validate: string; stop: string; focus: string };
} {
  const { t0, question, t1, referee } = input;
  const brief = {
    validate: t0.validationPriority,
    stop: t0.whyFail,
    focus: t0.criticalUnknown,
  };
  const riskText = `${t0.whyFail} ${t0.risks.join(' ')}`;
  const nextStepText = `${brief.validate} ${brief.stop} ${brief.focus} ${question.questionText}`;

  const judgmentClarity: FounderOutcomeAxis = {
    id: 'judgmentClarity',
    score:
      t0.judgment.startsWith('현재 판단:') && !/\d{1,3}\s*점/.test(t0.judgment) ? 'PASS' : 'FAIL',
    note: `${t0.verdictId}/${t0.stageId}`,
  };

  const riskHits = hits(referee.stopPatterns, riskText);
  const riskActionable: FounderOutcomeAxis = {
    id: 'riskActionable',
    score: riskHits > 0 ? 'PASS' : 'FAIL',
    note: riskHits > 0 ? 'whyFail names a hold/stop condition' : 'Risk is not a Founder stop rule',
  };

  const cuHasWhy = /없으면|확정할 수 없|아니면|아니다|그대로면/.test(t0.criticalUnknown);
  const cuFocus = hits(referee.focusPatterns, t0.criticalUnknown);
  const cuBlocksDecision: FounderOutcomeAxis = {
    id: 'cuBlocksDecision',
    score: cuHasWhy && cuFocus > 0 ? 'PASS' : cuHasWhy || cuFocus > 0 ? 'PARTIAL' : 'FAIL',
    note: cuHasWhy && cuFocus > 0 ? 'CU names the unknown that blocks a decision' : 'CU is thin as a focus rule',
  };

  const dceNamesMove: FounderOutcomeAxis = {
    id: 'dceNamesMove',
    score: /올리|내리|유지/.test(t0.decisionChangingEvidence) ? 'PASS' : 'FAIL',
    note: /올리|내리|유지/.test(t0.decisionChangingEvidence)
      ? 'DCE says how the verdict would move'
      : 'DCE missing a judgment move',
  };

  const priorityHits = hits(referee.validatePatterns, t0.validationPriority);
  const priorityOneAction: FounderOutcomeAxis = {
    id: 'priorityOneAction',
    score: priorityHits > 0 && t0.validationPriority.length < 120 ? 'PASS' : priorityHits > 0 ? 'PARTIAL' : 'FAIL',
    note: priorityHits > 0 ? 'Priority is one next proof' : 'Priority is not a Founder validate action',
  };

  const askHits = hits(referee.validatePatterns, question.questionText);
  const questionAsksProof: FounderOutcomeAxis = {
    id: 'questionAsksProof',
    score: askHits > 0 && /습니까|알려주세요/.test(question.questionText) ? 'PASS' : 'FAIL',
    note: askHits > 0 ? 'Spoken question asks for the same proof' : 'Question does not ask the validate action',
  };

  const stakeRequired = referee.stakeInAnswer;
  const answerHasStake = stakeRequired ? stakeRequired.test(input.answer) : true;
  const falseUpgrade = Boolean(stakeRequired) && !answerHasStake && t1.verdictId === 'viable';
  const moved =
    t1.verdictId !== t0.verdictId ||
    t1.criticalUnknown !== t0.criticalUnknown ||
    t1.validationPriority !== t0.validationPriority;
  const rejudgmentHonest: FounderOutcomeAxis = {
    id: 'rejudgmentHonest',
    score: !input.answerEnteredEvidence
      ? 'FAIL'
      : falseUpgrade
        ? 'FAIL'
        : answerHasStake && moved
          ? 'PASS'
          : 'PARTIAL',
    note: falseUpgrade
      ? 'Incomplete answer upgraded to viable'
      : input.answerEnteredEvidence
        ? answerHasStake && moved
          ? 'Re-judgment moved on the same axis'
          : `Evidence entered; t1=${t1.verdictId}/${t1.stageId}; stake in answer=${answerHasStake}`
        : 'Answer did not enter Evidence',
  };

  const nextHits =
    hits(referee.validatePatterns, nextStepText) > 0 &&
    hits(referee.stopPatterns, nextStepText) > 0 &&
    hits(referee.focusPatterns, nextStepText) > 0;
  const threeDistinct =
    brief.validate !== brief.stop && brief.focus !== brief.validate && brief.focus.length > 8;
  const founderNextStep: FounderOutcomeAxis = {
    id: 'founderNextStep',
    score: nextHits && threeDistinct ? 'PASS' : nextHits || threeDistinct ? 'PARTIAL' : 'FAIL',
    note:
      nextHits && threeDistinct
        ? 'Founder can read validate / stop / focus from t0'
        : 'Validate / stop / focus are not all explicit',
  };

  const axes = [
    judgmentClarity,
    riskActionable,
    cuBlocksDecision,
    dceNamesMove,
    priorityOneAction,
    questionAsksProof,
    rejudgmentHonest,
    founderNextStep,
  ];

  const direction = scoreSiFirstPass(t0, FIRST_PASS_REFEREE[input.id]).overall;

  return {
    axes,
    overall: rollup(axes.map((axis) => axis.score)),
    directionMatch: direction,
    brief,
  };
}
