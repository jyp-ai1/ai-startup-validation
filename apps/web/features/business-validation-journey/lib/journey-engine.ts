import { buildRedelivery } from './answer-redelivery';
import { verificationActionFor } from './verification-action';
import {
  claimLabel,
  COUNTER_REVIEW_NOTE,
  evidenceLabel,
  EVIDENCE_QUESTION,
  gradeLabel,
  JUDGMENT_HOLD_REASON,
  JUDGMENT_TEXT,
  payerLabel,
  revenueLabel,
  SESSION_NOTE,
  type AnswerGrade,
  type Choice,
  type CorrectableField,
  type DeltaKind,
  type EvidenceChoice,
  type FieldRevision,
  type FounderAnswer,
  type FounderSourceRecord,
  type HypothesisJudgment,
  type Intake,
  type JourneySource,
  type JourneyState,
  type NextAction,
  type NextQuestion,
  type RequiredField,
  type Understanding,
} from './journey-types';

export type StartResult =
  | { ok: true; state: JourneyState }
  | { ok: false; missing: RequiredField[] };

export type ApplyResult = {
  state: JourneyState;
  applied: boolean;
  reason: string;
};

const FIELD_HYPOTHESIS: Record<CorrectableField, string> = {
  business: 'h-business',
  customer: 'h-customer',
  problem: 'h-problem',
  solution: 'h-solution',
};

const FIELD_LABEL: Record<CorrectableField, string> = {
  business: '사업 설명',
  customer: '목표 고객',
  problem: '고객 문제',
  solution: '해결책',
};

export function startJourney(
  intake: Intake,
  source: JourneySource = 'founder_input',
): StartResult {
  const normalized = normalizeIntake(intake);
  const missing = missingRequired(normalized);
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true, state: withRedelivery(null, finish(normalized, source, [], [], [], [])) };
}

export function applyAnswer(
  state: JourneyState,
  input: { choiceId: string; freeText: string; now: string },
): ApplyResult {
  const question = state.nextQuestion;
  if (!question) {
    return {
      state,
      applied: false,
      reason: '지금 물을 질문이 없다. 같은 질문을 만들어 내지 않는다.',
    };
  }

  const choice = question.choices.find((item) => item.id === input.choiceId);
  if (!choice) {
    return {
      state,
      applied: false,
      reason: '선택지에 없는 답이다. 입력 초안은 그대로 둔다.',
    };
  }

  const freeText = input.freeText.trim();
  const classification = classifyIncomingAnswer(
    state.answers,
    question.uncertaintyId,
    choice.id,
    freeText,
    choice.grade,
    state.intake,
  );
  const answer = makeAnswer(state, question, choice, freeText, input.now, classification);
  const intake = classification.material
    ? intakeAfterAnswer(state.intake, question.uncertaintyId, choice.id)
    : state.intake;
  const next = withRedelivery(
    state,
    finish(
      intake,
      state.source,
      [...state.answers, answer],
      state.revisions,
      state.sourceRecords ?? [],
      state.hypothesisJudgments ?? [],
    ),
  );

  return {
    state: next,
    applied: true,
    reason: reasonFor(classification.delta),
  };
}

export function correctField(
  state: JourneyState,
  field: CorrectableField,
  nextText: string,
  now: string,
): ApplyResult {
  const previous = state.intake[field].trim();
  const next = nextText.trim();
  if (!next) {
    return {
      state,
      applied: false,
      reason: '빈 문장으로는 진술을 바꾸지 않는다.',
    };
  }

  const duplicate = previous === next;
  const revision: FieldRevision = {
    id: `rev-${state.revisions.length + 1}`,
    field,
    hypothesisId: FIELD_HYPOTHESIS[field],
    previous,
    next,
    receivedAt: now,
    delta: duplicate ? 'duplicate' : 'hypothesis_change',
    material: !duplicate,
  };
  const intake = duplicate ? state.intake : { ...state.intake, [field]: next };
  const finished = withRedelivery(
    state,
    finish(
      intake,
      state.source,
      state.answers,
      [...state.revisions, revision],
      state.sourceRecords ?? [],
      state.hypothesisJudgments ?? [],
    ),
  );

  return {
    state: finished,
    applied: true,
    reason: duplicate
      ? '같은 진술이다. 이해를 바꾸지 않았고 이미 낸 질문을 다시 내지 않는다.'
      : `${FIELD_LABEL[field]} 진술을 바꿨다. 이전 문장과 새 문장을 둘 다 남긴다. 검증된 사실로 올리지 않았다.`,
  };
}

export function classifyIncomingAnswer(
  existing: FounderAnswer[],
  uncertaintyId: string,
  choiceId: string,
  freeText: string,
  grade: AnswerGrade,
  intake: Intake,
): { delta: DeltaKind; material: boolean } {
  const sameUncertainty = existing.filter((answer) => answer.uncertaintyId === uncertaintyId);
  const duplicate = sameUncertainty.some(
    (answer) => answer.choiceId === choiceId && answer.freeText.trim() === freeText,
  );
  if (duplicate) return { delta: 'duplicate', material: false };

  const conflict =
    (grade === 'claimed_record' && intake.evidence === 'none') ||
    (choiceId === 'paid_customer' && payerUnresolved(intake));
  if (conflict) return { delta: 'conflict_opened', material: true };

  const changedChoice = sameUncertainty.some(
    (answer) => answer.material && answer.choiceId !== choiceId,
  );
  if (changedChoice) return { delta: 'hypothesis_change', material: true };
  if (freeText) return { delta: 'detail_added', material: true };
  return { delta: 'new_claim', material: true };
}

export function gradeFromIntakeEvidence(evidence: EvidenceChoice): AnswerGrade | null {
  switch (evidence) {
    case '':
      return null;
    case 'none':
      return 'no_evidence';
    case 'interview':
      return 'founder_estimate';
    case 'usage':
    case 'payment':
    case 'repeat':
      return 'claimed_record';
  }
}

function withRedelivery(previous: JourneyState | null, next: JourneyState): JourneyState {
  return { ...next, redelivery: buildRedelivery(previous, next) };
}

function finish(
  intake: Intake,
  source: JourneySource,
  answers: FounderAnswer[],
  revisions: FieldRevision[],
  sourceRecords: FounderSourceRecord[],
  hypothesisJudgments: HypothesisJudgment[],
): JourneyState {
  const materialAnswers = answers.filter((answer) => answer.material);
  const materialRevisions = revisions.filter((revision) => revision.material);
  const asked = new Set(answers.map((answer) => answer.uncertaintyId));
  const selected = selectNextQuestion(intake, asked, answers);

  return {
    intake,
    source,
    answers,
    revisions,
    understanding: buildUnderstanding(intake, materialAnswers, materialRevisions),
    nextQuestion: selected.question,
    repeatBlockedReason: selected.repeatBlockedReason,
    nextAction: selected.question
      ? actionForQuestion(selected.question)
      : holdAction(intake, answers, revisions),
    researchStatus: 'research_not_run',
    researchNote: researchNote(intake.url),
    counterReviewStatus: 'counter_review_not_run',
    counterReviewNote: COUNTER_REVIEW_NOTE,
    judgmentStatus: 'judgment_deferred',
    judgmentText: JUDGMENT_TEXT,
    judgmentHoldReason: JUDGMENT_HOLD_REASON,
    sessionNote: SESSION_NOTE,
    analysisDelivery: {
      status: 'not_sent',
      reason: '전체 답변 이력은 이 상태에 보존한다. 모델에는 관련 이력도 보내지 않았다.',
    },
    captures: [],
    sourceRecords,
    hypothesisJudgments,
    redelivery: null,
  };
}

function buildUnderstanding(
  intake: Intake,
  answers: FounderAnswer[],
  revisions: FieldRevision[],
): Understanding {
  const known: Understanding['known'] = [
    { id: 'k-business', text: `사업 설명: 「${intake.business}」` },
    { id: 'k-customer', text: `목표 고객: 「${intake.customer}」` },
    { id: 'k-problem', text: `고객 문제: 「${intake.problem}」` },
  ];

  if (intake.solution) {
    known.push({ id: 'k-solution', text: `해결책: 「${intake.solution}」` });
  }
  if (intake.payer) {
    known.push({
      id: 'k-payer',
      text: `지불자: 「${payerLabel(intake.payer)}」. 창업자 진술 · 검증된 사실 아님.`,
    });
  }
  if (intake.revenue) {
    known.push({
      id: 'k-revenue',
      text: `수익 방식: 「${revenueLabel(intake.revenue)}」. 창업자 진술 · 검증된 사실 아님.`,
    });
  }
  if (intake.evidence) {
    const grade = gradeFromIntakeEvidence(intake.evidence);
    known.push({
      id: 'k-evidence',
      text: `현재 확보한 근거: ${evidenceLabel(intake.evidence)}. ${grade ? gradeLabel(grade) : ''}.`,
    });
  }

  const inferredParts = [
    `잠정 이해. 사업 설명은 「${intake.business}」`,
    `목표 고객은 「${intake.customer}」`,
    `문제는 「${intake.problem}」`,
  ];
  if (intake.solution) inferredParts.push(`제시한 해결책은 「${intake.solution}」`);
  if (intake.revenue === 'undecided') {
    inferredParts.push('수익 방식은 아직 정하지 않았다고 적었다');
  } else if (intake.revenue) {
    inferredParts.push(`수익 방식으로 ${revenueLabel(intake.revenue)}을 적었다`);
  }
  if (intake.payer === 'unknown') {
    inferredParts.push('지불자는 아직 모른다고 적었다');
  } else if (intake.payer) {
    inferredParts.push(`지불자는 「${payerLabel(intake.payer)}」이라고 적었다`);
  }

  const contradictions: Understanding['contradictions'] = [];
  if (payerUnresolved(intake) && claimsPayment(intake, answers)) {
    contradictions.push({
      id: 'c-payer',
      text: '결제 또는 반복 사용이 있다고 말했으나 지불자는 아직 모른다. 진술을 검증된 사실로 올리지 않는다.',
    });
  }
  if (
    intake.evidence === 'none' &&
    answers.some((answer) => answer.grade === 'claimed_record')
  ) {
    contradictions.push({
      id: 'c-evidence',
      text: '처음에는 근거를 확인하지 못했다고 했고, 이후 기록이 있다고 말했다. 두 진술을 모두 보존한다. 어느 쪽도 검증된 사실이 아니다.',
    });
  }
  if (
    !payerUnresolved(intake) &&
    answers.some((answer) => answer.choiceId === 'paid_customer' && answer.delta === 'conflict_opened')
  ) {
    contradictions.push({
      id: 'c-payer-later',
      text: `결제 고객이 있다고 말했다. 이후 지불자를 「${payerLabel(intake.payer)}」이라고 말했다. 둘 다 창업자 진술이며 결제 관찰은 없다.`,
    });
  }
  for (const revision of revisions) {
    contradictions.push({
      id: `c-${revision.id}`,
      text: `${FIELD_LABEL[revision.field]} 진술이 바뀌었다. 이전: 「${revision.previous}」 이후: 「${revision.next}」 둘 다 창업자 진술이며 검증된 사실이 아니다.`,
    });
  }

  return {
    known,
    inferred: [
      {
        id: 'inf-summary',
        text: `${inferredParts.join('. ')}. 이 문장은 입력을 묶은 잠정 해석이다. 고객 행동이나 매출 증거가 아니다.`,
      },
    ],
    contradictions,
    unknown: unknownItems(intake, answers),
  };
}

function unknownItems(intake: Intake, answers: FounderAnswer[]): Understanding['unknown'] {
  const frequency = answers.find((answer) => answer.uncertaintyId === 'u-frequency');
  const demand = answers.find((answer) => answer.uncertaintyId === 'u-demand');
  const payerNote =
    intake.payer && intake.payer !== 'unknown'
      ? ` 입력은 「${payerLabel(intake.payer)}」이다. 결제 관찰은 없다.`
      : '';

  return [
    {
      id: 'u-frequency',
      text: frequency
        ? `이 문제가 고객에게 얼마나 자주 발생하는가? 받은 답은 ${gradeLabel(frequency.grade)}이다. 이 항목을 확인으로 닫지 않았다.`
        : '이 문제가 고객에게 얼마나 자주 발생하는가?',
    },
    {
      id: 'u-demand',
      text: demand
        ? `고객이 실제로 해결책을 원하는가? 받은 답은 ${gradeLabel(demand.grade)}이다. 이 항목을 확인으로 닫지 않았다.`
        : '고객이 실제로 해결책을 원하는가?',
    },
    {
      id: 'u-payer',
      text: `누가 실제로 비용을 지불할 것인가?${payerNote}`,
    },
    {
      id: 'u-observed',
      text: '비용을 지불하거나 반복 사용하는 고객이 있는가?',
    },
  ];
}

function selectNextQuestion(
  intake: Intake,
  asked: Set<string>,
  answers: FounderAnswer[],
): { question: NextQuestion | null; repeatBlockedReason: string | null } {
  const lastPrompt = [...answers].reverse().find((answer) => answer.questionText)?.questionText ?? null;
  const candidates = collectCandidates(intake, asked, answers);
  const skipped: string[] = [];

  for (const candidate of candidates) {
    if (lastPrompt && candidate.prompt === lastPrompt) {
      skipped.push(candidate.uncertaintyId);
      continue;
    }
    return {
      question: candidate,
      repeatBlockedReason:
        skipped.length > 0
          ? `직전 질문과 문장이 같아 ${skipped.join(', ')} 은 다시 내지 않았다.`
          : null,
    };
  }

  return {
    question: null,
    repeatBlockedReason:
      skipped.length > 0
        ? '남은 후보가 직전 질문과 같다. 같은 질문을 다시 내지 않고 판단을 유보한다.'
        : null,
  };
}

function collectCandidates(
  intake: Intake,
  asked: Set<string>,
  answers: FounderAnswer[],
): NextQuestion[] {
  const candidates: NextQuestion[] = [];

  if (!intake.evidence && !asked.has('u-evidence')) {
    candidates.push({
      uncertaintyId: 'u-evidence',
      hypothesisId: 'h-problem-evidence',
      prompt: EVIDENCE_QUESTION,
      whyDifferent: null,
      allowsFreeText: true,
      choices: [
        { id: 'paid_customer', label: '실제로 비용을 지불한 고객이 있다', grade: 'claimed_record' },
        { id: 'usage_record', label: '고객이 실제로 사용한 기록이 있다', grade: 'claimed_record' },
        {
          id: 'interview',
          label: '고객 인터뷰에서 문제가 반복적으로 확인됐다',
          grade: 'founder_estimate',
        },
        { id: 'hypothesis', label: '현재는 내 추측 또는 가설이다', grade: 'founder_estimate' },
        { id: 'unknown', label: '아직 모르겠다', grade: 'unknown' },
      ],
    });
  }

  if ((intake.evidence !== '' || asked.has('u-evidence')) && !asked.has('u-episode')) {
    candidates.push({
      uncertaintyId: 'u-episode',
      hypothesisId: 'h-problem-evidence',
      prompt: '그 근거가 나온 구체적인 한 장면을 알려 달라.',
      whyDifferent: episodeWhy(intake),
      allowsFreeText: true,
      choices: [
        {
          id: 'have_scene',
          label: '한 장면을 적을 수 있다',
          grade: sceneGrade(intake, answers),
        },
        { id: 'no_scene', label: '구체적인 장면은 없다', grade: 'no_evidence' },
        { id: 'unknown', label: '아직 모르겠다', grade: 'unknown' },
      ],
    });
  }

  if (intake.payer === '' && !asked.has('u-payer')) {
    candidates.push({
      uncertaintyId: 'u-payer',
      hypothesisId: 'h-payer',
      prompt: '누가 비용을 지불하나요?',
      whyDifferent: null,
      allowsFreeText: true,
      choices: [
        { id: 'owner', label: '사업자 본인', grade: 'founder_estimate' },
        { id: 'end_customer', label: '최종 고객', grade: 'founder_estimate' },
        { id: 'organization', label: '기업·기관', grade: 'founder_estimate' },
        { id: 'unknown', label: '아직 모르겠다', grade: 'unknown' },
      ],
    });
  }

  if (!asked.has('u-frequency')) {
    candidates.push({
      uncertaintyId: 'u-frequency',
      hypothesisId: 'h-frequency',
      prompt: '이 문제가 고객에게 얼마나 자주 발생하나요?',
      whyDifferent: null,
      allowsFreeText: true,
      choices: [
        { id: 'often', label: '반복해서 발생한다고 본다', grade: 'founder_estimate' },
        { id: 'rare', label: '가끔 발생한다고 본다', grade: 'founder_estimate' },
        { id: 'no_evidence', label: '빈도를 뒷받침하는 근거가 없다', grade: 'no_evidence' },
        { id: 'unknown', label: '아직 모르겠다', grade: 'unknown' },
      ],
    });
  }

  if (!asked.has('u-demand')) {
    candidates.push({
      uncertaintyId: 'u-demand',
      hypothesisId: 'h-demand',
      prompt: '고객이 이 해결책을 원한다는 근거가 있나요?',
      whyDifferent: null,
      allowsFreeText: true,
      choices: [
        {
          id: 'claimed_use',
          label: '요청이나 사용 기록이 있다고 본다',
          grade: 'claimed_record',
        },
        { id: 'interview', label: '인터뷰에서 원한다고 들었다', grade: 'founder_estimate' },
        { id: 'hypothesis', label: '현재는 내 추측이다', grade: 'founder_estimate' },
        { id: 'no_evidence', label: '근거가 없다', grade: 'no_evidence' },
        { id: 'unknown', label: '아직 모르겠다', grade: 'unknown' },
      ],
    });
  }

  return candidates;
}

function episodeWhy(intake: Intake): string {
  if (intake.evidence) {
    return '첫 화면에서 근거 종류를 이미 받았다. 같은 선택 메뉴를 반복하지 않고, 그 근거가 나온 장면으로 질문을 좁힌다.';
  }
  return '근거 종류에 대한 답을 이미 받았다. 같은 질문을 반복하지 않고, 구체적인 장면이 있는지만 묻는다.';
}

function sceneGrade(intake: Intake, answers: FounderAnswer[]): AnswerGrade {
  const prior = [...answers].reverse().find((answer) => answer.uncertaintyId === 'u-evidence' && answer.material);
  const parent = prior?.grade ?? gradeFromIntakeEvidence(intake.evidence);
  if (parent === 'claimed_record') return 'claimed_record';
  return 'founder_estimate';
}

function actionForQuestion(question: NextQuestion): NextAction {
  return {
    kind: 'mcq_confirm',
    text: question.prompt,
    successCriterion: '창업자가 선택지 또는 장면으로 빈칸을 줄인다. 그 답은 검증된 사실이 아니다.',
    failureCriterion: '같은 질문을 반복하거나, 답변만으로 조사를 실행한 것처럼 표시한다.',
  };
}

function holdAction(intake: Intake, answers: FounderAnswer[], revisions: FieldRevision[]): NextAction {
  const verification = verificationActionFor({ intake, answers, revisions });
  return {
    kind: 'external_validation',
    text: verification.action,
    successCriterion: verification.evidenceNeeded,
    failureCriterion: '같은 질문을 반복하거나, 창업자 진술만으로 판단을 바꾼다.',
  };
}

function makeAnswer(
  state: JourneyState,
  question: NextQuestion,
  choice: Choice,
  freeText: string,
  now: string,
  classification: { delta: DeltaKind; material: boolean },
): FounderAnswer {
  const prior = [...state.answers].reverse().find((answer) => answer.uncertaintyId === question.uncertaintyId);
  return {
    id: `ans-${state.answers.length + 1}`,
    uncertaintyId: question.uncertaintyId,
    hypothesisId: question.hypothesisId,
    questionText: question.prompt,
    choiceId: choice.id,
    choiceLabel: choice.label,
    freeText,
    grade: choice.grade,
    claimLabel: claimLabel(choice.grade),
    receivedAt: now,
    previousValue: prior?.choiceLabel ?? evidenceLabel(state.intake.evidence),
    delta: classification.delta,
    material: classification.material,
  };
}

function reasonFor(delta: DeltaKind): string {
  switch (delta) {
    case 'duplicate':
      return '같은 답변이다. 이해를 바꾸지 않았고 같은 질문을 다시 내지 않는다.';
    case 'conflict_opened':
      return '두 진술이 충돌한다. 어느 쪽도 검증된 사실로 올리지 않았다.';
    case 'hypothesis_change':
      return '가설이 바뀌었다. 이전 답과 새 답을 둘 다 남긴다.';
    case 'detail_added':
      return '선택과 서술을 기록했다. 창업자 진술이며 검증된 사실이 아니다.';
    case 'new_claim':
      return '답을 기록했다. 창업자 진술이며 검증된 사실이 아니다.';
  }
}

function intakeAfterAnswer(intake: Intake, uncertaintyId: string, choiceId: string): Intake {
  if (uncertaintyId !== 'u-payer') return intake;
  if (
    choiceId === 'owner' ||
    choiceId === 'end_customer' ||
    choiceId === 'organization' ||
    choiceId === 'unknown'
  ) {
    return { ...intake, payer: choiceId };
  }
  return intake;
}

function researchNote(url: string): string {
  if (!url) return 'URL이 없다. 조사를 실행하지 않았다.';
  return 'URL은 저장했다. 페이지는 열지 않았다. research_not_run.';
}

function payerUnresolved(intake: Intake): boolean {
  return intake.payer === '' || intake.payer === 'unknown';
}

function claimsPayment(intake: Intake, answers: FounderAnswer[]): boolean {
  if (intake.evidence === 'payment' || intake.evidence === 'repeat') return true;
  return answers.some((answer) => answer.choiceId === 'paid_customer');
}

function missingRequired(intake: Intake): RequiredField[] {
  const missing: RequiredField[] = [];
  if (!intake.business) missing.push('business');
  if (!intake.customer) missing.push('customer');
  if (!intake.problem) missing.push('problem');
  return missing;
}

function normalizeIntake(intake: Intake): Intake {
  return {
    business: intake.business.trim(),
    customer: intake.customer.trim(),
    problem: intake.problem.trim(),
    solution: intake.solution.trim(),
    payer: intake.payer,
    revenue: intake.revenue,
    evidence: intake.evidence,
    url: intake.url.trim(),
  };
}
