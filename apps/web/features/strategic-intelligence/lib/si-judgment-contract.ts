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
  JudgmentChangeClass,
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
const DERIVED_TIE_KEYS = ['open-pair', 'payment-gap', 'active-gap', 'stage-delta', 'verdict-delta', 'fail-drops-stage', 'judgment-class', 'validation-over-question', 'critical-unknown'] as const;

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
  return { id, statement, outcome: 'not_run', criterionId: null, evidenceClass, alreadyKnown: false, pairedCustomerId: null };
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

function activeCustomerClaimed(ledger: JudgmentLedger): boolean {
  if (ledger.pairBroken && ledger.hypotheses['h-customer-next']?.evidenceClass === 'CLAIM') return true;
  const customer = ledger.hypotheses['h-customer'];
  return customer?.evidenceClass === 'CLAIM' && customer.outcome !== 'conflict_unresolved';
}

function nextCritical(ledger: JudgmentLedger): string {
  if (ledger.pairBroken && ledger.hypotheses['h-customer-next']?.evidenceClass === 'CLAIM') {
    const nextProblem = ledger.hypotheses['h-problem-next'];
    if (!nextProblem?.statement.trim() || nextProblem.evidenceClass !== 'CLAIM') return 'h-problem-next';
    if (ledger.hypotheses['h-payer']?.evidenceClass !== 'CLAIM') return 'h-payer';
  }
  if (
    activeCustomerClaimed(ledger) &&
    hasWeakPayment(ledger) &&
    !hasAbsence(ledger) &&
    !hasPaymentFact(ledger) &&
    ledger.hypotheses['h-payer']?.evidenceClass !== 'CLAIM'
  ) {
    return 'h-payer';
  }
  if (activeCustomerClaimed(ledger) && hasAbsence(ledger) && !hasPaymentFact(ledger)) return 'h-business-model';
  if (ledger.hypotheses['h-customer']?.outcome === 'conflict_unresolved') return 'h-customer';
  if (ledger.hypotheses['h-problem']?.outcome === 'conflict_unresolved') return 'h-problem';
  if (ledger.hypotheses['h-customer']?.evidenceClass !== 'CLAIM') return 'h-customer';
  if (ledger.hypotheses['h-problem']?.evidenceClass !== 'CLAIM') return 'h-problem';
  if (ledger.hypotheses['h-payer']?.evidenceClass !== 'CLAIM') return 'h-payer';
  const criterion = ledger.criteria.find((item) => item.hypothesisId === 'h-business-model');
  if (!criterion?.passIf || !criterion.failIf) return 'h-business-model';
  return 'h-repeat';
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

  if (customer?.outcome === 'conflict_unresolved') {
    const activeProblem = nextProblem?.statement?.trim()
      ? `활성 판단의 문제는 「${nextProblem.statement}」이다. 이 문제는 새 고객의 문제이며 과거 문제와 다르다.`
      : '활성 판단의 문제는 아직 확인되지 않았다.';
    const payerText =
      payer?.evidenceClass === 'CLAIM' && payer.statement
        ? ` 활성 고객의 결제 주체는 「${payer.statement}」 CLAIM이다. 금액과 기록은 아직 없다.`
        : '';
    judgment = `활성 판단의 고객은 새 CLAIM 「${successor?.statement ?? ''}」이다. ${activeProblem}${payerText} 과거 기록의 고객은 「${customer.statement}」이고 그 문제는 「${problem?.statement ?? ''}」이다. 그 문제는 새 고객의 문제가 아니다. 과거 기록은 활성 판단이 아니다. 이전 고객과 문제의 짝은 철회되었다.`;
    whyPossible = '이전 고객 문장은 철회되었다.';
    whyFail = 'h-customer의 충돌이 해소되기 전에는 단계 근거가 아니다.';
  } else if (problem?.outcome === 'conflict_unresolved') {
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
  if (absence) {
    judgment = `${judgment} ${absence.proposition} 이것은 h-business-model의 CLAIM이며 단계는 그대로다.`;
    whyFail = `${whyFail} ${absence.proposition}`.trim();
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
    Boolean(absence) ||
    Boolean(weak) ||
    Boolean(ledger.pendingUnknownId);
  return {
    ...ledger,
    judgment,
    whyPossible,
    whyFail,
    evidenceMap: ledger.bindings.map(bindingToItem),
    criticalUnknown: ledger.criticalUnknownHypothesisId,
    decisionChangingEvidence: talked ? '결제 주체·금액·기록이 나와야 단계가 움직인다.' : '',
    validationPriority: talked ? '주체·금액·기록이 있는 결제 기록과 문제 지표를 확인한다.' : '',
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
  if (ledger.hypotheses['h-problem']?.outcome === 'conflict_unresolved') return { stageId: 'S0', verdictId: 'insufficient_basis' };
  const customerClaim = ledger.hypotheses['h-customer']?.evidenceClass === 'CLAIM';
  const problemClaim = ledger.hypotheses['h-problem']?.evidenceClass === 'CLAIM';
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

function applyStage(ledger: JudgmentLedger): JudgmentLedger {
  const stage = evaluateStage(ledger);
  const critical = nextCritical(ledger);
  return syncCompletion(
    refreshNarrative({ ...ledger, stageId: stage.stageId, verdictId: stage.verdictId, criticalUnknownHypothesisId: critical, criticalUnknown: critical }),
  );
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
    opened = { ...opened, pairBroken: true };
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
  return { ...next, stageId, verdictId };
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
  if (input.hypothesisId === 'h-customer' && chosen.hypothesisId === 'h-customer-next') {
    const successorProblem = ledger.hypotheses['h-problem-next'];
    next = replaceHypothesis(next, 'h-problem', {
      statement: successorProblem?.statement ?? '',
      evidenceClass: 'ASSUMPTION',
      outcome: 'not_run',
      alreadyKnown: false,
    });
    next = { ...next, activePairCustomerId: 'h-customer-next', pairBroken: false };
  }
  if (input.hypothesisId === 'h-customer' && chosen.hypothesisId !== 'h-customer-next') {
    next = replaceHypothesis(next, 'h-problem', { alreadyKnown: false });
    next = { ...next, activePairCustomerId: 'h-customer', pairBroken: false };
  }
  const withReason: JudgmentLedger = {
    ...next,
    bindings: [...next.bindings, founderBinding(ledger, `b-conflict-resolution-${input.hypothesisId}-${ledger.commitIds.length}`, input.hypothesisId, input.reason, 'conflict-resolution', 'CLAIM')],
  };
  const staged = applyStage(bump(withReason));
  if (chosen.evidenceClass === 'FACT') return storeOutcome(staged, input.hypothesisId);
  return staged;
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

function previewRecord(before: JudgmentLedger, after: JudgmentLedger, candidateId: string, hypothesisId: string, act: string): PreviewBranchRecord {
  const outcomeBefore = before.hypotheses[hypothesisId]?.outcome ?? 'missing';
  const outcomeAfter = after.hypotheses[hypothesisId]?.outcome ?? 'missing';
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
  const successor = ledger.hypotheses[hypothesisId === 'h-customer' ? 'h-customer-next' : 'h-problem-next'];
  const prompt = askedPrompt(
    ledger,
    hypothesisId,
    `어느 근거를 ${hypothesisId}의 작업 기준으로 둘까요? 이전 「${ledger.hypotheses[hypothesisId]?.statement ?? ''}」. 새 문장 「${successor?.statement ?? ''}」.`,
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
    if ((ledger.unknownCounts[hypothesisId] ?? 0) >= 2) continue;
    if (ledger.hypotheses[hypothesisId]?.outcome === 'conflict_unresolved') {
      list.push(resolveCandidate(ledger, hypothesisId));
      continue;
    }
    list.push(questionCandidate(ledger, hypothesisId));
  }
  if (ledger.pairBroken && ledger.hypotheses['h-problem-next'] && !ledger.hypotheses['h-problem-next'].alreadyKnown) {
    list.push(questionCandidate(ledger, 'h-problem-next'));
  }
  list.push(validationCandidate(ledger));
  return list;
}

function maxPreviewStage(item: DecisionCandidate): number {
  return Math.max(0, ...(item.previews ?? []).map((preview) => Math.abs(STAGE_RANK[preview.stageAfter] - STAGE_RANK[preview.stageBefore])));
}

function opensEmptyPair(ledger: JudgmentLedger, item: DecisionCandidate): number {
  const nextProblem = ledger.hypotheses['h-problem-next'];
  if (!ledger.pairBroken || !nextProblem || nextProblem.statement.trim() || nextProblem.alreadyKnown) return 0;
  if (item.hypothesisId !== 'h-problem-next') return 0;
  return (item.previews ?? []).some((preview) => preview.judgmentChanged) ? 1 : 0;
}

function paymentGap(ledger: JudgmentLedger, item: DecisionCandidate): number {
  if (!activeCustomerClaimed(ledger) || hasPaymentFact(ledger)) return 0;
  const previews = item.previews ?? [];
  const changesJudgment = previews.some((preview) => preview.judgmentChanged || preview.judgmentChangeClass === 'conflict');
  if (!changesJudgment) return 0;
  if (
    item.hypothesisId === 'h-payer' &&
    hasWeakPayment(ledger) &&
    !hasAbsence(ledger) &&
    ledger.hypotheses['h-payer']?.evidenceClass !== 'CLAIM'
  ) {
    return 1;
  }
  if (item.id === 'v-business-model' && hasAbsence(ledger) && !hasWeakPayment(ledger)) return 1;
  return 0;
}

function activeGap(ledger: JudgmentLedger, item: DecisionCandidate): number {
  if (!ledger.pairBroken || ledger.hypotheses['h-customer-next']?.evidenceClass !== 'CLAIM') return 0;
  if (item.hypothesisId !== nextCritical(ledger)) return 0;
  return (item.previews ?? []).some((preview) => preview.judgmentChanged) ? 1 : 0;
}

function derivedTuple(ledger: JudgmentLedger, item: DecisionCandidate): number[] {
  const previews = item.previews ?? [];
  const verdict = previews.some((preview) => preview.verdictChanged) ? 1 : 0;
  const drop = previews.some((preview) => preview.failureDropsStage) ? 1 : 0;
  const klass = previews.reduce((max, preview) => Math.max(max, CLASS_RANK[preview.judgmentChangeClass]), 0);
  const validation = item.resolvableByQuestion ? 0 : 1;
  const critical = item.hypothesisId === ledger.criticalUnknownHypothesisId ? 1 : 0;
  return [opensEmptyPair(ledger, item), paymentGap(ledger, item), activeGap(ledger, item), maxPreviewStage(item), verdict, drop, klass, validation, critical];
}

function bestPreview(item: DecisionCandidate): PreviewBranchRecord | undefined {
  return [...(item.previews ?? [])].sort((left, right) => {
    const stage = Number(right.stageChanged) - Number(left.stageChanged);
    if (stage) return stage;
    const klass = CLASS_RANK[right.judgmentChangeClass] - CLASS_RANK[left.judgmentChangeClass];
    if (klass) return klass;
    return Number(right.verdictChanged) - Number(left.verdictChanged);
  })[0];
}

function stageTextOf(preview: PreviewBranchRecord | undefined): string {
  return preview?.stageChanged ? `단계를 ${preview.stageBefore}에서 ${preview.stageAfter}로 바꾼다` : '단계 변화는 없다';
}

function derivedReason(winner: DecisionCandidate, tieBreak: DecisionTieBreak): string {
  const best = bestPreview(winner);
  const act = best?.act ?? 'affirm';
  const stageText = stageTextOf(best);
  if (tieBreak === 'stable-id') {
    return `키 1부터 5가 같다. hypothesisId 사전순으로 ${winner.hypothesisId}를 고른다. tieBreak는 stable-id다. 사업 근거가 아니다.`;
  }
  if (winner.hypothesisId === 'h-problem-next') {
    const judgmentText = best?.judgmentChanged ? '판단 문장이 달라진다' : '판단 문장은 그대로다';
    return `${winner.id}는 새 고객과 문제의 짝이 비어 있다. ${act} 분기는 ${judgmentText}. ${stageText}.`;
  }
  if (winner.hypothesisId === 'h-payer' && winner.prompt.includes('누구의 결제')) {
    const affirm = winner.previews?.find((preview) => preview.act === 'affirm');
    const judgmentText = affirm?.judgmentChanged ? '판단 문장이 달라진다' : '판단 문장은 그대로다';
    return `${winner.id}는 확인할 가설이 h-payer다. 이미 알려진 정보는 고객 CLAIM과 주체·금액·기록이 없는 결제 CLAIM이다. affirm 분기는 ${judgmentText}. 금액과 기록은 이 질문으로 생기지 않는다. 문제 문장 재확인보다 결제 주체의 불확실성을 줄인다. ${stageTextOf(affirm)}.`;
  }
  if (winner.id === 'v-business-model' && winner.prompt.includes('문자 기록')) {
    const literal = winner.previews?.find((preview) => preview.act === 'literal_unreviewed');
    return `${winner.id}는 확인할 가설이 h-business-model이다. 이미 알려진 정보는 부재 CLAIM이다. literal_unreviewed 분기는 부재 CLAIM과 문자 기록을 구분하고 판단 변화 등급은 ${literal?.judgmentChangeClass ?? 'none'}다. 문제 문장을 다시 확인해도 기록이 생기지 않는다. 필요한 증거는 주체와 금액이 적힌 문자 기록이다. ${stageTextOf(literal)}.`;
  }
  if (winner.hypothesisId === 'h-payer' && tieBreak === 'active-gap') {
    const affirm = winner.previews?.find((preview) => preview.act === 'affirm');
    const judgmentText = affirm?.judgmentChanged ? '판단 문장이 달라진다' : '판단 문장은 그대로다';
    return `${winner.id}는 활성 고객의 다음 미확인인 h-payer다. affirm 분기는 ${judgmentText}. 과거 문제는 새 고객의 문제가 아니다. ${stageTextOf(affirm)}.`;
  }
  if ((winner.previews ?? []).every((preview) => preview.judgmentChangeClass === 'none')) {
    return `${winner.id}는 질문을 반복해도 판단이 달라지지 않는다. 필요한 증거가 부족하다. 단계 변화는 없다.`;
  }
  if (tieBreak === 'none') return `${winner.id}의 ${act} 분기가 ${stageText}.`;
  return `${winner.id}의 ${act} 분기가 ${stageText}. tieBreak는 ${tieBreak}다.`;
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
  const hasJudgment = source.some((item) => (item.previews ?? []).some((preview) => preview.judgmentChangeClass !== 'none'));
  const judged: DecisionCandidate[] = [];
  for (const item of source) {
    const noneOnly = (item.previews ?? []).every((preview) => preview.judgmentChangeClass === 'none');
    if (hasJudgment && noneOnly) eliminated.push({ candidateId: item.id, hypothesisId: item.hypothesisId, key: 'no-judgment-branch' });
    else judged.push(item);
  }
  const hasStage = judged.some((item) => maxPreviewStage(item) > 0);
  const staged: DecisionCandidate[] = [];
  for (const item of judged) {
    if (hasStage && maxPreviewStage(item) === 0 && opensEmptyPair(ledger, item) === 0 && paymentGap(ledger, item) === 0 && activeGap(ledger, item) === 0) {
      eliminated.push({ candidateId: item.id, hypothesisId: item.hypothesisId, key: 'no-stage-branch' });
    }
    else staged.push(item);
  }
  if (staged.length === 0) throw new Error('selectNextAction found no candidate');
  const ranked = staged.slice().sort((left, right) => {
    const leftRank = derivedTuple(ledger, left);
    const rightRank = derivedTuple(ledger, right);
    for (let index = 0; index < leftRank.length; index += 1) {
      if (leftRank[index] !== rightRank[index]) return rightRank[index]! - leftRank[index]!;
    }
    if (left.hypothesisId === right.hypothesisId) return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    return left.hypothesisId < right.hypothesisId ? -1 : 1;
  });
  const winner = ranked[0]!;
  const second = ranked[1];
  let tieBreak: DecisionTieBreak = 'none';
  if (second) {
    const winnerRank = derivedTuple(ledger, winner);
    const secondRank = derivedTuple(ledger, second);
    const splitAt = winnerRank.findIndex((value, index) => value !== secondRank[index]);
    tieBreak = splitAt === -1 ? 'stable-id' : DERIVED_TIE_KEYS[splitAt]!;
  }
  const priorityReason = derivedReason(winner, tieBreak);
  const winnerPreviews = winner.previews ?? [];
  if (/단계를 .+에서 .+로 바꾼다|유일한 단계 변화/.test(priorityReason) && winnerPreviews.every((item) => !item.stageChanged)) {
    throw new Error(`stage reason without stage change: ${priorityReason}`);
  }
  const previews = derived.flatMap((item) => item.previews ?? []);
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
  };
  return syncCompletion(refreshNarrative(ledger));
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
  return { ...bumped, stageId: ledger.stageId, verdictId: ledger.verdictId, reviewCompletion: ledger.reviewCompletion };
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
  const criterion = ledger.criteria.find((item) => item.hypothesisId === hypothesisId);
  if (!criterion) return ledger;
  return applyStage(bump(replaceHypothesis(ledger, hypothesisId, { outcome, criterionId: criterion.id })));
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
    const outcome = ledger.hypotheses[id]?.outcome;
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
