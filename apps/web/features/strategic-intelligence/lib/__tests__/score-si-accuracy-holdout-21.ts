/**
 * Twenty-first holdout Accuracy Batch referee. Measure only.
 * Not imported by analyzer, presenter, classifier, or persist SoT.
 */

export type Score = 'PASS' | 'PARTIAL' | 'FAIL';

export type AxisId = 'judgment' | 'evidence' | 'cu' | 'questionAlignment' | 'decisionValue';

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
  | 'none';

export type SceneId =
  | 't0'
  | 'thin'
  | 'rich'
  | 'plan'
  | 'full'
  | 'partial'
  | 'worse'
  | 'deny'
  | 'conflict'
  | 'repeat_zero'
  | 'repeat_ok'
  | 'wrong_axis'
  | 'repeat_answer'
  | 'vague'
  | 'hype';

export type Snap = {
  verdictId: string;
  stageId: string;
  judgment: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  whyAsking: string;
  questionText: string;
  evidenceClass: string | null;
};

export type AxisScore = { id: AxisId; score: Score; note: string };

function leak(text: string): boolean {
  return /targetGap|gapId|gapTarget|internalId|\bscore\b/i.test(text);
}

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
  if (/지불만|줄었는가|유료 파일럿|전후|누락|반품|no-show|노쇼|부하|미스매치|불일치/.test(text)) {
    return 'paid_conversion';
  }
  return 'other';
}

function promoted(snap: Snap): boolean {
  return snap.verdictId === 'viable' || snap.stageId === 'S3' || snap.stageId === 'S4';
}

function leftoverPositive(snap: Snap): boolean {
  return (
    /가능성이 높음/.test(snap.judgment) &&
    (snap.verdictId === 'judgment_deferred' || snap.verdictId === 'insufficient_basis')
  );
}

export function scoreScene(input: {
  scene: SceneId;
  stake: string;
  t0?: Snap;
  snap: Snap;
}): { axes: AxisScore[]; overall: Score; failureType: FailureType } {
  const { scene, snap, t0 } = input;
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
  } else if (scene === 'plan' && promoted(snap) && t0 && !promoted(t0)) {
    judgment = 'FAIL';
    failures.push('over_promote_on_plan');
    judgmentNote = 'plan/intent promoted';
  } else if (scene === 'hype' && snap.verdictId === 'viable' && snap.stageId === 'S4') {
    judgment = 'FAIL';
    failures.push('over_promote_on_hype');
    judgmentNote = 'hype reached S4';
  } else if (scene === 'vague' && promoted(snap) && snap.evidenceClass !== 'VALIDATED') {
    judgment = 'PARTIAL';
    judgmentNote = 'vague answer still promoted';
  }

  let evidence: Score = 'PASS';
  let evidenceNote = snap.evidenceClass ?? 'none';
  if (scene === 'plan' && snap.evidenceClass === 'VALIDATED') {
    evidence = 'FAIL';
    failures.push('validated_on_intent');
    evidenceNote = 'intent classified VALIDATED';
  } else if (scene === 'partial' && promoted(snap) && /지불만|줄었는가/.test(t0?.criticalUnknown ?? snap.criticalUnknown)) {
    evidence = 'FAIL';
    failures.push('over_promote_on_partial');
    evidenceNote = 'payment-only promoted a stake CU';
  } else if ((scene === 'worse' || scene === 'deny' || scene === 'conflict' || scene === 'repeat_zero') && t0) {
    const dropped =
      snap.verdictId !== 'viable' ||
      snap.stageId < t0.stageId ||
      /보류|조건부/.test(snap.judgment) ||
      snap.evidenceClass === 'CONFLICT';
    if (!dropped && t0.verdictId === 'viable') {
      evidence = 'PARTIAL';
      failures.push('missed_downgrade');
      evidenceNote = 'negative/conflict did not clearly move the headline';
    }
  }

  let cu: Score = 'PASS';
  let cuNote = axisOf(snap.criticalUnknown);
  if (snap.criticalUnknown.length < 12) {
    cu = 'FAIL';
    cuNote = 'empty CU';
  } else if (scene === 'full' && t0 && snap.criticalUnknown === t0.criticalUnknown && promoted(snap)) {
    cu = 'FAIL';
    failures.push('stale_cu');
    cuNote = 'CU unchanged after DCE fulfillment';
  } else if (scene === 'repeat_ok' && axisOf(snap.criticalUnknown) === 'next_period') {
    cu = 'FAIL';
    failures.push('closed_cu_reopened');
    cuNote = 'repeat answer reopened next-period CU';
  }

  const cuAxis = axisOf(snap.criticalUnknown);
  const spokenAxis = axisOf(snap.questionText);
  const whyAxis = axisOf(snap.whyAsking);
  const dceAxis = axisOf(snap.decisionChangingEvidence);
  const genericPromo = scene === 'full' && isGenericSpoken(snap.questionText);
  let question: Score = 'PASS';
  let questionNote = 'spoken binds CU';
  if (genericPromo) {
    question = 'FAIL';
    failures.push('generic_after_promotion');
    questionNote = 'generic-after-promotion';
  } else if (cuAxis === 'next_period' && spokenAxis === 'resale') {
    question = 'FAIL';
    failures.push('axis_drift');
    questionNote = 'spoken asks resale on next-period CU';
  } else if (cuAxis !== 'other' && spokenAxis !== 'generic' && cuAxis !== spokenAxis && spokenAxis !== 'other') {
    question = 'PARTIAL';
    questionNote = `spoken ${spokenAxis} / CU ${cuAxis}`;
  } else if (whyAxis !== spokenAxis && whyAxis !== 'other' && spokenAxis !== 'other') {
    question = 'PARTIAL';
    questionNote = `whyAsking ${whyAxis} / spoken ${spokenAxis}`;
  }

  let decision: Score = 'PASS';
  let decisionNote = 'Founder can hear the next proof';
  if (genericPromo || question === 'FAIL' || judgment === 'FAIL') {
    decision = 'FAIL';
    decisionNote = questionNote;
  } else if (question === 'PARTIAL' || evidence === 'PARTIAL' || cu === 'PARTIAL') {
    decision = 'PARTIAL';
    decisionNote = 'chain is readable; one layer is weaker';
  } else if (dceAxis !== cuAxis && dceAxis !== 'other' && cuAxis !== 'other') {
    decision = 'PARTIAL';
    decisionNote = `DCE ${dceAxis} / CU ${cuAxis}`;
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
