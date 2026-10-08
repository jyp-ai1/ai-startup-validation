/**
 * CPO 2-pass referee for the Decision Value Accuracy Batch.
 * Independent of the Accuracy Batch referee. Not imported by the engine.
 *
 * Pass 1 Accuracy — does the live chain match the recorded evidence?
 * Pass 2 Strategy — does Founder Decision Value actually improve, on one principle?
 */

export type PassScore = 'PASS' | 'PARTIAL' | 'FAIL';

export type LiveChain = {
  verdictId: string;
  stageId: string;
  judgment: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  whyAsking: string;
  questionText: string;
};

export function genericSpoken(text: string): boolean {
  return /실제 행동 증거가 필요합니다/.test(text);
}

export function namesNextPeriod(text: string): boolean {
  return /다음 고객|다음 기간/.test(text);
}

export function namesRepeat(text: string): boolean {
  return /두 번째|재구매|반복|재판매|계약/.test(text);
}

export function namesResale(text: string): boolean {
  return /재판매|C2C/.test(text);
}

export function scoreAccuracy(input: {
  stake?: string;
  t0: LiveChain;
  promoted?: LiveChain;
}): { score: PassScore; notes: string[] } {
  const notes: string[] = [];
  const { t0, promoted, stake } = input;

  if (!t0.judgment.startsWith('현재 판단:')) notes.push('t0 judgment unread');
  if (t0.criticalUnknown.length < 12) notes.push('t0 CU empty');
  if (stake && !new RegExp(stake.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(t0.criticalUnknown + t0.questionText)) {
    notes.push(`t0 does not name stake ${stake}`);
  }

  if (promoted) {
    if (promoted.criticalUnknown === t0.criticalUnknown) notes.push('CU did not move after DCE');
    if (genericSpoken(promoted.questionText)) notes.push('generic-after-promotion');
    if (namesNextPeriod(promoted.criticalUnknown)) {
      if (!namesNextPeriod(promoted.questionText)) notes.push('spoken missing next-period CU');
      if (!namesNextPeriod(promoted.whyAsking)) notes.push('whyAsking missing next-period CU');
      if (!namesNextPeriod(promoted.validationPriority)) notes.push('priority missing next-period CU');
    }
    if (namesRepeat(promoted.criticalUnknown) && !namesNextPeriod(promoted.criticalUnknown)) {
      if (!namesRepeat(promoted.questionText)) notes.push('spoken missing repeat CU');
      if (!namesRepeat(promoted.whyAsking)) notes.push('whyAsking missing repeat CU');
    }
  } else if (namesResale(t0.criticalUnknown) && !namesResale(t0.questionText)) {
    notes.push('resale CU not in spoken');
  }

  const fail = notes.some((note) =>
    /generic-after-promotion|CU did not move|spoken missing|whyAsking missing/.test(note),
  );
  if (fail) return { score: 'FAIL', notes };
  if (notes.length) return { score: 'PARTIAL', notes };
  return { score: 'PASS', notes: ['live chain matches the Accuracy Batch record'] };
}

export function scoreStrategy(input: {
  t0: LiveChain;
  promoted?: LiveChain;
}): { score: PassScore; notes: string[] } {
  const target = input.promoted ?? input.t0;
  const notes: string[] = [];
  if (genericSpoken(target.questionText)) notes.push('Founder hears a generic ask');
  if (namesNextPeriod(target.criticalUnknown) && namesResale(target.questionText) && !namesResale(target.criticalUnknown)) {
    notes.push('AI PM asks resale while CU is next-period');
  }
  if (target.questionText.length < 20) notes.push('spoken too short to act on');
  if (
    namesNextPeriod(target.criticalUnknown) &&
    namesNextPeriod(target.questionText) &&
    namesNextPeriod(target.whyAsking)
  ) {
    notes.push('Founder can check next-period held outcome from the question');
  } else if (namesRepeat(target.criticalUnknown) && namesRepeat(target.questionText)) {
    notes.push('Founder can check the repeat proof from the question');
  } else if (namesResale(target.criticalUnknown) && namesResale(target.questionText)) {
    notes.push('Founder can check resale proof from the question');
  }

  const fail = notes.some((note) => /generic ask|asks resale while|too short/.test(note));
  if (fail) return { score: 'FAIL', notes };
  return { score: 'PASS', notes };
}
