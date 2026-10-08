/**
 * Founder Decision Value Accuracy Batch — measure only.
 * Not imported by the analyzer or presenter. Not a persist SoT.
 *
 * Axes from the CPO work order:
 * Judgment · CU · DCE · Question Alignment · Founder Decision Value
 */

export type DvScore = 'PASS' | 'PARTIAL' | 'FAIL';

export type AxisId = 'judgment' | 'cu' | 'dce' | 'questionAlignment' | 'decisionValue';

export type ValidationAxis =
  | 'next_period'
  | 'repeat_loop'
  | 'paid_conversion'
  | 'resale'
  | 'payer_split'
  | 'payer_job'
  | 'segment'
  | 'generic'
  | 'other';

export type DvActual = {
  verdictId: string;
  stageId: string;
  judgment: string;
  whyPossible: string;
  whyFail: string;
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  questionText: string;
  whyAsking: string;
  evidenceClass: string | null;
  evidenceStrengthDelta: string | null;
};

export type AxisScore = {
  id: AxisId;
  score: DvScore;
  note: string;
};

function leak(text: string): boolean {
  return /targetGap|gapId|gapTarget|internalId|\bscore\b/i.test(text);
}

export function isGenericSpoken(text: string): boolean {
  return /실제 행동 증거가 필요합니다/.test(text);
}

export function validationAxis(text: string): ValidationAxis {
  if (/실제 행동 증거가 필요합니다/.test(text)) return 'generic';
  if (/다음 고객|다음 기간/.test(text)) return 'next_period';
  if (/재판매|C2C/.test(text)) return 'resale';
  if (/직무|Job-to-be-done/i.test(text)) return 'payer_job';
  if (/쓰는 사람|돈을 내는 사람|결제자가 분리/.test(text)) return 'payer_split';
  if (/세그먼트|고객 그룹/.test(text)) return 'segment';
  if (/반복 가능|두 번째|재구매|반복 사용|반복되는|관광 수요/.test(text)) return 'repeat_loop';
  if (/지불만|줄었는가|유료 파일럿|전후|누락|반품|no-show|노쇼|부하|미스매치|불일치/.test(text)) {
    return 'paid_conversion';
  }
  return 'other';
}

export function chainAxes(actual: DvActual) {
  return {
    cu: validationAxis(actual.criticalUnknown),
    dce: validationAxis(actual.decisionChangingEvidence),
    priority: validationAxis(actual.validationPriority),
    whyAsking: validationAxis(actual.whyAsking),
    spoken: validationAxis(actual.questionText),
  };
}

function sameAxis(left: ValidationAxis, right: ValidationAxis): boolean {
  return left === right && left !== 'other' && left !== 'generic';
}

function chainAligned(actual: DvActual): boolean {
  const axes = chainAxes(actual);
  return (
    sameAxis(axes.cu, axes.dce) &&
    sameAxis(axes.cu, axes.priority) &&
    sameAxis(axes.cu, axes.whyAsking) &&
    sameAxis(axes.cu, axes.spoken)
  );
}

export function scoreScenario(input: {
  stake?: string;
  t0: DvActual;
  promoted?: DvActual;
}): {
  axes: AxisScore[];
  overall: DvScore;
  genericAfterPromotion: boolean;
  founderDecisionValue: DvScore;
} {
  const { t0, promoted } = input;
  const surface = [
    t0.judgment,
    t0.criticalUnknown,
    t0.decisionChangingEvidence,
    t0.validationPriority,
    t0.questionText,
    promoted?.judgment,
    promoted?.criticalUnknown,
    promoted?.questionText,
  ]
    .filter(Boolean)
    .join('\n');

  const t0Readable = t0.judgment.startsWith('현재 판단:') && t0.criticalUnknown.length > 12;
  const t0Deferred = t0.verdictId === 'judgment_deferred' || t0.stageId === 'S1' || t0.stageId === 'S0';
  const promotedMoved = promoted
    ? promoted.verdictId !== 'judgment_deferred' && promoted.stageId !== t0.stageId
    : true;
  const judgment: AxisScore = {
    id: 'judgment',
    score: leak(surface) ? 'FAIL' : t0Readable && (!promoted || promotedMoved || promoted.verdictId !== t0.verdictId)
      ? 'PASS'
      : t0Readable
        ? 'PARTIAL'
        : 'FAIL',
    note: promoted
      ? `${t0.verdictId}/${t0.stageId} → ${promoted.verdictId}/${promoted.stageId}`
      : `${t0.verdictId}/${t0.stageId}`,
  };
  if (!promoted && t0Readable && !leak(surface)) {
    judgment.score = t0Deferred || t0.judgment.startsWith('현재 판단:') ? 'PASS' : 'FAIL';
  }

  const t0CuClear = t0.criticalUnknown.length > 12 && validationAxis(t0.criticalUnknown) !== 'generic';
  const cuMoved = promoted
    ? validationAxis(promoted.criticalUnknown) !== validationAxis(t0.criticalUnknown)
    : true;
  const cu: AxisScore = {
    id: 'cu',
    score: !t0CuClear
      ? 'FAIL'
      : promoted && !cuMoved
        ? 'FAIL'
        : 'PASS',
    note: promoted
      ? `${validationAxis(t0.criticalUnknown)} → ${validationAxis(promoted.criticalUnknown)}`
      : validationAxis(t0.criticalUnknown),
  };

  const dceMoves =
    /올리|내리|유지/.test(t0.decisionChangingEvidence) &&
    (!promoted || /올리|내리|유지/.test(promoted.decisionChangingEvidence));
  const dceFollowsCu = promoted
    ? sameAxis(validationAxis(promoted.criticalUnknown), validationAxis(promoted.decisionChangingEvidence))
    : sameAxis(validationAxis(t0.criticalUnknown), validationAxis(t0.decisionChangingEvidence));
  const dce: AxisScore = {
    id: 'dce',
    score: dceMoves && dceFollowsCu ? 'PASS' : dceMoves ? 'PARTIAL' : 'FAIL',
    note: promoted
      ? validationAxis(promoted.decisionChangingEvidence)
      : validationAxis(t0.decisionChangingEvidence),
  };

  const target = promoted ?? t0;
  const genericAfterPromotion = Boolean(promoted && isGenericSpoken(promoted.questionText));
  const spokenMatchesCu = sameAxis(validationAxis(target.criticalUnknown), validationAxis(target.questionText));
  const whyMatchesSpoken = sameAxis(validationAxis(target.whyAsking), validationAxis(target.questionText));
  const closedAxisReturn = Boolean(
    promoted &&
      validationAxis(promoted.questionText) === validationAxis(t0.criticalUnknown) &&
      validationAxis(promoted.criticalUnknown) !== validationAxis(t0.criticalUnknown),
  );
  let questionScore: DvScore = 'PASS';
  let questionNote = 'whyAsking and spoken bind the current CU';
  if (genericAfterPromotion || closedAxisReturn || !spokenMatchesCu) {
    questionScore = 'FAIL';
    questionNote = genericAfterPromotion
      ? 'spoken retreated to generic after promotion'
      : closedAxisReturn
        ? 'spoken returned to the closed t0 axis'
        : `spoken ${validationAxis(target.questionText)} ≠ CU ${validationAxis(target.criticalUnknown)}`;
  } else if (!whyMatchesSpoken) {
    questionScore = 'PARTIAL';
    questionNote = `whyAsking ${validationAxis(target.whyAsking)} / spoken ${validationAxis(target.questionText)}`;
  }
  const questionAlignment: AxisScore = {
    id: 'questionAlignment',
    score: questionScore,
    note: questionNote,
  };

  const founderHearsNext = spokenMatchesCu && !isGenericSpoken(target.questionText) && target.questionText.length > 20;
  const aligned = chainAligned(target);
  let decisionScore: DvScore = 'PASS';
  let decisionNote = 'Founder can hear what to check from the question';
  if (!founderHearsNext || closedAxisReturn || genericAfterPromotion) {
    decisionScore = 'FAIL';
    decisionNote = genericAfterPromotion
      ? 'generic-after-promotion'
      : closedAxisReturn
        ? 'spoken asks a closed axis'
        : 'Founder cannot tell what to check now';
  } else if (!aligned) {
    decisionScore = 'PARTIAL';
    decisionNote = 'CU is clear; spoken is weaker than the full chain';
  }
  const decisionValue: AxisScore = {
    id: 'decisionValue',
    score: decisionScore,
    note: decisionNote,
  };

  const axes = [judgment, cu, dce, questionAlignment, decisionValue];
  const overall = axes.some((axis) => axis.score === 'FAIL')
    ? 'FAIL'
    : axes.some((axis) => axis.score === 'PARTIAL')
      ? 'PARTIAL'
      : 'PASS';

  return {
    axes,
    overall,
    genericAfterPromotion,
    founderDecisionValue: decisionScore,
  };
}
