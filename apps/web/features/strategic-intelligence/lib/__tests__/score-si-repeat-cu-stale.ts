/**
 * After next-period held, CU = 반복 가능.
 * Measure whether answering the spoken question retires that CU.
 * Not imported by the analyzer or presenter.
 */

export type BatchScore = 'PASS' | 'PARTIAL' | 'FAIL';

export type Snap = {
  verdictId: string;
  stageId: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  whyAsking: string;
  questionText: string;
  evidenceClass: string | null;
};

export function isGenericSpoken(text: string): boolean {
  return /실제 행동 증거가 필요합니다/.test(text);
}

export function isRepeatCu(text: string): boolean {
  return /반복 가능/.test(text);
}

export function isNextPeriodCu(text: string): boolean {
  return /다음 고객|다음 기간/.test(text);
}

export function spokenAsksRepeat(text: string): boolean {
  return /두 번째|재구매|반복 사용|재판매|계약/.test(text);
}

export function retiredRepeatCu(before: Snap, after: Snap): boolean {
  return isRepeatCu(before.criticalUnknown) && !isRepeatCu(after.criticalUnknown);
}

export function sameSpoken(before: Snap, after: Snap): boolean {
  return before.questionText === after.questionText;
}

export function scoreAnsweredSpoken(before: Snap, after: Snap): {
  score: BatchScore;
  note: string;
} {
  if (isGenericSpoken(before.questionText)) {
    return { score: 'FAIL', note: 'spoken is generic before the Founder answers' };
  }
  if (!isRepeatCu(before.criticalUnknown) || !spokenAsksRepeat(before.questionText)) {
    return { score: 'FAIL', note: 'held did not land on a repeat CU/spoken pair' };
  }
  if (after.stageId === 'S4' && !/재판매|C2C/.test(before.criticalUnknown) && /재판매/.test(after.criticalUnknown)) {
    return { score: 'FAIL', note: 'answering spoken jumped to a resale thesis' };
  }
  if (retiredRepeatCu(before, after) && isNextPeriodCu(after.criticalUnknown)) {
    return { score: 'FAIL', note: 'repeat CU retired back to the closed next-period axis' };
  }
  if (retiredRepeatCu(before, after)) {
    return { score: 'PASS', note: `${before.stageId}→${after.stageId}; CU moved off 반복 가능` };
  }
  if (isRepeatCu(after.criticalUnknown) && sameSpoken(before, after)) {
    return {
      score: 'PARTIAL',
      note: 'Founder answered the spoken question; CU and question stayed. Verdict honest.',
    };
  }
  return { score: 'PARTIAL', note: `${before.stageId}→${after.stageId}; CU still 반복 가능` };
}
