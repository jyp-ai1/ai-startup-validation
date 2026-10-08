/**
 * Repeatability referee for spoken_generic_after_promotion.
 * Not imported by analyzer or presenter. Not a persist SoT.
 *
 * Pattern A obstruction = does a generic ask block the loop?
 * spoken_generic_after_promotion = CU/DCE/priority/whyAsking are right,
 * but the Founder-visible question does not name the next proof.
 */

export type BatchTurn = 't0' | 'promoted' | 'held';
export type BatchRole = 'candidate' | 'control';
export type ExpectedCu = 'next_period' | 'repeat' | 'paid' | 'other';

export type SpokenSurface = {
  kind: string;
  verdictId: string;
  stageId: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  questionText: string;
  whyAsking: string;
};

export type FailureKind = 'judgment_wrong' | 'cu_wrong' | 'dce_wrong' | 'state_wrong' | null;

export type PatternHit = 'spoken_generic_after_promotion' | 'absent' | 'control';

const GENERIC_SPOKEN = /실제 행동 증거가 필요합니다/;
const NEXT_PERIOD = /다음 고객|다음 기간/;

export function isPromoted(surface: SpokenSurface): boolean {
  return (
    surface.stageId === 'S3' ||
    surface.stageId === 'S4' ||
    surface.verdictId === 'viable' ||
    surface.verdictId === 'conditionally_viable'
  );
}

export function namesNextPeriod(text: string): boolean {
  return NEXT_PERIOD.test(text);
}

export function isGenericSpoken(text: string): boolean {
  return GENERIC_SPOKEN.test(text);
}

export function classifySpokenGenericBatch(input: {
  role: BatchRole;
  turn: BatchTurn;
  expectedCu: ExpectedCu;
  surface: SpokenSurface;
}): {
  pattern: PatternHit;
  spokenGeneric: boolean;
  nextPeriodCu: boolean;
  nextPeriodDce: boolean;
  nextPeriodPriority: boolean;
  nextPeriodWhy: boolean;
  decisionValueHurt: boolean;
  patternAObstruction: false;
  failure: FailureKind;
  note: string;
} {
  const { role, turn, expectedCu, surface } = input;
  const spokenGeneric = isGenericSpoken(surface.questionText);
  const nextPeriodCu = namesNextPeriod(surface.criticalUnknown);
  const nextPeriodDce = namesNextPeriod(surface.decisionChangingEvidence);
  const nextPeriodPriority = namesNextPeriod(surface.validationPriority);
  const nextPeriodWhy = namesNextPeriod(surface.whyAsking);
  const promoted = isPromoted(surface);

  const triadAligned = nextPeriodCu && nextPeriodDce && nextPeriodPriority && nextPeriodWhy;
  const decisionValueHurt = promoted && triadAligned && spokenGeneric;

  let failure: FailureKind = null;
  if (turn === 'promoted' && expectedCu === 'next_period' && !promoted) {
    failure = 'judgment_wrong';
  } else if (turn === 'promoted' && expectedCu === 'next_period' && !nextPeriodCu) {
    failure = 'cu_wrong';
  } else if (turn === 'promoted' && expectedCu === 'next_period' && nextPeriodCu && (!nextPeriodDce || !nextPeriodPriority)) {
    failure = 'dce_wrong';
  } else if (turn === 'held' && expectedCu === 'repeat' && nextPeriodCu) {
    failure = 'state_wrong';
  } else if (turn === 't0' && expectedCu === 'paid' && nextPeriodCu) {
    failure = 'cu_wrong';
  }

  if (decisionValueHurt) {
    return {
      pattern: 'spoken_generic_after_promotion',
      spokenGeneric,
      nextPeriodCu,
      nextPeriodDce,
      nextPeriodPriority,
      nextPeriodWhy,
      decisionValueHurt,
      patternAObstruction: false,
      failure,
      note: `kind=${surface.kind}; CU/DCE/priority/whyAsking name next period; spoken is generic`,
    };
  }

  return {
    pattern: role === 'control' || turn !== 'promoted' ? 'control' : 'absent',
    spokenGeneric,
    nextPeriodCu,
    nextPeriodDce,
    nextPeriodPriority,
    nextPeriodWhy,
    decisionValueHurt,
    patternAObstruction: false,
    failure,
    note: spokenGeneric
      ? `kind=${surface.kind}; generic spoken without next-period Decision Value gap`
      : `kind=${surface.kind}; spoken names a concrete proof`,
  };
}
