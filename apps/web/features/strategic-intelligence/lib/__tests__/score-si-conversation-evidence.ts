/**
 * Independent CPO referee for the conversation-quality Evidence Batch.
 * Not imported by the analyzer. Not used by #128 implementation tests.
 * Criteria come from the CPO 5-axis table, not from helper source.
 */

export type EvidenceScore = 'PASS' | 'FAIL';

export type ConversationActual = {
  verdictId: string;
  stageId: string;
  judgment: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  questionText: string;
  whyAsking: string;
  evidenceClass: string | null;
  evidenceStrengthDelta: string | null;
  criticalUnknownChanged: boolean | null;
};

export type EvidenceRow = {
  id: string;
  score: EvidenceScore;
  note: string;
};

const NEXT_PERIOD_CU = /다음 고객|다음 기간/;
const RETIRED_TO_REPEAT = /반복 가능/;
const SAME_STAKE_ASK = /전후 수치|얼마나 줄였/;

export function scoreAfterFullDce(actual: ConversationActual): EvidenceRow {
  const cu = NEXT_PERIOD_CU.test(actual.criticalUnknown);
  const promoted = actual.stageId === 'S3' && actual.verdictId !== 'judgment_deferred';
  const askFollows =
    NEXT_PERIOD_CU.test(`${actual.questionText} ${actual.whyAsking}`) ||
    /같은 성과|두 번째|반복/.test(`${actual.questionText} ${actual.whyAsking}`);
  const ok = cu && promoted && askFollows;
  return {
    id: 'after_2_2',
    score: ok ? 'PASS' : 'FAIL',
    note: ok
      ? '2/2 opens next-period CU and the ask stays on that unknown'
      : `cu=${cu} promoted=${promoted} askFollows=${askFollows}`,
  };
}

export function scoreHeldOutcome(
  afterFull: ConversationActual,
  held: ConversationActual,
): EvidenceRow {
  const retired = !/다음 고객이나 다음 기간에도 같은 방향/.test(held.criticalUnknown);
  const moved = RETIRED_TO_REPEAT.test(held.criticalUnknown) || held.criticalUnknownChanged === true;
  const stillPromoted = held.stageId === 'S3';
  const questionMoved = held.questionText !== afterFull.questionText;
  const notSameStakeAsk = !SAME_STAKE_ASK.test(held.questionText);
  const notValidated = held.evidenceClass !== 'VALIDATED';
  const ok = retired && moved && stillPromoted && questionMoved && notSameStakeAsk && notValidated;
  return {
    id: 'held_retires_cu',
    score: ok ? 'PASS' : 'FAIL',
    note: ok
      ? 'held outcome retires next-period CU and changes the ask'
      : `retired=${retired} moved=${moved} S3=${stillPromoted} qMoved=${questionMoved} class=${held.evidenceClass}`,
  };
}

export function scoreWorseOutcome(worse: ConversationActual): EvidenceRow {
  const wronglyRetired =
    RETIRED_TO_REPEAT.test(worse.criticalUnknown) &&
    (worse.verdictId === 'viable' || worse.verdictId === 'conditionally_viable');
  const ok = !wronglyRetired;
  return {
    id: 'worse_does_not_retire',
    score: ok ? 'PASS' : 'FAIL',
    note: ok
      ? 'worsened next period is not treated as a successful CU retirement'
      : 'worsened period retired CU as if the outcome held',
  };
}

export function scorePlannedOutcome(plan: ConversationActual): EvidenceRow {
  const claim = plan.evidenceClass === 'CLAIM';
  const notValidated = plan.evidenceClass !== 'VALIDATED';
  const stillOpen = NEXT_PERIOD_CU.test(plan.criticalUnknown);
  const ok = claim && notValidated && stillOpen;
  return {
    id: 'plan_stays_claim',
    score: ok ? 'PASS' : 'FAIL',
    note: ok
      ? 'planned next-period stay CLAIM and keep the next-period CU'
      : `class=${plan.evidenceClass} stillOpen=${stillOpen}`,
  };
}

export function scoreGeneralizedHeld(held: ConversationActual): EvidenceRow {
  const retired = !/다음 고객이나 다음 기간에도 같은 방향/.test(held.criticalUnknown);
  const moved = RETIRED_TO_REPEAT.test(held.criticalUnknown);
  const stillPromoted = held.stageId === 'S3';
  const ok = retired && moved && stillPromoted;
  return {
    id: 'generalized_metric',
    score: ok ? 'PASS' : 'FAIL',
    note: ok
      ? 'same held-outcome rule applies on a different metric'
      : `retired=${retired} moved=${moved} S3=${stillPromoted}`,
  };
}
