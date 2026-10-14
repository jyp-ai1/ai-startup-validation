import type {
  DecisionBranch,
  DecisionCandidate,
  DecisionRecord,
  DecisionTieBreak,
  EliminatedCandidate,
  EvidenceSourceKind,
  HypothesisEvidenceBinding,
  HypothesisJudgment,
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
  type DecisionCandidate,
  type DecisionRecord,
  type HypothesisEvidenceBinding,
  type HypothesisJudgment,
  type ReviewCompletion,
  type ValidationOutcome,
};

const STAGE_RANK: Record<SiStageId, number> = { S0: 0, S1: 1, S2: 2, S3: 3, S4: 4 };

export const CUSTOMER_STATEMENT = '반찬가게·꽃집 등 직접 배송 소상공인';
export const PROBLEM_STATEMENT = '주문과 배송을 따로 관리해야 함';
export const CUSTOMER_CONFIRM =
  '이 서비스를 가장 필요로 하는 사람은 반찬가게·꽃집 등 직접 배송 소상공인입니다.';
export const PAYER_CONFIRM = '서비스 비용은 사장님 본인이 지불합니다.';
export const ABSENCE_SENTENCE = '아직 실제 결제·사용 증거는 없습니다.';
export const WEAK_PAYMENT_SENTENCE = '이미 결제 3건이 있어 고객이 돈을 내고 있습니다.';
export const LOGISTICS_PROBLEM_ID = 'h-problem-logistics';
export const LOGISTICS_CUSTOMER_ID = 'h-customer-logistics';
export const LOGISTICS_PROMPT = '물류본부 고객이 겪는 불편은 무엇입니까?';

const TIE_KEYS = [
  'stage-delta',
  'verdict-delta',
  'fail-drops-stage',
  'validation-over-question',
  'critical-unknown',
] as const;

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
};

export type CloseReviewResult = {
  ledger: JudgmentLedger;
  reviewCompletion: ReviewCompletion;
  blockingHypothesisIds: string[];
  blockingConflictIds: string[];
};

export type ModelDraftOffer = { stub?: boolean; text?: string } | string;

function hypothesis(
  id: string,
  statement: string,
  evidenceClass: SiEvidenceClass = 'ASSUMPTION',
): HypothesisJudgment {
  return {
    id,
    statement,
    outcome: 'not_run',
    criterionId: null,
    evidenceClass,
    alreadyKnown: false,
  };
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
  if (input.evidenceClass === 'VALIDATED') {
    throw new Error('VALIDATED is not a binding class');
  }
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
    history: [
      {
        commitId: input.commitId,
        from: '',
        to: input.evidenceClass,
        reason: input.classReason,
      },
    ],
  };
}

function bindingToItem(item: HypothesisEvidenceBinding): SiEvidenceItem {
  const axisId =
    item.hypothesisId.includes('problem') || item.hypothesisId.includes('customer')
      ? 'customerProblemFit'
      : item.hypothesisId.includes('market')
        ? 'marketAlternatives'
        : 'businessModel';
  return {
    id: item.id,
    text: item.proposition,
    evidenceClass: item.evidenceClass,
    axisId,
  };
}

export function createSeedLedger(): JudgmentLedger {
  const commitId = 'c0';
  const hypotheses: Record<string, HypothesisJudgment> = {
    'h-customer': hypothesis('h-customer', CUSTOMER_STATEMENT),
    'h-problem': hypothesis('h-problem', PROBLEM_STATEMENT),
    'h-payer': hypothesis('h-payer', ''),
    'h-business-model': hypothesis('h-business-model', '월 구독'),
    'h-repeat': hypothesis('h-repeat', ''),
    'h-one-liner': hypothesis('h-one-liner', ''),
    'h-market': hypothesis('h-market', ''),
    'h-channel': hypothesis('h-channel', ''),
  };
  const bindings = [
    binding({
      id: 'b-customer-doc',
      hypothesisId: 'h-customer',
      proposition: CUSTOMER_STATEMENT,
      sourceKind: 'document',
      sourceRef: 'seed',
      evidenceClass: 'ASSUMPTION',
      classReason: 'document-assumption',
      commitId,
    }),
    binding({
      id: 'b-problem-doc',
      hypothesisId: 'h-problem',
      proposition: PROBLEM_STATEMENT,
      sourceKind: 'document',
      sourceRef: 'seed',
      evidenceClass: 'ASSUMPTION',
      classReason: 'document-assumption',
      commitId,
    }),
    binding({
      id: 'b-model-doc',
      hypothesisId: 'h-business-model',
      proposition: '월 구독',
      sourceKind: 'document',
      sourceRef: 'seed',
      evidenceClass: 'ASSUMPTION',
      classReason: 'document-assumption',
      commitId,
    }),
  ];
  const ledger: JudgmentLedger = {
    headCommitId: commitId,
    commitIds: [commitId],
    stageId: 'S0',
    verdictId: 'insufficient_basis',
    judgment: '문서의 고객, 문제, 수익은 아직 확인되지 않은 가정이다.',
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
  };
  return syncCompletion(refreshNarrative(ledger));
}

function bump(ledger: JudgmentLedger): JudgmentLedger {
  const id = `c${ledger.commitIds.length}`;
  return { ...ledger, headCommitId: id, commitIds: [...ledger.commitIds, id] };
}

function isAncestor(ledger: JudgmentLedger, commitId: string): boolean {
  const written = ledger.commitIds.indexOf(commitId);
  const head = ledger.commitIds.indexOf(ledger.headCommitId);
  return written >= 0 && head >= 0 && written < head;
}

function replaceHypothesis(
  ledger: JudgmentLedger,
  id: string,
  patch: Partial<HypothesisJudgment>,
): JudgmentLedger {
  const current = ledger.hypotheses[id] ?? hypothesis(id, '');
  return {
    ...ledger,
    hypotheses: {
      ...ledger.hypotheses,
      [id]: { ...current, ...patch, id },
    },
  };
}

export function questionHash(input: { hypothesisId: string; prompt: string }): string {
  return `${input.hypothesisId}::${input.prompt}`;
}

function branch(
  id: string,
  stageId: SiStageId,
  verdictId: SiVerdictId,
  dropsStage = false,
): DecisionBranch {
  return { id, stageId, verdictId, dropsStage, judgmentChanges: stageId !== 'S0' || dropsStage };
}

function three(
  id: string,
  stages: [SiStageId, SiStageId, SiStageId],
  verdicts: [SiVerdictId, SiVerdictId, SiVerdictId],
  drops: [boolean, boolean, boolean] = [false, false, false],
): DecisionBranch[] {
  return [0, 1, 2].map((index) =>
    branch(`${id}-${index}`, stages[index], verdicts[index], drops[index]),
  );
}

function candidate(input: {
  id: string;
  hypothesisId: string;
  actionKind?: 'question' | 'validation';
  alreadyKnown?: boolean;
  resolvableByQuestion?: boolean;
  branches: DecisionBranch[];
  prompt: string;
  gapId?: string;
}): DecisionCandidate {
  return {
    id: input.id,
    hypothesisId: input.hypothesisId,
    actionKind: input.actionKind ?? 'question',
    alreadyKnown: input.alreadyKnown ?? false,
    resolvableByQuestion: input.resolvableByQuestion ?? true,
    branches: input.branches,
    priorityReason: '',
    prompt: input.prompt,
    gapId: input.gapId,
  };
}

function askedPrompt(ledger: JudgmentLedger, hypothesisId: string, prompt: string): string {
  if (ledger.askedQuestionHashes.includes(questionHash({ hypothesisId, prompt }))) {
    return `${prompt} 더 좁혀 근거가 될 기록의 범위를 지정해 달라.`;
  }
  return prompt;
}

export function proposeCandidates(ledger: JudgmentLedger): DecisionCandidate[] {
  const stage = ledger.stageId;
  const stay = stage;
  const customerKnown = ledger.hypotheses['h-customer']?.evidenceClass === 'CLAIM' && !ledger.pairBroken;
  const problemStage: SiStageId = customerKnown ? 'S1' : 'S0';
  const list: DecisionCandidate[] = [];

  if (ledger.pairBroken) {
    list.push(
      candidate({
        id: 'q-problem-logistics',
        hypothesisId: LOGISTICS_PROBLEM_ID,
        alreadyKnown: ledger.hypotheses[LOGISTICS_PROBLEM_ID]?.alreadyKnown ?? false,
        prompt: askedPrompt(ledger, LOGISTICS_PROBLEM_ID, LOGISTICS_PROMPT),
        branches: three(
          'q-problem-logistics',
          ['S1', 'S0', 'S0'],
          ['judgment_deferred', 'insufficient_basis', 'insufficient_basis'],
        ),
      }),
      candidate({
        id: 'q-problem-old',
        hypothesisId: 'h-problem',
        alreadyKnown: true,
        prompt: PROBLEM_STATEMENT,
        branches: three('q-problem-old', [stay, stay, stay], [ledger.verdictId, ledger.verdictId, ledger.verdictId]),
      }),
    );
  } else {
    list.push(
      candidate({
        id: 'q-customer',
        hypothesisId: 'h-customer',
        alreadyKnown: ledger.hypotheses['h-customer']?.alreadyKnown ?? false,
        prompt: askedPrompt(
          ledger,
          'h-customer',
          '이 서비스를 가장 필요로 하는 사람이 반찬가게·꽃집 등 직접 배송 소상공인인지 확인해 달라.',
        ),
        branches: three('q-customer', ['S0', 'S0', 'S0'], ['insufficient_basis', 'insufficient_basis', 'insufficient_basis']),
      }),
      candidate({
        id: 'q-problem',
        hypothesisId: 'h-problem',
        alreadyKnown: ledger.hypotheses['h-problem']?.alreadyKnown ?? false,
        prompt: askedPrompt(ledger, 'h-problem', '주문과 배송을 따로 관리해야 하는 문제가 맞는지 확인해 달라.'),
        branches: three(
          'q-problem',
          [problemStage, 'S0', 'S0'],
          [
            problemStage === 'S1' ? 'judgment_deferred' : 'insufficient_basis',
            'insufficient_basis',
            'insufficient_basis',
          ],
        ),
      }),
    );
  }

  list.push(
    candidate({
      id: 'q-payer',
      hypothesisId: 'h-payer',
      alreadyKnown: ledger.hypotheses['h-payer']?.alreadyKnown ?? false,
      prompt: askedPrompt(ledger, 'h-payer', '누가 비용을 지불하는지 확인해 달라.'),
      branches: three('q-payer', [stay, stay, stay], [ledger.verdictId, ledger.verdictId, ledger.verdictId]),
    }),
    candidate({
      id: 'q-channel',
      hypothesisId: 'h-channel',
      prompt: askedPrompt(ledger, 'h-channel', '어느 채널에서 만나는지 확인해 달라.'),
      gapId: 'marketChannel',
      branches: three('q-channel', [stay, stay, stay], [ledger.verdictId, ledger.verdictId, ledger.verdictId]),
    }),
  );
  return list;
}

function maxStageDelta(ledger: JudgmentLedger, item: DecisionCandidate): number {
  return Math.max(
    ...item.branches.map((itemBranch) => Math.abs(STAGE_RANK[itemBranch.stageId] - STAGE_RANK[ledger.stageId])),
  );
}

function rankTuple(ledger: JudgmentLedger, item: DecisionCandidate): number[] {
  const verdictChanges = item.branches.some((itemBranch) => itemBranch.verdictId !== ledger.verdictId) ? 1 : 0;
  const failDrops = item.branches.some((itemBranch) => itemBranch.dropsStage) ? 1 : 0;
  const validationFirst = item.resolvableByQuestion ? 0 : 1;
  const critical = item.hypothesisId === ledger.criticalUnknownHypothesisId ? 1 : 0;
  return [maxStageDelta(ledger, item), verdictChanges, failDrops, validationFirst, critical];
}

function compareRank(ledger: JudgmentLedger, left: DecisionCandidate, right: DecisionCandidate): number {
  const leftRank = rankTuple(ledger, left);
  const rightRank = rankTuple(ledger, right);
  for (let index = 0; index < leftRank.length; index += 1) {
    if (leftRank[index] !== rightRank[index]) return rightRank[index]! - leftRank[index]!;
  }
  return left.hypothesisId < right.hypothesisId ? -1 : left.hypothesisId > right.hypothesisId ? 1 : 0;
}

function reasonFor(
  winner: DecisionCandidate,
  tieBreak: DecisionTieBreak,
  eliminated: EliminatedCandidate[],
): string {
  if (winner.hypothesisId === LOGISTICS_PROBLEM_ID) {
    return 'h-problem-logistics는 새 고객과 문제의 짝이 비어 있다.';
  }
  if (tieBreak === 'stable-id') {
    return `키 1부터 5가 같다. hypothesisId 사전순으로 ${winner.hypothesisId}를 고른다. tieBreak는 stable-id다. 사업 근거가 아니다.`;
  }
  if (tieBreak === 'none') {
    const dropped = eliminated
      .filter((item) => item.key === 'no-stage-branch')
      .slice()
      .sort((left, right) => left.hypothesisId.localeCompare(right.hypothesisId))
      .map((item) => `${item.hypothesisId}는 단계 분기가 없어 키 1 이전에 탈락`)
      .join('. ');
    return dropped
      ? `${winner.hypothesisId}의 단계 변화가 남아 있는 후보 중 유일하다. ${dropped}.`
      : `${winner.hypothesisId}의 단계 변화가 남아 있는 후보 중 유일하다.`;
  }
  if (tieBreak === 'critical-unknown') {
    return `${winner.hypothesisId}가 현재 critical unknown과 같다. tieBreak는 critical-unknown이다.`;
  }
  if (tieBreak === 'stage-delta') {
    return `${winner.hypothesisId}의 단계 변화 절대값이 더 크다. tieBreak는 stage-delta다.`;
  }
  return `${winner.hypothesisId}를 ${tieBreak}로 고른다.`;
}

export function selectNextAction(
  ledger: JudgmentLedger,
  supplied?: DecisionCandidate[],
): DecisionRecord {
  const source = (supplied ?? proposeCandidates(ledger)).filter(
    (item) => !ledger.askedQuestionHashes.includes(questionHash(item)),
  );
  for (const item of source) {
    if (item.branches.length < 3) throw new Error(`candidate ${item.id} needs three branches`);
  }
  const eliminated: EliminatedCandidate[] = [];
  const known: DecisionCandidate[] = [];
  for (const item of source) {
    if (item.alreadyKnown) {
      eliminated.push({ candidateId: item.id, hypothesisId: item.hypothesisId, key: 'alreadyKnown' });
    } else {
      known.push(item);
    }
  }
  const hasStageMove = known.some((item) => maxStageDelta(ledger, item) > 0);
  const rankedPool: DecisionCandidate[] = [];
  for (const item of known) {
    if (hasStageMove && maxStageDelta(ledger, item) === 0) {
      eliminated.push({ candidateId: item.id, hypothesisId: item.hypothesisId, key: 'no-stage-branch' });
    } else {
      rankedPool.push(item);
    }
  }
  if (rankedPool.length === 0) {
    throw new Error('selectNextAction found no candidate');
  }
  const ranked = rankedPool.slice().sort((left, right) => compareRank(ledger, left, right));
  const winner = ranked[0]!;
  const second = ranked[1];
  let tieBreak: DecisionTieBreak = 'none';
  if (second) {
    const winnerRank = rankTuple(ledger, winner);
    const secondRank = rankTuple(ledger, second);
    const splitAt = winnerRank.findIndex((value, index) => value !== secondRank[index]);
    tieBreak = splitAt === -1 ? 'stable-id' : TIE_KEYS[splitAt]!;
  }
  const priorityReason = reasonFor(winner, tieBreak, eliminated);
  const selected: DecisionCandidate = { ...winner, priorityReason };
  const candidates = ranked
    .map((item) => (item.id === winner.id ? selected : { ...item, priorityReason: '' }))
    .sort((left, right) => left.hypothesisId.localeCompare(right.hypothesisId));
  return {
    id: `decision-${ledger.headCommitId}-${winner.id}`,
    committedBeforeAnswer: true,
    candidates,
    eliminated: eliminated.slice().sort((left, right) => left.hypothesisId.localeCompare(right.hypothesisId)),
    selectedId: winner.id,
    tieBreak,
    hypothesisId: winner.hypothesisId,
    prompt: winner.prompt,
    priorityReason,
  };
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
  const model = ledger.hypotheses['h-business-model'];
  const criterion = ledger.criteria.find((item) => item.hypothesisId === 'h-business-model');
  const absence = ledger.bindings.find(
    (item) => item.hypothesisId === 'h-business-model' && item.classReason === 'absence',
  );
  const weak = ledger.bindings.find(
    (item) => item.hypothesisId === 'h-business-model' && item.classReason === 'weak-payment',
  );

  let judgment = '문서의 고객, 문제, 수익은 아직 확인되지 않은 가정이다.';
  let whyPossible = '';
  let whyFail = '';

  if (ledger.pairBroken) {
    judgment = '고객이 물류본부로 수정되었다. 이전 고객과 문제의 짝은 깨졌다.';
    whyPossible = '이전 소상공인 고객 문장은 철회되었다.';
    whyFail = 'h-customer와 h-problem의 기존 짝은 단계 근거가 아니다.';
  } else if (customer?.evidenceClass === 'CLAIM' && problem?.evidenceClass === 'CLAIM') {
    judgment = `고객 확인과 문제 확인을 반영했다. h-customer는 ${customer.statement} CLAIM이다. h-problem은 ${problem.statement} CLAIM이다.`;
    whyPossible = 'h-customer와 h-problem이 창업자 확인을 받았다.';
    whyFail = 'h-customer와 h-problem은 확인일 뿐 결제 기록은 없다.';
  } else if (customer?.evidenceClass === 'CLAIM') {
    judgment = `고객 가설은 창업자 확인을 받았다. ${CUSTOMER_CONFIRM} CLAIM.`;
  }

  if (absence) whyFail = `${whyFail} ${absence.proposition}`.trim();
  if (weak) judgment = `${judgment} 주체·금액·기록이 없어 단계를 움직이지 않았다.`;
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

  const talked = customer?.evidenceClass === 'CLAIM' || ledger.pairBroken || model?.outcome === 'failed' || model?.outcome === 'passed';
  return {
    ...ledger,
    judgment,
    whyPossible,
    whyFail,
    evidenceMap: ledger.bindings.map(bindingToItem),
    criticalUnknown: ledger.criticalUnknownHypothesisId,
    decisionChangingEvidence: talked ? (model?.outcome === 'failed' ? (criterion?.failIf ?? '기준 실패') : '결제 주체·금액·기록이 나와야 단계가 움직인다.') : '',
    validationPriority: talked ? '주체·금액·기록이 있는 결제 기록과 문제 지표를 확인한다.' : '',
  };
}

function syncCompletion(ledger: JudgmentLedger): JudgmentLedger {
  if (ledger.reviewCompletion === 'closed_complete' || ledger.reviewCompletion === 'closed_incomplete') {
    return ledger;
  }
  return { ...ledger, reviewCompletion: sevenReady(ledger) ? 'decision_ready' : 'in_progress' };
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
  const logistics = ledger.hypotheses[LOGISTICS_PROBLEM_ID];
  if (ledger.pairBroken && logistics?.evidenceClass !== 'CLAIM') {
    return { stageId: 'S0', verdictId: 'insufficient_basis' };
  }
  const blocked = (id: string) => ledger.hypotheses[id]?.outcome === 'conflict_unresolved';
  if (blocked('h-customer') || blocked('h-problem')) {
    return { stageId: 'S0', verdictId: 'insufficient_basis' };
  }
  const customerClaim = ledger.hypotheses['h-customer']?.evidenceClass === 'CLAIM';
  const problemClaim = ledger.hypotheses['h-problem']?.evidenceClass === 'CLAIM';
  if (!customerClaim || !problemClaim) return { stageId: 'S0', verdictId: 'insufficient_basis' };

  const model = ledger.hypotheses['h-business-model'];
  if (model?.outcome === 'passed' && s3FactsReady(ledger)) {
    if (ledger.hypotheses['h-repeat']?.outcome === 'passed') {
      return { stageId: 'S4', verdictId: 'viable' };
    }
    return { stageId: 'S3', verdictId: 'conditionally_viable' };
  }

  const payerClaim = ledger.hypotheses['h-payer']?.evidenceClass === 'CLAIM';
  const criterion = ledger.criteria.find((item) => item.hypothesisId === 'h-business-model');
  if (payerClaim && criterion?.passIf && criterion.failIf) {
    return { stageId: 'S2', verdictId: 'judgment_deferred' };
  }
  return { stageId: 'S1', verdictId: 'judgment_deferred' };
}

function applyStage(ledger: JudgmentLedger): JudgmentLedger {
  const stage = evaluateStage(ledger);
  return syncCompletion(refreshNarrative({ ...ledger, stageId: stage.stageId, verdictId: stage.verdictId }));
}

export function evaluateHypothesis(ledger: JudgmentLedger, hypothesisId: string): ValidationOutcome {
  const current = ledger.hypotheses[hypothesisId];
  if (!current) return 'not_run';
  if (current.outcome === 'conflict_unresolved') return 'conflict_unresolved';
  if (ledger.conflicts.some((item) => item.hypothesisId === hypothesisId && !item.resolved)) {
    return 'conflict_unresolved';
  }
  if (hypothesisId !== 'h-business-model') {
    if (current.outcome === 'passed' || current.outcome === 'failed') return current.outcome;
    return 'not_run';
  }
  const criterion = ledger.criteria.find((item) => item.hypothesisId === hypothesisId);
  const facts = ledger.bindings.filter(
    (item) => item.hypothesisId === hypothesisId && item.evidenceClass === 'FACT',
  );
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

export function commitFounderStatement(
  ledger: JudgmentLedger,
  input: { proposition: string; sourceKind?: EvidenceSourceKind; hypothesisId?: string },
): JudgmentLedger {
  if (input.sourceKind === 'model_draft') return ledger;
  const proposition = input.proposition.trim();

  if (proposition.includes('물류본부')) return reviseCustomer(ledger, proposition);
  if (proposition.includes('모르겠')) {
    const decision = selectNextAction(ledger);
    const hash = questionHash(decision);
    if (ledger.askedQuestionHashes.includes(hash)) return ledger;
    return { ...ledger, askedQuestionHashes: [...ledger.askedQuestionHashes, hash] };
  }
  if (proposition.includes(ABSENCE_SENTENCE)) return commitAbsence(ledger, proposition);
  if (proposition.includes('이미 결제 3건')) return commitWeakPayment(ledger, proposition);
  if (proposition.includes('사장님 본인')) return commitPayer(ledger, proposition);
  if (ledger.pairBroken && proposition.includes(PROBLEM_STATEMENT)) return ledger;
  if (proposition.includes('반찬가게') && proposition.includes('필요로')) return commitCustomer(ledger, proposition);
  if (proposition.includes('주문과 배송을 따로 관리해야')) return commitProblem(ledger);
  if (input.hypothesisId) {
    return applyStage(
      bump(
        replaceHypothesis(
          {
            ...ledger,
            bindings: [
              ...ledger.bindings,
              binding({
                id: `b-${input.hypothesisId}-${ledger.commitIds.length}`,
                hypothesisId: input.hypothesisId,
                proposition,
                sourceKind: 'founder_answer',
                sourceRef: 'founder',
                evidenceClass: 'CLAIM',
                classReason: 'founder-claim',
                commitId: ledger.headCommitId,
              }),
            ],
          },
          input.hypothesisId,
          { evidenceClass: 'CLAIM', statement: proposition, alreadyKnown: true },
        ),
      ),
    );
  }
  return ledger;
}

function commitCustomer(ledger: JudgmentLedger, proposition: string): JudgmentLedger {
  const next = replaceHypothesis(ledger, 'h-customer', {
    evidenceClass: 'CLAIM',
    statement: CUSTOMER_STATEMENT,
    alreadyKnown: true,
  });
  const withBinding: JudgmentLedger = {
    ...next,
    criticalUnknownHypothesisId: 'h-problem',
    criticalUnknown: 'h-problem',
    bindings: [
      ...next.bindings,
      binding({
        id: 'b-customer-claim',
        hypothesisId: 'h-customer',
        proposition,
        sourceKind: 'founder_answer',
        sourceRef: 'founder',
        evidenceClass: 'CLAIM',
        classReason: 'founder-confirm',
        commitId: ledger.headCommitId,
      }),
    ],
  };
  return applyStage(bump(withBinding));
}

function commitProblem(ledger: JudgmentLedger): JudgmentLedger {
  const next = replaceHypothesis(ledger, 'h-problem', {
    evidenceClass: 'CLAIM',
    statement: PROBLEM_STATEMENT,
    alreadyKnown: true,
  });
  const withBinding: JudgmentLedger = {
    ...next,
    criticalUnknownHypothesisId: 'h-payer',
    criticalUnknown: 'h-payer',
    bindings: [
      ...next.bindings,
      binding({
        id: 'b-problem-claim',
        hypothesisId: 'h-problem',
        proposition: PROBLEM_STATEMENT,
        sourceKind: 'founder_answer',
        sourceRef: 'founder',
        evidenceClass: 'CLAIM',
        classReason: 'founder-confirm',
        commitId: ledger.headCommitId,
      }),
    ],
  };
  return applyStage(bump(withBinding));
}

function commitPayer(ledger: JudgmentLedger, proposition: string): JudgmentLedger {
  const customer = ledger.hypotheses['h-customer'];
  const next = replaceHypothesis(ledger, 'h-payer', {
    evidenceClass: 'CLAIM',
    statement: proposition,
    alreadyKnown: true,
  });
  const kept = replaceHypothesis(next, 'h-customer', {
    statement: customer?.statement ?? CUSTOMER_STATEMENT,
    evidenceClass: customer?.evidenceClass ?? 'ASSUMPTION',
  });
  const withBinding: JudgmentLedger = {
    ...kept,
    criticalUnknownHypothesisId: 'h-business-model',
    criticalUnknown: 'h-business-model',
    bindings: [
      ...kept.bindings,
      binding({
        id: 'b-payer-claim',
        hypothesisId: 'h-payer',
        proposition,
        sourceKind: 'founder_answer',
        sourceRef: 'founder',
        evidenceClass: 'CLAIM',
        classReason: 'founder-confirm',
        commitId: ledger.headCommitId,
      }),
    ],
  };
  return applyStage(bump(withBinding));
}

function commitAbsence(ledger: JudgmentLedger, proposition: string): JudgmentLedger {
  const hasFact = ledger.bindings.some(
    (item) => item.hypothesisId === 'h-business-model' && item.evidenceClass === 'FACT',
  );
  const classed = hasFact
    ? ledger
    : replaceHypothesis(ledger, 'h-business-model', { evidenceClass: 'CLAIM' });
  const withBinding: JudgmentLedger = {
    ...classed,
    bindings: [
      ...ledger.bindings,
      binding({
        id: 'b-absence',
        hypothesisId: 'h-business-model',
        proposition,
        sourceKind: 'founder_answer',
        sourceRef: 'founder',
        evidenceClass: 'CLAIM',
        classReason: 'absence',
        commitId: ledger.headCommitId,
      }),
    ],
  };
  return contradictIfNeeded(applyStage(bump(withBinding)));
}

function commitWeakPayment(ledger: JudgmentLedger, proposition: string): JudgmentLedger {
  const stageId = ledger.stageId;
  const verdictId = ledger.verdictId;
  const classed = replaceHypothesis(ledger, 'h-business-model', { evidenceClass: 'CLAIM', outcome: 'not_run' });
  const withBinding: JudgmentLedger = {
    ...classed,
    bindings: [
      ...ledger.bindings,
      binding({
        id: 'b-weak-payment',
        hypothesisId: 'h-business-model',
        proposition,
        sourceKind: 'founder_answer',
        sourceRef: 'founder',
        evidenceClass: 'CLAIM',
        classReason: 'weak-payment',
        commitId: ledger.headCommitId,
      }),
    ],
  };
  const next = applyStage(bump(withBinding));
  return { ...next, stageId, verdictId };
}

function reviseCustomer(ledger: JudgmentLedger, proposition: string): JudgmentLedger {
  const conflicted = replaceHypothesis(ledger, 'h-customer', {
    outcome: 'conflict_unresolved',
    evidenceClass: 'CONFLICT',
  });
  const opened = replaceHypothesis(conflicted, LOGISTICS_CUSTOMER_ID, {
    statement: proposition,
    evidenceClass: 'CLAIM',
    outcome: 'not_run',
    alreadyKnown: true,
  });
  const oldProblem = replaceHypothesis(opened, 'h-problem', { alreadyKnown: true });
  const logistics = replaceHypothesis(oldProblem, LOGISTICS_PROBLEM_ID, {
    statement: '',
    evidenceClass: 'ASSUMPTION',
    outcome: 'not_run',
    alreadyKnown: false,
  });
  const withBindings: JudgmentLedger = {
    ...logistics,
    pairBroken: true,
    criticalUnknownHypothesisId: LOGISTICS_PROBLEM_ID,
    criticalUnknown: LOGISTICS_PROBLEM_ID,
    bindings: [
      ...logistics.bindings,
      binding({
        id: 'b-customer-logistics',
        hypothesisId: LOGISTICS_CUSTOMER_ID,
        proposition,
        sourceKind: 'founder_answer',
        sourceRef: 'founder',
        evidenceClass: 'CLAIM',
        classReason: 'customer-revision',
        commitId: ledger.headCommitId,
      }),
    ],
    conflicts: [
      ...logistics.conflicts,
      {
        hypothesisId: 'h-customer',
        leftId: 'b-customer-claim',
        rightId: 'b-customer-logistics',
        resolved: false,
      },
    ],
  };
  return applyStage(bump(withBindings));
}

function contradictIfNeeded(ledger: JudgmentLedger): JudgmentLedger {
  const absence = ledger.bindings.find(
    (item) => item.hypothesisId === 'h-business-model' && item.classReason === 'absence',
  );
  const fact = ledger.bindings.find(
    (item) => item.hypothesisId === 'h-business-model' && item.evidenceClass === 'FACT',
  );
  if (!absence || !fact) return ledger;
  if (ledger.hypotheses['h-business-model']?.outcome === 'conflict_unresolved') return ledger;
  return applyConflict(ledger, 'h-business-model', absence.id, fact.id);
}

function applyConflict(
  ledger: JudgmentLedger,
  hypothesisId: string,
  leftId: string,
  rightId: string,
): JudgmentLedger {
  const next = replaceHypothesis(ledger, hypothesisId, { outcome: 'conflict_unresolved' });
  const conflicts = next.conflicts.some(
    (item) => item.hypothesisId === hypothesisId && item.leftId === leftId && item.rightId === rightId,
  )
    ? next.conflicts
    : [...next.conflicts, { hypothesisId, leftId, rightId, resolved: false }];
  return applyStage({ ...next, conflicts });
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
  input: { bindingId: string; attribution: ProjectAttribution; caller: 'si' | 'model_draft' },
): JudgmentLedger {
  if (input.caller !== 'si') return ledger;
  const bindings = ledger.bindings.map((item) =>
    item.id === input.bindingId
      ? {
          ...item,
          projectAttribution: input.attribution,
          history: [
            ...item.history,
            {
              commitId: ledger.headCommitId,
              from: item.projectAttribution,
              to: input.attribution,
              reason: 'judgeAttribution',
            },
          ],
        }
      : item,
  );
  const bumped = bump({ ...ledger, bindings });
  const hypothesisId = bindings.find((item) => item.id === input.bindingId)?.hypothesisId;
  return hypothesisId ? contradictIfNeeded(storeOutcome(bumped, hypothesisId)) : bumped;
}

export function judgeRequiredHypothesis(
  ledger: JudgmentLedger,
  hypothesisId: string,
  outcome: 'passed' | 'failed',
  caller: 'si' | 'model_draft',
): JudgmentLedger {
  if (caller !== 'si') return ledger;
  if (hypothesisId === 'h-business-model') return ledger;
  const criterion = ledger.criteria.find((item) => item.hypothesisId === hypothesisId);
  if (!criterion || !isAncestor(ledger, criterion.writtenAtCommitId)) return ledger;
  if (outcome !== 'passed' && outcome !== 'failed') return ledger;
  return applyStage(
    bump(replaceHypothesis(ledger, hypothesisId, { outcome, criterionId: criterion.id })),
  );
}

export function recordConflict(
  ledger: JudgmentLedger,
  input: {
    hypothesisId: string;
    left: { id: string; proposition: string; sourceKind: EvidenceSourceKind };
    right: { id: string; proposition: string; sourceKind: EvidenceSourceKind };
  },
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
