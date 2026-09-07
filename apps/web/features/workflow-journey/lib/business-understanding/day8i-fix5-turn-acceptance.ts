/**
 * DAY 8-I P0 FIX-5 — Strict acceptance (semantic chain + structured judgment).
 */

import type { CeoJudgmentDimensionId } from './ai-pm-ceo-judgment-dimensions';
import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import type { Day8iConversationTurnRecord } from './day8i-conversation-harness';
import {
  FIX3_CRITICAL_TURN_EXPECTATIONS,
  evaluateTurnExpectation,
  type TurnAcceptanceFailure,
  type TurnDimensionExpectation,
} from './day8i-fix3-turn-acceptance';
import { isRawSolutionAppend, renderSolutionJudgment, renderSolutionJudgmentStructured } from './ai-pm-judgment-structured-solution';
import { extractAnswerSemanticEvidences } from './ai-pm-answer-semantic-sot';
import { isSemanticCopy } from './ai-pm-judgment-target-binding';
import { isAiPmJudgmentFix8V1Active } from './ai-pm-judgment-fix8-v1';
import { CUSTOMER_CHANGE_CLAIM_LABEL } from './ai-pm-judgment-canonical-state';

export const FIX5_ADDITIONAL_TURN_EXPECTATIONS: TurnDimensionExpectation[] = [
  {
    turnIndex: 18,
    label: 'T18 hypothesis',
    mustUpdate: ['customerChange'],
    stateMustContain: { customerChange: /80%|가설/ },
  },
  {
    turnIndex: 29,
    label: 'T29 meta confirmation',
    nonJudgmentSlot: 'metaConfirmation',
    mustNotUpdate: ['customer', 'problem', 'solution', 'customerChange'],
  },
  {
    turnIndex: 28,
    label: 'T28 structured solution MVP',
    mustUpdate: ['solution'],
    stateMustContain: { solution: /MVP|체크리스트|주문\s*입력/ },
    stateMustNotContain: { solution: /^(?:주문과 배송.*·.*·.*)/ },
  },
];

export const FIX5_CRITICAL_TURN_EXPECTATIONS: TurnDimensionExpectation[] = [
  ...FIX3_CRITICAL_TURN_EXPECTATIONS.filter((s) => s.turnIndex !== 18 && s.turnIndex !== 28),
  ...FIX5_ADDITIONAL_TURN_EXPECTATIONS,
];

export function evaluateHypothesisTurn(
  turn: Day8iConversationTurnRecord,
): TurnAcceptanceFailure[] {
  if (turn.turnIndex !== 18) return [];
  const failures: TurnAcceptanceFailure[] = [];
  const d = turn.judgmentSnapshot?.dimensions.customerChange;
  if (!d) {
    failures.push({
      turnIndex: 18,
      label: 'T18 hypothesis',
      field: 'hypothesis.dimension',
      expected: 'customerChange with evidenceType=hypothesis',
      actual: 'missing snapshot',
    });
    return failures;
  }
  if (d.evidenceType !== 'hypothesis') {
    failures.push({
      turnIndex: 18,
      label: 'T18 hypothesis',
      field: 'hypothesis.evidenceType',
      expected: 'hypothesis',
      actual: d.evidenceType ?? 'fact',
    });
  }
  if (d.status === 'clear') {
    failures.push({
      turnIndex: 18,
      label: 'T18 hypothesis',
      field: 'hypothesis.status',
      expected: 'needs_check (not confirmed fact)',
      actual: d.status,
    });
  }
  const labelOk =
    /가설/.test(d.label) ||
    (isAiPmJudgmentFix8V1Active() && d.label === CUSTOMER_CHANGE_CLAIM_LABEL);
  if (!labelOk) {
    failures.push({
      turnIndex: 18,
      label: 'T18 hypothesis',
      field: 'hypothesis.label',
      expected: 'label contains 가설 or FIX-8 claim label',
      actual: d.label,
    });
  }
  return failures;
}

export function evaluateMetaConfirmationTurn(
  turn: Day8iConversationTurnRecord,
): TurnAcceptanceFailure[] {
  if (turn.turnIndex !== 29) return [];
  const failures: TurnAcceptanceFailure[] = [];
  const semantic = extractAnswerSemanticEvidences(turn.ceoAnswer);
  if (semantic.nonJudgmentSlot !== 'metaConfirmation') {
    failures.push({
      turnIndex: 29,
      label: 'T29 meta confirmation',
      field: 'meta.slot',
      expected: 'metaConfirmation',
      actual: semantic.nonJudgmentSlot ?? '(judgment extract)',
    });
  }
  const traceDims =
    turn.trace?.dimensionEntries.map((e) => e.affectedDimension) ?? [];
  if (traceDims.length > 0) {
    failures.push({
      turnIndex: 29,
      label: 'T29 meta confirmation',
      field: 'meta.noTrace',
      expected: 'no judgment trace',
      actual: traceDims.join(','),
    });
  }
  if (!turn.question.includes('최종 확인')) {
    failures.push({
      turnIndex: 29,
      label: 'T29 meta confirmation',
      field: 'meta.ack',
      expected: 'meta confirmation acknowledgement UX',
      actual: turn.question.slice(0, 80),
    });
  }
  return failures;
}

export function evaluateStructuredSolutionState(
  state: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  if (!state) return failures;
  const s = state.dimensions.solution;
  if (!s.summary.trim()) return failures;

  if (isRawSolutionAppend(s.summary)) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-5 structured solution',
      field: 'solution.rawAppend',
      expected: 'structured judgment (— layers, not · append chain)',
      actual: s.summary,
    });
  }

  const layers = s.solutionLayers;
  if (layers) {
    const rendered = renderSolutionJudgment(layers);
    const structured = renderSolutionJudgmentStructured(layers);
    const summaryMatches =
      !rendered ||
      isSemanticCopy(rendered, s.summary) ||
      s.summary === rendered ||
      s.summary === structured ||
      (structured && s.summary.includes('- 접근:'));
    if (rendered && !summaryMatches) {
      failures.push({
        turnIndex: 30,
        label: 'FIX-5 structured solution',
        field: 'solution.renderMismatch',
        expected: rendered,
        actual: s.summary,
      });
    }
  }

  if (
    !(/SaaS|한\s*곳|통합/.test(s.summary) && /MVP|모바일|체크리스트/.test(s.summary))
  ) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-5 structured solution',
      field: 'solution.layers',
      expected: 'approach + refinement (mobile/MVP) in structured summary',
      actual: s.summary,
    });
  }

  return failures;
}

export function evaluateT06EvidenceUnits(
  turn: Day8iConversationTurnRecord,
): TurnAcceptanceFailure[] {
  if (turn.turnIndex !== 6) return [];
  const failures: TurnAcceptanceFailure[] = [];
  const entries = turn.trace?.dimensionEntries ?? [];
  const evidences = entries.map((e) => ({
    dim: e.affectedDimension,
    span: e.evidence.trim(),
  }));

  for (const { dim, span } of evidences) {
    if (span.length < 6) {
      failures.push({
        turnIndex: 6,
        label: 'T06 multi-fact',
        field: `evidence.minLength.${dim}`,
        expected: 'meaning unit span >= 6 chars',
        actual: span,
      });
    }
  }

  for (let i = 0; i < evidences.length; i += 1) {
    for (let j = i + 1; j < evidences.length; j += 1) {
      const a = evidences[i]!;
      const b = evidences[j]!;
      if (
        a.span.includes(b.span) ||
        b.span.includes(a.span) ||
        isSemanticCopy(a.span, b.span)
      ) {
        failures.push({
          turnIndex: 6,
          label: 'T06 multi-fact',
          field: 'evidence.distinctUnits',
          expected: 'non-overlapping meaning units',
          actual: `${a.dim}="${a.span}" vs ${b.dim}="${b.span}"`,
        });
      }
    }
  }

  return failures;
}

export function evaluateAllFix5Turns(
  turns: Day8iConversationTurnRecord[],
  finalState: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];

  for (const spec of FIX5_CRITICAL_TURN_EXPECTATIONS) {
    const turn = turns[spec.turnIndex - 1];
    if (turn) failures.push(...evaluateTurnExpectation(spec, turn));
  }

  for (const turn of turns) {
    failures.push(...evaluateHypothesisTurn(turn));
    failures.push(...evaluateMetaConfirmationTurn(turn));
    failures.push(...evaluateT06EvidenceUnits(turn));
  }

  failures.push(...evaluateStructuredSolutionState(finalState));
  return failures;
}
