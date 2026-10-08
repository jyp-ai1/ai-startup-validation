/**
 * Founder Decision Value referee on Production after spoken-generic fix.
 * Not imported by the analyzer or presenter. Not a persist SoT.
 *
 * Layer 1 Accuracy — did the state update honestly?
 * Layer 2 Judgment — did the verdict/stage move for the right reason?
 * Layer 3 Validation — does the spoken question seek the current DCE?
 * Layer 4 Decision Value — can a Founder tell what to check now?
 * Layer 5 Strategy — S.I. judges; AI PM executes the current CU, not another axis.
 */

export type DvScore = 'PASS' | 'PARTIAL' | 'FAIL';

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

export type DvLayer = {
  id: 'accuracy' | 'judgment' | 'validation' | 'decisionValue' | 'strategy';
  score: DvScore;
  note: string;
};

function rollup(scores: DvScore[]): DvScore {
  if (scores.includes('FAIL')) return 'FAIL';
  if (scores.includes('PARTIAL')) return 'PARTIAL';
  return 'PASS';
}

function leak(text: string): boolean {
  return /targetGap|gapId|gapTarget|internalId|\bscore\b/i.test(text);
}

function spokenSeeksCu(actual: DvActual): boolean {
  const cu = actual.criticalUnknown;
  const ask = actual.questionText;
  if (/다음 고객|다음 기간/.test(cu)) {
    return /다음 고객|다음 기간|같은 성과|유지/.test(ask);
  }
  if (/재판매|C2C/.test(cu)) {
    return /재판매|재구매|두 번째/.test(ask);
  }
  if (/지불만|줄었는가|유료 전환/.test(cu)) {
    return /전후|줄였|결제|유료/.test(ask);
  }
  if (/세그먼트/.test(cu)) {
    return /고객 그룹|세그먼트|쓰거나 돈을/.test(ask);
  }
  if (/반복 가능/.test(cu)) {
    return /두 번째|재구매|반복|재판매|계약/.test(ask);
  }
  return ask.length > 12;
}

function axisDrift(actual: DvActual): boolean {
  const cu = actual.criticalUnknown;
  const ask = actual.questionText;
  if (/다음 고객|다음 기간/.test(cu) && /재판매/.test(ask) && !/재판매|C2C/.test(cu)) {
    return true;
  }
  if (/재판매|C2C/.test(cu) && /다음 기간/.test(ask) && !/재판매|두 번째/.test(ask)) {
    return true;
  }
  return false;
}

export function isGenericSpoken(text: string): boolean {
  return /실제 행동 증거가 필요합니다/.test(text);
}

export function scoreDecisionValue(actual: DvActual): {
  layers: DvLayer[];
  overall: DvScore;
} {
  const surface = [
    actual.judgment,
    actual.criticalUnknown,
    actual.decisionChangingEvidence,
    actual.validationPriority,
    actual.questionText,
  ].join('\n');

  const accuracy: DvLayer = {
    id: 'accuracy',
    score: leak(surface) ? 'FAIL' : actual.judgment.startsWith('현재 판단:') ? 'PASS' : 'FAIL',
    note: leak(surface) ? 'internal id leaked' : `${actual.verdictId}/${actual.stageId}`,
  };

  const judgmentReadable =
    actual.criticalUnknown.length > 12 && /올리|내리|유지/.test(actual.decisionChangingEvidence);
  const judgment: DvLayer = {
    id: 'judgment',
    score: judgmentReadable ? 'PASS' : 'FAIL',
    note: actual.judgment.slice(0, 72),
  };

  const seeks = spokenSeeksCu(actual);
  const recovered = /다음 고객|다음 기간|재판매|전후|유료/.test(actual.whyAsking);
  const validation: DvLayer = {
    id: 'validation',
    score: seeks ? 'PASS' : recovered ? 'PARTIAL' : 'FAIL',
    note: seeks
      ? 'spoken question seeks the current CU/DCE'
      : recovered
        ? 'spoken question is generic; whyAsking still names the CU'
        : 'question does not seek a decision-changing proof',
  };

  const nextClear =
    actual.validationPriority.length > 8 &&
    actual.validationPriority.length < 140 &&
    /확인|잰다|검증/.test(actual.validationPriority);
  const decisionValue: DvLayer = {
    id: 'decisionValue',
    score: seeks && nextClear ? 'PASS' : nextClear ? 'PARTIAL' : 'FAIL',
    note: seeks
      ? 'Founder can hear what to check from the question'
      : nextClear
        ? 'Priority names the next proof; spoken question does not'
        : 'Founder cannot tell what to check now',
  };

  const strategy: DvLayer = {
    id: 'strategy',
    score: axisDrift(actual) ? 'FAIL' : 'PASS',
    note: axisDrift(actual)
      ? 'AI PM asks a different validation axis than the current CU'
      : 'AI PM executes the current CU, not another thesis',
  };

  const layers = [accuracy, judgment, validation, decisionValue, strategy];
  return { layers, overall: rollup(layers.map((layer) => layer.score)) };
}
