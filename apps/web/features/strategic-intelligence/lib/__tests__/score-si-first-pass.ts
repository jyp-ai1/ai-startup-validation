import type { SiStrategicJudgment } from '@repo/types/domain/strategic-intelligence';

import type { FirstPassReferee } from './si-first-pass-referee';

export type FirstPassAxisId =
  | 'direction'
  | 'coreRisk'
  | 'criticalUnknown'
  | 'decisionEvidence'
  | 'validationPriority'
  | 'grounding';

export type FirstPassAxisScore = 'PASS' | 'PARTIAL' | 'FAIL';

export type FirstPassAxisResult = {
  id: FirstPassAxisId;
  score: FirstPassAxisScore;
  note: string;
};

function hits(patterns: RegExp[], text: string): number {
  return patterns.filter((pattern) => pattern.test(text)).length;
}

function rollup(scores: FirstPassAxisScore[]): FirstPassAxisScore {
  if (scores.includes('FAIL')) return 'FAIL';
  if (scores.includes('PARTIAL')) return 'PARTIAL';
  return 'PASS';
}

export function scoreSiFirstPass(
  judgment: SiStrategicJudgment,
  referee: FirstPassReferee,
): { axes: FirstPassAxisResult[]; overall: FirstPassAxisScore } {
  const riskText = `${judgment.whyFail} ${judgment.risks.join(' ')}`;
  const cuText = judgment.criticalUnknown;
  const dceText = judgment.decisionChangingEvidence;
  const priorityText = judgment.validationPriority;
  const allText = [
    judgment.judgment,
    judgment.whyPossible,
    judgment.whyFail,
    judgment.criticalUnknown,
    judgment.decisionChangingEvidence,
    judgment.validationPriority,
    judgment.strengths.join(' '),
  ].join(' ');

  const directionOk =
    judgment.verdictId === referee.verdictId && referee.stageBand.includes(judgment.stageId);
  const direction: FirstPassAxisResult = {
    id: 'direction',
    score: directionOk ? 'PASS' : 'FAIL',
    note: `${judgment.verdictId}/${judgment.stageId} vs ${referee.verdictId}/${referee.stageBand.join('|')}`,
  };

  const riskHits = hits(referee.coreRiskPatterns, riskText);
  const coreRisk: FirstPassAxisResult = {
    id: 'coreRisk',
    score:
      riskHits === referee.coreRiskPatterns.length
        ? 'PASS'
        : riskHits === 0
          ? 'FAIL'
          : 'PARTIAL',
    note: `${riskHits}/${referee.coreRiskPatterns.length} core risks named`,
  };

  const cuHits = hits(referee.cuPatterns, cuText);
  const cuHasWhy = /없으면|확정할 수 없|아니면|아니다/.test(cuText);
  const cuSpecific = referee.cuSpecificPatterns
    ? hits(referee.cuSpecificPatterns, `${cuText} ${dceText} ${priorityText}`)
    : 1;
  const criticalUnknown: FirstPassAxisResult = {
    id: 'criticalUnknown',
    score:
      cuHits === 0
        ? 'FAIL'
        : cuHasWhy && cuSpecific > 0
          ? 'PASS'
          : 'PARTIAL',
    note:
      cuSpecific === 0
        ? 'CU is decision-relevant but misses the domain stake GPT/Gemini would name'
        : cuHasWhy
          ? 'CU names the unknown and why it blocks a decision'
          : 'CU missing decision stake',
  };

  const dceHits = hits(referee.dcePatterns, dceText);
  const dceChanges = /올리|내리|유지/.test(dceText);
  const decisionEvidence: FirstPassAxisResult = {
    id: 'decisionEvidence',
    score: dceHits > 0 && dceChanges ? 'PASS' : dceHits > 0 ? 'PARTIAL' : 'FAIL',
    note: dceChanges ? 'DCE names artifact and judgment move' : 'DCE missing judgment move',
  };

  const priorityHits = hits(referee.priorityPatterns, priorityText);
  const validationPriority: FirstPassAxisResult = {
    id: 'validationPriority',
    score: priorityHits > 0 ? 'PASS' : 'FAIL',
    note: priorityHits > 0 ? 'Priority is one action on the same axis as CU' : 'Priority off-axis',
  };

  const optimismHit = referee.forbiddenOptimism.some((pattern) => pattern.test(allText));
  const validatedHit = judgment.evidenceMap.some((item) => item.evidenceClass === 'VALIDATED');
  const grounding: FirstPassAxisResult = {
    id: 'grounding',
    score: !optimismHit && !validatedHit ? 'PASS' : 'FAIL',
    note:
      optimismHit || validatedHit
        ? 'Ungrounded optimism or VALIDATED on first pass'
        : 'No ungrounded optimism on t0',
  };

  const axes = [direction, coreRisk, criticalUnknown, decisionEvidence, validationPriority, grounding];
  return { axes, overall: rollup(axes.map((axis) => axis.score)) };
}
