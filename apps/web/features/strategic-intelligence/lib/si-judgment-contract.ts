import type {
  ApplyFounderAnswerResult,
  DecisionCandidate,
  DecisionRecord,
  DecisionTieBreak,
  EliminatedCandidate,
  EvidenceSourceKind,
  FounderAnswerAct,
  HypothesisEvidenceBinding,
  HypothesisJudgment,
  HypothesisRole,
  JudgmentChangeClass,
  OpenUncertainty,
  ValidationPlan,
  PreviewBranchRecord,
  ProjectAttribution,
  ReviewCompletion,
  ReviewRunStatus,
  SiEvidenceClass,
  SiEvidenceItem,
  SiStageId,
  SiVerdictId,
  UnresolvedConflict,
  ValidationCriterion,
  ValidationOutcome,
} from '@repo/types/domain/strategic-intelligence';
import { REQUIRED_REVIEW_IDS } from '@repo/types/domain/strategic-intelligence';

export {
  REQUIRED_REVIEW_IDS,
  type ApplyFounderAnswerResult,
  type DecisionCandidate,
  type DecisionRecord,
  type FounderAnswerAct,
  type HypothesisEvidenceBinding,
  type HypothesisJudgment,
  type PreviewBranchRecord,
  type ReviewCompletion,
  type ValidationOutcome,
};

const STAGE_RANK: Record<SiStageId, number> = { S0: 0, S1: 1, S2: 2, S3: 3, S4: 4 };
const CLASS_RANK: Record<JudgmentChangeClass, number> = { none: 0, annotation: 1, identity: 2, conflict: 3 };
const SUPPLIED_TIE_KEYS = ['stage-delta', 'verdict-delta', 'fail-drops-stage', 'validation-over-question', 'critical-unknown'] as const;

/** Active evaluation include/exclude. 미판정 is not a role. */
export const HYPOTHESIS_ROLE_RULES = {
  active: { stage: true, outcome: true, critical: true, candidates: true },
  'conflict-side': { stage: true, outcome: true, critical: true, candidates: true },
  'inactive-preserved': { stage: false, outcome: false, critical: false, candidates: false },
} as const;

export const CUSTOMER_STATEMENT = '반찬가게·꽃집 등 직접 배송 소상공인';
export const PROBLEM_STATEMENT = '주문과 배송을 따로 관리해야 함';
export const CUSTOMER_CONFIRM = '이 서비스를 가장 필요로 하는 사람은 반찬가게·꽃집 등 직접 배송 소상공인입니다.';
export const PAYER_CONFIRM = '서비스 비용은 사장님 본인이 지불합니다.';
export const ABSENCE_SENTENCE = '아직 실제 결제·사용 증거는 없습니다.';
export const WEAK_PAYMENT_SENTENCE = '이미 결제 3건이 있어 고객이 돈을 내고 있습니다.';
export const LOGISTICS_PROBLEM_ID = 'h-problem-next';
export const LOGISTICS_CUSTOMER_ID = 'h-customer-next';
export const LOGISTICS_PROMPT = '물류본부 고객이 겪는 불편은 무엇입니까?';

export type JudgmentLedger = {
  headCommitId: string;
  commitIds: string[];
  stageId: SiStageId;
  verdictId: SiVerdictId;
  judgment: string;
  whyPossible: string;
  whyFail: string;
  evidenceMap: SiEvidenceItem[];
  criticalUnknown: string;
  criticalUnknownHypothesisId: string;
  decisionChangingEvidence: string;
  validationPriority: string;
  runStatus: ReviewRunStatus;
  reviewCompletion: ReviewCompletion;
  hypotheses: Record<string, HypothesisJudgment>;
  bindings: HypothesisEvidenceBinding[];
  criteria: ValidationCriterion[];
  conflicts: UnresolvedConflict[];
  askedQuestionHashes: string[];
  pairBroken: boolean;
  businessStatement: string;
  activePairCustomerId: string;
  unknownCounts: Record<string, number>;
  pendingUnknownId: string | null;
  uncertainties: OpenUncertainty[];
  validationPlan: ValidationPlan;
  preservedHypothesisIds: string[];
  stageReason: string;
};

export type CloseReviewResult = {
  ledger: JudgmentLedger;
  reviewCompletion: ReviewCompletion;
  blockingHypothesisIds: string[];
  blockingConflictIds: string[];
};

export type ModelDraftOffer = { stub?: boolean; text?: string } | string;

export type FounderAnswerApplied = ApplyFounderAnswerResult & { ledger: JudgmentLedger };

function hypothesis(
  id: string,
  statement: string,
  evidenceClass: SiEvidenceClass = 'ASSUMPTION',
): HypothesisJudgment {
  return { id, statement, outcome: 'not_run', criterionId: null, evidenceClass, alreadyKnown: false, pairedCustomerId: null, role: 'active' };
}

function binding(input: {
  id: string;
  hypothesisId: string;
  proposition: string;
  sourceKind: EvidenceSourceKind;
  sourceRef: string;
  evidenceClass: SiEvidenceClass;
  classReason: string;
  literalScope?: string | null;
  projectAttribution?: ProjectAttribution;
  commitId: string;
}): HypothesisEvidenceBinding {
  if (input.evidenceClass === 'VALIDATED') throw new Error('VALIDATED is not a binding class');
  return {
    id: input.id,
    hypothesisId: input.hypothesisId,
    proposition: input.proposition,
    sourceKind: input.sourceKind,
    sourceRef: input.sourceRef,
    evidenceClass: input.evidenceClass,
    classReason: input.classReason,
    literalScope: input.literalScope ?? null,
    authenticityGuaranteed: false,
    projectAttribution: input.projectAttribution ?? 'unreviewed',
    history: [{ commitId: input.commitId, from: '', to: input.evidenceClass, reason: input.classReason }],
  };
}

function bindingToItem(item: HypothesisEvidenceBinding): SiEvidenceItem {
  const axisId =
    item.hypothesisId.includes('problem') || item.hypothesisId.includes('customer')
      ? 'customerProblemFit'
      : item.hypothesisId.includes('market')
        ? 'marketAlternatives'
        : 'businessModel';
  return { id: item.id, text: item.proposition, evidenceClass: item.evidenceClass, axisId };
}

function bump(ledger: JudgmentLedger): JudgmentLedger {
  const id = `c${ledger.commitIds.length}`;
  return { ...ledger, headCommitId: id, commitIds: [...ledger.commitIds, id] };
}

function replaceHypothesis(ledger: JudgmentLedger, id: string, patch: Partial<HypothesisJudgment>): JudgmentLedger {
  const current = ledger.hypotheses[id] ?? hypothesis(id, '');
  return { ...ledger, hypotheses: { ...ledger.hypotheses, [id]: { ...current, ...patch, id } } };
}

export function questionHash(input: { hypothesisId: string; prompt: string }): string {
  return `${input.hypothesisId}::${input.prompt}`;
}

function cloneLedger(ledger: JudgmentLedger): JudgmentLedger {
  return structuredClone(ledger);
}

function askedPrompt(ledger: JudgmentLedger, hypothesisId: string, prompt: string): string {
  let current = prompt;
  while (ledger.askedQuestionHashes.includes(questionHash({ hypothesisId, prompt: current }))) {
    current = `${current} 더 좁혀 근거가 될 기록의 범위를 지정해 달라.`;
  }
  return current;
}

function noteAsked(ledger: JudgmentLedger, decision: DecisionRecord): JudgmentLedger {
  const hash = questionHash(decision);
  if (ledger.askedQuestionHashes.includes(hash)) return ledger;
  return { ...ledger, askedQuestionHashes: [...ledger.askedQuestionHashes, hash] };
}

function noteAskedForAct(ledger: JudgmentLedger, decision: DecisionRecord, act: FounderAnswerAct): JudgmentLedger {
  const target = act.targetHypothesisId ?? decision.hypothesisId;
  if ((act.kind === 'payment_claim' || act.kind === 'absence_claim') && target !== decision.hypothesisId) return ledger;
  return noteAsked(ledger, decision);
}

function hasWeakPayment(ledger: JudgmentLedger): boolean {
  return ledger.bindings.some((item) => item.hypothesisId === 'h-business-model' && item.classReason === 'weak-payment');
}

function hasAbsence(ledger: JudgmentLedger): boolean {
  return ledger.bindings.some((item) => item.hypothesisId === 'h-business-model' && item.classReason === 'absence');
}

function hasPaymentFact(ledger: JudgmentLedger): boolean {
  return ledger.bindings.some(
    (item) => item.hypothesisId === 'h-business-model' && item.evidenceClass === 'FACT' && item.classReason === 'payment-literal',
  );
}

function roleOf(item: HypothesisJudgment | undefined): HypothesisRole {
  return item?.role ?? 'active';
}

export function roleAllows(item: HypothesisJudgment | undefined, use: 'stage' | 'outcome' | 'critical' | 'candidates'): boolean {
  return HYPOTHESIS_ROLE_RULES[roleOf(item)][use];
}

function activeProblem(ledger: JudgmentLedger): HypothesisJudgment | undefined {
  const stored = ledger.hypotheses['h-problem'];
  if (stored && !roleAllows(stored, 'critical')) return ledger.hypotheses['h-problem-next'];
  return stored;
}

function emptyPlan(): ValidationPlan {
  return { status: 'not_required', targetHypothesisId: null, evidenceNeeded: '', passIf: '', failIf: '', pendingWork: '' };
}

function assignRoles(ledger: JudgmentLedger): JudgmentLedger {
  const preserved = new Set(ledger.preservedHypothesisIds ?? []);
  const customerConflict = ledger.conflicts.some((item) => item.hypothesisId === 'h-customer' && !item.resolved);
  const hypotheses: Record<string, HypothesisJudgment> = {};
  for (const [id, item] of Object.entries(ledger.hypotheses)) {
    let role: HypothesisRole = preserved.has(id) ? 'inactive-preserved' : 'active';
    if (id === 'h-customer' && customerConflict) role = 'conflict-side';
    hypotheses[id] = { ...item, role };
  }
  return { ...ledger, hypotheses };
}

function openConflict(ledger: JudgmentLedger, hypothesisId: string): UnresolvedConflict | undefined {
  return ledger.conflicts.find((item) => item.hypothesisId === hypothesisId && !item.resolved);
}

function listUncertainties(ledger: JudgmentLedger): OpenUncertainty[] {
  const list: OpenUncertainty[] = [];
  const customer = ledger.hypotheses['h-customer'];
  const problem = ledger.hypotheses['h-problem'];
  const currentProblem = activeProblem(ledger);
  const payer = ledger.hypotheses['h-payer'];
  const customerConflict = openConflict(ledger, 'h-customer');
  const problemConflict = roleAllows(problem, 'critical') ? openConflict(ledger, 'h-problem') : undefined;
  const modelConflict = openConflict(ledger, 'h-business-model');
  const absence = ledger.bindings.find((item) => item.classReason === 'absence');
  const fact = ledger.bindings.find((item) => item.classReason === 'payment-literal' && item.evidenceClass === 'FACT');
  const customerClaim = Boolean(customer && customer.evidenceClass === 'CLAIM' && customer.outcome !== 'conflict_unresolved') || Boolean(ledger.hypotheses['h-customer-next']?.evidenceClass === 'CLAIM' && customerConflict);
  const problemClaim = Boolean(currentProblem && roleAllows(currentProblem, 'outcome') && currentProblem.evidenceClass === 'CLAIM' && currentProblem.statement.trim());

  if (currentProblem && roleAllows(currentProblem, 'critical') && !currentProblem.statement.trim() && currentProblem.evidenceClass !== 'CLAIM') {
    list.push({ id: 'u-empty-problem', hypothesisId: currentProblem.id, blocksStage: true, resolvableByQuestion: true, evidenceIds: [] });
  }
  if (customerConflict) {
    list.push({ id: 'u-conflict-h-customer', hypothesisId: 'h-customer', blocksStage: true, resolvableByQuestion: true, evidenceIds: [customerConflict.leftId, customerConflict.rightId] });
  }
  if (problemConflict) {
    list.push({ id: 'u-conflict-h-problem', hypothesisId: 'h-problem', blocksStage: true, resolvableByQuestion: true, evidenceIds: [problemConflict.leftId, problemConflict.rightId] });
  }
  if (absence && !fact) {
    list.push({ id: 'u-record', hypothesisId: 'h-business-model', blocksStage: false, resolvableByQuestion: false, evidenceIds: [absence.id] });
  }
  if (!customerConflict && customer && customer.evidenceClass !== 'CLAIM' && customer.statement.trim()) {
    const doc = ledger.bindings.find((item) => item.id === 'b-customer-doc');
    list.push({ id: 'u-unconfirmed-h-customer', hypothesisId: 'h-customer', blocksStage: true, resolvableByQuestion: true, evidenceIds: doc ? [doc.id] : [] });
  }
  if (customerClaim && hasWeakPayment(ledger) && !hasAbsence(ledger) && !hasPaymentFact(ledger) && payer?.evidenceClass !== 'CLAIM') {
    const weak = ledger.bindings.find((item) => item.classReason === 'weak-payment');
    list.push({ id: 'u-payer', hypothesisId: 'h-payer', blocksStage: false, resolvableByQuestion: true, evidenceIds: weak ? [weak.id] : [] });
  }
  if (!problemConflict && currentProblem && roleAllows(currentProblem, 'critical') && currentProblem.statement.trim() && currentProblem.evidenceClass !== 'CLAIM') {
    const doc = ledger.bindings.find((item) => item.hypothesisId === currentProblem.id);
    list.push({ id: `u-unconfirmed-${currentProblem.id}`, hypothesisId: currentProblem.id, blocksStage: true, resolvableByQuestion: true, evidenceIds: doc ? [doc.id] : [] });
  }
  if (customerClaim && problemClaim && payer?.evidenceClass !== 'CLAIM' && !list.some((item) => item.id === 'u-payer')) {
    list.push({ id: 'u-payer', hypothesisId: 'h-payer', blocksStage: false, resolvableByQuestion: true, evidenceIds: [] });
  }
  if (modelConflict) {
    list.push({ id: 'u-conflict-h-business-model', hypothesisId: 'h-business-model', blocksStage: false, resolvableByQuestion: true, evidenceIds: [modelConflict.leftId, modelConflict.rightId] });
  }
  if (fact && fact.projectAttribution !== 'accepted' && !modelConflict) {
    list.push({ id: 'u-attribution', hypothesisId: 'h-business-model', blocksStage: false, resolvableByQuestion: false, evidenceIds: [fact.id] });
  }
  if (customerClaim && problemClaim && payer?.evidenceClass === 'CLAIM' && !fact && !absence && !modelConflict && ledger.stageId !== 'S2') {
    list.push({ id: 'u-model-record', hypothesisId: 'h-business-model', blocksStage: false, resolvableByQuestion: false, evidenceIds: [] });
  }
  const criterion = ledger.criteria.find((item) => item.hypothesisId === 'h-business-model');
  const repeat = ledger.hypotheses['h-repeat'];
  if (ledger.stageId === 'S2' && criterion?.passIf && criterion.failIf && repeat?.evidenceClass !== 'CLAIM' && !customerConflict) {
    list.push({ id: 'u-repeat', hypothesisId: 'h-repeat', blocksStage: false, resolvableByQuestion: true, evidenceIds: [] });
  }
  return list;
}

function buildValidationPlan(ledger: JudgmentLedger, uncertainties: OpenUncertainty[]): ValidationPlan {
  const pending = uncertainties.filter((item) => !item.resolvableByQuestion);
  if (pending.length === 0) return emptyPlan();
  const top = pending[0]!;
  const criterion = ledger.criteria.find((item) => item.hypothesisId === top.hypothesisId);
  const evidenceNeeded =
    top.id === 'u-record'
      ? '주체와 금액이 적힌 문자 기록'
      : top.id === 'u-attribution'
        ? '선택한 문자 기록이 이 사업의 거래인지에 대한 귀속 판단'
        : top.id === 'u-model-record'
          ? '사업 가설을 판정할 문자 기록'
          : top.evidenceIds.join(', ') || top.id;
  return {
    status: 'proposed',
    targetHypothesisId: top.hypothesisId,
    evidenceNeeded,
    passIf: criterion?.passIf || '귀속이 accepted 이고 기준을 통과하는 기록이 있다',
    failIf: criterion?.failIf || '기록이 이 사업의 거래로 확인되지 않는다',
    pendingWork: '계획은 제안만 되었다. 엔진은 executed 를 설정하지 않는다.',
  };
}

function stageReasonFor(ledger: JudgmentLedger, uncertainties: OpenUncertainty[]): string {
  const blocking = uncertainties.find((item) => item.blocksStage);
  if (blocking) return `단계는 ${ledger.stageId}다. 사유는 ${blocking.id}이며 근거는 ${blocking.evidenceIds.join(', ') || '없음'}이다.`;
  return `단계는 ${ledger.stageId}다. 단계 상승은 선택 이유가 아니다.`;
}

function sevenReady(ledger: JudgmentLedger): boolean {
  return Boolean(
    ledger.judgment &&
      ledger.whyPossible &&
      ledger.whyFail &&
      ledger.evidenceMap.length > 0 &&
      ledger.criticalUnknown &&
      ledger.decisionChangingEvidence &&
      ledger.validationPriority,
  );
}

function refreshNarrative(ledger: JudgmentLedger): JudgmentLedger {
  const customer = ledger.hypotheses['h-customer'];
  const problem = ledger.hypotheses['h-problem'];
  const payer = ledger.hypotheses['h-payer'];
  const model = ledger.hypotheses['h-business-model'];
  const successor = ledger.hypotheses['h-customer-next'];
  const nextProblem = ledger.hypotheses['h-problem-next'];
  const criterion = ledger.criteria.find((item) => item.hypothesisId === 'h-business-model');
  const absence = ledger.bindings.find((item) => item.hypothesisId === 'h-business-model' && item.classReason === 'absence');
  const weak = ledger.bindings.find((item) => item.hypothesisId === 'h-business-model' && item.classReason === 'weak-payment');
  let judgment = `문서의 고객 「${customer?.statement ?? ''}」, 문제 「${problem?.statement ?? ''}」, 수익 「${ledger.businessStatement}」은 아직 확인되지 않은 가정이다.`;
  let whyPossible = '';
  let whyFail = '';

  if (customer?.outcome === 'conflict_unresolved' || customer?.role === 'conflict-side') {
    const visibleProblem = problem && !roleAllows(problem, 'critical') ? nextProblem : problem;
    const activeProblemText = visibleProblem?.statement?.trim() && visibleProblem.evidenceClass === 'CLAIM'
      ? `활성 판단의 문제는 「${visibleProblem.statement}」이다. 이 문제는 새 고객의 문제이며 과거 문제와 다르다.`
      : '활성 판단의 문제는 아직 확인되지 않았다.';
    const payerText =
      payer?.evidenceClass === 'CLAIM' && payer.statement
        ? ` 활성 고객의 결제 주체는 「${payer.statement}」 CLAIM이다. 금액과 기록은 아직 없다.`
        : '';
    judgment = `활성 판단의 고객은 새 CLAIM 「${successor?.statement ?? ''}」이다. ${activeProblemText}${payerText} 이전 고객 문장은 작업 기준에서 철회되었다. 과거 기록의 고객은 「${customer.statement}」이다. 과거 기록의 문제는 「${problem?.statement ?? ''}」이다. 이 문제는 이전 고객 짝에 속하며 활성 평가에서 제외되었다. 새 고객에 대한 판정이 아니다.`;
    whyPossible = '이전 고객 문장은 작업 기준에서 철회되었다. 새 고객 문장은 CLAIM이며 성공 가능성은 그 CLAIM을 넘지 않는다.';
    whyFail = 'h-customer의 충돌이 해소되기 전에는 단계 근거가 아니다.';
  } else if (problem?.role !== 'inactive-preserved' && problem?.outcome === 'conflict_unresolved') {
    judgment = `문제 문장이 충돌했다. 이전 문장은 「${problem.statement}」. 새 문장은 「${nextProblem?.statement ?? ''}」. 해소 전까지 작업 기준이 아니다.`;
    whyPossible = '이전 문제 문장은 보존되었다.';
    whyFail = 'h-problem의 충돌이 해소되기 전에는 단계 근거가 아니다.';
  } else if (customer?.evidenceClass === 'CLAIM' && problem?.evidenceClass === 'CLAIM') {
    judgment = `고객 확인과 문제 확인을 반영했다. h-customer는 ${customer.statement} CLAIM이다. h-problem은 ${problem.statement} CLAIM이다.`;
    whyPossible = 'h-customer와 h-problem이 창업자 확인을 받았다.';
    whyFail = 'h-customer와 h-problem은 확인일 뿐 결제 기록은 없다.';
  } else if (customer?.evidenceClass === 'CLAIM') {
    judgment = `고객 가설은 창업자 확인을 받았다. ${customer.statement} CLAIM.`;
    whyFail = '문제는 아직 확인되지 않았다.';
  } else if (problem?.evidenceClass === 'CLAIM') {
    judgment = `문제 가설은 창업자 확인을 받았다. ${problem.statement} CLAIM. 고객 「${customer?.statement ?? ''}」은 아직 가정이다.`;
    whyFail = '고객은 아직 확인되지 않았다.';
  }

  if (customer?.outcome !== 'conflict_unresolved' && payer?.evidenceClass === 'CLAIM' && payer.statement) {
    judgment = `${judgment} 지불자는 ${payer.statement} CLAIM이다.`;
  }
  const paymentFact = ledger.bindings.find(
    (item) => item.hypothesisId === 'h-business-model' && item.classReason === 'payment-literal' && item.evidenceClass === 'FACT',
  );
  const businessConflictOpen = ledger.conflicts.some((item) => item.hypothesisId === 'h-business-model' && !item.resolved);
  const businessConflictClosed = ledger.conflicts.some((item) => item.hypothesisId === 'h-business-model' && item.resolved);
  if (absence && !paymentFact) {
    judgment = `${judgment} ${absence.proposition} 이것은 h-business-model의 CLAIM이며 단계는 그대로다.`;
    whyFail = `${whyFail} ${absence.proposition}`.trim();
  }
  if (absence && paymentFact && model?.outcome === 'conflict_unresolved') {
    judgment = `${judgment} 판단은 충돌이다. 부재 근거 ${absence.id}는 CLAIM 「${absence.proposition}」이다. 문자 근거 ${paymentFact.id}는 FACT 「${paymentFact.proposition}」이고 귀속은 ${paymentFact.projectAttribution}다. 진위는 보장되지 않는다. 둘 다 검증된 사실이 아니고 확정된 사업 성과가 아니다. 해소 전에는 어느 쪽도 작업 기준으로 고르지 않는다.`;
    whyFail = `${whyFail} 부재 ${absence.id}와 문자 ${paymentFact.id}가 충돌한다. 귀속은 ${paymentFact.projectAttribution}다.`.trim();
  } else if (absence && paymentFact && businessConflictClosed && !businessConflictOpen) {
    judgment = `${judgment} 충돌은 해소되었다. 작업 기준으로 고른 근거는 ${paymentFact.id} FACT 「${paymentFact.proposition}」이고 귀속은 ${paymentFact.projectAttribution}다. 진위는 보장되지 않는다. 거래 성과는 미확인이다. 부재 근거 ${absence.id}는 이력으로 남아 활성 결론이 아니다. 귀속이 unreviewed이면 이 기록을 확정된 사업 성과로 두지 않는다.`;
  }
  const repeat = ledger.hypotheses['h-repeat'];
  if (repeat?.evidenceClass === 'CLAIM' && repeat.statement.trim()) {
    judgment = `${judgment} 반복 가설은 「${repeat.statement}」 CLAIM이다. 이 확인은 사업 성과의 확정이 아니다.`;
  }
  if (weak) judgment = `${judgment} ${weak.proposition} 주체·금액·기록이 없어 단계를 움직이지 않았다.`;
  if (ledger.pendingUnknownId && (REQUIRED_REVIEW_IDS as readonly string[]).includes(ledger.pendingUnknownId)) {
    const item = ledger.hypotheses[ledger.pendingUnknownId];
    judgment = `${judgment} 「${item?.statement || ledger.pendingUnknownId}」은 아직 확인되지 않았다.`;
  }
  if (model?.outcome === 'failed') {
    const reason = criterion?.failIf ?? '기준을 통과하지 못했다.';
    judgment = `h-business-model 가설이 기준을 통과하지 못했다. ${reason}`;
    whyFail = `${whyFail} ${reason} h-business-model은 failed다.`.trim();
    if (!whyPossible) whyPossible = 'h-customer와 h-problem이 창업자 확인을 받았다.';
  }
  if (model?.outcome === 'passed') {
    if (!whyPossible) whyPossible = 'h-business-model의 문자 기록과 귀속 수락이 기준을 통과했다.';
    if (!whyFail) whyFail = 'h-repeat는 아직 판정되지 않았다.';
  }

  const talked =
    customer?.evidenceClass === 'CLAIM' ||
    customer?.outcome === 'conflict_unresolved' ||
    problem?.evidenceClass === 'CLAIM' ||
    model?.outcome === 'failed' ||
    model?.outcome === 'passed' ||
    model?.outcome === 'conflict_unresolved' ||
    Boolean(absence) ||
    Boolean(weak) ||
    Boolean(paymentFact) ||
    Boolean(ledger.pendingUnknownId);
  const conflictEvidence = Boolean(absence && paymentFact && model?.outcome === 'conflict_unresolved');
  return {
    ...ledger,
    judgment,
    whyPossible,
    whyFail,
    evidenceMap: ledger.bindings.map(bindingToItem),
    criticalUnknown: ledger.uncertainties?.[0]?.id || ledger.criticalUnknown,
    decisionChangingEvidence: conflictEvidence
      ? `충돌 근거는 부재 ${absence?.id}와 문자 ${paymentFact?.id}다. 귀속은 ${paymentFact?.projectAttribution}다.`
      : talked
        ? '결제 주체·금액·기록이 나와야 단계가 움직인다.'
        : '',
    validationPriority: conflictEvidence
      ? '어느 근거를 작업 기준으로 둘지 해소한 뒤에도 귀속 수락이 있어야 한다.'
      : talked
        ? '주체·금액·기록이 있는 결제 기록과 문제 지표를 확인한다.'
        : '',
  };
}

function syncCompletion(ledger: JudgmentLedger): JudgmentLedger {
  if (ledger.reviewCompletion === 'closed_complete' || ledger.reviewCompletion === 'closed_incomplete') return ledger;
  return { ...ledger, reviewCompletion: sevenReady(ledger) ? 'decision_ready' : 'in_progress' };
}

function isAncestor(ledger: JudgmentLedger, commitId: string): boolean {
  const written = ledger.commitIds.indexOf(commitId);
  const head = ledger.commitIds.indexOf(ledger.headCommitId);
  return written >= 0 && head >= 0 && written < head;
}

function s3FactsReady(ledger: JudgmentLedger): boolean {
  const criterion = ledger.criteria.find((item) => item.hypothesisId === 'h-business-model');
  if (!criterion || !isAncestor(ledger, criterion.writtenAtCommitId)) return false;
  const payment = ledger.bindings.find(
    (item) => item.hypothesisId === 'h-business-model' && item.classReason === 'payment-literal' && item.evidenceClass === 'FACT',
  );
  const metric = ledger.bindings.find(
    (item) => item.hypothesisId === 'h-business-model' && item.classReason === 'metric:pass' && item.evidenceClass === 'FACT',
  );
  return Boolean(payment && metric && payment.projectAttribution === 'accepted' && metric.projectAttribution === 'accepted');
}

export function evaluateStage(ledger: JudgmentLedger): { stageId: SiStageId; verdictId: SiVerdictId } {
  if (ledger.hypotheses['h-customer']?.outcome === 'conflict_unresolved') return { stageId: 'S0', verdictId: 'insufficient_basis' };
  const storedProblem = ledger.hypotheses['h-problem'];
  if (roleAllows(storedProblem, 'stage') && storedProblem?.outcome === 'conflict_unresolved') {
    return { stageId: 'S0', verdictId: 'insufficient_basis' };
  }
  const customer = ledger.hypotheses['h-customer'];
  const problem = activeProblem(ledger);
  const customerClaim = customer?.evidenceClass === 'CLAIM' && customer.outcome !== 'conflict_unresolved';
  const problemClaim = Boolean(problem && roleAllows(problem, 'outcome') && problem.evidenceClass === 'CLAIM' && problem.statement.trim());
  if (!customerClaim || !problemClaim) return { stageId: 'S0', verdictId: 'insufficient_basis' };
  const model = ledger.hypotheses['h-business-model'];
  if (model?.outcome === 'passed' && s3FactsReady(ledger)) {
    if (ledger.hypotheses['h-repeat']?.outcome === 'passed') return { stageId: 'S4', verdictId: 'viable' };
    return { stageId: 'S3', verdictId: 'conditionally_viable' };
  }
  const payerClaim = ledger.hypotheses['h-payer']?.evidenceClass === 'CLAIM';
  const criterion = ledger.criteria.find((item) => item.hypothesisId === 'h-business-model');
  if (payerClaim && criterion?.passIf && criterion.failIf) return { stageId: 'S2', verdictId: 'judgment_deferred' };
  return { stageId: 'S1', verdictId: 'judgment_deferred' };
}

function reassess(ledger: JudgmentLedger, options?: { freezeStage?: boolean }): JudgmentLedger {
  const roled = assignRoles(ledger);
  const stage = options?.freezeStage
    ? { stageId: roled.stageId, verdictId: roled.verdictId }
    : evaluateStage(roled);
  const staged = { ...roled, stageId: stage.stageId, verdictId: stage.verdictId };
  const uncertainties = listUncertainties(staged);
  const critical = uncertainties[0];
  const narrated = refreshNarrative({
    ...staged,
    uncertainties,
    criticalUnknownHypothesisId: critical?.hypothesisId ?? '',
    criticalUnknown: critical?.id ?? '',
    stageReason: stageReasonFor(staged, uncertainties),
  });
  const validationPlan = buildValidationPlan(narrated, uncertainties);
  return syncCompletion({ ...narrated, validationPlan, uncertainties });
}

function applyStage(ledger: JudgmentLedger): JudgmentLedger {
  return reassess(ledger);
}

export function evaluateHypothesis(ledger: JudgmentLedger, hypothesisId: string): ValidationOutcome {
  const current = ledger.hypotheses[hypothesisId];
  if (!current) return 'not_run';
  if (current.outcome === 'conflict_unresolved') return 'conflict_unresolved';
  if (ledger.conflicts.some((item) => item.hypothesisId === hypothesisId && !item.resolved)) return 'conflict_unresolved';
  if (hypothesisId !== 'h-business-model') {
    if (current.outcome === 'passed' || current.outcome === 'failed') return current.outcome;
    return 'not_run';
  }
  const criterion = ledger.criteria.find((item) => item.hypothesisId === hypothesisId);
  const facts = ledger.bindings.filter((item) => item.hypothesisId === hypothesisId && item.evidenceClass === 'FACT');
  if (facts.length === 0) return current.outcome === 'failed' ? 'failed' : 'not_run';
  if (!criterion || !isAncestor(ledger, criterion.writtenAtCommitId)) return 'insufficient_record';
  const payment = facts.find((item) => item.classReason === 'payment-literal');
  const metricPass = facts.find((item) => item.classReason === 'metric:pass');
  const metricFail = facts.find((item) => item.classReason === 'metric:fail');
  const accepted = (item: HypothesisEvidenceBinding | undefined) => item?.projectAttribution === 'accepted';
  if (!payment || payment.projectAttribution !== 'accepted') return 'insufficient_record';
  if (metricFail) return accepted(metricFail) ? 'failed' : 'insufficient_record';
  if (!metricPass) return 'insufficient_record';
  if (!accepted(metricPass)) return 'insufficient_record';
  return 'passed';
}

function storeOutcome(ledger: JudgmentLedger, hypothesisId: string): JudgmentLedger {
  const outcome = evaluateHypothesis(ledger, hypothesisId);
  const current = ledger.hypotheses[hypothesisId];
  if (!current || current.outcome === outcome) return applyStage(ledger);
  return applyStage(replaceHypothesis(ledger, hypothesisId, { outcome }));
}

function clearPending(ledger: JudgmentLedger): JudgmentLedger {
  return { ...ledger, pendingUnknownId: null };
}

function founderBinding(ledger: JudgmentLedger, id: string, hypothesisId: string, proposition: string, classReason: string, evidenceClass: SiEvidenceClass): HypothesisEvidenceBinding {
  return binding({
    id,
    hypothesisId,
    proposition,
    sourceKind: 'founder_answer',
    sourceRef: 'founder',
    evidenceClass,
    classReason,
    commitId: ledger.headCommitId,
  });
}

function commitAffirm(ledger: JudgmentLedger, hypothesisId: string, proposition: string): JudgmentLedger {
  const current = ledger.hypotheses[hypothesisId] ?? hypothesis(hypothesisId, '');
  const statement = current.statement.trim() ? current.statement : proposition.trim() || current.statement;
  const next = replaceHypothesis(clearPending(ledger), hypothesisId, { statement, evidenceClass: 'CLAIM', alreadyKnown: true });
  const withBinding: JudgmentLedger = {
    ...next,
    bindings: [...next.bindings, founderBinding(ledger, `b-affirm-${hypothesisId}-${ledger.commitIds.length}`, hypothesisId, proposition || statement, 'founder-confirm', 'CLAIM')],
  };
  return applyStage(bump(withBinding));
}

function commitReplace(ledger: JudgmentLedger, hypothesisId: string, nextStatement: string): JudgmentLedger {
  const current = ledger.hypotheses[hypothesisId] ?? hypothesis(hypothesisId, '');
  const oldBinding = [...ledger.bindings].reverse().find((item) => item.hypothesisId === hypothesisId);
  const leftId = oldBinding?.id ?? `b-${hypothesisId}-preserved`;
  const rightId = `b-${hypothesisId}-next-${ledger.commitIds.length}`;
  const base = oldBinding
    ? ledger
    : {
        ...ledger,
        bindings: [...ledger.bindings, founderBinding(ledger, leftId, hypothesisId, current.statement, 'preserved-statement', current.evidenceClass)],
      };
  const conflicted = replaceHypothesis(clearPending(base), hypothesisId, {
    statement: current.statement,
    outcome: 'conflict_unresolved',
    evidenceClass: 'CONFLICT',
  });
  const successorId = hypothesisId === 'h-customer' ? 'h-customer-next' : `${hypothesisId}-next`;
  let opened = replaceHypothesis(conflicted, successorId, {
    statement: nextStatement,
    evidenceClass: 'CLAIM',
    outcome: 'not_run',
    alreadyKnown: true,
    pairedCustomerId: hypothesisId === 'h-problem' ? ledger.activePairCustomerId : null,
  });
  if (hypothesisId === 'h-customer') {
    opened = replaceHypothesis(opened, 'h-problem', { alreadyKnown: true });
    opened = replaceHypothesis(opened, 'h-problem-next', {
      statement: '',
      evidenceClass: 'ASSUMPTION',
      outcome: 'not_run',
      alreadyKnown: false,
      pairedCustomerId: 'h-customer-next',
    });
    opened = { ...opened, pairBroken: true, preservedHypothesisIds: [...new Set([...(opened.preservedHypothesisIds ?? []), 'h-problem'])] };
  }
  const withBindings: JudgmentLedger = {
    ...opened,
    bindings: [
      ...opened.bindings,
      founderBinding(ledger, rightId, successorId, nextStatement, hypothesisId === 'h-customer' ? 'customer-revision' : 'problem-revision', 'CLAIM'),
    ],
    conflicts: [...opened.conflicts, { hypothesisId, leftId, rightId, resolved: false }],
  };
  return applyStage(bump(withBindings));
}

function commitUnknown(ledger: JudgmentLedger, decision: DecisionRecord, hypothesisId: string): JudgmentLedger {
  const hash = questionHash(decision);
  const hashes = ledger.askedQuestionHashes.includes(hash) ? ledger.askedQuestionHashes : [...ledger.askedQuestionHashes, hash];
  const count = (ledger.unknownCounts[hypothesisId] ?? 0) + 1;
  return applyStage(
    bump({
      ...ledger,
      askedQuestionHashes: hashes,
      unknownCounts: { ...ledger.unknownCounts, [hypothesisId]: count },
      pendingUnknownId: hypothesisId,
    }),
  );
}

function commitReject(ledger: JudgmentLedger, hypothesisId: string, proposition: string): JudgmentLedger {
  const withBinding: JudgmentLedger = {
    ...clearPending(ledger),
    bindings: [...ledger.bindings, founderBinding(ledger, `b-reject-${hypothesisId}-${ledger.commitIds.length}`, hypothesisId, proposition || hypothesisId, 'reject', 'ASSUMPTION')],
    pendingUnknownId: hypothesisId,
  };
  return applyStage(bump(withBinding));
}

function commitWeakPayment(ledger: JudgmentLedger, proposition: string): JudgmentLedger {
  const stageId = ledger.stageId;
  const verdictId = ledger.verdictId;
  const classed = replaceHypothesis(clearPending(ledger), 'h-business-model', { evidenceClass: 'CLAIM', outcome: 'not_run' });
  const withBinding: JudgmentLedger = {
    ...classed,
    bindings: [...classed.bindings, founderBinding(ledger, `b-weak-payment-${ledger.commitIds.length}`, 'h-business-model', proposition, 'weak-payment', 'CLAIM')],
  };
  const next = applyStage(bump(withBinding));
  return reassess({ ...next, stageId, verdictId }, { freezeStage: true });
}

function commitAbsence(ledger: JudgmentLedger, proposition: string): JudgmentLedger {
  const hasFact = ledger.bindings.some((item) => item.hypothesisId === 'h-business-model' && item.evidenceClass === 'FACT');
  const classed = hasFact ? clearPending(ledger) : replaceHypothesis(clearPending(ledger), 'h-business-model', { evidenceClass: 'CLAIM' });
  const withBinding: JudgmentLedger = {
    ...classed,
    bindings: [...ledger.bindings, founderBinding(ledger, 'b-absence', 'h-business-model', proposition, 'absence', 'CLAIM')],
  };
  return contradictIfNeeded(applyStage(bump(withBinding)));
}

function contradictIfNeeded(ledger: JudgmentLedger): JudgmentLedger {
  const absence = ledger.bindings.find((item) => item.hypothesisId === 'h-business-model' && item.classReason === 'absence');
  const fact = ledger.bindings.find((item) => item.hypothesisId === 'h-business-model' && item.evidenceClass === 'FACT');
  if (!absence || !fact) return ledger;
  if (ledger.hypotheses['h-business-model']?.outcome === 'conflict_unresolved') return ledger;
  return applyConflict(ledger, 'h-business-model', absence.id, fact.id);
}

function applyConflict(ledger: JudgmentLedger, hypothesisId: string, leftId: string, rightId: string): JudgmentLedger {
  const next = replaceHypothesis(ledger, hypothesisId, { outcome: 'conflict_unresolved', evidenceClass: 'CONFLICT' });
  const conflicts = next.conflicts.some((item) => item.hypothesisId === hypothesisId && item.leftId === leftId && item.rightId === rightId)
    ? next.conflicts
    : [...next.conflicts, { hypothesisId, leftId, rightId, resolved: false }];
  return applyStage({ ...next, conflicts });
}

function appliedResult(before: JudgmentLedger, after: JudgmentLedger, targetHypothesisId: string, matches: boolean, bindingIds: string[], unchangedReason: string | null): FounderAnswerApplied {
  return {
    ledger: after,
    attributionMatchesDecision: matches,
    targetHypothesisId,
    changedHypothesisIds: Object.keys(after.hypotheses).filter((id) => JSON.stringify(before.hypotheses[id]) !== JSON.stringify(after.hypotheses[id])),
    bindingIds,
    stageBefore: before.stageId,
    stageAfter: after.stageId,
    verdictBefore: before.verdictId,
    verdictAfter: after.verdictId,
    judgmentBefore: before.judgment,
    judgmentAfter: after.judgment,
    criticalUnknownHypothesisId: after.criticalUnknownHypothesisId,
    unchangedReason,
  };
}

export function applyFounderAnswer(ledger: JudgmentLedger, decision: DecisionRecord, act: FounderAnswerAct): FounderAnswerApplied {
  const target = act.targetHypothesisId ?? decision.hypothesisId;
  const matches = target === decision.hypothesisId;
  if (act.kind === 'affirm' && target === 'h-problem' && ledger.pairBroken && ledger.hypotheses['h-problem']?.alreadyKnown) {
    return appliedResult(ledger, noteAsked(ledger, decision), target, matches, [], '옛 문제는 새 고객의 짝이 아니다');
  }
  const beforeIds = new Set(ledger.bindings.map((item) => item.id));
  let after = ledger;
  if (act.kind === 'affirm') after = commitAffirm(ledger, target, act.proposition ?? '');
  else if (act.kind === 'replace') after = commitReplace(ledger, target, act.nextStatement);
  else if (act.kind === 'unknown') after = commitUnknown(ledger, decision, target);
  else if (act.kind === 'reject') after = commitReject(ledger, target, act.proposition ?? '');
  else if (act.kind === 'payment_claim') after = commitWeakPayment(ledger, act.proposition);
  else after = commitAbsence(ledger, act.proposition);
  after = noteAskedForAct(after, decision, act);
  const bindingIds = after.bindings.filter((item) => !beforeIds.has(item.id)).map((item) => item.id);
  return appliedResult(ledger, after, target, matches, bindingIds, null);
}

export function resolveConflict(
  ledger: JudgmentLedger,
  input: { hypothesisId: string; evidenceId: string; reason: string },
): JudgmentLedger {
  if (!input.reason.trim()) throw new Error('resolveConflict requires a reason');
  const chosen = ledger.bindings.find((item) => item.id === input.evidenceId);
  if (!chosen) throw new Error(`resolveConflict missing evidence ${input.evidenceId}`);
  const conflicts = ledger.conflicts.map((item) => (item.hypothesisId === input.hypothesisId ? { ...item, resolved: true } : item));
  let next = replaceHypothesis({ ...clearPending(ledger), conflicts }, input.hypothesisId, {
    statement: chosen.proposition,
    evidenceClass: chosen.evidenceClass === 'FACT' ? 'FACT' : 'CLAIM',
    outcome: 'not_run',
    alreadyKnown: true,
  });
  let preserved = [...(ledger.preservedHypothesisIds ?? [])];
  if (input.hypothesisId === 'h-customer' && chosen.hypothesisId === 'h-customer-next') {
    if (!preserved.includes('h-problem')) preserved.push('h-problem');
    next = { ...next, activePairCustomerId: 'h-customer-next', pairBroken: false, preservedHypothesisIds: preserved };
  }
  if (input.hypothesisId === 'h-customer' && chosen.hypothesisId !== 'h-customer-next') {
    preserved = preserved.filter((id) => id !== 'h-problem');
    if (!preserved.includes('h-problem-next')) preserved.push('h-problem-next');
    next = replaceHypothesis(next, 'h-problem', { alreadyKnown: false });
    next = { ...next, activePairCustomerId: 'h-customer', pairBroken: false, preservedHypothesisIds: preserved };
  }
  const withReason: JudgmentLedger = {
    ...next,
    bindings: [...next.bindings, founderBinding(ledger, `b-conflict-resolution-${input.hypothesisId}-${ledger.commitIds.length}`, input.hypothesisId, input.reason, 'conflict-resolution', 'CLAIM')],
  };
  const bumped = bump(withReason);
  const outcome = evaluateHypothesis(bumped, input.hypothesisId);
  const landed = outcome === 'passed' ? 'insufficient_record' : outcome;
  return reassess(replaceHypothesis(bumped, input.hypothesisId, { outcome: landed }));
}

function judgmentChangeClass(before: JudgmentLedger, after: JudgmentLedger): JudgmentChangeClass {
  const required = ['h-customer', 'h-problem', 'h-payer', 'h-business-model', 'h-repeat'];
  const conflictFlip = required.some((id) => (before.hypotheses[id]?.outcome === 'conflict_unresolved') !== (after.hypotheses[id]?.outcome === 'conflict_unresolved'));
  if (conflictFlip) return 'conflict';
  const identity = ['h-customer', 'h-problem'].some((id) => {
    const left = before.hypotheses[id];
    const right = after.hypotheses[id];
    if (!left || !right) return false;
    if (left.evidenceClass === 'ASSUMPTION' && right.evidenceClass === 'CLAIM') return true;
    if (left.statement !== right.statement && right.evidenceClass === 'CLAIM') return true;
    return false;
  });
  const payer = before.hypotheses['h-payer'];
  const payerAfter = after.hypotheses['h-payer'];
  const payerIdentity = Boolean(payer && payerAfter && !payer.statement.trim() && payerAfter.statement.trim() && payerAfter.evidenceClass === 'CLAIM');
  if (identity || payerIdentity) return 'identity';
  if (before.judgment !== after.judgment || before.stageId !== after.stageId || before.verdictId !== after.verdictId) return 'annotation';
  return 'none';
}

function uncertaintyWasClosed(before: JudgmentLedger, after: JudgmentLedger, id: string): boolean {
  if ((after.uncertainties ?? []).some((item) => item.id === id)) return false;
  if (id === 'u-empty-problem') {
    const hypothesisId = (before.uncertainties ?? []).find((item) => item.id === id)?.hypothesisId;
    const slot = hypothesisId ? after.hypotheses[hypothesisId] : undefined;
    return Boolean(slot && roleAllows(slot, 'critical') && slot.statement.trim() && slot.evidenceClass === 'CLAIM');
  }
  if (id === 'u-attribution') {
    const fact = after.bindings.find((item) => item.classReason === 'payment-literal' && item.evidenceClass === 'FACT');
    return fact?.projectAttribution === 'accepted';
  }
  return true;
}

function previewRecord(before: JudgmentLedger, after: JudgmentLedger, candidateId: string, hypothesisId: string, act: string): PreviewBranchRecord {
  const outcomeBefore = before.hypotheses[hypothesisId]?.outcome ?? 'missing';
  const outcomeAfter = after.hypotheses[hypothesisId]?.outcome ?? 'missing';
  const closedUncertaintyIds = (before.uncertainties ?? []).map((item) => item.id).filter((id) => uncertaintyWasClosed(before, after, id));
  return {
    candidateId,
    hypothesisId,
    act,
    stageBefore: before.stageId,
    stageAfter: after.stageId,
    stageChanged: before.stageId !== after.stageId,
    verdictBefore: before.verdictId,
    verdictAfter: after.verdictId,
    verdictChanged: before.verdictId !== after.verdictId,
    judgmentBefore: before.judgment,
    judgmentAfter: after.judgment,
    judgmentChanged: before.judgment !== after.judgment,
    judgmentChangeClass: judgmentChangeClass(before, after),
    criticalUnknownBefore: before.criticalUnknownHypothesisId,
    criticalUnknownAfter: after.criticalUnknownHypothesisId,
    outcomeBefore,
    outcomeAfter,
    failureDropsStage: STAGE_RANK[after.stageId] < STAGE_RANK[before.stageId],
    bindingIdsBefore: before.bindings.map((item) => item.id),
    bindingIdsAfter: after.bindings.map((item) => item.id),
    uncertaintyIdsBefore: (before.uncertainties ?? []).map((item) => item.id),
    uncertaintyIdsAfter: (after.uncertainties ?? []).map((item) => item.id),
    closedUncertaintyIds,
  };
}

function fakeDecision(hypothesisId: string): DecisionRecord {
  return {
    id: 'preview',
    committedBeforeAnswer: true,
    candidates: [],
    eliminated: [],
    selectedId: 'preview',
    tieBreak: 'none',
    hypothesisId,
    prompt: 'preview',
    priorityReason: '',
  };
}

function promptFor(ledger: JudgmentLedger, hypothesisId: string): string {
  const statement = ledger.hypotheses[hypothesisId]?.statement ?? '';
  if (hypothesisId === 'h-customer') return askedPrompt(ledger, hypothesisId, `이 서비스를 가장 필요로 하는 사람이 「${statement}」인지 확인해 달라.`);
  if (hypothesisId === 'h-problem' || hypothesisId === 'h-problem-next') {
    if (!statement.trim()) {
      const customer = ledger.hypotheses['h-customer-next']?.statement ?? ledger.hypotheses['h-customer']?.statement ?? '';
      return askedPrompt(ledger, hypothesisId, `새 고객과 문제의 짝이 비어 있다. ${customer} 고객이 겪는 불편은 무엇입니까?`);
    }
    return askedPrompt(ledger, hypothesisId, `「${statement}」가 맞는지 확인해 달라.`);
  }
  if (hypothesisId === 'h-payer') {
    const activeCustomer = ledger.pairBroken
      ? (ledger.hypotheses['h-customer-next']?.statement ?? '')
      : (ledger.hypotheses['h-customer']?.statement ?? '');
    if (hasWeakPayment(ledger) && !hasPaymentFact(ledger) && ledger.hypotheses['h-payer']?.evidenceClass !== 'CLAIM') {
      return askedPrompt(
        ledger,
        hypothesisId,
        `이미 알려진 정보는 고객 「${activeCustomer}」 CLAIM과 주체·금액·기록이 없는 결제 주장이다. 이 결제는 누구의 결제인가? 금액과 거래 기록은 이 질문으로 생기지 않는다.`,
      );
    }
    if (ledger.pairBroken) {
      return askedPrompt(ledger, hypothesisId, `활성 고객 「${activeCustomer}」의 결제 주체는 누구인가? 과거 문제 문장은 이 질문의 대상이 아니다.`);
    }
    return askedPrompt(ledger, hypothesisId, '누가 비용을 지불하는지 확인해 달라.');
  }
  if (hypothesisId === 'h-channel') return askedPrompt(ledger, hypothesisId, '어느 채널에서 만나는지 확인해 달라.');
  if (hypothesisId === 'h-repeat') {
    return askedPrompt(
      ledger,
      hypothesisId,
      '같은 고객에게서 반복 사용이 다시 나타나는지 확인해 달라. 이 질문은 결제 기록을 만들지 않고 사업 성과를 확정하지 않는다.',
    );
  }
  return askedPrompt(ledger, hypothesisId, `${hypothesisId}를 확인해 달라.`);
}

function previewQuestionAct(ledger: JudgmentLedger, hypothesisId: string, candidateId: string, act: 'affirm' | 'replace' | 'unknown'): PreviewBranchRecord {
  const before = cloneLedger(ledger);
  const decision = fakeDecision(hypothesisId);
  const statement = before.hypotheses[hypothesisId]?.statement ?? '';
  const applied =
    act === 'affirm'
      ? applyFounderAnswer(before, decision, { kind: 'affirm', targetHypothesisId: hypothesisId, proposition: statement.trim() || `확인된 ${hypothesisId} 문장` })
      : act === 'replace'
        ? applyFounderAnswer(before, decision, { kind: 'replace', targetHypothesisId: hypothesisId, nextStatement: `${statement || hypothesisId} 와 다른 작업 기준` })
        : applyFounderAnswer(before, decision, { kind: 'unknown', targetHypothesisId: hypothesisId });
  return previewRecord(before, applied.ledger, candidateId, hypothesisId, act);
}

function questionCandidate(ledger: JudgmentLedger, hypothesisId: string): DecisionCandidate {
  const id = hypothesisId === 'h-problem-next' ? 'q-problem-next' : `q-${hypothesisId.replace('h-', '')}`;
  const previews = (['affirm', 'replace', 'unknown'] as const).map((act) => previewQuestionAct(ledger, hypothesisId, id, act));
  return {
    id,
    hypothesisId,
    actionKind: 'question',
    alreadyKnown: ledger.hypotheses[hypothesisId]?.alreadyKnown ?? false,
    resolvableByQuestion: (ledger.unknownCounts[hypothesisId] ?? 0) < 2,
    branches: previews.map((item) => ({
      id: `${id}-${item.act}`,
      stageId: item.stageAfter,
      verdictId: item.verdictAfter,
      dropsStage: item.failureDropsStage,
      judgmentChanges: item.judgmentChanged,
    })),
    priorityReason: '',
    prompt: promptFor(ledger, hypothesisId),
    previews,
  };
}

function previewValidation(ledger: JudgmentLedger, candidateId: string, act: string): PreviewBranchRecord {
  const before = cloneLedger(ledger);
  const decision = fakeDecision('h-business-model');
  let after = before;
  if (act === 'payment_claim') after = applyFounderAnswer(before, decision, { kind: 'payment_claim', proposition: '결제 주장의 구조 자리표시', targetHypothesisId: 'h-business-model' }).ledger;
  else if (act === 'absence_claim') after = applyFounderAnswer(before, decision, { kind: 'absence_claim', proposition: ABSENCE_SENTENCE, targetHypothesisId: 'h-business-model' }).ledger;
  else if (act === 'literal_unreviewed') {
    after = bindLiteralFact(before, { hypothesisId: 'h-business-model', recordText: '문자 기록 자리표시', role: 'payment-literal' }).ledger;
  } else {
    after = defineCriterion(before, { hypothesisId: 'h-business-model', measure: '기준', passIf: '통과 조건', failIf: '실패 조건', requiredLiteralScopes: [] });
  }
  return previewRecord(before, after, candidateId, 'h-business-model', act);
}

function validationCandidate(ledger: JudgmentLedger): DecisionCandidate {
  const id = 'v-business-model';
  const previews = ['payment_claim', 'absence_claim', 'literal_unreviewed', 'criterion_defined'].map((act) => previewValidation(ledger, id, act));
  return {
    id,
    hypothesisId: 'h-business-model',
    actionKind: 'validation',
    alreadyKnown: false,
    resolvableByQuestion: false,
    branches: previews.slice(0, 3).map((item) => ({
      id: `${id}-${item.act}`,
      stageId: item.stageAfter,
      verdictId: item.verdictAfter,
      dropsStage: item.failureDropsStage,
      judgmentChanges: item.judgmentChanged,
    })),
    priorityReason: '',
    prompt: askedPrompt(
      ledger,
      'h-business-model',
      hasAbsence(ledger) && !hasPaymentFact(ledger)
        ? '부재는 결제 가설의 CLAIM이다. 문제 문장을 다시 확인해도 기록이 생기지 않는다. 주체와 금액이 적힌 문자 기록이 있어야 부재와 구분된다.'
        : '주체·금액·기록이 있는 결제 기록이나 기준을 확인해 달라.',
    ),
    previews,
  };
}

function resolveCandidate(ledger: JudgmentLedger, hypothesisId: string): DecisionCandidate {
  const id = `q-resolve-${hypothesisId}`;
  const conflict = [...ledger.conflicts].reverse().find((item) => item.hypothesisId === hypothesisId && !item.resolved);
  const successorStatement =
    hypothesisId === 'h-customer'
      ? (ledger.hypotheses['h-customer-next']?.statement ?? '')
      : hypothesisId === 'h-business-model'
        ? (ledger.bindings.find((item) => item.id === conflict?.rightId)?.proposition ?? '')
        : (ledger.hypotheses['h-problem-next']?.statement ?? '');
  const previousStatement =
    hypothesisId === 'h-business-model'
      ? (ledger.bindings.find((item) => item.id === conflict?.leftId)?.proposition ?? '')
      : (ledger.hypotheses[hypothesisId]?.statement ?? '');
  const prompt = askedPrompt(
    ledger,
    hypothesisId,
    `어느 근거를 ${hypothesisId}의 작업 기준으로 둘까요? 이전 「${previousStatement}」. 새 문장 「${successorStatement}」.`,
  );
  const previews: PreviewBranchRecord[] = [];
  for (const side of ['resolve_retain_new', 'resolve_retain_old'] as const) {
    const before = cloneLedger(ledger);
    const evidenceId = side === 'resolve_retain_new' ? conflict?.rightId : conflict?.leftId;
    const after = evidenceId ? resolveConflict(before, { hypothesisId, evidenceId, reason: '작업 기준을 명시한다' }) : before;
    previews.push(previewRecord(before, after, id, hypothesisId, side));
  }
  previews.push(previewQuestionAct(ledger, hypothesisId, id, 'unknown'));
  return {
    id,
    hypothesisId,
    actionKind: 'question',
    alreadyKnown: false,
    resolvableByQuestion: true,
    branches: previews.map((item) => ({
      id: `${id}-${item.act}`,
      stageId: item.stageAfter,
      verdictId: item.verdictAfter,
      dropsStage: item.failureDropsStage,
      judgmentChanges: item.judgmentChanged,
    })),
    priorityReason: '',
    prompt,
    previews,
  };
}

function deriveCandidates(ledger: JudgmentLedger): DecisionCandidate[] {
  const list: DecisionCandidate[] = [];
  for (const hypothesisId of ['h-customer', 'h-problem', 'h-payer', 'h-channel']) {
    const item = ledger.hypotheses[hypothesisId];
    if (!roleAllows(item, 'candidates')) continue;
    if ((ledger.unknownCounts[hypothesisId] ?? 0) >= 2) continue;
    if (ledger.hypotheses[hypothesisId]?.outcome === 'conflict_unresolved') {
      list.push(resolveCandidate(ledger, hypothesisId));
      continue;
    }
    list.push(questionCandidate(ledger, hypothesisId));
  }
  if (ledger.criticalUnknownHypothesisId === 'h-repeat' && (ledger.unknownCounts['h-repeat'] ?? 0) < 2) {
    if (ledger.hypotheses['h-repeat']?.outcome === 'conflict_unresolved') list.push(resolveCandidate(ledger, 'h-repeat'));
    else list.push(questionCandidate(ledger, 'h-repeat'));
  }
  const successor = ledger.hypotheses['h-problem-next'];
  if (
    successor &&
    roleAllows(successor, 'candidates') &&
    !successor.alreadyKnown &&
    (ledger.unknownCounts['h-problem-next'] ?? 0) < 2 &&
    !list.some((item) => item.hypothesisId === 'h-problem-next')
  ) {
    list.push(questionCandidate(ledger, 'h-problem-next'));
  }
  if (ledger.conflicts.some((item) => item.hypothesisId === 'h-business-model' && !item.resolved)) {
    list.push(resolveCandidate(ledger, 'h-business-model'));
  }
  list.push(validationCandidate(ledger));
  return list;
}

function closingPreview(item: DecisionCandidate, uncertaintyId: string): PreviewBranchRecord | undefined {
  return (item.previews ?? []).find((preview) => (preview.closedUncertaintyIds ?? []).includes(uncertaintyId));
}

function uncertaintyReason(winner: DecisionCandidate, cited: PreviewBranchRecord, criticalId: string, losers: DecisionCandidate[], ledger: JudgmentLedger): string {
  const closed = (cited.closedUncertaintyIds ?? []).join(', ') || '없음';
  const loserText = losers
    .slice(0, 3)
    .map((item) => `${item.id}는 ${criticalId}를 남긴다`)
    .join('. ');
  const sentence = cited.judgmentChanged ? '판단 문장이 달라진다' : '판단 문장만의 변화는 없다';
  const stageNote = cited.stageChanged ? '단계 값도 미리보기에 바뀌지만 선택 이유가 아니다' : '단계 변화는 없다';
  const grade = `판단 변화 등급은 ${cited.judgmentChangeClass}다.`;
  const needed = ledger.validationPlan?.evidenceNeeded || '주체와 금액이 적힌 문자 기록';
  const tail =
    winner.actionKind === 'question'
      ? '이 질문은 결제 기록을 만들지 않고 사업 성과를 확정하지 않는다.'
      : `필요한 증거는 ${needed}이다. 문제 문장을 다시 확인해도 기록이 생기지 않는다.`;
  return `${winner.id}의 ${cited.act} 분기가 가설 ${cited.hypothesisId}의 outcome을 ${cited.outcomeBefore}에서 ${cited.outcomeAfter}로 바꾼다. 닫히는 불확실성은 ${closed}다. ${loserText}. 핵심 불확실성 ${criticalId}를 닫는 분기다. ${sentence}. ${stageNote}. ${grade} ${tail}`;
}

function rankDerived(ledger: JudgmentLedger): DecisionRecord {
  const derived = deriveCandidates(ledger);
  const eliminated: EliminatedCandidate[] = [];
  const pool: DecisionCandidate[] = [];
  for (const item of derived) {
    if (item.alreadyKnown) eliminated.push({ candidateId: item.id, hypothesisId: item.hypothesisId, key: 'alreadyKnown' });
    else pool.push(item);
  }
  const unasked = pool.filter((item) => !ledger.askedQuestionHashes.includes(questionHash(item)));
  const source = unasked.length > 0 ? unasked : pool;
  const critical = ledger.uncertainties?.[0];
  const criticalId = critical?.id ?? '';
  const closers = source.filter((item) => Boolean(criticalId && closingPreview(item, criticalId)));
  const previews = derived.flatMap((item) => item.previews ?? []);
  if (!critical || closers.length === 0) {
    const blocked = source.map((item) => ({ candidateId: item.id, hypothesisId: item.hypothesisId, key: 'no-judgment-branch' as const }));
    const needed = ledger.validationPlan?.evidenceNeeded || criticalId || '추가 근거';
    return {
      id: `decision-${ledger.headCommitId}-v-record-needed`,
      committedBeforeAnswer: true,
      candidates: source,
      eliminated: [...eliminated, ...blocked].sort((left, right) => left.hypothesisId.localeCompare(right.hypothesisId)),
      selectedId: 'v-record-needed',
      tieBreak: 'uncertainty-closed',
      hypothesisId: critical?.hypothesisId ?? ledger.criticalUnknownHypothesisId,
      prompt: `핵심 불확실성 ${criticalId || '없음'}을 닫는 후보가 없다. 필요한 증거는 ${needed}다.`,
      priorityReason: `어떤 후보도 ${criticalId || '핵심 불확실성'}을 닫지 못한다. 문장 변경과 단계 변경은 해소가 아니다. 필요한 증거는 ${needed}다. 검증 계획은 ${ledger.validationPlan?.status ?? 'not_required'}다.`,
      previews,
    };
  }
  const rankedClosers = closers.slice().sort((left, right) => {
    const leftPreview = closingPreview(left, criticalId)!;
    const rightPreview = closingPreview(right, criticalId)!;
    const leftDirect = left.hypothesisId === critical.hypothesisId ? 1 : 0;
    const rightDirect = right.hypothesisId === critical.hypothesisId ? 1 : 0;
    if (leftDirect !== rightDirect) return rightDirect - leftDirect;
    const leftKind = left.resolvableByQuestion === critical.resolvableByQuestion ? 1 : 0;
    const rightKind = right.resolvableByQuestion === critical.resolvableByQuestion ? 1 : 0;
    if (leftKind !== rightKind) return rightKind - leftKind;
    const klass = CLASS_RANK[rightPreview.judgmentChangeClass] - CLASS_RANK[leftPreview.judgmentChangeClass];
    if (klass) return klass;
    return left.hypothesisId < right.hypothesisId ? -1 : left.hypothesisId > right.hypothesisId ? 1 : 0;
  });
  const winner = rankedClosers[0]!;
  const cited = closingPreview(winner, criticalId)!;
  const losers = source.filter((item) => item.id !== winner.id);
  const ranked = [...rankedClosers, ...source.filter((item) => !rankedClosers.includes(item))];
  const tieBreak: DecisionTieBreak = rankedClosers.length > 1 ? 'uncertainty-closed' : 'uncertainty-closed';
  const priorityReason = uncertaintyReason(winner, cited, criticalId, losers, ledger);
  return {
    id: `decision-${ledger.headCommitId}-${winner.id}`,
    committedBeforeAnswer: true,
    candidates: ranked.map((item) => ({ ...item, priorityReason: item.id === winner.id ? priorityReason : '' })),
    eliminated: eliminated.slice().sort((left, right) => left.hypothesisId.localeCompare(right.hypothesisId)),
    selectedId: winner.id,
    tieBreak,
    hypothesisId: winner.hypothesisId,
    prompt: winner.prompt,
    priorityReason,
    previews,
  };
}

function maxStageDelta(ledger: JudgmentLedger, item: DecisionCandidate): number {
  return Math.max(...item.branches.map((itemBranch) => Math.abs(STAGE_RANK[itemBranch.stageId] - STAGE_RANK[ledger.stageId])));
}

function suppliedTuple(ledger: JudgmentLedger, item: DecisionCandidate): number[] {
  const verdictChanges = item.branches.some((itemBranch) => itemBranch.verdictId !== ledger.verdictId) ? 1 : 0;
  const failDrops = item.branches.some((itemBranch) => itemBranch.dropsStage) ? 1 : 0;
  const validationFirst = item.resolvableByQuestion ? 0 : 1;
  const critical = item.hypothesisId === ledger.criticalUnknownHypothesisId ? 1 : 0;
  return [maxStageDelta(ledger, item), verdictChanges, failDrops, validationFirst, critical];
}

function suppliedReason(winner: DecisionCandidate, tieBreak: DecisionTieBreak, eliminated: EliminatedCandidate[]): string {
  if (tieBreak === 'stable-id') return `키 1부터 5가 같다. hypothesisId 사전순으로 ${winner.hypothesisId}를 고른다. tieBreak는 stable-id다. 사업 근거가 아니다.`;
  if (tieBreak === 'none') {
    const dropped = eliminated
      .filter((item) => item.key === 'no-stage-branch')
      .slice()
      .sort((left, right) => left.hypothesisId.localeCompare(right.hypothesisId))
      .map((item) => `${item.hypothesisId}는 단계 분기가 없어 키 1 이전에 탈락`)
      .join('. ');
    return dropped ? `${winner.hypothesisId}의 단계 변화가 남아 있는 후보 중 유일하다. ${dropped}.` : `${winner.hypothesisId}의 단계 변화가 남아 있는 후보 중 유일하다.`;
  }
  if (tieBreak === 'critical-unknown') return `${winner.hypothesisId}가 현재 critical unknown과 같다. tieBreak는 critical-unknown이다.`;
  if (tieBreak === 'stage-delta') return `${winner.hypothesisId}의 단계 변화 절대값이 더 크다. tieBreak는 stage-delta다.`;
  return `${winner.hypothesisId}를 ${tieBreak}로 고른다.`;
}

function rankSupplied(ledger: JudgmentLedger, supplied: DecisionCandidate[]): DecisionRecord {
  const source = supplied.filter((item) => !ledger.askedQuestionHashes.includes(questionHash(item)));
  for (const item of source) {
    if (item.branches.length < 3) throw new Error(`candidate ${item.id} needs three branches`);
  }
  const eliminated: EliminatedCandidate[] = [];
  const known: DecisionCandidate[] = [];
  for (const item of source) {
    if (item.alreadyKnown) eliminated.push({ candidateId: item.id, hypothesisId: item.hypothesisId, key: 'alreadyKnown' });
    else known.push(item);
  }
  const hasStageMove = known.some((item) => maxStageDelta(ledger, item) > 0);
  const rankedPool: DecisionCandidate[] = [];
  for (const item of known) {
    if (hasStageMove && maxStageDelta(ledger, item) === 0) eliminated.push({ candidateId: item.id, hypothesisId: item.hypothesisId, key: 'no-stage-branch' });
    else rankedPool.push(item);
  }
  if (rankedPool.length === 0) throw new Error('selectNextAction found no candidate');
  const ranked = rankedPool.slice().sort((left, right) => {
    const leftRank = suppliedTuple(ledger, left);
    const rightRank = suppliedTuple(ledger, right);
    for (let index = 0; index < leftRank.length; index += 1) {
      if (leftRank[index] !== rightRank[index]) return rightRank[index]! - leftRank[index]!;
    }
    return left.hypothesisId < right.hypothesisId ? -1 : left.hypothesisId > right.hypothesisId ? 1 : 0;
  });
  const winner = ranked[0]!;
  const second = ranked[1];
  let tieBreak: DecisionTieBreak = 'none';
  if (second) {
    const winnerRank = suppliedTuple(ledger, winner);
    const secondRank = suppliedTuple(ledger, second);
    const splitAt = winnerRank.findIndex((value, index) => value !== secondRank[index]);
    tieBreak = splitAt === -1 ? 'stable-id' : SUPPLIED_TIE_KEYS[splitAt]!;
  }
  const priorityReason = suppliedReason(winner, tieBreak, eliminated);
  return {
    id: `decision-${ledger.headCommitId}-${winner.id}`,
    committedBeforeAnswer: true,
    candidates: ranked.map((item) => ({ ...item, priorityReason: item.id === winner.id ? priorityReason : '' })),
    eliminated: eliminated.slice().sort((left, right) => left.hypothesisId.localeCompare(right.hypothesisId)),
    selectedId: winner.id,
    tieBreak,
    hypothesisId: winner.hypothesisId,
    prompt: winner.prompt,
    priorityReason,
  };
}

export function selectNextAction(ledger: JudgmentLedger, supplied?: DecisionCandidate[]): DecisionRecord {
  if (supplied) return rankSupplied(ledger, supplied);
  return rankDerived(ledger);
}

export function createProjectLedger(input: { customerStatement: string; problemStatement: string; businessStatement: string }): JudgmentLedger {
  const commitId = 'c0';
  const hypotheses: Record<string, HypothesisJudgment> = {
    'h-customer': hypothesis('h-customer', input.customerStatement),
    'h-problem': hypothesis('h-problem', input.problemStatement),
    'h-payer': hypothesis('h-payer', ''),
    'h-business-model': hypothesis('h-business-model', input.businessStatement),
    'h-repeat': hypothesis('h-repeat', ''),
    'h-one-liner': hypothesis('h-one-liner', input.businessStatement),
    'h-market': hypothesis('h-market', ''),
    'h-channel': hypothesis('h-channel', ''),
  };
  const bindings = [
    binding({ id: 'b-customer-doc', hypothesisId: 'h-customer', proposition: input.customerStatement, sourceKind: 'document', sourceRef: 'seed', evidenceClass: 'ASSUMPTION', classReason: 'document-assumption', commitId }),
    binding({ id: 'b-problem-doc', hypothesisId: 'h-problem', proposition: input.problemStatement, sourceKind: 'document', sourceRef: 'seed', evidenceClass: 'ASSUMPTION', classReason: 'document-assumption', commitId }),
    binding({ id: 'b-model-doc', hypothesisId: 'h-business-model', proposition: input.businessStatement, sourceKind: 'document', sourceRef: 'seed', evidenceClass: 'ASSUMPTION', classReason: 'document-assumption', commitId }),
  ];
  const ledger: JudgmentLedger = {
    headCommitId: commitId,
    commitIds: [commitId],
    stageId: 'S0',
    verdictId: 'insufficient_basis',
    judgment: '',
    whyPossible: '',
    whyFail: '',
    evidenceMap: [],
    criticalUnknown: 'h-customer',
    criticalUnknownHypothesisId: 'h-customer',
    decisionChangingEvidence: '',
    validationPriority: '',
    runStatus: 'open',
    reviewCompletion: 'in_progress',
    hypotheses,
    bindings,
    criteria: [],
    conflicts: [],
    askedQuestionHashes: [],
    pairBroken: false,
    businessStatement: input.businessStatement,
    activePairCustomerId: 'h-customer',
    unknownCounts: {},
    pendingUnknownId: null,
    uncertainties: [],
    validationPlan: emptyPlan(),
    preservedHypothesisIds: [],
    stageReason: '',
  };
  return reassess(ledger);
}

export function createSeedLedger(): JudgmentLedger {
  return createProjectLedger({ customerStatement: CUSTOMER_STATEMENT, problemStatement: PROBLEM_STATEMENT, businessStatement: '월 구독' });
}

export function bindLiteralFact(
  ledger: JudgmentLedger,
  input: { hypothesisId: string; recordText: string; role: 'payment-literal' | 'metric:pass' | 'metric:fail' },
): { ledger: JudgmentLedger; binding: HypothesisEvidenceBinding } {
  const created = binding({
    id: `b-fact-${input.role}-${input.hypothesisId}`,
    hypothesisId: input.hypothesisId,
    proposition: input.recordText,
    sourceKind: 'record',
    sourceRef: 'record',
    evidenceClass: 'FACT',
    classReason: input.role,
    literalScope: input.recordText,
    commitId: ledger.headCommitId,
  });
  const stored = bump({
    ...replaceHypothesis(ledger, input.hypothesisId, { evidenceClass: 'FACT' }),
    bindings: [...ledger.bindings, created],
  });
  return { ledger: contradictIfNeeded(storeOutcome(stored, input.hypothesisId)), binding: created };
}

export function defineCriterion(
  ledger: JudgmentLedger,
  input: { hypothesisId: string; measure: string; passIf: string; failIf: string; requiredLiteralScopes: string[] },
): JudgmentLedger {
  const criterion: ValidationCriterion = {
    id: `crit-${input.hypothesisId}`,
    hypothesisId: input.hypothesisId,
    writtenAtCommitId: ledger.headCommitId,
    measure: input.measure,
    passIf: input.passIf,
    failIf: input.failIf,
    requiredLiteralScopes: input.requiredLiteralScopes,
  };
  const criteria = [...ledger.criteria.filter((item) => item.hypothesisId !== input.hypothesisId), criterion];
  const bumped = bump({ ...ledger, criteria });
  const frozen = reassess(bumped, { freezeStage: true });
  return { ...frozen, reviewCompletion: ledger.reviewCompletion };
}

export function judgeAttribution(
  ledger: JudgmentLedger,
  input: { bindingId: string; attribution: ProjectAttribution; caller: string },
): JudgmentLedger {
  if (input.caller !== 'si') return ledger;
  const bindings = ledger.bindings.map((item) => (item.id === input.bindingId ? { ...item, projectAttribution: input.attribution } : item));
  const bumped = bump({ ...ledger, bindings });
  const hypothesisId = bindings.find((item) => item.id === input.bindingId)?.hypothesisId;
  return hypothesisId ? contradictIfNeeded(storeOutcome(bumped, hypothesisId)) : bumped;
}

export function judgeRequiredHypothesis(ledger: JudgmentLedger, hypothesisId: string, outcome: ValidationOutcome, caller: string): JudgmentLedger {
  if (caller !== 'si') return ledger;
  if (hypothesisId === 'h-business-model') return ledger;
  const target = hypothesisId === 'h-problem' && ledger.hypotheses['h-problem']?.role === 'inactive-preserved' ? 'h-problem-next' : hypothesisId;
  const criterion = ledger.criteria.find((item) => item.hypothesisId === hypothesisId) ?? ledger.criteria.find((item) => item.hypothesisId === target);
  if (!criterion) return ledger;
  return applyStage(bump(replaceHypothesis(ledger, target, { outcome, criterionId: criterion.id })));
}

export function recordConflict(
  ledger: JudgmentLedger,
  input: { hypothesisId: string; left: { id: string; proposition: string; sourceKind: EvidenceSourceKind }; right: { id: string; proposition: string; sourceKind: EvidenceSourceKind } },
): JudgmentLedger {
  const extras = [input.left, input.right].filter((item) => !ledger.bindings.some((existing) => existing.id === item.id));
  const withBindings: JudgmentLedger = {
    ...ledger,
    bindings: [
      ...ledger.bindings,
      ...extras.map((item) =>
        binding({
          id: item.id,
          hypothesisId: input.hypothesisId,
          proposition: item.proposition,
          sourceKind: item.sourceKind,
          sourceRef: item.id,
          evidenceClass: 'CLAIM',
          classReason: 'conflict-side',
          commitId: ledger.headCommitId,
        }),
      ),
    ],
  };
  return applyConflict(withBindings, input.hypothesisId, input.left.id, input.right.id);
}

export function recordCriticalUnknown(ledger: JudgmentLedger, hypothesisId: string): JudgmentLedger {
  return { ...ledger, criticalUnknownHypothesisId: hypothesisId, criticalUnknown: hypothesisId };
}

export function closeReview(ledger: JudgmentLedger, options?: { founderStopped?: boolean }): CloseReviewResult {
  const blockingHypothesisIds = REQUIRED_REVIEW_IDS.filter((id) => {
    const stored = ledger.hypotheses[id];
    const reviewed = id === 'h-problem' && stored?.role === 'inactive-preserved' ? ledger.hypotheses['h-problem-next'] : stored;
    const outcome = reviewed?.outcome;
    return outcome !== 'passed' && outcome !== 'failed';
  });
  const blockingConflictIds = Object.values(ledger.hypotheses)
    .filter((item) => item.outcome === 'conflict_unresolved')
    .map((item) => item.id)
    .sort();
  const complete = sevenReady(ledger) && blockingHypothesisIds.length === 0 && blockingConflictIds.length === 0;
  let reviewCompletion: ReviewCompletion;
  if (complete) reviewCompletion = 'closed_complete';
  else if (options?.founderStopped) reviewCompletion = 'closed_incomplete';
  else reviewCompletion = sevenReady(ledger) ? 'decision_ready' : 'in_progress';
  return {
    ledger: { ...ledger, reviewCompletion },
    reviewCompletion,
    blockingHypothesisIds: complete ? [] : blockingHypothesisIds,
    blockingConflictIds: complete ? [] : blockingConflictIds,
  };
}

export function applyBudgetHold(ledger: JudgmentLedger): JudgmentLedger {
  return { ...ledger, runStatus: 'budget_held' };
}

export function rejectModelDraft(ledger: JudgmentLedger, _draft: ModelDraftOffer): { rejected: true; ledger: JudgmentLedger } {
  return { rejected: true, ledger };
}

export function offerModelDraft(
  ledger: JudgmentLedger,
  draft: ModelDraftOffer,
  _provider?: { chat?: (body: unknown) => unknown },
): { rejected: true; ledger: JudgmentLedger } {
  return rejectModelDraft(ledger, draft);
}

export function renderSevenFields(ledger: JudgmentLedger): {
  judgment: string;
  whyPossible: string;
  whyFail: string;
  evidenceMap: SiEvidenceItem[];
  criticalUnknown: string;
  decisionChangingEvidence: string;
  validationPriority: string;
} | null {
  if (!sevenReady(ledger)) return null;
  return {
    judgment: ledger.judgment,
    whyPossible: ledger.whyPossible,
    whyFail: ledger.whyFail,
    evidenceMap: ledger.evidenceMap,
    criticalUnknown: ledger.criticalUnknown,
    decisionChangingEvidence: ledger.decisionChangingEvidence,
    validationPriority: ledger.validationPriority,
  };
}
