/**
 * DAY 8-I P0 FIX-9 — Preservation + R-check acceptance gates.
 */

import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import type { Day8iConversationTurnRecord } from './day8i-conversation-harness';
import { evaluateAllFix8Turns } from './day8i-fix8-turn-acceptance';
import type { TurnAcceptanceFailure } from './day8i-fix3-turn-acceptance';
import { runAllCpoChecks } from './day8i-cpo-r-extended-checks';
import {
  buildCustomerChangeProvenance,
  isNarrowingCustomerEvidence,
} from './ai-pm-judgment-canonical-state';
import { renderProblemStructuredReview } from './ai-pm-judgment-structured-review';
import { primaryEvidenceRecord } from './ai-pm-judgment-evidence-model';

export function evaluateT06CustomerPreservation(
  turns: Day8iConversationTurnRecord[],
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  const t5 = turns[4];
  const t6 = turns[5];
  if (!t5?.judgmentSnapshot || !t6?.judgmentSnapshot) return failures;

  const priorCustomer = t5.judgmentSnapshot.dimensions.customer.summary;
  const t6Customer = t6.judgmentSnapshot.dimensions.customer.summary;

  if (
    isNarrowingCustomerEvidence(priorCustomer, '소규모 양조장') &&
    t6Customer === '소규모 양조장'
  ) {
    failures.push({
      turnIndex: 6,
      label: 'FIX-9 T06 customer preservation',
      field: 'customer.notNarrowed',
      expected: 'preserve broader customer from T01/T05',
      actual: t6Customer,
    });
  }

  if (!/반찬|사장|주\s*고객/.test(t6Customer)) {
    failures.push({
      turnIndex: 6,
      label: 'FIX-9 T06 customer preservation',
      field: 'customer.breadth',
      expected: 'prior customer breadth retained',
      actual: t6Customer,
    });
  }

  const t6Trace = t6.trace?.dimensionEntries.find((e) => e.affectedDimension === 'customer');
  if (t6Trace?.changeType === 'CONFLICTED' || t6Trace?.changeType === 'CHANGED') {
    if (t6Customer.length < priorCustomer.length - 4) {
      failures.push({
        turnIndex: 6,
        label: 'FIX-9 T06 customer preservation',
        field: 'trace.conflictedNarrow',
        expected: 'supporting evidence only, not CONFLICTED narrow',
        actual: `${t6Trace.changeType}: ${t6Customer}`,
      });
    }
  }

  return failures;
}

export function evaluateProblemEvidenceProvenance(
  finalState: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  if (!finalState) return failures;

  const problem = finalState.dimensions.problem;
  const records = problem.evidenceRecords ?? [];
  const severity = records.find((r) => /10%|심각/.test(r.span));
  if (!severity?.sourceTurnIndex) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-9 T09 provenance',
      field: 'problem.severitySourceTurn',
      expected: 'T09 severity evidence with source turn',
      actual: severity?.span ?? '(none)',
    });
  }

  const display = renderProblemStructuredReview(problem);
  if (severity && !display.includes('10%')) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-9 T09 provenance',
      field: 'problem.severityInReview',
      expected: '10% severity visible in final RELATED',
      actual: display,
    });
  }

  for (const r of records.filter((rec) => rec.role === 'related')) {
    if (!r.sourceTurnIndex) {
      failures.push({
        turnIndex: 30,
        label: 'FIX-9 problem provenance',
        field: `related.missingTurn.${r.meaning.slice(0, 12)}`,
        expected: 'source turn on every RELATED evidence',
        actual: r.span,
      });
    }
  }

  const primary = primaryEvidenceRecord(problem);
  if (!primary?.sourceTurnIndex) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-9 T22 provenance',
      field: 'problem.primarySourceTurn',
      expected: 'PRIMARY with source turn',
      actual: primary?.span ?? '(none)',
    });
  }

  return failures;
}

export function evaluateCustomerChangeProvenance(
  finalState: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  if (!finalState) return failures;

  const prov = buildCustomerChangeProvenance(finalState.dimensions.customerChange);
  if (!prov) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-9 customer change provenance',
      field: 'provenance.missing',
      expected: 'claim + source + pending validation',
      actual: '(none)',
    });
    return failures;
  }

  if (prov.validation !== 'pending') {
    failures.push({
      turnIndex: 30,
      label: 'FIX-9 customer change provenance',
      field: 'validation.pending',
      expected: 'pending',
      actual: prov.validation,
    });
  }
  if (finalState.dimensions.customerChange.status === 'clear') {
    failures.push({
      turnIndex: 30,
      label: 'FIX-9 customer change provenance',
      field: 'status.neverClear',
      expected: 'needs_check',
      actual: 'clear',
    });
  }
  if (!prov.sourceTurnIndex) {
    failures.push({
      turnIndex: 30,
      label: 'FIX-9 customer change provenance',
      field: 'sourceTurn',
      expected: 'T30 source turn',
      actual: String(prov.sourceTurnIndex),
    });
  }

  return failures;
}

export function evaluateCpoRChecks(): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  const checks = runAllCpoChecks();
  for (const check of checks) {
    if (check.verdict === 'FAIL') {
      failures.push({
        turnIndex: 0,
        label: 'FIX-9 CPO-R gate',
        field: check.id,
        expected: 'PASS',
        actual: check.rationale,
      });
    }
  }
  return failures;
}

export function evaluateAllFix9Turns(
  turns: Day8iConversationTurnRecord[],
  finalState: CeoJudgmentState | null,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];

  failures.push(...evaluateAllFix8Turns(turns, finalState));
  failures.push(...evaluateT06CustomerPreservation(turns));
  failures.push(...evaluateProblemEvidenceProvenance(finalState));
  failures.push(...evaluateCustomerChangeProvenance(finalState));
  failures.push(...evaluateCpoRChecks());

  return failures;
}
