/**
 * Accuracy Batch referee for Founder-visible conversation quality.
 * Not imported by the analyzer. Not a persist SoT.
 */

import type { SiAiPmQuestion, SiStrategicJudgment } from '@repo/types/domain/strategic-intelligence';

export type ConversationScore = 'PASS' | 'PARTIAL' | 'FAIL';

export type ConversationAxisId =
  | 'initialJudgment'
  | 'judgmentBasis'
  | 'coreRisk'
  | 'criticalUnknown'
  | 'decisionEvidence'
  | 'questionVerifiesCu'
  | 'answerClass'
  | 'evidenceUpdate'
  | 'rejudgmentHonesty'
  | 'nextAction';

export type ConversationAxis = {
  id: ConversationAxisId;
  score: ConversationScore;
  note: string;
};

function rollup(scores: ConversationScore[]): ConversationScore {
  if (scores.includes('FAIL')) return 'FAIL';
  if (scores.includes('PARTIAL')) return 'PARTIAL';
  return 'PASS';
}

function leak(text: string): boolean {
  return /targetGap|gapId|gapTarget|internalId|\bscore\b/i.test(text);
}

export function scoreReadableJudgment(judgment: SiStrategicJudgment): ConversationAxis[] {
  const surface = [
    judgment.judgment,
    judgment.whyPossible,
    judgment.whyFail,
    judgment.criticalUnknown,
    judgment.decisionChangingEvidence,
    judgment.validationPriority,
    ...judgment.strengths,
    ...judgment.risks,
  ].join('\n');

  return [
    {
      id: 'initialJudgment',
      score: judgment.judgment.startsWith('현재 판단:') && !leak(judgment.judgment) ? 'PASS' : 'FAIL',
      note: `${judgment.verdictId}/${judgment.stageId}`,
    },
    {
      id: 'judgmentBasis',
      score: judgment.strengths.length > 0 || judgment.whyPossible.length > 8 ? 'PASS' : 'FAIL',
      note: judgment.strengths[0] ?? judgment.whyPossible.slice(0, 48),
    },
    {
      id: 'coreRisk',
      score: judgment.risks.length > 0 || judgment.whyFail.length > 8 ? 'PASS' : 'FAIL',
      note: judgment.risks[0] ?? judgment.whyFail.slice(0, 48),
    },
    {
      id: 'criticalUnknown',
      score:
        judgment.criticalUnknown.length > 12 &&
        /없으면|확정할 수 없|아니면|아니다|그대로면|유지할 수 없|말할 수 없|가설이면/.test(
          judgment.criticalUnknown,
        )
          ? 'PASS'
          : 'FAIL',
      note: judgment.criticalUnknown.slice(0, 72),
    },
    {
      id: 'decisionEvidence',
      score: /올리|내리|유지/.test(judgment.decisionChangingEvidence) ? 'PASS' : 'FAIL',
      note: judgment.decisionChangingEvidence.slice(0, 72),
    },
    {
      id: 'nextAction',
      score:
        judgment.validationPriority.length > 8 &&
        judgment.validationPriority.length < 140 &&
        !leak(surface)
          ? 'PASS'
          : 'FAIL',
      note: judgment.validationPriority.slice(0, 72),
    },
  ];
}

export function questionVerifiesCu(
  judgment: SiStrategicJudgment,
  question: SiAiPmQuestion,
): ConversationAxis {
  const cu = judgment.criticalUnknown;
  const ask = `${question.questionText} ${question.whyAsking}`;
  if (leak(ask)) {
    return { id: 'questionVerifiesCu', score: 'FAIL', note: 'internal id leaked' };
  }
  if (/다음 고객|다음 기간/.test(cu)) {
    const binds = /다음 고객|다음 기간|같은 성과|두 번째|반복/.test(ask);
    return {
      id: 'questionVerifiesCu',
      score: binds ? 'PASS' : 'FAIL',
      note: binds ? 'ask stays on next-period CU' : `ask drifted: ${question.questionText.slice(0, 48)}`,
    };
  }
  if (/지불만|줄었는가|유료 전환/.test(cu)) {
    const binds = /전후|줄였|결제|유료/.test(ask);
    return {
      id: 'questionVerifiesCu',
      score: binds ? 'PASS' : 'PARTIAL',
      note: binds ? 'ask stays on paid+stake CU' : question.questionText.slice(0, 48),
    };
  }
  return {
    id: 'questionVerifiesCu',
    score: question.questionText.length > 12 ? 'PASS' : 'FAIL',
    note: question.kind,
  };
}

export function scoreConversationTurn(input: {
  judgment: SiStrategicJudgment;
  question: SiAiPmQuestion;
}): { axes: ConversationAxis[]; overall: ConversationScore } {
  const axes = [...scoreReadableJudgment(input.judgment), questionVerifiesCu(input.judgment, input.question)];
  return { axes, overall: rollup(axes.map((axis) => axis.score)) };
}
