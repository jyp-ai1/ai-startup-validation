/**
 * DAY 8-G G-5 — Question budget and judgment stop conditions.
 */

import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import { isAiPmJudgmentAggregationV1Active } from './ai-pm-judgment-aggregation-v1';

export const CEO_JUDGMENT_SESSION_MAX_QUESTIONS = 5;
export const CEO_JUDGMENT_EARLY_VIEW_FROM = 3;

export type JudgmentStopReason =
  | 'continue'
  | 'budget_reached'
  | 'readiness_reached'
  | 'follow_up';

export type JudgmentStopVerdict = {
  shouldStop: boolean;
  reason: JudgmentStopReason;
  showJudgmentView: boolean;
  judgmentTitle: 'question' | 'interim' | 'result';
};

/** 1차 판단 가능: customer+problem have content AND (solution OR customerChange has signal). */
export function isJudgmentReadinessReached(state: CeoJudgmentState): boolean {
  const c = state.dimensions.customer;
  const p = state.dimensions.problem;
  const s = state.dimensions.solution;
  const ch = state.dimensions.customerChange;

  const hasCustomer = c.status !== 'unknown' && c.summary.trim().length >= 4;
  const hasProblem = p.status !== 'unknown' && p.summary.trim().length >= 4;
  const hasSolutionOrChange =
    (s.status !== 'unknown' && s.summary.trim().length >= 4) ||
    (ch.status !== 'unknown' && ch.summary.trim().length >= 4);

  return hasCustomer && hasProblem && hasSolutionOrChange;
}

export function evaluateJudgmentStop(input: {
  questionCount: number;
  judgment: CeoJudgmentState;
  forceJudgmentView?: boolean;
}): JudgmentStopVerdict {
  if (!isAiPmJudgmentAggregationV1Active()) {
    return {
      shouldStop: false,
      reason: 'continue',
      showJudgmentView: false,
      judgmentTitle: 'question',
    };
  }

  const count = input.questionCount;

  if (input.forceJudgmentView) {
    return {
      shouldStop: true,
      reason: 'follow_up',
      showJudgmentView: true,
      judgmentTitle: 'interim',
    };
  }

  if (count >= CEO_JUDGMENT_SESSION_MAX_QUESTIONS) {
    return {
      shouldStop: true,
      reason: 'budget_reached',
      showJudgmentView: true,
      judgmentTitle: 'result',
    };
  }

  return {
    shouldStop: false,
    reason: 'continue',
    showJudgmentView: false,
    judgmentTitle: 'question',
  };
}

export function judgmentViewTitle(
  questionCount: number,
  mode: 'interim' | 'result' | 'question',
): string {
  if (mode === 'result') {
    return '사업 검토 결과';
  }
  if (mode === 'interim') {
    return '현재까지의 사업 판단';
  }
  if (questionCount >= CEO_JUDGMENT_SESSION_MAX_QUESTIONS) {
    return '사업 검토 결과';
  }
  if (questionCount >= CEO_JUDGMENT_EARLY_VIEW_FROM) {
    return '현재까지의 사업 판단';
  }
  return '지금 확인할 것';
}
