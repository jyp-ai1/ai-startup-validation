import type {
  Accuracy,
  Agreement,
  NextAction,
  ReviewMark,
  ReviewSections,
  RevisionArea,
} from './ai-pm-review-store';

export type { ReviewMark };

export const REVIEW_MARKS = [
  'understanding_accurate',
  'understanding_wrong',
  'core_missing',
  'unnecessary',
  'evidence_unclear',
  'question_unfit',
] as const satisfies readonly ReviewMark[];

export const REVIEW_MARK_LABEL: Record<ReviewMark, string> = {
  understanding_accurate: '사업 이해가 정확함',
  understanding_wrong: '사업 이해가 틀림',
  core_missing: '핵심 내용이 빠짐',
  unnecessary: '불필요한 내용이 많음',
  evidence_unclear: '판단 근거가 불명확함',
  question_unfit: '다음 질문이 적절하지 않음',
};

export type ReviewReading = {
  source: 'model-review' | 'input-only';
  summary: string;
  idea: string;
  hypothesis: string | null;
  question: string | null;
  questionReason: string | null;
  openingTrimmed: boolean;
};

export type RevisedReading = ReviewReading & {
  notes: string[];
  showIdea: boolean;
  founderFact: string | null;
};

const HELD_QUESTION = '이 질문 대신, 판단이 바뀌는 사실 하나를 적어 주세요.';
const INPUT_QUESTION = '판단이 바뀌는 사실 하나를 적어 주세요.';

export function isReviewMark(value: unknown): value is ReviewMark {
  return typeof value === 'string' && (REVIEW_MARKS as readonly string[]).includes(value);
}

export function normalizeMarks(value: unknown): ReviewMark[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter(isReviewMark))];
}

export function inputFingerprint(text: string): string {
  let hash = 5381;
  for (const char of text) {
    hash = Math.imul(hash, 33) + (char.codePointAt(0) ?? 0);
  }
  return (hash >>> 0).toString(16);
}

export function openingLine(text: string): { line: string; trimmed: boolean } {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= 280) return { line: compact, trimmed: false };
  const slice = compact.slice(0, 280);
  const stop = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('。'), slice.lastIndexOf('다'));
  return { line: stop >= 40 ? slice.slice(0, stop + 1) : slice, trimmed: true };
}

export function readingFromInput(text: string): ReviewReading {
  const opening = openingLine(text);
  return {
    source: 'input-only',
    summary: opening.line,
    idea: '',
    hypothesis: null,
    question: null,
    questionReason: null,
    openingTrimmed: opening.trimmed,
  };
}

export function readingFromSections(sections: ReviewSections): ReviewReading {
  return {
    source: 'model-review',
    summary: sections.judgment,
    idea: sections.execution,
    hypothesis: sections.uncertain[0] ?? sections.hypotheses[0] ?? null,
    question: sections.nextQuestion,
    questionReason: sections.nextQuestionReason,
    openingTrimmed: false,
  };
}

export function feedbackFromMarks(marks: ReviewMark[], comment = ''): {
  agreement: Agreement;
  accuracy: Accuracy;
  revisionAreas: RevisionArea[];
  nextAction: NextAction;
  comment: string;
  marks: ReviewMark[];
} {
  const wrong = marks.includes('understanding_wrong');
  const accurate = marks.includes('understanding_accurate');
  const agreement: Agreement = wrong && accurate ? 'partial' : wrong ? 'disagree' : accurate ? 'agree' : 'need_info';
  const accuracy: Accuracy = wrong
    ? 'misstated'
    : marks.includes('evidence_unclear')
      ? 'hard_to_compare'
      : marks.includes('core_missing')
        ? 'mostly_accurate'
        : accurate
          ? 'very_accurate'
          : 'hard_to_compare';
  const revisionAreas: RevisionArea[] = [];
  if (wrong || marks.includes('core_missing')) revisionAreas.push('problem');
  if (marks.includes('evidence_unclear')) revisionAreas.push('evidence');
  if (marks.includes('unnecessary') || marks.includes('question_unfit')) revisionAreas.push('other');
  const correction = marks.some((mark) => mark !== 'understanding_accurate');
  const note = [comment.trim(), marks.map((mark) => REVIEW_MARK_LABEL[mark]).join(', ')].filter(Boolean).join('\n');
  return {
    agreement,
    accuracy,
    revisionAreas,
    nextAction: correction ? 'verify_hypotheses' : 'proceed',
    comment: note.slice(0, 4000),
    marks,
  };
}

export function restoredMarks(
  feedback: { marks: ReviewMark[]; submittedAt: string }[],
  local: { marks: ReviewMark[]; fact: string } | null,
): { marks: ReviewMark[]; where: 'account' | 'browser' | ''; fact: string } {
  if (local && local.marks.length > 0) {
    return { marks: normalizeMarks(local.marks), where: 'browser', fact: local.fact };
  }
  const latest = [...feedback].sort((left, right) => left.submittedAt.localeCompare(right.submittedAt)).at(-1);
  const marks = latest ? normalizeMarks(latest.marks) : [];
  if (marks.length > 0) return { marks, where: 'account', fact: local?.fact ?? '' };
  return { marks: [], where: '', fact: local?.fact ?? '' };
}

export function reviseReading(reading: ReviewReading, marks: ReviewMark[], founderFact = ''): RevisedReading {
  const notes: string[] = [];
  const fact = founderFact.trim();
  let hypothesis = reading.hypothesis;
  let question = reading.question;
  let questionReason = reading.questionReason;
  if (marks.includes('understanding_wrong')) {
    notes.push('사업 이해는 오류로 표시되었습니다. 이 문장을 확인된 사실로 두지 않습니다.');
  } else if (marks.includes('understanding_accurate')) {
    notes.push('사업 이해는 정확하다고 표시되었습니다.');
  }
  if (marks.includes('core_missing')) notes.push('빠진 핵심은 다음 검증에서 받습니다.');
  if (marks.includes('unnecessary')) notes.push('반복되던 부가 설명은 이 화면에서 뺐습니다.');
  if (marks.includes('evidence_unclear')) {
    notes.push('판단 근거는 아직 가정입니다.');
    if (hypothesis) hypothesis = `가정 · ${hypothesis}`;
  }
  if (marks.includes('question_unfit') || !question) {
    question = marks.includes('question_unfit') ? HELD_QUESTION : reading.source === 'input-only' ? INPUT_QUESTION : question;
    if (marks.includes('question_unfit')) {
      questionReason = '이전 질문은 적절하지 않다고 표시되었습니다.';
      notes.push('다음 질문은 보류했습니다.');
    } else if (reading.source === 'input-only') {
      questionReason = '모델이 고른 질문이 아닙니다.';
    }
  }
  if (fact) notes.push(`대표가 더한 사실: ${fact}`);
  const showIdea = Boolean(reading.idea) && reading.idea !== reading.summary && !marks.includes('unnecessary');
  return { ...reading, hypothesis, question, questionReason, notes, showIdea, founderFact: fact || null };
}
