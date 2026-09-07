/**
 * DAY 8-I P0 FIX-10 — CEO trust journey acceptance gates.
 */

import { parseIntakeSeedDocument } from '@/lib/project/parse-intake-seed';

import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import { applyAnswerToJudgment } from './ai-pm-judgment-aggregation';
import { buildBusinessReviewResult } from './ai-pm-business-review';
import { mergeCanonicalCustomer } from './ai-pm-judgment-canonical-state';
import { emptyCeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import { buildConfirmTextForTest } from './ai-pm-no-ask-policy-fix10';
import { isQuestionBackAnswer } from './ai-pm-judgment-target-binding';
import { toHumanLanguageQuestion } from './ai-pm-question-human-language';
import type { TurnAcceptanceFailure } from './day8i-fix3-turn-acceptance';

export const CEO_BREWERY_INTAKE_DOC = [
  '프로젝트 이름: 주인집1',
  '',
  '사업 설명:',
  '영세한 양조장들이 온라인 마케팅을 잘 못하고 있어서, 양조장을 온라인 시장에 홍보하고 지역경제를 활성화하는 모델입니다.',
].join('\n');

export function evaluateFix10IntakeSeparation(): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  const parsed = parseIntakeSeedDocument(CEO_BREWERY_INTAKE_DOC);

  if (parsed.projectTitle !== '주인집1') {
    failures.push({
      turnIndex: 0,
      label: 'FIX-10 intake',
      field: 'projectTitle',
      expected: '주인집1',
      actual: parsed.projectTitle ?? '(null)',
    });
  }

  if (!parsed.businessDescription?.includes('영세한 양조장')) {
    failures.push({
      turnIndex: 0,
      label: 'FIX-10 intake',
      field: 'businessDescription',
      expected: 'initial CEO business description',
      actual: parsed.businessDescription ?? '(null)',
    });
  }

  if (parsed.businessOneLinerCandidate === '주인집1') {
    failures.push({
      turnIndex: 0,
      label: 'FIX-10 intake',
      field: 'businessOneLinerCandidate',
      expected: 'must not equal project title',
      actual: parsed.businessOneLinerCandidate ?? '(null)',
    });
  }

  return failures;
}

export function evaluateFix10QuestionBackFreeze(): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  const answer = '고객이 누군데?';

  if (!isQuestionBackAnswer(answer)) {
    failures.push({
      turnIndex: 1,
      label: 'FIX-10 question-back',
      field: 'detect',
      expected: 'question-back detected',
      actual: 'not detected',
    });
  }

  let state = emptyCeoJudgmentState(0);
  const beforeProblem = state.dimensions.problem.summary;
  state = applyAnswerToJudgment({
    prior: state,
    answer,
    targetGap: 'problemJtbd',
    issueId: 'problem_definition',
  });

  if (state.dimensions.problem.summary !== beforeProblem) {
    failures.push({
      turnIndex: 1,
      label: 'FIX-10 question-back',
      field: 'problem.frozen',
      expected: 'no problem update',
      actual: state.dimensions.problem.summary,
    });
  }

  return failures;
}

export function evaluateFix10ShortCustomerNeedsCheck(): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  const merged = mergeCanonicalCustomer(emptyCeoJudgmentState(0).dimensions.customer, {
    conclusion: '양조장 사장님',
    evidence: '양조장 사장님',
    sourceTurnIndex: 1,
  });

  if (merged.status === 'clear') {
    failures.push({
      turnIndex: 2,
      label: 'FIX-10 customer trust',
      field: 'customer.status',
      expected: 'needs_check (short answer, not explicit definition)',
      actual: merged.status,
    });
  }

  if (merged.knowledgeSource === 'ai_inference') {
    failures.push({
      turnIndex: 2,
      label: 'FIX-10 customer trust',
      field: 'customer.knowledgeSource',
      expected: 'ceo_confirmed',
      actual: merged.knowledgeSource ?? '(null)',
    });
  }

  return failures;
}

export function evaluateFix10NoConditionalGo(state: CeoJudgmentState): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  const review = buildBusinessReviewResult(state);

  if (review.verdict === 'conditional_go') {
    failures.push({
      turnIndex: 99,
      label: 'FIX-10 verdict',
      field: 'verdict',
      expected: 'never conditional_go under FIX-10',
      actual: review.verdict,
    });
  }

  if (review.readiness === 'supplement_recommended' && review.verdict !== 'no_go') {
    failures.push({
      turnIndex: 99,
      label: 'FIX-10 verdict',
      field: 'supplement.verdict',
      expected: 'no_go when supplement_recommended',
      actual: review.verdict,
    });
  }

  return failures;
}

export function evaluateFix10ConfirmAndQuestionCopy(): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];

  const confirm = buildConfirmTextForTest(
    'businessOneLiner',
    '영세한 양조장의 온라인 마케팅을 지원하는 사업',
    false,
  );
  if (!confirm.includes('제가 이해한 사업') || !confirm.includes('맞나요')) {
    failures.push({
      turnIndex: 0,
      label: 'FIX-10 confirm copy',
      field: 'businessOneLiner.confirm',
      expected: '제가 이해한 사업 … 맞나요?',
      actual: confirm,
    });
  }

  const preserved = toHumanLanguageQuestion(
    '제가 이해한 사업은 「영세한 양조장」입니다. 맞나요?',
    'businessOneLiner',
  );
  if (!preserved.includes('맞나요')) {
    failures.push({
      turnIndex: 0,
      label: 'FIX-10 question copy',
      field: 'confirm.preserved',
      expected: 'confirm question preserved',
      actual: preserved,
    });
  }

  const aligned = toHumanLanguageQuestion('사업 한 줄은 무엇인가요?', 'businessOneLiner');
  if (!aligned.includes('누구에게') || !aligned.includes('무엇')) {
    failures.push({
      turnIndex: 0,
      label: 'FIX-10 question copy',
      field: 'businessOneLiner.aligned',
      expected: 'question aligned with guide',
      actual: aligned,
    });
  }

  return failures;
}

export function evaluateAllFix10Turns(state: CeoJudgmentState | null): TurnAcceptanceFailure[] {
  return [
    ...evaluateFix10IntakeSeparation(),
    ...evaluateFix10QuestionBackFreeze(),
    ...evaluateFix10ShortCustomerNeedsCheck(),
    ...evaluateFix10ConfirmAndQuestionCopy(),
    ...(state ? evaluateFix10NoConditionalGo(state) : []),
  ];
}
