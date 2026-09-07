/**
 * DAY 8-I P0 FIX-8 — Canonical judgment state acceptance gates.
 */

import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import type { Day8iConversationTurnRecord } from './day8i-conversation-harness';
import { evaluateAllFix7Turns } from './day8i-fix7-turn-acceptance';
import type { TurnAcceptanceFailure } from './day8i-fix3-turn-acceptance';
import {
  CUSTOMER_CHANGE_CLAIM_LABEL,
  isAccumulativeProblemSummary,
} from './ai-pm-judgment-canonical-state';
import {
  buildStructuredFinalReview,
  buildStructuredReviewEntry,
  renderProblemStructuredReview,
} from './ai-pm-judgment-structured-review';
import {
  expectedFocusAtTurn,
  expectedFocusPromptAtTurn,
} from './ai-pm-judgment-next-focus';
import { formatReviewModeDisplay } from './ai-pm-review-mode-prompt';
import { primaryEvidenceRecord } from './ai-pm-judgment-evidence-model';

const MILESTONE_TURNS = [4, 8, 18, 22, 28, 30] as const;
const NO_DOT_TURNS = [5, 9, 15, 16, 21] as const;

export function evaluateT09FullEvidence(
  turn: Day8iConversationTurnRecord,
): TurnAcceptanceFailure[] {
  if (turn.turnIndex !== 9) return [];
  const failures: TurnAcceptanceFailure[] = [];
  const problem = turn.judgmentSnapshot?.dimensions.problem;
  if (!problem) return failures;

  const records = problem.evidenceRecords ?? [];
  const severity = records.find((r) => /10%|심각/.test(r.span));
  if (!severity) {
    failures.push({
      turnIndex: 9,
      label: 'FIX-8 T09 evidence fidelity',
      field: 'problem.severityRecord',
      expected: 'evidence with 10% severity span',
      actual: records.map((r) => r.span).join(' | ') || '(none)',
    });
  } else if (!/10%/.test(severity.span) || !/심각/.test(severity.span)) {
    failures.push({
      turnIndex: 9,
      label: 'FIX-8 T09 evidence fidelity',
      field: 'problem.fullSeveritySpan',
      expected: '배송 누락이 주문 건수의 10% 정도로 매우 심각',
      actual: severity.span,
    });
  }

  const trace = turn.trace?.dimensionEntries.find((e) => e.affectedDimension === 'problem');
  if (trace && !/10%|심각/.test(trace.evidence)) {
    failures.push({
      turnIndex: 9,
      label: 'FIX-8 T09 evidence fidelity',
      field: 'trace.evidence',
      expected: 'full severity in trace evidence',
      actual: trace.evidence,
    });
  }

  return failures;
}

export function evaluateNoAccumulativeProblem(
  turns: Day8iConversationTurnRecord[],
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  for (const turn of turns) {
    const problem = turn.judgmentSnapshot?.dimensions.problem;
    if (!problem?.summary.trim()) continue;
    if (NO_DOT_TURNS.includes(turn.turnIndex as (typeof NO_DOT_TURNS)[number])) {
      if (isAccumulativeProblemSummary(problem.summary)) {
        failures.push({
          turnIndex: turn.turnIndex,
          label: 'FIX-8 no string append',
          field: 'problem.summary',
          expected: 'PRIMARY/RELATED structure, no · chain',
          actual: problem.summary,
        });
      }
    }
  }
  return failures;
}

export function evaluateCustomerChangeClaimLabel(
  finalState: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  if (!finalState) return failures;

  const cc = finalState.dimensions.customerChange;
  if (cc.label !== CUSTOMER_CHANGE_CLAIM_LABEL) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-8 customer change label',
      field: 'customerChange.label',
      expected: CUSTOMER_CHANGE_CLAIM_LABEL,
      actual: cc.label,
    });
  }

  const review = buildStructuredFinalReview(finalState);
  if (!review.includes(CUSTOMER_CHANGE_CLAIM_LABEL)) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-8 customer change label',
      field: 'finalReview.heading',
      expected: CUSTOMER_CHANGE_CLAIM_LABEL,
      actual: review.split('\n').find((l) => l.startsWith('###')) ?? '(none)',
    });
  }

  if (cc.status === 'clear') {
    failures.push({
      turnIndex: 30,
      label: 'FIX-8 customer change status lock',
      field: 'customerChange.neverClear',
      expected: 'needs_check without validation',
      actual: 'clear',
    });
  }

  return failures;
}

export function evaluateFinalReviewFromCanonical(
  finalState: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  if (!finalState) return failures;

  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as const) {
    const d = finalState.dimensions[id];
    const entry = buildStructuredReviewEntry(d);
    if (id === 'problem' && /·/.test(entry.display.split('RELATED:')[0] ?? '')) {
      failures.push({
        turnIndex: 30,
        label: 'FIX-8 final review canonical',
        field: 'problem.notAccumulated',
        expected: 'PRIMARY/RELATED from canonical state',
        actual: entry.display,
      });
    }
  }

  const problem = finalState.dimensions.problem;
  const structured = renderProblemStructuredReview(problem);
  if (problem.summary !== structured && !problem.summary.includes('PRIMARY:')) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-8 final review canonical',
      field: 'problem.summarySync',
      expected: 'summary matches structured review',
      actual: problem.summary,
    });
  }

  return failures;
}

export function evaluateStateBasedFocus(
  turns: Day8iConversationTurnRecord[],
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];

  for (const turnIndex of MILESTONE_TURNS) {
    const turn = turns[turnIndex - 1];
    if (!turn?.judgmentSnapshot) continue;

    if (turnIndex >= 29) {
      if (turn.nextQuestion && /더 구체적으로 확인/.test(turn.nextQuestion)) {
        failures.push({
          turnIndex,
          label: 'FIX-8 state-based focus',
          field: `focus.t${turnIndex}.reviewMode`,
          expected: 'review / no repeat dimension focus',
          actual: turn.nextQuestion.slice(0, 80),
        });
      }
      continue;
    }

    const expected = expectedFocusAtTurn(turnIndex, turn.judgmentSnapshot);
    const expectedPrompt = expected ? expectedFocusPromptAtTurn(turnIndex, turn.judgmentSnapshot) : null;
    if (!expected || !expectedPrompt) continue;

    const snap = turn.judgmentSnapshot;
    const focusBlock =
      formatReviewModeDisplay(snap).split('[다음 AI 판단 초점]')[1]?.split('[다음 선택]')[0] ?? '';
    if (!focusBlock.includes(expectedPrompt.slice(0, 14))) {
      failures.push({
        turnIndex,
        label: 'FIX-8 state-based focus',
        field: `focus.t${turnIndex}`,
        expected: expectedPrompt,
        actual: focusBlock.trim().slice(0, 80) || '(none)',
      });
    }
  }

  return failures;
}

export function evaluateT22CanonicalReplace(
  turn: Day8iConversationTurnRecord,
): TurnAcceptanceFailure[] {
  if (turn.turnIndex !== 22) return [];
  const failures: TurnAcceptanceFailure[] = [];
  const problem = turn.judgmentSnapshot?.dimensions.problem;
  if (!problem) return failures;

  const primary = primaryEvidenceRecord(problem);
  if (!primary?.span.includes('더 큽') && !primary?.span.includes('사실')) {
    failures.push({
      turnIndex: 22,
      label: 'FIX-8 T22 canonical replace',
      field: 'problem.fullEvidence',
      expected: 'full CEO answer in primary evidence',
      actual: primary?.span ?? '(none)',
    });
  }

  if (primary?.meaning && !/확인\s*시간|핵심/.test(primary.meaning)) {
    failures.push({
      turnIndex: 22,
      label: 'FIX-8 T22 canonical replace',
      field: 'problem.primaryMeaning',
      expected: '주문 확인 시간이 핵심 문제',
      actual: primary.meaning,
    });
  }

  const display = renderProblemStructuredReview(problem);
  if (/배송\s*분리|엑셀로\s*주문|10%/.test(display.split('RELATED:')[0] ?? display)) {
    failures.push({
      turnIndex: 22,
      label: 'FIX-8 T22 canonical replace',
      field: 'problem.primaryOnly',
      expected: 'PRIMARY without accumulated dump',
      actual: display,
    });
  }

  return failures;
}

export function evaluateAllFix8Turns(
  turns: Day8iConversationTurnRecord[],
  finalState: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];

  failures.push(...evaluateAllFix7Turns(turns, finalState));

  for (const turn of turns) {
    failures.push(...evaluateT09FullEvidence(turn));
    failures.push(...evaluateT22CanonicalReplace(turn));
  }

  failures.push(...evaluateNoAccumulativeProblem(turns));
  failures.push(...evaluateCustomerChangeClaimLabel(finalState));
  failures.push(...evaluateFinalReviewFromCanonical(finalState));
  failures.push(...evaluateStateBasedFocus(turns));

  return failures;
}
