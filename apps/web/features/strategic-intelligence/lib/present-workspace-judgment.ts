import type { DecisionRecord, ReviewCompletion } from '@repo/types/domain/strategic-intelligence';

import type { JudgmentLedger } from './si-judgment-contract';

export type WorkspaceJudgmentView = {
  judgmentText: string;
  nextActionText: string;
  validationPlanStatus: 'not_required' | 'proposed';
  validationPlanText: string;
  reviewCompletion: ReviewCompletion;
};

const HYPOTHESIS_LABELS: Array<[string, string]> = [
  ['h-customer-next', '새 고객'],
  ['h-problem-next', '새 문제'],
  ['h-business-model', '사업 가설'],
  ['h-one-liner', '한 줄 설명'],
  ['h-customer', '고객'],
  ['h-problem', '문제'],
  ['h-payer', '결제 주체'],
  ['h-repeat', '반복'],
  ['h-channel', '채널'],
  ['h-market', '시장'],
];

const FORBIDDEN_TOKEN =
  /(?:h|u|b|q|v)-[A-Za-z0-9-]+|\btargetGap\b|\btieBreak\b|\bscore\b/;

function relabelHypothesisIds(text: string): string {
  let next = text;
  for (const [id, label] of HYPOTHESIS_LABELS) {
    next = next
      .replaceAll(`${id}는`, `${label}은`)
      .replaceAll(`${id}은`, `${label}은`)
      .replaceAll(`${id}이`, `${label}이`)
      .replaceAll(`${id}가`, `${label}가`)
      .replaceAll(`${id}를`, `${label}를`)
      .replaceAll(`${id}을`, `${label}을`)
      .replaceAll(`${id}의`, `${label}의`)
      .replaceAll(id, label);
  }
  return next;
}

export function stripWorkspaceJudgmentTokens(text: string): string {
  const withoutBindings = text.replace(/b-[A-Za-z0-9-]+/g, '');
  const labeled = relabelHypothesisIds(withoutBindings);
  const withoutIds = labeled.replace(/(?:h|u|q|v)-[A-Za-z0-9-]+/g, '');
  return withoutIds
    .replace(/\btargetGap\b/g, '')
    .replace(/\btieBreak\b/g, '')
    .replace(/\bscore\b/g, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\s+([.,])/g, '$1')
    .trim();
}

export function workspaceJudgmentExposesInternalToken(view: WorkspaceJudgmentView): boolean {
  return [view.judgmentText, view.nextActionText, view.validationPlanText].some((line) =>
    FORBIDDEN_TOKEN.test(line),
  );
}

export function visibleWorkspaceJudgmentSentences(view: WorkspaceJudgmentView): string[] {
  const sentences = [view.judgmentText, view.nextActionText];
  if (view.validationPlanStatus === 'proposed' && view.validationPlanText) {
    sentences.push(view.validationPlanText);
  }
  return sentences;
}

export function presentWorkspaceJudgment(input: {
  ledger: JudgmentLedger;
  decision: DecisionRecord;
  previous?: WorkspaceJudgmentView | null;
}): WorkspaceJudgmentView | null {
  if (input.ledger.validationPlan.status === 'executed') return input.previous ?? null;
  const status = input.ledger.validationPlan.status;
  const validationPlanText =
    status === 'not_required'
      ? ''
      : [input.ledger.validationPlan.evidenceNeeded, input.ledger.validationPlan.pendingWork]
          .map((line) => line.trim())
          .filter(Boolean)
          .join(' ');
  return {
    judgmentText: stripWorkspaceJudgmentTokens(input.ledger.judgment),
    nextActionText: stripWorkspaceJudgmentTokens(input.decision.prompt),
    validationPlanStatus: status,
    validationPlanText,
    reviewCompletion: input.ledger.reviewCompletion,
  };
}
