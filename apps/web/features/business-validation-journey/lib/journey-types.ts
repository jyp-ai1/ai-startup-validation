/**
 * Phase 1–2 founder journey. No model call, no page capture, no durable archive.
 * Founder statements stay claims. Grades never mean verified fact.
 */

export const SESSION_NOTE =
  '이 브라우저 세션의 초안이다. 조사 기록 보관소가 아니다.';

export const PROTOTYPE_NOTE =
  '이 화면은 입력 구조를 확인하기 위한 프로토타입이다. 입력은 이 브라우저 세션 초안으로만 남고, 외부 AI에 전송하지 않는다.';

export const PROVISIONAL_NOTE =
  '이 내용은 입력에 기반한 잠정 해석입니다. 실제 고객 행동이나 매출 증거가 아닙니다.';

export const JUDGMENT_TEXT =
  '외부 조사와 독립 반대 검토를 실행하지 않았다. 사업성 판단은 유보한다. 화면에 있는 이해는 창업자 입력의 잠정 해석이다.';

export const JUDGMENT_HOLD_REASON =
  '새 캡처 ID가 없다. 창업자 진술만으로 판단을 바꾸지 않는다.';

export const COUNTER_REVIEW_NOTE =
  '독립 GPT 객체는 Gemini와 분리되어 있다. 이 화면은 그 객체를 호출하지 않았다. counter_review_not_run.';

export type PayerChoice = '' | 'owner' | 'end_customer' | 'organization' | 'unknown';

export type RevenueChoice = '' | 'subscription' | 'per_use' | 'fee' | 'undecided';

export type EvidenceChoice = '' | 'none' | 'interview' | 'usage' | 'payment' | 'repeat';

export type Intake = {
  business: string;
  customer: string;
  problem: string;
  solution: string;
  payer: PayerChoice;
  revenue: RevenueChoice;
  evidence: EvidenceChoice;
  url: string;
};

export type JourneySource = 'founder_input' | 'test_hypothesis';

export type AnswerGrade = 'unknown' | 'no_evidence' | 'founder_estimate' | 'claimed_record';

export type DeltaKind =
  | 'duplicate'
  | 'new_claim'
  | 'hypothesis_change'
  | 'conflict_opened'
  | 'detail_added';

export type RequiredField = 'business' | 'customer' | 'problem';

export type Choice = {
  id: string;
  label: string;
  grade: AnswerGrade;
};

export type NextQuestion = {
  uncertaintyId: string;
  hypothesisId: string;
  prompt: string;
  whyDifferent: string | null;
  choices: Choice[];
  allowsFreeText: true;
  purpose?: string;
  answerBranches?: string;
  unchangedWhen?: string;
};

export type PlanProfile = 'lmulm' | 'ridm' | 'unrecognized';

export type PlanClaimRole =
  | 'business'
  | 'customer'
  | 'problem'
  | 'solution'
  | 'buyer'
  | 'revenue'
  | 'past_transaction'
  | 'resale_hypothesis'
  | 'pre_revenue'
  | 'forecast';

export type PlanClaim = {
  id: string;
  role: PlanClaimRole;
  text: string;
  sourceLabel: string;
  claimStatus: 'CLAIM';
  ledgerChecked: false;
  provenance: AnalysisProvenance;
};

export type PlanFixtureResult = {
  id: string;
  note: string;
  provenance: 'test_fixture';
  verifiedFact: false;
  systemVerified: false;
  label: '테스트 픽스처 · 실제 검증 완료 아님';
};

export type PlanCase = {
  profile: PlanProfile;
  provenance: AnalysisProvenance;
  sourceLabel: string;
  claims: PlanClaim[];
  support: string[];
  counter: string[];
  unknowns: string[];
  decisiveGap: string;
  exitCondition: string;
  openingJudgment: string;
  fixtureResults: PlanFixtureResult[];
};

export type FounderAnswer = {
  id: string;
  uncertaintyId: string;
  hypothesisId: string;
  questionText: string;
  choiceId: string;
  choiceLabel: string;
  freeText: string;
  grade: AnswerGrade;
  claimLabel: string;
  receivedAt: string;
  previousValue: string;
  delta: DeltaKind;
  material: boolean;
};

export type CorrectableField = 'business' | 'customer' | 'problem' | 'solution';

export type FieldRevision = {
  id: string;
  field: CorrectableField;
  hypothesisId: string;
  previous: string;
  next: string;
  receivedAt: string;
  delta: DeltaKind;
  material: boolean;
};

export type UnderstandingItem = {
  id: string;
  text: string;
};

export type Understanding = {
  known: UnderstandingItem[];
  inferred: UnderstandingItem[];
  contradictions: UnderstandingItem[];
  unknown: UnderstandingItem[];
};

export type NextAction = {
  kind: 'mcq_confirm' | 'external_validation';
  text: string;
  successCriterion: string;
  failureCriterion: string;
};

export type JourneyState = {
  intake: Intake;
  source: JourneySource;
  answers: FounderAnswer[];
  revisions: FieldRevision[];
  understanding: Understanding;
  nextQuestion: NextQuestion | null;
  repeatBlockedReason: string | null;
  nextAction: NextAction;
  researchStatus: 'research_not_run';
  researchNote: string;
  counterReviewStatus: 'counter_review_not_run';
  counterReviewNote: string;
  judgmentStatus: 'judgment_deferred';
  judgmentText: string;
  judgmentHoldReason: string;
  sessionNote: string;
  analysisDelivery: {
    status: 'not_sent';
    reason: string;
  };
  captures: [];
  sourceRecords: FounderSourceRecord[];
  hypothesisJudgments: HypothesisJudgment[];
  analysisAcceptances: AnalysisAcceptanceRecord[];
  redelivery: RedeliveryRecord | null;
  externalNotes?: ExternalNote[];
  judgmentComparisons?: JudgmentComparison[];
  planCase?: PlanCase;
};

export type AnalysisProvenance = 'test_fixture' | 'user_declared';

export type EvidenceKind = 'model_claim' | 'order_record' | 'interview_verbatim' | 'unknown';

export type ModelClaimStatus = 'CLAIM' | 'unassessed';

export type ExternalNote = {
  executionId: string;
  origin: 'user_paste';
  liveModelCall: false;
  providerLabel: string;
  provenance: AnalysisProvenance;
  evidenceKind: EvidenceKind;
  sourceLabel: string;
  text: string;
  citedExcerpt: string | null;
  verifiedFact: false;
  realAnalysisSuccess: false;
  systemVerified: false;
  userDeclaredReal: boolean;
  claimStatus: ModelClaimStatus;
  judgmentChanged: boolean;
  receivedAt: string;
  questionId: string | null;
  hypothesisIds: string[];
  status: 'reference';
};

export type JudgmentComparison = {
  id: string;
  executionId: string | null;
  kind: 'external_analysis' | 'founder_answer' | 'customer_change' | 'rejected';
  provenance: AnalysisProvenance | null;
  liveVerified: false;
  realAnalysisSuccess: false;
  systemVerified: false;
  improvementAssessed: false;
  linkJustified: false;
  missing: string[];
  userDeclaredReal: boolean;
  originalSecured: boolean;
  sourceLabel: string | null;
  originalText: string | null;
  hypothesisIds: string[];
  receivedAt: string;
  previousJudgmentText: string;
  nextJudgmentText: string;
  judgmentChanged: boolean;
  verifiedFact: false;
  validated: false;
  claimStatus: ModelClaimStatus | null;
  affectedHypothesisIds: string[];
  evidenceIds: string[];
  reason: string;
  uncertaintyId: string | null;
  uncertaintyResolved: boolean;
  nextQuestionId: string | null;
  questionSelectionReason: string | null;
};

export type FounderSourceRecord = {
  id: string;
  sourceKind: 'founder_paste';
  text: string;
  excerpt: string;
  pageHash: string;
  hypothesisIds: string[];
  causeId: string;
  receivedAt: string;
  previousJudgmentText: string;
  nextJudgmentText: string;
  judgmentStatus: 'judgment_deferred';
  verifiedFact: false;
  claimLabel: '창업자가 붙인 원문 · 검증된 사실 아님';
  relevance: 'unconfirmed';
  accepted: false;
  duplicate: boolean;
  reason: string;
  effect: 'unchanged' | 'revised' | 'held';
  hypothesisBefore: string;
  hypothesisAfter: string;
  stance: HypothesisStance;
  notEstablished: string[];
};

export type AnalysisStatus = 'succeeded' | 'failed' | 'not_run' | 'result_missing';

export type ExecutionInputSnapshot = {
  snapshotId: string;
  answerIds: string[];
  evidenceIds: string[];
  hypothesisIds: string[];
  causeIds: string[];
};

export type SourceCheckStatus = 'matched' | 'mismatched' | 'uncheckable';

export type ClaimBearingStatus = 'grounded' | 'ungrounded' | 'unassessed';

export type CrossReviewOutcome = 'agreement' | 'disagreement' | 'insufficient_evidence' | 'not_compared';

export type AnalysisProviderSlot = {
  side: 'gemini' | 'gpt';
  executionId: string;
  providerId: string | null;
  modelId: string | null;
  endpoint: string | null;
  purpose: 'research' | 'counter_review' | null;
  analysisStatus: AnalysisStatus | 'absent';
  claim: string | null;
  support: string | null;
  counter: string | null;
  uncertainty: string | null;
  citedExcerpt: string | null;
  capturedSourceId: string | null;
  sourceCheck: SourceCheckStatus;
  claimBearing: ClaimBearingStatus;
  hypothesisIds: string[];
  verifiedFact: false;
  sourceConflict: 'none' | 'preserved' | 'not_established';
  replayed: boolean;
  inputSnapshot: ExecutionInputSnapshot | null;
  reason: string;
};

export type AnalysisHypothesisEffect = {
  hypothesisId: string;
  beforeStance: HypothesisStance | 'absent';
  afterStance: HypothesisStance | 'absent';
  changed: false;
  causeId: string | null;
  reason: string;
};

export type AnalysisAcceptanceRecord = {
  id: string;
  receivedAt: string;
  disposition: 'recorded' | 'duplicate_delivery';
  gemini: AnalysisProviderSlot;
  gpt: AnalysisProviderSlot;
  comparison: CrossReviewOutcome;
  verifiedFact: false;
  businessJudgment: 'preserved';
  judgmentChanged: false;
  judgmentStatus: 'judgment_deferred';
  previousJudgmentText: string;
  nextJudgmentText: string;
  causeIds: string[];
  conflictsWithExecutionIds: string[];
  reason: string;
  hypothesisEffects: AnalysisHypothesisEffect[];
  sourceIds: string[];
};

export type HypothesisStance = 'unreviewed' | 'supported' | 'contradicted' | 'held';

export type HypothesisJudgment = {
  hypothesisId: string;
  before: string;
  after: string;
  stance: HypothesisStance;
  causeId: string | null;
  sourceId: string | null;
  reason: string;
  verifiedFact: false;
  notEstablished: string[];
};

export type ContextRole =
  | 'customer'
  | 'problem'
  | 'solution'
  | 'payer'
  | 'revenue'
  | 'business'
  | 'answer';

export type ContextItem = {
  id: string;
  hypothesisId: string;
  role: ContextRole;
  text: string;
  disposition: 'included' | 'omitted';
  reason: string;
  relevance: 'unconfirmed' | 'kept';
};

export type ChangeClass = 'none' | 'wording_edit' | 'core_hypothesis_change' | 'new_claim';

export type RedeliveryRecord = {
  id: string;
  reinvestigation: 'skipped' | 'required';
  changeClass: ChangeClass;
  sent: false;
  inputReady: boolean;
  inputGap: string | null;
  reason: string;
  summary: string;
  items: ContextItem[];
  includedAnswerIds: string[];
  omittedAnswerIds: string[];
  hypothesisIds: string[];
  unknownIds: string[];
  contradictionIds: string[];
  evidenceIds: string[];
  changedSincePrevious: string[];
  changeConditions: string[];
  researchStatus: 'research_not_run';
  counterReviewStatus: 'counter_review_not_run';
  judgmentChange: 'preserved';
  preserveReason: string;
};

export const PAYER_OPTIONS: { id: Exclude<PayerChoice, ''>; label: string }[] = [
  { id: 'owner', label: '사업자 본인' },
  { id: 'end_customer', label: '최종 고객' },
  { id: 'organization', label: '기업·기관' },
  { id: 'unknown', label: '아직 모름' },
];

export const REVENUE_OPTIONS: { id: Exclude<RevenueChoice, ''>; label: string }[] = [
  { id: 'subscription', label: '월 구독료' },
  { id: 'per_use', label: '건당 이용료' },
  { id: 'fee', label: '거래 수수료' },
  { id: 'undecided', label: '아직 정하지 않음' },
];

export const EVIDENCE_OPTIONS: { id: Exclude<EvidenceChoice, ''>; label: string }[] = [
  { id: 'none', label: '아직 확인하지 못함' },
  { id: 'interview', label: '고객 인터뷰' },
  { id: 'usage', label: '실제 사용 기록' },
  { id: 'payment', label: '결제·매출 기록' },
  { id: 'repeat', label: '재구매·반복 사용 기록' },
];

export const TEST_HYPOTHESIS_INTAKE: Intake = {
  business: '소상공인이 주문과 배송을 각각 관리해야 하는 불편을 줄이는 서비스',
  customer: '소규모 음식점·꽃집 등 직접 배송을 관리하는 사업자',
  problem: '주문 접수와 배송 일정 관리가 분리되어 누락과 혼선이 발생한다',
  solution: '주문과 배송을 한곳에서 관리하는 구독형 서비스',
  payer: 'owner',
  revenue: 'subscription',
  evidence: '',
  url: '',
};

export const EVIDENCE_QUESTION =
  '고객에게 이 문제가 실제로 발생한다는 근거가 있나요?';

export function emptyIntake(): Intake {
  return {
    business: '',
    customer: '',
    problem: '',
    solution: '',
    payer: '',
    revenue: '',
    evidence: '',
    url: '',
  };
}

export function payerLabel(payer: PayerChoice): string {
  return PAYER_OPTIONS.find((option) => option.id === payer)?.label ?? '';
}

export function revenueLabel(revenue: RevenueChoice): string {
  return REVENUE_OPTIONS.find((option) => option.id === revenue)?.label ?? '';
}

export function evidenceLabel(evidence: EvidenceChoice): string {
  return EVIDENCE_OPTIONS.find((option) => option.id === evidence)?.label ?? '';
}

export function gradeLabel(grade: AnswerGrade): string {
  switch (grade) {
    case 'unknown':
      return '모름';
    case 'no_evidence':
      return '근거 없음';
    case 'founder_estimate':
      return '창업자 추정';
    case 'claimed_record':
      return '기록이 있다는 창업자 진술 · 검증된 사실 아님';
  }
}

export function claimLabel(grade: AnswerGrade): string {
  if (grade === 'claimed_record') return '창업자 진술 · 검증된 사실 아님';
  return gradeLabel(grade);
}
