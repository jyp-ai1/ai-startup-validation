/**
 * Reproducibility referee for spoken_generic_after_promotion.
 * Not imported by analyzer or presenter. Not a persist SoT.
 */

export type ReproScore = 'REPRO' | 'ABSENT' | 'CONTROL';

export type ReproActual = {
  kind: string;
  verdictId: string;
  stageId: string;
  criticalUnknown: string;
  validationPriority: string;
  questionText: string;
  whyAsking: string;
};

const GENERIC_SPOKEN = /실제 행동 증거가 필요합니다/;
const NEXT_PERIOD_CU = /다음 고객|다음 기간/;

export function isPromoted(actual: ReproActual): boolean {
  return (
    actual.stageId === 'S3' ||
    actual.stageId === 'S4' ||
    actual.verdictId === 'viable' ||
    actual.verdictId === 'conditionally_viable'
  );
}

export function classifySpokenGeneric(actual: ReproActual): {
  score: ReproScore;
  spokenGeneric: boolean;
  nextPeriodCu: boolean;
  note: string;
} {
  const spokenGeneric = GENERIC_SPOKEN.test(actual.questionText);
  const nextPeriodCu = NEXT_PERIOD_CU.test(actual.criticalUnknown);
  const promoted = isPromoted(actual);
  if (spokenGeneric && nextPeriodCu && promoted) {
    return {
      score: 'REPRO',
      spokenGeneric,
      nextPeriodCu,
      note: `kind=${actual.kind}; CU is next-period but spoken question is generic`,
    };
  }
  return {
    score: nextPeriodCu || promoted ? 'ABSENT' : 'CONTROL',
    spokenGeneric,
    nextPeriodCu,
    note: spokenGeneric
      ? `kind=${actual.kind}; generic ask without next-period CU`
      : `kind=${actual.kind}; spoken question names a concrete proof`,
  };
}
