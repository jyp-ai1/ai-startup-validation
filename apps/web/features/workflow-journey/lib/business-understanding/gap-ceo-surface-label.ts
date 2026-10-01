import type { GapCompleteness } from '@repo/types/domain/answer-review';

/** Track B — CEO-facing gap status (V3 `GapCompleteness` unchanged internally). */
export type GapCeoSurfaceKind =
  | 'MISSING'
  | 'AMBIGUOUS'
  | 'UNVERIFIED'
  | 'CONFLICT'
  | 'SUFFICIENT';

export function gapCeoSurfaceKind(completeness: GapCompleteness): GapCeoSurfaceKind {
  switch (completeness) {
    case 'CLOSED':
      return 'SUFFICIENT';
    case 'PARTIAL':
      return 'UNVERIFIED';
    case 'CONTRADICTED':
      return 'CONFLICT';
    case 'OPEN':
    default:
      return 'MISSING';
  }
}

export function gapCeoSurfaceLabel(kind: GapCeoSurfaceKind): string {
  switch (kind) {
    case 'MISSING':
      return '아직 확인되지 않음';
    case 'AMBIGUOUS':
      return '표현이 불명확함';
    case 'UNVERIFIED':
      return '가설은 있으나 검증 필요';
    case 'CONFLICT':
      return '서로 다른 설명이 충돌함';
    case 'SUFFICIENT':
      return '현재 판단에 충분함';
  }
}

/** Map hedge / partial answers to AMBIGUOUS for display when completeness is OPEN. */
export function gapCeoSurfaceFromAnswer(input: {
  completeness: GapCompleteness;
  answerLooksAmbiguous?: boolean;
}): GapCeoSurfaceKind {
  if (input.completeness === 'OPEN' && input.answerLooksAmbiguous) {
    return 'AMBIGUOUS';
  }
  return gapCeoSurfaceKind(input.completeness);
}
