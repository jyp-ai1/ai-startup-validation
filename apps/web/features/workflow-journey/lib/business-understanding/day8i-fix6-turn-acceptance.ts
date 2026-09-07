/**
 * DAY 8-I P0 FIX-6 — Strict acceptance (evidence-grounded judgment chain).
 */

import type { CeoJudgmentDimensionId } from './ai-pm-ceo-judgment-dimensions';
import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import type { Day8iConversationTurnRecord } from './day8i-conversation-harness';
import {
  evaluateAllFix5Turns,
  FIX5_CRITICAL_TURN_EXPECTATIONS,
} from './day8i-fix5-turn-acceptance';
import {
  evaluateTurnExpectation,
  type TurnAcceptanceFailure,
  type TurnDimensionExpectation,
} from './day8i-fix3-turn-acceptance';
import { extractAnswerSemanticEvidences } from './ai-pm-answer-semantic-sot';
import {
  buildDimensionSourceTrace,
  evaluateEvidenceAlignment,
} from './ai-pm-judgment-evidence-review';
import { formatReviewModeDisplay } from './ai-pm-review-mode-prompt';
import { pickDynamicNextFocus } from './ai-pm-judgment-next-focus';
import { isProblemPriorityCorrection } from './ai-pm-judgment-problem-correction';

export const FIX6_ADDITIONAL_TURN_EXPECTATIONS: TurnDimensionExpectation[] = [
  {
    turnIndex: 22,
    label: 'T22 problem priority correction',
    mustUpdate: ['problem'],
    stateMustContain: { problem: /확인\s*시간.*핵심|주문\s*확인.*핵심/ },
    stateMustNotContain: { problem: /^배송\s*누락\s*·/ },
    evidenceMustContain: { problem: /확인\s*시간|주문\s*확인/ },
  },
  {
    turnIndex: 26,
    label: 'T26 expectation not fact',
    mustUpdate: ['customerChange'],
    stateMustContain: { customerChange: /실수|시간|아낄/ },
  },
];

export const FIX6_CRITICAL_TURN_EXPECTATIONS: TurnDimensionExpectation[] = [
  ...FIX5_CRITICAL_TURN_EXPECTATIONS.filter((s) => s.turnIndex !== 22),
  ...FIX6_ADDITIONAL_TURN_EXPECTATIONS,
];

export function evaluateT22PriorityCorrection(
  turn: Day8iConversationTurnRecord,
): TurnAcceptanceFailure[] {
  if (turn.turnIndex !== 22) return [];
  const failures: TurnAcceptanceFailure[] = [];

  if (!isProblemPriorityCorrection(turn.ceoAnswer)) {
    failures.push({
      turnIndex: 22,
      label: 'T22 priority correction',
      field: 'correction.detect',
      expected: 'priority correction pattern',
      actual: turn.ceoAnswer,
    });
  }

  const problem = turn.judgmentSnapshot?.dimensions.problem;
  if (!problem) {
    failures.push({
      turnIndex: 22,
      label: 'T22 priority correction',
      field: 'correction.snapshot',
      expected: 'problem snapshot',
      actual: '(missing)',
    });
    return failures;
  }

  if (!/핵심\s*문제/.test(problem.currentConclusion ?? problem.summary)) {
    failures.push({
      turnIndex: 22,
      label: 'T22 priority correction',
      field: 'correction.primaryConclusion',
      expected: '주문 확인 시간이 핵심 문제',
      actual: problem.currentConclusion ?? problem.summary,
    });
  }

  if (!problem.correctionApplied) {
    failures.push({
      turnIndex: 22,
      label: 'T22 priority correction',
      field: 'correction.applied',
      expected: 'correctionApplied=true',
      actual: 'false',
    });
  }

  const trace = turn.trace?.dimensionEntries.find((e) => e.affectedDimension === 'problem');
  if (trace && !/확인\s*시간|주문\s*확인/.test(trace.evidence)) {
    failures.push({
      turnIndex: 22,
      label: 'T22 priority correction',
      field: 'correction.evidenceSpan',
      expected: 'evidence contains 주문 확인 시간',
      actual: trace.evidence,
    });
  }

  return failures;
}

export function evaluateT26ExpectationTyping(
  turn: Day8iConversationTurnRecord,
): TurnAcceptanceFailure[] {
  if (turn.turnIndex !== 26) return [];
  const failures: TurnAcceptanceFailure[] = [];
  const d = turn.judgmentSnapshot?.dimensions.customerChange;
  if (!d) return failures;

  if (d.status === 'clear') {
    failures.push({
      turnIndex: 26,
      label: 'T26 expectation',
      field: 'expectation.status',
      expected: 'needs_check (not validated fact)',
      actual: d.status,
    });
  }
  if (d.evidenceType !== 'expectation' && d.evidenceType !== 'hypothesis') {
    failures.push({
      turnIndex: 26,
      label: 'T26 expectation',
      field: 'expectation.evidenceType',
      expected: 'expectation or hypothesis',
      actual: d.evidenceType ?? 'fact',
    });
  }
  return failures;
}

export function evaluateStructuredSolutionDisplay(
  state: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  if (!state) return failures;
  const s = state.dimensions.solution;
  if (!s.summary.trim()) return failures;

  if (!s.summary.includes('- 접근:') || !s.summary.includes('- MVP:')) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-6 structured solution display',
      field: 'solution.bullets',
      expected: 'bullet structure (- 접근: / - 핵심 기능: / - MVP:)',
      actual: s.summary,
    });
  }
  if (/ — /.test(s.summary)) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-6 structured solution display',
      field: 'solution.notDashChain',
      expected: 'no em-dash sentence chain',
      actual: s.summary,
    });
  }
  return failures;
}

export function evaluateFinalEvidenceAlignment(
  state: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  if (!state) return failures;

  for (const issue of evaluateEvidenceAlignment(state)) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-6 final evidence alignment',
      field: `evidence.${issue.dimensionId}`,
      expected: 'final judgment aligned with primary evidence span',
      actual: issue.issue,
    });
  }

  const problemTrace = buildDimensionSourceTrace(state.dimensions.problem);
  if (problemTrace.sourceTurnIndex !== 22) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-6 problem source turn',
      field: 'evidence.problem.sourceTurn',
      expected: 'Turn 22',
      actual: problemTrace.sourceTurnIndex?.toString() ?? '(none)',
    });
  }
  if (!problemTrace.evidenceSpan || !/확인/.test(problemTrace.evidenceSpan)) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-6 problem source evidence',
      field: 'evidence.problem.span',
      expected: '주문 확인 시간 evidence span',
      actual: problemTrace.evidenceSpan ?? '(none)',
    });
  }

  return failures;
}

export function evaluateDynamicNextFocus(
  turns: Day8iConversationTurnRecord[],
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];

  const t08 = turns[7];
  if (t08?.judgmentSnapshot) {
    const focus = pickDynamicNextFocus(t08.judgmentSnapshot, {
      turnIndex: 8,
      lastUpdatedDimensions: t08.judgmentSnapshot.lastUpdatedDimensions ?? ['customer'],
      recentCorrections: t08.judgmentSnapshot.recentCorrections ?? ['customer'],
    });
    if (focus === 'customer') {
      failures.push({
        turnIndex: 8,
        label: 'FIX-6 dynamic focus after T08',
        field: 'focus.afterCustomerCorrection',
        expected: 'not customer (corrected)',
        actual: 'customer',
      });
    }
  }

  const t22 = turns[21];
  if (t22?.judgmentSnapshot) {
    const focus = pickDynamicNextFocus(t22.judgmentSnapshot, {
      turnIndex: 22,
      lastUpdatedDimensions: t22.judgmentSnapshot.lastUpdatedDimensions ?? ['problem'],
      recentCorrections: t22.judgmentSnapshot.recentCorrections ?? ['problem'],
    });
    if (focus === 'customer') {
      failures.push({
        turnIndex: 22,
        label: 'FIX-6 dynamic focus after T22',
        field: 'focus.afterProblemCorrection',
        expected: 'not customer',
        actual: 'customer',
      });
    }
  }

  const reviewTurns = turns.filter((t) => t.question.includes('[다음 AI 판단 초점]'));
  const customerFocusRepeats = reviewTurns.filter((t) =>
    t.question.includes('누구를 위한 사업인지'),
  );
  if (customerFocusRepeats.length > 3) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-6 dynamic focus repetition',
      field: 'focus.customerRepeat',
      expected: '<= 3 customer focus prompts after T08 correction',
      actual: String(customerFocusRepeats.length),
    });
  }

  return failures;
}

export function evaluateSemanticChainFix6(
  turn: Day8iConversationTurnRecord,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  const semantic = extractAnswerSemanticEvidences(turn.ceoAnswer);
  if (semantic.frozen || semantic.nonJudgmentSlot) return failures;

  for (const ev of semantic.evidences) {
    const entry = turn.trace?.dimensionEntries.find((e) => e.affectedDimension === ev.dimension);
    if (!entry) continue;
    if (ev.evidence && entry.evidence && !entry.evidence.includes(ev.evidence.slice(0, 4))) {
      if (
        ev.dimension === 'problem' &&
        turn.turnIndex === 22 &&
        /확인/.test(ev.evidence) &&
        /확인/.test(entry.evidence)
      ) {
        continue;
      }
      failures.push({
        turnIndex: turn.turnIndex,
        label: `T${turn.turnIndex} semantic chain`,
        field: `chain.${ev.dimension}.evidenceMatch`,
        expected: ev.evidence,
        actual: entry.evidence,
      });
    }
  }
  return failures;
}

export function evaluateAllFix6Turns(
  turns: Day8iConversationTurnRecord[],
  finalState: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];

  failures.push(...evaluateAllFix5Turns(turns, finalState));

  for (const spec of FIX6_CRITICAL_TURN_EXPECTATIONS) {
    const turn = turns[spec.turnIndex - 1];
    if (turn) failures.push(...evaluateTurnExpectation(spec, turn));
  }

  for (const turn of turns) {
    failures.push(...evaluateT22PriorityCorrection(turn));
    failures.push(...evaluateT26ExpectationTyping(turn));
    failures.push(...evaluateSemanticChainFix6(turn));
  }

  failures.push(...evaluateStructuredSolutionDisplay(finalState));
  failures.push(...evaluateFinalEvidenceAlignment(finalState));
  failures.push(...evaluateDynamicNextFocus(turns));

  if (finalState && !formatReviewModeDisplay(finalState).includes('- 접근:')) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-6 review mode display',
      field: 'review.solutionBullets',
      expected: 'structured solution in review mode',
      actual: formatReviewModeDisplay(finalState).slice(0, 120),
    });
  }

  return failures;
}
