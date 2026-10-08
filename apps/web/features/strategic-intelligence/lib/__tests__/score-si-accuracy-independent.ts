/**
 * Independent Accuracy Batch referee.
 * Not imported by analyzer, presenter, classifier, or persist SoT.
 * Scores actual engine output on unseen businesses — does not copy prior dumps.
 */

export type Score = 'PASS' | 'PARTIAL' | 'FAIL';

export type AxisId =
  | 'judgment'
  | 'evidence'
  | 'cu'
  | 'questionAlignment'
  | 'decisionValue';

export type FailureType =
  | 'over_promote_on_plan'
  | 'over_promote_on_partial'
  | 'over_promote_on_hype'
  | 'validated_on_intent'
  | 'generic_after_promotion'
  | 'stale_cu'
  | 'missed_downgrade'
  | 'leftover_positive'
  | 'axis_drift'
  | 'closed_cu_reopened'
  | 'one_shot_as_repeat'
  | 'revenue_as_viability'
  | 'unread_judgment'
  | 'stake_blind_overfit'
  | 'none';

export type SceneId =
  | 'normal'
  | 'plan_intent'
  | 'partial'
  | 'full'
  | 'negative'
  | 'conflict'
  | 'revenue_no_repeat'
  | 'wrong_axis'
  | 'closed_reask';

export type Snap = {
  verdictId: string;
  stageId: string;
  judgment: string;
  whyPossible: string;
  whyFail: string;
  strengths: string[];
  risks: string[];
  evidenceClasses: string[];
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  whyAsking: string;
  questionText: string;
  askKind: string;
  evidenceClass: string | null;
};

export type AxisScore = { id: AxisId; score: Score; note: string };

export function isGenericSpoken(text: string): boolean {
  return /실제 행동 증거가 필요합니다/.test(text);
}

export function axisOf(text: string): string {
  if (/실제 행동 증거가 필요합니다/.test(text)) return 'generic';
  if (/다음 고객|다음 기간/.test(text)) return 'next_period';
  if (/재판매|C2C/.test(text)) return 'resale';
  if (/직무|Job-to-be-done/i.test(text)) return 'payer_job';
  if (/쓰는 사람|돈을 내는 사람|결제자가 분리/.test(text)) return 'payer_split';
  if (/반복 가능|두 번째|재구매|반복 사용|관광 수요/.test(text)) return 'repeat_loop';
  if (/지불만|줄었는가|유료 파일럿|전후|누락|반품|no-show|노쇼|부하|미스매치|불일치|유료 제안/.test(text)) {
    return 'paid_conversion';
  }
  return 'other';
}

function leak(text: string): boolean {
  return /targetGap|gapId|gapTarget|internalId|\bscore\b/i.test(text);
}

function promoted(snap: Snap): boolean {
  return snap.verdictId === 'viable' || snap.stageId === 'S3' || snap.stageId === 'S4';
}

const VERDICT_RANK: Record<string, number> = {
  insufficient_basis: 0,
  judgment_deferred: 1,
  conditionally_viable: 2,
  viable: 3,
};

function leftoverPositive(snap: Snap): boolean {
  const headlineUp =
    /가능성이 높음/.test(snap.judgment) &&
    (snap.verdictId === 'judgment_deferred' || snap.verdictId === 'insufficient_basis');
  const contradict =
    /판매·매출 증거가 있다/.test(snap.judgment) && /상업 실행 증거가 없다/.test(snap.judgment);
  return headlineUp || contradict;
}

function clearlyDropped(snap: Snap, t0: Snap): boolean {
  return (
    (VERDICT_RANK[snap.verdictId] ?? 0) < (VERDICT_RANK[t0.verdictId] ?? 0) ||
    snap.stageId < t0.stageId ||
    snap.evidenceClass === 'CONFLICT'
  );
}

function clearlyPromotedFrom(snap: Snap, t0: Snap): boolean {
  return (VERDICT_RANK[snap.verdictId] ?? 0) > (VERDICT_RANK[t0.verdictId] ?? 0) || snap.stageId > t0.stageId;
}

function mentionsStake(text: string, stake: string): boolean {
  return stake.length > 0 && text.includes(stake);
}

export function scoreScene(input: {
  scene: SceneId;
  stake: string;
  knownStakeNoun: boolean;
  t0?: Snap;
  snap: Snap;
}): { axes: AxisScore[]; overall: Score; failureType: FailureType } {
  const { scene, snap, t0, stake, knownStakeNoun } = input;
  const failures: FailureType[] = [];
  const surface = `${snap.judgment}\n${snap.criticalUnknown}\n${snap.questionText}`;

  let judgment: Score = 'PASS';
  let judgmentNote = `${snap.verdictId}/${snap.stageId}`;
  if (leak(surface) || !snap.judgment.startsWith('현재 판단:')) {
    judgment = 'FAIL';
    failures.push('unread_judgment');
    judgmentNote = 'unread or leaked';
  } else if (leftoverPositive(snap)) {
    judgment = 'FAIL';
    failures.push('leftover_positive');
    judgmentNote = 'positive headline on deferred verdict';
  } else if (scene === 'plan_intent' && promoted(snap) && t0 && !promoted(t0)) {
    judgment = 'FAIL';
    failures.push('over_promote_on_plan');
    judgmentNote = 'plan/intent promoted';
  } else if (scene === 'partial' && promoted(snap)) {
    judgment = 'FAIL';
    failures.push('over_promote_on_partial');
    judgmentNote = 'payment-only promoted off deferred';
  } else if (scene === 'wrong_axis' && t0 && clearlyPromotedFrom(snap, t0)) {
    judgment = 'FAIL';
    failures.push('axis_drift');
    judgmentNote = 'wrong-axis resale promoted the verdict';
  } else if (scene === 'revenue_no_repeat' && snap.verdictId === 'viable' && snap.stageId === 'S4') {
    judgment = 'FAIL';
    failures.push('revenue_as_viability');
    judgmentNote = 'revenue without repeat treated as S4 viable';
  } else if (
    !knownStakeNoun &&
    (scene === 'partial' || scene === 'full') &&
    snap.verdictId === 'viable' &&
    !mentionsStake(snap.criticalUnknown, stake)
  ) {
    judgment = 'FAIL';
    failures.push('stake_blind_overfit');
    judgmentNote = 'unseen stake noun ignored; payment promoted viability';
  }

  let evidence: Score = 'PASS';
  let evidenceNote = snap.evidenceClass ?? 'none';
  if (scene === 'plan_intent' && snap.evidenceClass === 'VALIDATED') {
    evidence = 'FAIL';
    failures.push('validated_on_intent');
    evidenceNote = 'intent classified VALIDATED';
  } else if (scene === 'partial' && snap.evidenceClass === 'VALIDATED' && promoted(snap)) {
    evidence = 'FAIL';
    failures.push('over_promote_on_partial');
    evidenceNote = 'payment-only VALIDATED and promoted';
  } else if ((scene === 'negative' || scene === 'conflict' || scene === 'revenue_no_repeat') && t0) {
    const dropped = clearlyDropped(snap, t0);
    if (!dropped && promoted(t0) && scene !== 'revenue_no_repeat') {
      evidence = 'FAIL';
      failures.push('missed_downgrade');
      evidenceNote = 'negative/conflict left the prior promoted headline in place';
    }
  } else if (scene === 'wrong_axis' && t0 && clearlyPromotedFrom(snap, t0)) {
    evidence = 'FAIL';
    failures.push('axis_drift');
    evidenceNote = 'C2C resale counts treated as decision-changing for a non-resale CU';
  }

  let cu: Score = 'PASS';
  let cuNote = axisOf(snap.criticalUnknown);
  if (snap.criticalUnknown.length < 12) {
    cu = 'FAIL';
    cuNote = 'empty CU';
  } else if (scene === 'full' && t0 && snap.criticalUnknown === t0.criticalUnknown && promoted(snap)) {
    cu = 'FAIL';
    failures.push('stale_cu');
    cuNote = 'CU unchanged after claimed DCE fulfillment';
  } else if (scene === 'closed_reask' && axisOf(snap.criticalUnknown) === 'next_period') {
    cu = 'FAIL';
    failures.push('closed_cu_reopened');
    cuNote = 'CLOSED next-period CU reopened on repeat answer';
  } else if (scene === 'wrong_axis' && t0 && axisOf(snap.criticalUnknown) === 'resale') {
    cu = 'FAIL';
    failures.push('axis_drift');
    cuNote = 'wrong-axis resale closed or replaced the live CU';
  } else if (scene === 'revenue_no_repeat' && axisOf(snap.criticalUnknown) !== 'repeat_loop' && axisOf(snap.criticalUnknown) !== 'other') {
    if (axisOf(snap.criticalUnknown) === 'next_period') {
      cu = 'PARTIAL';
      cuNote = 'revenue-without-repeat still on next-period, not repeat_loop';
    }
  } else if (!knownStakeNoun && scene === 'normal' && !mentionsStake(snap.criticalUnknown, stake)) {
    cu = 'PARTIAL';
    cuNote = `CU omits unseen stake "${stake}"`;
    failures.push('stake_blind_overfit');
  }

  const cuAxis = axisOf(snap.criticalUnknown);
  const spokenAxis = axisOf(snap.questionText);
  const whyAxis = axisOf(snap.whyAsking);
  const dceAxis = axisOf(snap.decisionChangingEvidence);
  const genericPromo = scene === 'full' && isGenericSpoken(snap.questionText);
  let question: Score = 'PASS';
  let questionNote = `spoken ${spokenAxis} / CU ${cuAxis} / kind ${snap.askKind}`;
  if (genericPromo) {
    question = 'FAIL';
    failures.push('generic_after_promotion');
    questionNote = 'generic-after-promotion';
  } else if (cuAxis === 'next_period' && spokenAxis === 'resale') {
    question = 'FAIL';
    failures.push('axis_drift');
    questionNote = 'spoken asks resale on next-period CU';
  } else if (scene === 'wrong_axis' && spokenAxis === 'resale' && cuAxis !== 'resale') {
    question = 'FAIL';
    failures.push('axis_drift');
    questionNote = 'wrong-axis answer steered the spoken question to resale';
  } else if (cuAxis !== 'other' && spokenAxis !== 'generic' && cuAxis !== spokenAxis && spokenAxis !== 'other') {
    question = 'PARTIAL';
    questionNote = `spoken ${spokenAxis} / CU ${cuAxis}`;
  } else if (whyAxis !== spokenAxis && whyAxis !== 'other' && spokenAxis !== 'other') {
    question = 'PARTIAL';
    questionNote = `whyAsking ${whyAxis} / spoken ${spokenAxis}`;
  }

  let decision: Score = 'PASS';
  let decisionNote = 'Founder can hear why this judgment and what to prove next';
  const readable =
    snap.judgment.startsWith('현재 판단:') &&
    snap.criticalUnknown.length >= 12 &&
    snap.questionText.length >= 12 &&
    snap.whyAsking.length >= 12;
  if (!readable || genericPromo || question === 'FAIL' || judgment === 'FAIL') {
    decision = 'FAIL';
    decisionNote = judgment === 'FAIL' ? judgmentNote : questionNote;
  } else if (question === 'PARTIAL' || evidence === 'PARTIAL' || cu === 'PARTIAL') {
    decision = 'PARTIAL';
    decisionNote = 'chain is readable; one layer is weaker';
  } else if (dceAxis !== cuAxis && dceAxis !== 'other' && cuAxis !== 'other') {
    decision = 'PARTIAL';
    decisionNote = `DCE ${dceAxis} / CU ${cuAxis}`;
  } else if (!knownStakeNoun && scene === 'normal' && !mentionsStake(`${snap.questionText}\n${snap.criticalUnknown}`, stake)) {
    decision = 'PARTIAL';
    decisionNote = `Founder of ${stake} business cannot hear that metric in CU or question`;
  }

  const axes: AxisScore[] = [
    { id: 'judgment', score: judgment, note: judgmentNote },
    { id: 'evidence', score: evidence, note: evidenceNote },
    { id: 'cu', score: cu, note: cuNote },
    { id: 'questionAlignment', score: question, note: questionNote },
    { id: 'decisionValue', score: decision, note: decisionNote },
  ];
  const overall = axes.some((axis) => axis.score === 'FAIL')
    ? 'FAIL'
    : axes.some((axis) => axis.score === 'PARTIAL')
      ? 'PARTIAL'
      : 'PASS';
  return { axes, overall, failureType: failures[0] ?? 'none' };
}
