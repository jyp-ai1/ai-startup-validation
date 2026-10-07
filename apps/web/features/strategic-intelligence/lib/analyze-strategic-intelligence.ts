import type {
  SiAxisId,
  SiAxisJudgment,
  SiAxisStatus,
  SiBusinessInput,
  SiEvidenceClass,
  SiEvidenceItem,
  SiStageId,
  SiStrategicJudgment,
  SiVerdictId,
} from '@repo/types/domain/strategic-intelligence';
import { SI_AXIS_LABELS, SI_VERDICT_LABELS } from '@repo/types/domain/strategic-intelligence';

type SignalKind =
  | 'problem'
  | 'customer'
  | 'payer_split'
  | 'segment_claim'
  | 'solution'
  | 'market'
  | 'alternatives'
  | 'model'
  | 'resale_thesis'
  | 'revenue'
  | 'launch'
  | 'operations'
  | 'repeat_validation'
  | 'job_unknown'
  | 'payer_unknown'
  | 'no_revenue'
  | 'no_launch'
  | 'unverified'
  | 'quantified_problem'
  | 'named_alternative'
  | 'stake_improved';

type DetectedSignal = {
  kind: SignalKind;
  evidenceClass: SiEvidenceClass;
  axisId: SiAxisId;
  text: string;
  negated: boolean;
  order: number;
  retracted: boolean;
  sourceLine: string;
};

const AXIS_ORDER: SiAxisId[] = [
  'customerProblemFit',
  'marketAlternatives',
  'businessModel',
  'executionAdvantage',
  'validationStrength',
];

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').trim();
}

function linesOf(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function clip(line: string, max = 140): string {
  const compact = line.replace(/\s+/g, ' ').trim();
  return compact.length <= max ? compact : `${compact.slice(0, max - 1)}…`;
}

function isNegated(line: string): boolean {
  return /(확인되지\s*않|검증되지\s*않|조사되지\s*않|정의되지\s*않|출시되지\s*않|아직\s*없|아직\s*없다|아직.{0,8}아무도|하지\s*않|매출은\s*없|미검증|없다\.|없음)/.test(
    line,
  );
}

function isHypothesis(line: string): boolean {
  return /(가설|목표|예정|계획|시 ROI|감소 시)/.test(line);
}

const STAKE_NOUN = /(no-show|노쇼|반품률|반품|누락|불일치|미스매치|이탈|부하)/i;

function percentPair(line: string): { from: number; to: number } | null {
  const match = line.match(/(\d+)\s*%.{0,12}(에서|→)\s*(\d+)\s*%/);
  if (!match) return null;
  return { from: Number(match[1]), to: Number(match[3]) };
}

function isStakeImprovedLine(line: string): boolean {
  if (!STAKE_NOUN.test(line) || isHypothesis(line) || isIntentWithoutAction(line)) return false;
  if (/(악화|늘었|증가했)/.test(line) && !/(줄었|감소했|개선)/.test(line)) return false;
  if (/(줄었|감소했|개선됐|개선되)/.test(line)) return true;
  const pair = percentPair(line);
  return pair !== null && pair.to < pair.from;
}

function isStakeWorsenedLine(line: string): boolean {
  if (!STAKE_NOUN.test(line)) return false;
  if (/(악화|늘었|증가했|나빠)/.test(line)) return true;
  const pair = percentPair(line);
  return pair !== null && pair.to > pair.from;
}

function isRepeatZeroLine(line: string): boolean {
  return /(재구매는?\s*0|재구매\s*고객은\s*0|재구매는 없)/.test(line);
}

function isRepeatPlanOrIntent(line: string): boolean {
  return (
    isHypothesis(line) ||
    isIntentWithoutAction(line) ||
    /(재구매|재판매|반복).{0,12}(계획|의도|예정|생각|의향)/.test(line) ||
    /(계획|예정|향후).{0,12}(재구매|재판매)/.test(line)
  );
}

function deniesValidatedPayment(line: string): boolean {
  if (isRepeatZeroLine(line) && !/결제/.test(line)) return false;
  return /(아무도 결제하지 않|유료 전환은 없었|실제 결제.{0,10}(없다|없었|발생하지 않)|결제[는은] 없다|결제하지 않았다|결제한 고객은 없었|실제로 결제한.{0,12}(없|발생하지 않)|모두 거절)/.test(
    line,
  );
}

function deniesValidatedRepeat(line: string): boolean {
  return (
    isRepeatZeroLine(line) ||
    /(재판매는 멈췄|아무도 등록하지 않|실제 재판매.{0,12}(없다|없었|발생하지 않)|실제 재판매·재구매는 없다)/.test(
      line,
    )
  );
}

function isRepeatDirectDenial(line: string): boolean {
  if (isRepeatZeroLine(line) && !/실제 재판매/.test(line)) return false;
  return /(실제 재판매.{0,12}(없다|없었|발생하지 않)|실제 재판매·재구매는 없다)/.test(line);
}

function isFounderFlip(line: string): boolean {
  return /지난번에는 됐다고 했지만 이번에는 아니다|이번에는 아니다/.test(line);
}

function isPaidChurnLine(line: string): boolean {
  return /(해지|취소됐)/.test(line);
}

function isIntentWithoutAction(line: string): boolean {
  return /(생각|의향|하려고|검토 중)/.test(line) && /(아직|아무도|없)/.test(line);
}

/** Counted completed actions — not intent, not a planned pilot. */
function isQuantifiedCompletion(line: string): boolean {
  if (isIntentWithoutAction(line) || isHypothesis(line) || isRepeatZeroLine(line)) return false;
  return (
    /\d+\s*(명|건)/.test(line) &&
    /(등록했|거래됐|거래가 됐|거래가 발생|재구매했|체결됐|실제로\s*재판매)/.test(line)
  );
}

/** Counted own payment — not a planned offer, not customer-size 매출. */
function isQuantifiedPayment(line: string): boolean {
  if (isIntentWithoutAction(line) || isHypothesis(line) || isQuantifiedCompletion(line)) {
    return false;
  }
  return /\d+\s*(명|건)/.test(line) && /(결제했|지불했|유료로\s*(썼|사용|전환))/.test(line);
}

/** Own commercial revenue — not the customer's size, not a problem symptom. */
function isOwnCommercialRevenue(line: string): boolean {
  if (/연\s*매출|고객.{0,12}매출|브랜드.{0,20}매출/.test(line)) return false;
  if (/매출이?\s*(흔들|감소|악화)|매출과/.test(line)) return false;
  return /(판매했|실제로 판매|판매 매출이 있|1차.{0,10}판매|구매가 존재|매출이 있다|매출은 있다)/.test(line);
}

function matchAny(line: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(line));
}

function scanLine(line: string): DetectedSignal[] {
  if (/^#{1,6}\s/.test(line)) return [];
  const negated = isNegated(line);
  const found: DetectedSignal[] = [];

  const push = (
    kind: SignalKind,
    evidenceClass: SiEvidenceClass,
    axisId: SiAxisId,
    forceClass?: SiEvidenceClass,
  ) => {
    found.push({
      kind,
      evidenceClass: forceClass ?? evidenceClass,
      axisId,
      text: clip(line),
      negated,
      order: 0,
      retracted: false,
      sourceLine: line,
    });
  };

  const isTargetClaim = matchAny(line, [/\bMZ\b/i, /FIT\s*(관광|개별|여행)/i, /타깃은/, /대상으로 보고/]);
  const isModelLine = /사업 모델|비즈니스 모델|C2C|재판매/.test(line);
  const isAbsenceLine = negated && matchAny(line, [/출시/, /매출/, /검증/, /파일럿/, /인터뷰/]);

  if (matchAny(line, [/문제/, /못하고/, /부족/, /어렵/, /불편/, /못 하/, /반품률/, /악화/, /누락/, /no-show/i, /부하/, /흔들/])) {
    push('problem', negated || isHypothesis(line) ? 'CLAIM' : 'FACT', 'customerProblemFit');
  }

  if (isTargetClaim) {
    push('segment_claim', negated ? 'ASSUMPTION' : 'CLAIM', 'customerProblemFit');
  } else if (
    !isModelLine &&
    !isAbsenceLine &&
    matchAny(line, [/고객/, /사용자/, /이용자/, /관광객/, /구매자/, /소비자/])
  ) {
    if (/(사용자|이용자).{0,40}(구매자|결제)/.test(line) || /(구매자|결제).{0,40}(사용자|이용자)/.test(line)) {
      push('payer_split', 'CLAIM', 'customerProblemFit');
    } else if (negated && /(유료\s*고객|결제자|구매자)/.test(line)) {
      push('payer_unknown', 'ASSUMPTION', 'businessModel');
    } else {
      push('customer', negated ? 'CLAIM' : 'FACT', 'customerProblemFit');
    }
  }

  if (
    !isAbsenceLine &&
    matchAny(line, [/해결/, /제공/, /플랫폼/, /컴패니언/, /앱을/, /연결하는 사업/])
  ) {
    push('solution', 'CLAIM', 'customerProblemFit');
  }

  if (matchAny(line, [/시장/, /경쟁/, /대안/, /기존/])) {
    const kind: SignalKind = /대안|경쟁|기존/.test(line) ? 'alternatives' : 'market';
    push(kind, 'FACT', 'marketAlternatives');
  }

  if (matchAny(line, [/C2C/i, /재판매/, /리세일/])) {
    push(
      'resale_thesis',
      negated ? 'ASSUMPTION' : 'CLAIM',
      'businessModel',
    );
  } else if (matchAny(line, [/수익/, /결제/, /돈을 내/, /구독/, /판매 매출/, /비즈니스 모델/, /사업 모델/])) {
    push('model', negated ? 'ASSUMPTION' : 'CLAIM', 'businessModel');
  }

  if (negated && /매출/.test(line) && !/연\s*매출/.test(line)) {
    push('no_revenue', 'FACT', 'validationStrength');
  } else if (isOwnCommercialRevenue(line)) {
    push('revenue', 'FACT', 'businessModel');
  }

  if (matchAny(line, [/출시/, /런칭/, /launch/i])) {
    if (negated) push('no_launch', 'FACT', 'executionAdvantage');
    else push('launch', 'FACT', 'executionAdvantage');
  }

  if (matchAny(line, [/분사/, /사내벤처/, /독립 법인/, /공급망/, /운영 중/])) {
    push('operations', negated ? 'CLAIM' : 'FACT', 'executionAdvantage');
  }

  if (isQuantifiedCompletion(line) && !negated) {
    push('repeat_validation', 'VALIDATED', 'validationStrength');
  } else if (isQuantifiedPayment(line) && !negated) {
    push('revenue', 'VALIDATED', 'validationStrength');
  } else if (matchAny(line, [/재구매/, /반복적으로/, /리텐션/, /2차 거래/, /파일럿/, /인터뷰 검증/])) {
    if (
      negated ||
      isRepeatPlanOrIntent(line) ||
      isRepeatZeroLine(line) ||
      deniesValidatedRepeat(line) ||
      /파일럿/.test(line)
    ) {
      push('unverified', 'ASSUMPTION', 'validationStrength');
    }
  }

  if (matchAny(line, [/직무/, /Job-to-be-done/i, /누가 왜 돈을/])) {
    push('job_unknown', negated ? 'ASSUMPTION' : 'CLAIM', 'customerProblemFit');
  }

  if (matchAny(line, [/결제자/, /낼 의향/, /유료 고객/]) && negated) {
    push('payer_unknown', 'ASSUMPTION', 'businessModel');
  }

  if (matchAny(line, [/조사되지/, /확인되지/, /검증되지/, /데이터는 아직/]) && found.length === 0) {
    push('unverified', 'ASSUMPTION', 'validationStrength');
  }

  if (
    /\d+\s*(?:~\s*)?\d*\s*%/.test(line) &&
    matchAny(line, [/no-show/i, /노쇼/, /반품/, /누락/, /불일치/, /미스매치/, /이탈/, /부하/])
  ) {
    push('quantified_problem', negated || isHypothesis(line) ? 'CLAIM' : 'FACT', 'customerProblemFit');
  }

  if (
    !negated &&
    isStakeImprovedLine(line)
  ) {
    push('stake_improved', 'VALIDATED', 'validationStrength');
  }

  if (
    matchAny(line, [/대안/, /경쟁/, /대비/, /차별/, /솔루션/, /연동/]) &&
    (/\b(?:EMR|CRM|ERP|PDP|API)\b/.test(line) ||
      /[A-Z][a-zA-Z]{2,}(?:\s+[A-Z][a-zA-Z]+)?/.test(line))
  ) {
    push('named_alternative', 'FACT', 'marketAlternatives');
  }

  return found;
}

function headingSection(line: string): 'alternatives' | 'other' | null {
  if (!/^#{1,6}\s/.test(line)) return null;
  return /대안|경쟁/.test(line) ? 'alternatives' : 'other';
}

function scanDocument(text: string): DetectedSignal[] {
  let section: 'alternatives' | 'other' | null = null;
  const out: DetectedSignal[] = [];
  let order = 0;
  for (const line of linesOf(text)) {
    const nextSection = headingSection(line);
    if (nextSection) {
      section = nextSection;
      continue;
    }
    order += 1;
    const found = scanLine(line);
    for (const signal of found) {
      signal.order = order;
      signal.sourceLine = line;
    }
    if (section === 'alternatives' && !found.some((signal) => signal.kind === 'alternatives')) {
      found.push({
        kind: 'alternatives',
        evidenceClass: 'FACT',
        axisId: 'marketAlternatives',
        text: clip(line),
        negated: false,
        order,
        retracted: false,
        sourceLine: line,
      });
    }
    out.push(...found);
  }
  applySignalRetractions(out);
  return out;
}

function uniqueEvidence(signals: DetectedSignal[]): SiEvidenceItem[] {
  const seen = new Set<string>();
  const items: SiEvidenceItem[] = [];
  let index = 0;
  for (const signal of signals) {
    const key = `${signal.evidenceClass}:${signal.text}`;
    if (seen.has(key)) continue;
    seen.add(key);
    index += 1;
    items.push({
      id: `ev-${index}`,
      text: signal.text,
      evidenceClass: signal.evidenceClass,
      axisId: signal.axisId,
    });
  }
  return items;
}

function hasKind(signals: DetectedSignal[], kind: SignalKind, negated?: boolean): boolean {
  return signals.some(
    (signal) =>
      !signal.retracted &&
      signal.kind === kind &&
      (negated === undefined || signal.negated === negated),
  );
}

function hasLiveValidated(signals: DetectedSignal[], kind: SignalKind): boolean {
  return signals.some(
    (signal) =>
      !signal.retracted &&
      signal.kind === kind &&
      signal.evidenceClass === 'VALIDATED',
  );
}

function liveValidated(signals: DetectedSignal[], kind: SignalKind, beforeOrder: number): boolean {
  return signals.some(
    (signal) =>
      !signal.retracted &&
      signal.order < beforeOrder &&
      signal.kind === kind &&
      signal.evidenceClass === 'VALIDATED',
  );
}

function retractPrior(
  signals: DetectedSignal[],
  beforeOrder: number,
  kind: SignalKind,
): boolean {
  let retracted = false;
  for (const signal of signals) {
    if (
      signal.order < beforeOrder &&
      !signal.retracted &&
      signal.kind === kind &&
      signal.evidenceClass === 'VALIDATED'
    ) {
      signal.retracted = true;
      retracted = true;
    }
  }
  return retracted;
}

function markLineConflict(signals: DetectedSignal[], order: number, sourceLine: string): void {
  const onLine = signals.filter((signal) => signal.order === order);
  if (onLine.length === 0) {
    signals.push({
      kind: 'unverified',
      evidenceClass: 'CONFLICT',
      axisId: 'validationStrength',
      text: clip(sourceLine),
      negated: false,
      order,
      retracted: false,
      sourceLine,
    });
    return;
  }
  for (const signal of onLine) {
    signal.evidenceClass = 'CONFLICT';
  }
}

function applySignalRetractions(signals: DetectedSignal[]): void {
  const lineByOrder = new Map<number, string>();
  for (const signal of signals) {
    if (!lineByOrder.has(signal.order)) lineByOrder.set(signal.order, signal.sourceLine);
  }
  const orders = [...lineByOrder.keys()].sort((left, right) => left - right);
  for (const order of orders) {
    const line = lineByOrder.get(order) ?? '';
    const paymentDenied = deniesValidatedPayment(line) && liveValidated(signals, 'revenue', order);
    const repeatDenied = deniesValidatedRepeat(line) && liveValidated(signals, 'repeat_validation', order);
    const repeatContradicted =
      isRepeatDirectDenial(line) && liveValidated(signals, 'repeat_validation', order);
    const stakeWorsened = isStakeWorsenedLine(line) && liveValidated(signals, 'stake_improved', order);
    const flip = isFounderFlip(line);
    const conflicting =
      paymentDenied ||
      stakeWorsened ||
      repeatContradicted ||
      (flip &&
        (liveValidated(signals, 'revenue', order) || liveValidated(signals, 'repeat_validation', order)));

    if (paymentDenied || (flip && deniesValidatedPayment(line))) {
      retractPrior(signals, order, 'revenue');
    }
    if (repeatDenied || (flip && deniesValidatedRepeat(line))) {
      retractPrior(signals, order, 'repeat_validation');
    }
    if (stakeWorsened) {
      retractPrior(signals, order, 'stake_improved');
    }
    if (flip && !paymentDenied && !repeatDenied) {
      if (liveValidated(signals, 'revenue', order)) retractPrior(signals, order, 'revenue');
      if (liveValidated(signals, 'repeat_validation', order)) {
        retractPrior(signals, order, 'repeat_validation');
      }
      if (liveValidated(signals, 'stake_improved', order)) retractPrior(signals, order, 'stake_improved');
    }
    if (isPaidChurnLine(line) && !deniesValidatedPayment(line)) {
      retractPrior(signals, order, 'revenue');
    }
    if (conflicting) {
      markLineConflict(signals, order, line);
    }
  }
}

function axisStatus(args: {
  supported: boolean;
  partial: boolean;
  weak: boolean;
}): SiAxisStatus {
  if (args.supported) return 'supported';
  if (args.partial) return 'partial';
  if (args.weak) return 'weak';
  return 'unknown';
}

function buildAxes(signals: DetectedSignal[]): SiAxisJudgment[] {
  const problem = hasKind(signals, 'problem', false);
  const customer = hasKind(signals, 'customer', false);
  const split = hasKind(signals, 'payer_split');
  const segment = hasKind(signals, 'segment_claim');
  const jobUnknown = hasKind(signals, 'job_unknown');
  const alternatives = hasKind(signals, 'alternatives');
  const market = hasKind(signals, 'market');
  const revenue = hasKind(signals, 'revenue', false);
  const resale = hasKind(signals, 'resale_thesis');
  const model = hasKind(signals, 'model') || resale;
  const payerUnknown = hasKind(signals, 'payer_unknown');
  const launch = hasKind(signals, 'launch', false);
  const operations = hasKind(signals, 'operations', false);
  const noLaunch = hasKind(signals, 'no_launch');
  const validated = hasKind(signals, 'repeat_validation', false);
  const unverified = hasKind(signals, 'unverified') || hasKind(signals, 'no_revenue');

  const customerProblemFit = axisStatus({
    supported: problem && customer && !split && !segment && !jobUnknown,
    partial: problem || customer,
    weak: segment || jobUnknown || split,
  });

  const marketAlternatives = axisStatus({
    supported: alternatives && market,
    partial: alternatives || market,
    weak: false,
  });

  const businessModel = axisStatus({
    supported: revenue && model && !resale && !payerUnknown,
    partial: revenue || (model && !payerUnknown),
    weak: model || payerUnknown || split,
  });

  const executionAdvantage = axisStatus({
    supported: (launch || operations) && !noLaunch,
    partial: launch || operations,
    weak: noLaunch,
  });

  const validationStrength = axisStatus({
    supported: validated,
    partial: revenue && !validated,
    weak: unverified || noLaunch,
  });

  const summaries: Record<SiAxisId, string> = {
    customerProblemFit: problem
      ? split || segment || jobUnknown
        ? '문제는 보이지만 실제 고객·결제자·직무가 검증되지 않았다.'
        : '고객과 문제가 문서에서 확인된다.'
      : revenue || customer
        ? '구매·이용 언급은 있으나 그들이 겪는 문제가 검증되지 않았다.'
        : '고객이 누구이며 문제가 실재하는지가 불충분하다.',
    marketAlternatives: alternatives
      ? '기존 대안이 언급되어 비교 출발점은 있다.'
      : market
        ? '시장은 언급됐으나 대안 대비 우위는 약하다.'
        : '시장과 대안이 거의 확인되지 않았다.',
    businessModel: revenue
      ? resale
        ? '1차 매출은 있으나 반복 수익 루프는 미검증이다.'
        : '누가 돈을 냈는지에 대한 상업 증거가 있다.'
      : payerUnknown || split
        ? '누가 왜 돈을 내는지가 가설 수준이다.'
        : '반복 가능한 지불 이유가 확인되지 않았다.',
    executionAdvantage: launch || operations
      ? '출시·운영·공급 등 실행 자산이 존재한다.'
      : noLaunch
        ? '아직 실행 자산(출시·운영)이 없다.'
        : '이 팀이 실행할 우위가 문서에서 드러나지 않는다.',
    validationStrength: validated
      ? '반복 사용·재구매 등 검증 사실이 있다.'
      : revenue
        ? '초기 판매는 있으나 주장 수준을 넘는 반복 검증은 없다.'
        : '실제 검증 사실이 없다.',
  };

  const statuses: Record<SiAxisId, SiAxisStatus> = {
    customerProblemFit,
    marketAlternatives,
    businessModel,
    executionAdvantage,
    validationStrength,
  };

  return AXIS_ORDER.map((axisId) => ({
    axisId,
    label: SI_AXIS_LABELS[axisId],
    status: statuses[axisId],
    summary: summaries[axisId],
  }));
}

function dceStakeOpen(signals: DetectedSignal[]): boolean {
  return hasKind(signals, 'quantified_problem') && !hasKind(signals, 'stake_improved', false);
}

function decideStage(signals: DetectedSignal[]): SiStageId {
  if (hasKind(signals, 'repeat_validation', false)) return 'S4';
  const paymentWithoutStake = hasKind(signals, 'revenue', false) && dceStakeOpen(signals);
  if ((hasKind(signals, 'revenue', false) && !paymentWithoutStake) || hasKind(signals, 'launch', false)) {
    return 'S3';
  }
  const commerciallyStarted =
    hasKind(signals, 'revenue', false) ||
    hasKind(signals, 'launch', false) ||
    hasKind(signals, 'operations', false);
  if (
    commerciallyStarted &&
    hasKind(signals, 'solution') &&
    (hasKind(signals, 'market') || hasKind(signals, 'alternatives') || hasKind(signals, 'model'))
  ) {
    return 'S2';
  }
  if (hasKind(signals, 'problem') || hasKind(signals, 'customer') || hasKind(signals, 'solution')) return 'S1';
  return 'S0';
}

function decideVerdict(stageId: SiStageId, signals: DetectedSignal[], axes: SiAxisJudgment[]): SiVerdictId {
  const evidenceCount = uniqueEvidence(signals).length;
  if (evidenceCount < 2 && stageId === 'S0') return 'insufficient_basis';

  const customerAxis = axes.find((axis) => axis.axisId === 'customerProblemFit');
  const validationAxis = axes.find((axis) => axis.axisId === 'validationStrength');
  const hasRevenue = hasKind(signals, 'revenue', false);
  const hasLaunch = hasKind(signals, 'launch', false);
  const hasOps = hasKind(signals, 'operations', false);
  const hasRepeat = hasKind(signals, 'repeat_validation', false);
  const payerUnknown = hasKind(signals, 'payer_unknown') || hasKind(signals, 'payer_split');
  const jobUnknown = hasKind(signals, 'job_unknown');

  if (hasRepeat && hasRevenue) return 'viable';
  if (dceStakeOpen(signals)) return 'judgment_deferred';
  if ((hasRevenue || (hasLaunch && hasOps)) && customerAxis?.status !== 'unknown' && !jobUnknown) {
    return hasRevenue ? 'viable' : 'conditionally_viable';
  }
  if (stageId === 'S3' && (hasLaunch || hasRevenue)) return 'conditionally_viable';
  if (stageId === 'S2' && validationAxis?.status !== 'unknown' && !payerUnknown && !jobUnknown) {
    return 'conditionally_viable';
  }
  if (stageId === 'S0' && evidenceCount < 3) return 'insufficient_basis';
  return 'judgment_deferred';
}

function stakeNoun(line: string): string {
  const adjacent = line.match(
    /(no-show|노쇼|반품률|반품|누락|불일치|미스매치|이탈|부하).{0,3}\d+\s*(?:~\s*)?\d*\s*%/i,
  );
  if (adjacent?.[1]) return adjacent[1];
  const match = line.match(STAKE_NOUN);
  return match?.[1] ?? '수치화된 문제 지표';
}

function alternativeNoun(line: string): string {
  const known = line.match(/\b(?:EMR|CRM|ERP|PDP|API)\b/);
  if (known) return known[0];
  const titled = line.match(/[A-Z][a-z]+(?:\s+[A-Z][a-zA-Z]+)+/);
  if (titled) return titled[0];
  const word = line.match(/[A-Z][a-zA-Z]{2,}/);
  return word?.[0] ?? '기존 대안';
}

function pickNamedAlternative(signals: DetectedSignal[]): DetectedSignal | undefined {
  const named = signals.filter((signal) => signal.kind === 'named_alternative');
  return named.find((signal) => /대안|경쟁|대비|솔루션|차별/.test(signal.text)) ?? named[0];
}

function paidConversionUnknown(signals: DetectedSignal[]): {
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
} {
  const metric = signals.find((signal) => signal.kind === 'quantified_problem');
  const alternative = pickNamedAlternative(signals);
  if (!metric) {
    return {
      criticalUnknown:
        '이 사업이 주장하는 가치가 실제 지불로 이어지는가. 문제와 대안이 있어도 유료 전환이 없으면 사업화 판단을 확정할 수 없다.',
      decisionChangingEvidence:
        '최초 유료 거래 또는 유료 파일럿 한 건과 그 전후 성과. 이 증거가 있으면 판단을 조건부 가능 이상으로 올리고, 없으면 보류를 유지한다.',
      validationPriority: '가장 가까운 결제 후보에게 유료 제안을 한 번 검증한다.',
    };
  }

  const stake = stakeNoun(metric.text);
  const versus = alternative ? alternativeNoun(alternative.text) : null;
  const versusClause = versus
    ? ` ${versus} 대비 문서가 주장한 차별이 그 지표에서 보이는지도 같이 본다.`
    : '';
  return {
    criticalUnknown: `결제 후보가 유료로 썼을 때 문서가 수치화한 ${stake} 수치가 실제로 줄어드는가. 지불만 있고 그 지표가 그대로면 유료 전환으로 판단을 확정할 수 없다.`,
    decisionChangingEvidence: `유료 파일럿 1건과 ${stake} 전후 비교.${versusClause} 지표가 줄면 판단을 조건부 가능 이상으로 올리고, 지불만 있거나 지표가 그대로면 보류를 유지한다.`,
    validationPriority: `가장 가까운 결제 후보에게 유료 제안을 하고, 문서가 적은 ${stake}의 전후를 한 번 잰다.`,
  };
}

function pickCriticalUnknown(signals: DetectedSignal[]): {
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
} {
  const payerResolved =
    hasLiveValidated(signals, 'revenue') || hasLiveValidated(signals, 'repeat_validation');

  if (hasKind(signals, 'resale_thesis') && !hasKind(signals, 'repeat_validation', false)) {
    return {
      criticalUnknown:
        'C2C 재판매가 한 번의 이벤트가 아니라 반복적으로 발생하는가. 이 루프가 없으면 1차 판매만 있는 브랜드이지 플랫폼 사업이 아니다.',
      decisionChangingEvidence:
        '최근 구매자의 실제 재판매 등록·거래·재구매 데이터. 이 데이터가 있으면 반복 가능한 양면 시장으로 판단을 올리고, 없으면 1차 판매 브랜드로 내린다.',
      validationPriority: '최근 구매 코호트의 재판매 등록·체결·재구매 여부 한 가지를 확인한다.',
    };
  }

  if (
    !payerResolved &&
    (hasKind(signals, 'job_unknown') || (hasKind(signals, 'payer_unknown') && !hasKind(signals, 'problem', false)))
  ) {
    return {
      criticalUnknown:
        '누가 어떤 직무를 이 제품으로 대체하며, 왜 돈을 내는가. 직무와 결제자가 없으면 콘셉트만으로 사업화 판단을 내릴 수 없다.',
      decisionChangingEvidence:
        '구체적 사용 상황에서 결제자 한 명이 실제로 지불하거나 유료 사용을 시작한 증거. 이 증거가 있으면 보류를 조건부 가능 이상으로 올리고, 없으면 보류를 유지한다.',
      validationPriority: '결제자와 Job-to-be-done을 한 쌍으로 확인한다.',
    };
  }

  if (!payerResolved && (hasKind(signals, 'payer_split') || hasKind(signals, 'payer_unknown'))) {
    return {
      criticalUnknown:
        '실제 돈을 내는 사람이 누구이며, 그 사람이 이 문제를 비용으로 해결할 이유가 있는가. 결제자가 확인되지 않으면 사용자 수요만으로 사업화 판단을 확정할 수 없다.',
      decisionChangingEvidence:
        '결제 후보의 지불 의향 인터뷰와 실제 지불 시도(견적·계약·선결제). 이 증거가 있으면 보류를 조건부 가능 이상으로 올리고, 거절이면 보류를 유지하거나 내린다.',
      validationPriority: '사용자와 결제자를 분리해, 결제자 한 명의 지불 이유를 확인한다.',
    };
  }

  if (hasKind(signals, 'segment_claim')) {
    return {
      criticalUnknown:
        '문서가 지목한 고객 세그먼트가 실제로 이 문제를 갖고 돈을 낼 의사가 있는가. 세그먼트가 가설이면 시장 크기를 말할 수 없다.',
      decisionChangingEvidence:
        '해당 세그먼트의 실사용 또는 지불 증거(예약·결제·반복 방문). 이 증거가 있으면 고객 축을 지지로 올리고, 없으면 세그먼트 주장을 내린다.',
      validationPriority: '주장된 세그먼트에서 실사용·지불 증거 한 건을 확인한다.',
    };
  }

  if (!hasKind(signals, 'revenue', false) && !hasKind(signals, 'repeat_validation', false)) {
    return paidConversionUnknown(signals);
  }

  const metric = signals.find((signal) => signal.kind === 'quantified_problem');
  if (metric && dceStakeOpen(signals) && !hasKind(signals, 'repeat_validation', false)) {
    const stake = stakeNoun(metric.text);
    const alternative = pickNamedAlternative(signals);
    const versus = alternative ? alternativeNoun(alternative.text) : null;
    const versusClause = versus
      ? ` ${versus} 대비 문서가 주장한 차별이 그 지표에서 보이는지도 같이 본다.`
      : '';
    return {
      criticalUnknown: `유료 전환 이후 문서가 수치화한 ${stake} 수치가 실제로 줄었는가. 지불만 있고 그 지표가 그대로면 판단을 확정할 수 없다.`,
      decisionChangingEvidence: `이미 결제한 후보의 ${stake} 전후 비교.${versusClause} 지표가 줄면 판단을 올리고, 그대로면 보류를 유지한다.`,
      validationPriority: `이미 돈을 낸 후보에서 문서가 적은 ${stake}의 전후를 한 번 잰다.`,
    };
  }

  if (metric && hasKind(signals, 'stake_improved', false) && !hasKind(signals, 'resale_thesis')) {
    return {
      criticalUnknown:
        '이번 성과가 다음 고객이나 다음 기간에도 같은 방향으로 이어지는가. 1회 결과만이면 판단을 확정할 수 없다.',
      decisionChangingEvidence:
        '다음 고객 또는 다음 기간에서 같은 성과가 유지되는지. 유지되면 판단을 유지하고, 1회성이면 내린다.',
      validationPriority: '다음 고객 또는 다음 기간에서 같은 성과가 반복되는지 한 번 확인한다.',
    };
  }

  return {
    criticalUnknown:
      '현재 강점이 반복 가능한 사업으로 이어지는가. 1회 성과가 반복되지 않으면 사업화 판단을 유지할 수 없다.',
    decisionChangingEvidence:
      '반복 구매·재사용 또는 이탈 없는 두 번째 거래 데이터. 이 데이터가 있으면 판단을 유지·상향하고, 없으면 1회성으로 내린다.',
    validationPriority: '이미 구매한 고객의 두 번째 행동을 확인한다.',
  };
}

function buildStrengths(signals: DetectedSignal[]): string[] {
  const out: string[] = [];
  if (hasKind(signals, 'revenue', false)) {
    out.push('실제 판매·매출 증거가 있다.');
  }
  if (hasKind(signals, 'operations', false)) {
    out.push('분사·공급망·운영 등 실행 자산이 있다.');
  }
  if (hasKind(signals, 'launch', false)) {
    out.push('제품 또는 앱이 이미 출시되어 있다.');
  }
  if (hasKind(signals, 'problem', false)) {
    out.push('문서에서 확인할 수 있는 구체적 문제가 있다.');
  }
  if (hasKind(signals, 'repeat_validation', false)) {
    out.push('반복 사용 또는 재구매가 검증되어 있다.');
  }
  return out.slice(0, 4);
}

function buildRisks(signals: DetectedSignal[], criticalUnknown: string): string[] {
  const out: string[] = [];
  if (hasKind(signals, 'resale_thesis') && !hasKind(signals, 'repeat_validation', false)) {
    out.push('C2C 재판매가 반복적으로 발생하는지 확인되지 않았다.');
  }
  if (hasKind(signals, 'payer_split')) {
    out.push('사용자와 결제자가 분리되어 있어 지불 이유가 따로 검증되지 않았다.');
  } else if (hasKind(signals, 'payer_unknown')) {
    out.push('결제자가 확인되지 않았다.');
  }
  if (hasKind(signals, 'segment_claim')) {
    out.push('지목된 고객 세그먼트는 아직 가설이다.');
  }
  if (hasKind(signals, 'job_unknown')) {
    out.push('이 제품이 대체하는 직무가 검증되지 않았다.');
  }
  if (hasKind(signals, 'no_revenue') || hasKind(signals, 'no_launch')) {
    out.push('출시·매출 등 상업 실행 증거가 없다.');
  }
  if (hasKind(signals, 'unverified') && !hasKind(signals, 'revenue', false)) {
    out.push('유료 전환·파일럿 성과가 아직 검증되지 않았다.');
  }
  const metric = signals.find((signal) => signal.kind === 'quantified_problem');
  if (metric && !hasKind(signals, 'revenue', false)) {
    out.push(`문서가 수치화한 ${stakeNoun(metric.text)} 수치가 유료 사용 전후로 줄었는지 검증되지 않았다.`);
  }
  if (out.length === 0) {
    out.push(criticalUnknown);
  }
  return out.slice(0, 4);
}

function proseWhyPossible(strengths: string[], signals: DetectedSignal[]): string {
  if (strengths.length === 0) {
    return '지금은 가능성을 뒷받침할 상업 사실이 거의 없다. 가능성보다 미검증 가정이 먼저다.';
  }
  if (hasKind(signals, 'revenue', false) && hasKind(signals, 'operations', false)) {
    return `실제 매출·공급망·고객 구매가 존재한다. ${strengths.join(' ')}`;
  }
  return strengths.join(' ');
}

function proseWhyFail(risks: string[]): string {
  if (risks.length === 0) {
    return '실패 조건이 아직 구체적으로 드러나지 않았다.';
  }
  return risks.join(' ');
}

function proseJudgment(verdictId: SiVerdictId, strengths: string[], risks: string[], criticalUnknown: string): string {
  const headline = `현재 판단: ${SI_VERDICT_LABELS[verdictId]}`;
  if (verdictId === 'viable') {
    const core = strengths[0] ?? '상업 실행 증거가 있다.';
    const risk = risks[0] ?? criticalUnknown;
    return `${headline}. 핵심 근거: ${core.replace(/\.$/, '')}. 핵심 리스크: ${risk.replace(/\.$/, '')}.`;
  }
  if (verdictId === 'conditionally_viable') {
    return `${headline}. 일부 실행 증거는 있으나, ${criticalUnknown.replace(/\.$/, '')}가 확인되기 전에는 판단을 확정하지 않는다.`;
  }
  if (verdictId === 'insufficient_basis') {
    return `${headline}. 고객·문제·검증 사실이 문서에서 충분하지 않아 사업성 문장을 내릴 수 없다.`;
  }
  const risk = risks[0] ?? '핵심 고객과 결제 이유가 검증되지 않았다.';
  if (criticalUnknown.includes(risk) || risk.includes(criticalUnknown.slice(0, 24))) {
    return `${headline}. ${criticalUnknown}`;
  }
  return `${headline}. ${risk} ${criticalUnknown}`;
}

function addInferences(items: SiEvidenceItem[], signals: DetectedSignal[], stageId: SiStageId): SiEvidenceItem[] {
  const inferences: SiEvidenceItem[] = [];
  if (hasKind(signals, 'revenue', false) && hasKind(signals, 'resale_thesis')) {
    inferences.push({
      id: `ev-inf-${inferences.length + 1}`,
      text: '1차 판매 성공이 곧바로 C2C 반복 거래의 증거는 아니다.',
      evidenceClass: 'INFERENCE',
      axisId: 'validationStrength',
    });
  }
  if (hasKind(signals, 'payer_split')) {
    inferences.push({
      id: `ev-inf-${inferences.length + 1}`,
      text: '사용자와 결제자가 다르면 문제 인식과 지불 의향을 따로 검증해야 한다.',
      evidenceClass: 'INFERENCE',
      axisId: 'customerProblemFit',
    });
  }
  if (hasKind(signals, 'revenue', false) && dceStakeOpen(signals)) {
    inferences.push({
      id: `ev-inf-${inferences.length + 1}`,
      text: '유료 전환 증거는 있으나, 문서가 수치화한 지표 전후는 아직 열려 있어 DCE는 부분이다.',
      evidenceClass: 'INFERENCE',
      axisId: 'validationStrength',
    });
  }
  if (stageId === 'S0' || stageId === 'S1') {
    inferences.push({
      id: `ev-inf-${inferences.length + 1}`,
      text: '출시·매출 이전 단계에서는 가능성 문장보다 미검증 가정을 먼저 적는다.',
      evidenceClass: 'INFERENCE',
      axisId: 'validationStrength',
    });
  }
  return [...items, ...inferences];
}

export function analyzeStrategicIntelligence(input: SiBusinessInput): SiStrategicJudgment {
  const documentText = normalize(input.documentText ?? '');
  if (documentText.length < 8) {
    return {
      version: 1,
      verdictId: 'insufficient_basis',
      stageId: 'S0',
      judgment: `현재 판단: ${SI_VERDICT_LABELS.insufficient_basis}. 사업 입력이 없어 근거를 나눌 수 없다.`,
      whyPossible: '가능성을 말할 사실이 없다.',
      whyFail: '입력이 없어 실패 조건도 특정할 수 없다.',
      evidenceMap: [],
      strengths: [],
      risks: ['사업 입력이 없다.'],
      axes: AXIS_ORDER.map((axisId) => ({
        axisId,
        label: SI_AXIS_LABELS[axisId],
        status: 'unknown',
        summary: '입력이 없어 판단할 수 없다.',
      })),
      criticalUnknown: '이 사업의 고객·문제·지불 이유가 무엇인가.',
      decisionChangingEvidence: '고객·문제·결제자가 드러나는 사업 설명 한 건.',
      validationPriority: '사업의 고객과 문제를 한 문장으로 먼저 적는다.',
      source: 'si-v1',
    };
  }

  const signals = scanDocument(documentText);
  const axes = buildAxes(signals);
  const stageId = decideStage(signals);
  const verdictId = decideVerdict(stageId, signals, axes);
  const unknown = pickCriticalUnknown(signals);
  const strengths = buildStrengths(signals);
  const risks = buildRisks(signals, unknown.criticalUnknown);
  const evidenceMap = addInferences(uniqueEvidence(signals), signals, stageId);

  return {
    version: 1,
    verdictId,
    stageId,
    judgment: proseJudgment(verdictId, strengths, risks, unknown.criticalUnknown),
    whyPossible: proseWhyPossible(strengths, signals),
    whyFail: proseWhyFail(risks),
    evidenceMap,
    strengths,
    risks,
    axes,
    criticalUnknown: unknown.criticalUnknown,
    decisionChangingEvidence: unknown.decisionChangingEvidence,
    validationPriority: unknown.validationPriority,
    source: 'si-v1',
  };
}

export function judgmentContainsScore(text: string): boolean {
  return /\d{1,3}\s*점/.test(text) || /\bscore\b/i.test(text) || /\d{2,3}\s*\/\s*100/.test(text);
}
