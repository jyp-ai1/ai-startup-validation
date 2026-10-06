import type { SiAiPmQuestion, SiStrategicJudgment } from '@repo/types/domain/strategic-intelligence';

export type QuestionAlignmentAxisId =
  | 'priorityPresent'
  | 'questionPresent'
  | 'asksDce'
  | 'noGenericRegression'
  | 'answerToEvidence'
  | 'twoTurnLoop';

export type QuestionAlignmentScore = 'PASS' | 'PARTIAL' | 'FAIL';

export type QuestionAlignmentAxis = {
  id: QuestionAlignmentAxisId;
  score: QuestionAlignmentScore;
  note: string;
};

/** Kind-level paid ask. Not a business name. */
export const GENERIC_PAID_QUESTION =
  '가장 가까운 결제 후보에게 유료로 제안했거나, 실제로 받은 돈이 있습니까?';

const SPECIALIZED_STAKES: Array<{ id: string; re: RegExp }> = [
  { id: 'no-show', re: /no-show|노쇼/i },
  { id: '반품', re: /반품/ },
  { id: 'EMR', re: /\bEMR\b/ },
  { id: 'True Fit', re: /True Fit/ },
  { id: '전후', re: /전후/ },
];

function specializedStakes(text: string): string[] {
  return SPECIALIZED_STAKES.filter((stake) => stake.re.test(text)).map((stake) => stake.id);
}

function rollup(scores: QuestionAlignmentScore[]): QuestionAlignmentScore {
  if (scores.includes('FAIL')) return 'FAIL';
  if (scores.includes('PARTIAL')) return 'PARTIAL';
  return 'PASS';
}

function axisMatch(question: string, dce: string, priority: string): boolean {
  const blob = `${dce} ${priority}`;
  if (/(재판매|C2C|재구매)/.test(blob)) return /(재판매|재구매|두 번째)/.test(question);
  if (/(직무|Job-to-be-done)/i.test(blob)) return /(직무|Job|돈을 내는|지불)/i.test(question);
  if (/(사용자와 결제자|결제자를 분리)/.test(blob)) {
    return /(쓰는 사람|결제자|돈을 내는)/.test(question);
  }
  if (/세그먼트/.test(blob)) return /(고객 그룹|세그먼트|돈을 낸)/.test(question);
  if (/(유료|결제|파일럿)/.test(blob)) return /(유료|결제|받은 돈|제안)/.test(question);
  return /있습니까|알려주세요/.test(question);
}

export function scoreSiQuestionAlignment(input: {
  judgment: SiStrategicJudgment;
  question: SiAiPmQuestion;
  answerEnteredEvidence: boolean;
  twoTurnHeld: boolean;
}): { axes: QuestionAlignmentAxis[]; overall: QuestionAlignmentScore; stakes: string[] } {
  const priority = input.judgment.validationPriority;
  const dce = input.judgment.decisionChangingEvidence;
  const question = input.question.questionText;
  const stakes = specializedStakes(`${dce} ${priority}`);
  const namedInQuestion = specializedStakes(question);

  const priorityPresent: QuestionAlignmentAxis = {
    id: 'priorityPresent',
    score: priority.trim().length > 8 ? 'PASS' : 'FAIL',
    note: priority.trim().length > 8 ? 'Validation Priority is present' : 'Priority missing',
  };

  const questionPresent: QuestionAlignmentAxis = {
    id: 'questionPresent',
    score: /있습니까|알려주세요/.test(question) ? 'PASS' : 'FAIL',
    note: /있습니까|알려주세요/.test(question)
      ? `AI PM asked a ${input.question.kind} question`
      : 'No executable AI PM question',
  };

  const onAxis = axisMatch(question, dce, priority);
  const stakeHit = stakes.length === 0 || namedInQuestion.length > 0;
  const asksDce: QuestionAlignmentAxis = {
    id: 'asksDce',
    score: onAxis && stakeHit ? 'PASS' : onAxis ? 'PARTIAL' : 'FAIL',
    note:
      onAxis && stakeHit
        ? 'Question asks for the DCE axis and any specialized stake'
        : onAxis
          ? `Question stays on the payment axis but misses DCE stakes: ${stakes.join(', ')}`
          : 'Question is off the DCE axis',
  };

  const isGenericPaid = question.includes(GENERIC_PAID_QUESTION);
  const noGenericRegression: QuestionAlignmentAxis = {
    id: 'noGenericRegression',
    score: stakes.length === 0 || !isGenericPaid ? 'PASS' : 'PARTIAL',
    note:
      stakes.length === 0
        ? 'No specialized stake — kind-level question is enough'
        : isGenericPaid
          ? `Kind-level paid_conversion dropped specialized stakes: ${stakes.join(', ')}`
          : 'Question is not the generic paid template',
  };

  const answerToEvidence: QuestionAlignmentAxis = {
    id: 'answerToEvidence',
    score: input.answerEnteredEvidence ? 'PASS' : 'FAIL',
    note: input.answerEnteredEvidence
      ? 'Founder answer entered S.I. Evidence as VALIDATED'
      : 'Answer did not enter S.I. Evidence',
  };

  const twoTurnLoop: QuestionAlignmentAxis = {
    id: 'twoTurnLoop',
    score: input.twoTurnHeld ? 'PASS' : 'FAIL',
    note: input.twoTurnHeld
      ? 'Two evidence turns still recompute judgment / CU / priority'
      : 'Two-turn loop broken',
  };

  const axes = [
    priorityPresent,
    questionPresent,
    asksDce,
    noGenericRegression,
    answerToEvidence,
    twoTurnLoop,
  ];
  return { axes, overall: rollup(axes.map((axis) => axis.score)), stakes };
}
