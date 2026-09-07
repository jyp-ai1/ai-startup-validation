/**
 * DAY 8-I P0 FIX-7 — Strict acceptance (structured final review + strict evidence).
 */

import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import type { Day8iConversationTurnRecord } from './day8i-conversation-harness';
import { evaluateAllFix6Turns } from './day8i-fix6-turn-acceptance';
import type { TurnAcceptanceFailure } from './day8i-fix3-turn-acceptance';
import {
  buildStructuredReviewEntry,
  renderProblemStructuredReview,
} from './ai-pm-judgment-structured-review';
import { evaluateEvidenceAlignment } from './ai-pm-judgment-evidence-review';
import {
  expectedFocusAtTurn,
  expectedFocusPromptAtTurn,
} from './ai-pm-judgment-next-focus';
import { formatReviewModeDisplay } from './ai-pm-review-mode-prompt';

const MILESTONE_TURNS = [4, 8, 18, 22, 28, 30] as const;

export function evaluateT22TrueReplace(
  turn: Day8iConversationTurnRecord,
): TurnAcceptanceFailure[] {
  if (turn.turnIndex !== 22) return [];
  const failures: TurnAcceptanceFailure[] = [];
  const problem = turn.judgmentSnapshot?.dimensions.problem;
  if (!problem) return failures;

  const display = renderProblemStructuredReview(problem);
  if (/배송\s*분리|엑셀로\s*주문|10%|재주문/.test(display.split('RELATED:')[0] ?? display)) {
    failures.push({
      turnIndex: 22,
      label: 'T22 true replace',
      field: 'problem.primaryOnly',
      expected: 'PRIMARY block without accumulated facts',
      actual: display,
    });
  }

  const primary = problem.evidenceRecords?.find((r) => r.role === 'primary');
  if (!primary?.span.includes('사실') && !primary?.span.includes('더 큽')) {
    failures.push({
      turnIndex: 22,
      label: 'T22 true replace',
      field: 'problem.fullEvidence',
      expected: 'full CEO answer preserved in evidence span',
      actual: primary?.span ?? '(none)',
    });
  }

  if ((problem.evidenceRecords?.filter((r) => r.role === 'supporting').length ?? 0) > 0) {
    failures.push({
      turnIndex: 22,
      label: 'T22 true replace',
      field: 'problem.noSupportingDump',
      expected: 'no supporting role dump from prior collection',
      actual: String(problem.evidenceRecords?.filter((r) => r.role === 'supporting').length),
    });
  }

  return failures;
}

export function evaluateSolutionLayerSources(
  state: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  if (!state) return failures;
  const ev = state.dimensions.solution.solutionLayerEvidence ?? [];
  const expected: Array<{ layer: 'approach' | 'keyFeature' | 'mvpScope'; turn: number }> = [
    { layer: 'approach', turn: 3 },
    { layer: 'keyFeature', turn: 21 },
    { layer: 'mvpScope', turn: 28 },
  ];
  for (const spec of expected) {
    const hit = ev.find((e) => e.layer === spec.layer);
    if (!hit) {
      failures.push({
        turnIndex: 30,
        label: 'FIX-7 solution layer source',
        field: `solution.${spec.layer}.missing`,
        expected: `layer evidence with source turn`,
        actual: '(none)',
      });
      continue;
    }
    if (hit.sourceTurnIndex !== spec.turn) {
      failures.push({
        turnIndex: 30,
        label: 'FIX-7 solution layer source',
        field: `solution.${spec.layer}.turn`,
        expected: `Turn ${spec.turn}`,
        actual: `Turn ${hit.sourceTurnIndex ?? '(none)'}`,
      });
    }
  }
  return failures;
}

export function evaluateStatusPromotionBlock(
  turns: Day8iConversationTurnRecord[],
  finalState: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  const t26 = turns[25];
  if (t26?.judgmentSnapshot?.dimensions.customerChange.status === 'clear') {
    failures.push({
      turnIndex: 26,
      label: 'FIX-7 status promotion',
      field: 't26.notClear',
      expected: 'needs_check',
      actual: 'clear',
    });
  }
  if (finalState?.dimensions.customerChange.status === 'clear') {
    failures.push({
      turnIndex: 30,
      label: 'FIX-7 status promotion',
      field: 'final.customerChange.notClear',
      expected: 'needs_check (CEO claim, no validation)',
      actual: 'clear',
    });
  }
  return failures;
}

export function evaluateMilestoneFocus(
  turns: Day8iConversationTurnRecord[],
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];

  for (const turnIndex of MILESTONE_TURNS) {
    const turn = turns[turnIndex - 1];
    if (!turn?.judgmentSnapshot) continue;
    const expected = expectedFocusAtTurn(turnIndex, turn.judgmentSnapshot);
    const expectedPrompt = expected
      ? expectedFocusPromptAtTurn(turnIndex, turn.judgmentSnapshot)
      : null;

    if (turnIndex >= 29) {
      if (turn.nextQuestion && /더 구체적으로 확인/.test(turn.nextQuestion)) {
        failures.push({
          turnIndex,
          label: 'FIX-7 milestone focus',
          field: `focus.t${turnIndex}.reviewMode`,
          expected: 'review / no repeat solution focus',
          actual: turn.nextQuestion.slice(0, 80),
        });
      }
      continue;
    }

    if (!expected || !expectedPrompt) continue;

    const snap = turn.judgmentSnapshot;
    const focusBlock = formatReviewModeDisplay(snap).split('[다음 AI 판단 초점]')[1]?.split('[다음 선택]')[0] ?? '';
    if (!focusBlock.includes(expectedPrompt.slice(0, 14))) {
      failures.push({
        turnIndex,
        label: 'FIX-7 milestone focus',
        field: `focus.t${turnIndex}`,
        expected: expectedPrompt,
        actual: focusBlock.trim().slice(0, 80) || '(none)',
      });
    }
  }

  return failures;
}

export function evaluateStrictFinalReview(
  state: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  if (!state) return failures;

  for (const issue of evaluateEvidenceAlignment(state)) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-7 strict final review',
      field: `alignment.${issue.dimensionId}`,
      expected: 'evidence + source turn + aligned',
      actual: issue.issue,
    });
  }

  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as const) {
    const entry = buildStructuredReviewEntry(state.dimensions[id]);
    if (entry.aligned && (!entry.primarySourceTurn || !entry.primaryEvidenceSpan)) {
      if (id === 'solution') continue;
      failures.push({
        turnIndex: 30,
        label: 'FIX-7 strict final review',
        field: `alignedWithoutSource.${id}`,
        expected: 'no Aligned ✅ without source turn',
        actual: 'aligned=true but missing source',
      });
    }
    if (id === 'problem' && /·/.test(entry.display.split('RELATED:')[0] ?? '')) {
      failures.push({
        turnIndex: 30,
        label: 'FIX-7 strict final review',
        field: 'problem.notAccumulated',
        expected: 'structured PRIMARY/RELATED, not · chain',
        actual: entry.display,
      });
    }
  }

  return failures;
}

export function evaluateAllFix7Turns(
  turns: Day8iConversationTurnRecord[],
  finalState: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];

  failures.push(...evaluateAllFix6Turns(turns, finalState));

  for (const turn of turns) {
    failures.push(...evaluateT22TrueReplace(turn));
  }

  failures.push(...evaluateSolutionLayerSources(finalState));
  failures.push(...evaluateStatusPromotionBlock(turns, finalState));
  failures.push(...evaluateMilestoneFocus(turns));
  failures.push(...evaluateStrictFinalReview(finalState));

  return failures;
}
