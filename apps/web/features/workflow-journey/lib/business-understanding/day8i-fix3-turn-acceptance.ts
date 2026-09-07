/**
 * DAY 8-I P0 FIX-3 — Strict per-turn acceptance spec.
 * One mismatch → entire acceptance FAIL.
 */

import type { CeoJudgmentDimensionId } from './ai-pm-ceo-judgment-dimensions';
import type { Day8iConversationTurnRecord } from './day8i-conversation-harness';
import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';

export type TurnDimensionExpectation = {
  turnIndex: number;
  label: string;
  /** Dimensions that MUST appear in this turn's trace as updated */
  mustUpdate?: CeoJudgmentDimensionId[];
  /** Dimensions that MUST NOT appear in this turn's trace */
  mustNotUpdate?: CeoJudgmentDimensionId[];
  /** After this turn, state summary must match (per dimension) */
  stateMustContain?: Partial<Record<CeoJudgmentDimensionId, RegExp>>;
  /** After this turn, state must NOT contain (unsupported inference) */
  stateMustNotContain?: Partial<Record<CeoJudgmentDimensionId, RegExp>>;
  /** Trace evidence must include pattern */
  evidenceMustContain?: Partial<Record<CeoJudgmentDimensionId, RegExp>>;
  /** Non-judgment slots — no 4-dimension update expected */
  nonJudgmentSlot?: 'payer' | 'research' | 'businessGoal' | 'marketUnknown' | 'frozen';
};

export const FIX3_CRITICAL_TURN_EXPECTATIONS: TurnDimensionExpectation[] = [
  {
    turnIndex: 1,
    label: 'T01 customer',
    mustUpdate: ['customer'],
    mustNotUpdate: ['problem', 'solution', 'customerChange'],
    stateMustContain: { customer: /양조|반찬|사장/ },
    stateMustNotContain: { problem: /주문과\s*배송을\s*따로\s*관리해야/ },
    evidenceMustContain: { customer: /양조|반찬/ },
  },
  {
    turnIndex: 3,
    label: 'T03 solution',
    mustUpdate: ['solution'],
    mustNotUpdate: ['customer'],
    stateMustContain: { solution: /SaaS|한\s*곳|관리/ },
  },
  {
    turnIndex: 4,
    label: 'T04 customerChange',
    mustUpdate: ['customerChange'],
    stateMustContain: { customerChange: /누락|확인|단축|줄/ },
  },
  {
    turnIndex: 5,
    label: 'T05 problem off-slot',
    mustUpdate: ['problem'],
    mustNotUpdate: ['customerChange'],
    stateMustContain: { problem: /엑셀|누락/ },
  },
  {
    turnIndex: 6,
    label: 'T06 multi-fact',
    mustUpdate: ['customer', 'problem', 'solution'],
    evidenceMustContain: {
      customer: /양조/,
      problem: /누락|엑셀/,
      solution: /한\s*곳|관리/,
    },
  },
  {
    turnIndex: 7,
    label: 'T07 customer repeat',
    mustNotUpdate: ['problem', 'solution', 'customerChange'],
  },
  {
    turnIndex: 8,
    label: 'T08 customer correction',
    mustUpdate: ['customer'],
    stateMustContain: { customer: /반찬|꽃집|포함/ },
  },
  {
    turnIndex: 9,
    label: 'T09 problem severity',
    mustUpdate: ['problem'],
    mustNotUpdate: ['customer'],
    stateMustContain: { problem: /10%|심각|누락/ },
  },
  {
    turnIndex: 11,
    label: 'T11 payer',
    nonJudgmentSlot: 'payer',
    mustNotUpdate: ['customer', 'problem', 'solution', 'customerChange'],
  },
  {
    turnIndex: 12,
    label: 'T12 research',
    nonJudgmentSlot: 'research',
    mustNotUpdate: ['customer', 'problem', 'solution', 'customerChange'],
  },
  {
    turnIndex: 13,
    label: 'T13 inference risk',
    nonJudgmentSlot: 'frozen',
    mustNotUpdate: ['problem', 'solution', 'customerChange'],
  },
  {
    turnIndex: 14,
    label: 'T14 continuity volume',
    mustNotUpdate: ['customer'],
  },
  {
    turnIndex: 16,
    label: 'T16 multi-fact problem',
    mustUpdate: ['problem'],
    mustNotUpdate: ['customer', 'solution'],
    stateMustContain: { problem: /놓치|재주문|배송\s*시간/ },
    stateMustNotContain: { customer: /^반찬가게(?:은|는)?$/ },
  },
  {
    turnIndex: 18,
    label: 'T18 hypothesis',
    mustUpdate: ['customerChange'],
    stateMustContain: { customerChange: /80%|줄|가설/ },
  },
  {
    turnIndex: 21,
    label: 'T21 solution feature',
    mustUpdate: ['solution'],
    stateMustContain: { solution: /모바일|한눈에/ },
  },
  {
    turnIndex: 22,
    label: 'T22 problem correction',
    mustUpdate: ['problem'],
    stateMustContain: { problem: /확인\s*시간|주문/ },
  },
  {
    turnIndex: 24,
    label: 'T24 research',
    nonJudgmentSlot: 'research',
    mustNotUpdate: ['customer', 'problem', 'solution', 'customerChange'],
  },
  {
    turnIndex: 25,
    label: 'T25 business goal',
    nonJudgmentSlot: 'businessGoal',
    mustNotUpdate: ['customer', 'problem', 'solution', 'customerChange'],
  },
  {
    turnIndex: 26,
    label: 'T26 customerChange benefit',
    mustUpdate: ['customerChange'],
    mustNotUpdate: ['customer', 'solution'],
    stateMustContain: { customerChange: /실수|시간|줄|아낄/ },
    stateMustNotContain: { customer: /^소상공인(?:은|는)?$/ },
  },
  {
    turnIndex: 27,
    label: 'T27 solution repeat',
    mustNotUpdate: ['customer', 'problem'],
  },
  {
    turnIndex: 28,
    label: 'T28 solution MVP',
    mustUpdate: ['solution'],
    stateMustContain: { solution: /MVP|체크리스트|주문\s*입력/ },
  },
  {
    turnIndex: 30,
    label: 'T30 customerChange final',
    mustUpdate: ['customerChange'],
    stateMustContain: { customerChange: /누락|확인|단축|변화/ },
  },
];

export type TurnAcceptanceFailure = {
  turnIndex: number;
  label: string;
  field: string;
  expected: string;
  actual: string;
};

export function evaluateTurnExpectation(
  spec: TurnDimensionExpectation,
  turn: Day8iConversationTurnRecord,
): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  const traceDims =
    turn.trace?.dimensionEntries.map((e) => e.affectedDimension) ?? [];
  const state = turn.judgmentSnapshot;

  for (const dim of spec.mustUpdate ?? []) {
    if (!traceDims.includes(dim)) {
      failures.push({
        turnIndex: spec.turnIndex,
        label: spec.label,
        field: `mustUpdate.${dim}`,
        expected: `trace includes ${dim}`,
        actual: `trace=[${traceDims.join(',')}]`,
      });
    }
  }

  for (const dim of spec.mustNotUpdate ?? []) {
    if (traceDims.includes(dim)) {
      failures.push({
        turnIndex: spec.turnIndex,
        label: spec.label,
        field: `mustNotUpdate.${dim}`,
        expected: `no ${dim} trace`,
        actual: `trace includes ${dim}`,
      });
    }
  }

  if (state) {
    for (const [dim, re] of Object.entries(spec.stateMustContain ?? {}) as Array<
      [CeoJudgmentDimensionId, RegExp]
    >) {
      const summary = state.dimensions[dim].summary;
      if (!re.test(summary)) {
        failures.push({
          turnIndex: spec.turnIndex,
          label: spec.label,
          field: `stateMustContain.${dim}`,
          expected: re.toString(),
          actual: summary || '(empty)',
        });
      }
    }
    for (const [dim, re] of Object.entries(spec.stateMustNotContain ?? {}) as Array<
      [CeoJudgmentDimensionId, RegExp]
    >) {
      const summary = state.dimensions[dim].summary;
      if (summary && re.test(summary)) {
        failures.push({
          turnIndex: spec.turnIndex,
          label: spec.label,
          field: `stateMustNotContain.${dim}`,
          expected: `must not match ${re.toString()}`,
          actual: summary,
        });
      }
    }
  }

  for (const [dim, re] of Object.entries(spec.evidenceMustContain ?? {}) as Array<
    [CeoJudgmentDimensionId, RegExp]
  >) {
    const entry = turn.trace?.dimensionEntries.find((e) => e.affectedDimension === dim);
    const evidence = entry?.evidence ?? '';
    if (!re.test(evidence)) {
      failures.push({
        turnIndex: spec.turnIndex,
        label: spec.label,
        field: `evidenceMustContain.${dim}`,
        expected: re.toString(),
        actual: evidence || '(none)',
      });
    }
  }

  if (spec.nonJudgmentSlot && traceDims.length > 0) {
    failures.push({
      turnIndex: spec.turnIndex,
      label: spec.label,
      field: 'nonJudgmentSlot',
      expected: `no judgment update (${spec.nonJudgmentSlot})`,
      actual: `trace=[${traceDims.join(',')}]`,
    });
  }

  return failures;
}

export function evaluateFinalReviewDimensions(state: CeoJudgmentState | null): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  if (!state) {
    failures.push({
      turnIndex: 30,
      label: 'P0-7 Final Review',
      field: 'finalState',
      expected: 'judgment state',
      actual: 'null',
    });
    return failures;
  }

  const checks: Array<{ dim: CeoJudgmentDimensionId; re: RegExp; label: string }> = [
    { dim: 'customer', re: /양조|반찬|꽃집|소상공인|사장/, label: 'customer' },
    { dim: 'problem', re: /누락|확인\s*시간|엑셀|관리|따로/, label: 'problem' },
    { dim: 'solution', re: /SaaS|MVP|한\s*곳|모바일|체크리스트|관리/, label: 'solution' },
    { dim: 'customerChange', re: /누락|확인|단축|줄|변화|80%/, label: 'customerChange' },
  ];

  for (const { dim, re, label } of checks) {
    const d = state.dimensions[dim];
    if (d.status === 'unknown' || !d.summary.trim()) {
      failures.push({
        turnIndex: 30,
        label: 'P0-7 Final Review',
        field: label,
        expected: 'non-unknown with evidence',
        actual: `${d.status}: ${d.summary || '(empty)'}`,
      });
    } else if (!re.test(d.summary)) {
      failures.push({
        turnIndex: 30,
        label: 'P0-7 Final Review',
        field: label,
        expected: re.toString(),
        actual: d.summary,
      });
    } else if (
      dim === 'customer' &&
      /(?:\d+\s*건|하루\s*\d+|주문을\s*받)/.test(d.summary) &&
      !/주\s*고객|포함|반찬|꽃집/.test(d.summary)
    ) {
      failures.push({
        turnIndex: 30,
        label: 'P0-7 Final Review',
        field: label,
        expected: 'customer segment definition (not volume fact)',
        actual: d.summary,
      });
    }
  }

  return failures;
}

export function detectCrossDimensionCopy(state: CeoJudgmentState): TurnAcceptanceFailure[] {
  const failures: TurnAcceptanceFailure[] = [];
  const ids: CeoJudgmentDimensionId[] = ['customer', 'problem', 'solution', 'customerChange'];
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = ids[i]!;
      const b = ids[j]!;
      const sa = state.dimensions[a].summary.trim();
      const sb = state.dimensions[b].summary.trim();
      if (sa && sb && sa === sb) {
        failures.push({
          turnIndex: 0,
          label: 'P0-3 Cross-dimension copy',
          field: `${a}=${b}`,
          expected: 'distinct summaries',
          actual: sa,
        });
      }
    }
  }
  return failures;
}
