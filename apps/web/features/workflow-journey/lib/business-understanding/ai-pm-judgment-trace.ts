/**
 * DAY 8-I — Judgment dimension trace for CPO independent review.
 * Presentation layer only — does not write gapState or V3 core.
 */

import type {
  CeoJudgmentDimensionId,
  CeoJudgmentState,
  CeoJudgmentStatus,
} from './ai-pm-ceo-judgment-dimensions';
import { CEO_JUDGMENT_DIMENSION_LABELS } from './ai-pm-ceo-judgment-dimensions';

export type JudgmentChangeType =
  | 'NEW'
  | 'CONFIRMED'
  | 'STRENGTHENED'
  | 'WEAKENED'
  | 'CHANGED'
  | 'UNCHANGED'
  | 'CONFLICTED'
  | 'UNKNOWN';

export type JudgmentDimensionSnapshot = {
  status: CeoJudgmentStatus;
  summary: string;
};

export type JudgmentTraceEntry = {
  sourceTurnId: string;
  question: string;
  answer: string;
  interpretedMeaning: string;
  evidence: string;
  affectedDimension: CeoJudgmentDimensionId;
  previousJudgment: JudgmentDimensionSnapshot;
  newJudgment: JudgmentDimensionSnapshot;
  changeType: JudgmentChangeType;
  reason: string;
  knownPriorInfo?: string;
  newlyAddedInfo?: string;
};

export type JudgmentTurnTrace = {
  turnId: string;
  turnIndex: number;
  question: string;
  answer: string;
  understandingOneLiner: string;
  judgmentOneLiner: string;
  dimensionEntries: JudgmentTraceEntry[];
  nextQuestionReason?: string;
};

export type DimensionSeparationIssue = {
  dimensionA: CeoJudgmentDimensionId;
  dimensionB: CeoJudgmentDimensionId;
  sharedSummary: string;
  reason: string;
};

const STATUS_RANK: Record<CeoJudgmentStatus, number> = {
  unknown: 0,
  needs_check: 1,
  clear: 2,
};

export function classifyJudgmentChangeType(input: {
  before: JudgmentDimensionSnapshot;
  after: JudgmentDimensionSnapshot;
}): JudgmentChangeType {
  const { before, after } = input;
  const beforeEmpty = !before.summary.trim();
  const afterEmpty = !after.summary.trim();

  if (beforeEmpty && afterEmpty) return 'UNCHANGED';
  if (beforeEmpty && !afterEmpty) return 'NEW';
  if (!beforeEmpty && afterEmpty) return 'WEAKENED';

  const sameSummary = before.summary.trim() === after.summary.trim();
  if (sameSummary && before.status === after.status) return 'UNCHANGED';
  if (sameSummary && STATUS_RANK[after.status] > STATUS_RANK[before.status]) {
    return 'STRENGTHENED';
  }
  if (sameSummary && STATUS_RANK[after.status] < STATUS_RANK[before.status]) {
    return 'WEAKENED';
  }

  if (
    before.summary.trim() &&
    after.summary.trim() &&
    before.summary.trim() !== after.summary.trim()
  ) {
    const overlap = tokenOverlap(before.summary, after.summary);
    if (overlap >= 0.6 && before.status === after.status) return 'CONFIRMED';
    if (overlap >= 0.3) return 'CHANGED';
    return 'CONFLICTED';
  }

  if (before.status !== after.status && sameSummary) {
    return STATUS_RANK[after.status] > STATUS_RANK[before.status]
      ? 'STRENGTHENED'
      : 'WEAKENED';
  }

  return 'UNKNOWN';
}

function tokenOverlap(a: string, b: string): number {
  const ta = new Set(a.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(Boolean));
  const tb = new Set(b.replace(/[^\p{L}\p{N}]+/gu, ' ').split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let shared = 0;
  for (const t of ta) {
    if (tb.has(t)) shared += 1;
  }
  return shared / Math.max(ta.size, tb.size);
}

export function buildJudgmentTraceEntries(input: {
  sourceTurnId: string;
  question: string;
  answer: string;
  prior: CeoJudgmentState;
  next: CeoJudgmentState;
  dimensionMeta: Partial<
    Record<
      CeoJudgmentDimensionId,
      { interpretedMeaning: string; evidence: string; reason: string; knownPriorInfo?: string }
    >
  >;
  /** When set, only dimensions extracted from the answer may produce trace entries. */
  allowedDimensions?: CeoJudgmentDimensionId[];
}): JudgmentTraceEntry[] {
  const entries: JudgmentTraceEntry[] = [];
  const allowed =
    input.allowedDimensions !== undefined
      ? new Set(input.allowedDimensions)
      : null;

  for (const id of [
    'customer',
    'problem',
    'solution',
    'customerChange',
  ] as CeoJudgmentDimensionId[]) {
    if (allowed && !allowed.has(id)) continue;
    const before = input.prior.dimensions[id];
    const after = input.next.dimensions[id];
    const changeType = classifyJudgmentChangeType({
      before: { status: before.status, summary: before.summary },
      after: { status: after.status, summary: after.summary },
    });
    const effectiveChangeType =
      changeType === 'UNCHANGED' && allowed?.has(id) ? 'CONFIRMED' : changeType;
    if (effectiveChangeType === 'UNCHANGED') continue;

    const meta = input.dimensionMeta[id];
    entries.push({
      sourceTurnId: input.sourceTurnId,
      question: input.question,
      answer: input.answer,
      interpretedMeaning:
        meta?.interpretedMeaning ??
        `${CEO_JUDGMENT_DIMENSION_LABELS[id]} 관련 의미로 해석`,
      evidence: meta?.evidence ?? input.answer.trim(),
      affectedDimension: id,
      previousJudgment: { status: before.status, summary: before.summary },
      newJudgment: { status: after.status, summary: after.summary },
      changeType: effectiveChangeType,
      reason:
        meta?.reason ??
        after.statusReason ??
        `${CEO_JUDGMENT_DIMENSION_LABELS[id]} 판단 갱신`,
      knownPriorInfo: meta?.knownPriorInfo ?? (before.summary || undefined),
      newlyAddedInfo:
        changeType === 'NEW' || changeType === 'CHANGED' || changeType === 'STRENGTHENED'
          ? after.summary
          : undefined,
    });
  }

  return entries;
}

/** Detect dimension summaries copied without distinct semantic basis. */
export function detectDimensionSeparationIssues(
  state: CeoJudgmentState,
): DimensionSeparationIssue[] {
  const issues: DimensionSeparationIssue[] = [];
  const ids: CeoJudgmentDimensionId[] = [
    'customer',
    'problem',
    'solution',
    'customerChange',
  ];

  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = ids[i]!;
      const b = ids[j]!;
      const sa = state.dimensions[a].summary.trim();
      const sb = state.dimensions[b].summary.trim();
      if (!sa || !sb) continue;
      if (sa !== sb) continue;

      const hasDistinctBasis =
        state.dimensions[a].statusReason !== state.dimensions[b].statusReason &&
        Boolean(state.dimensions[a].statusReason) &&
        Boolean(state.dimensions[b].statusReason);

      if (!hasDistinctBasis) {
        issues.push({
          dimensionA: a,
          dimensionB: b,
          sharedSummary: sa,
          reason: `${CEO_JUDGMENT_DIMENSION_LABELS[a]}와 ${CEO_JUDGMENT_DIMENSION_LABELS[b]}에 동일 요약이 의미적 근거 없이 복제됨`,
        });
      }
    }
  }

  return issues;
}

export function formatJudgmentEvolutionTable(
  traces: JudgmentTurnTrace[],
): string {
  const header =
    '| Turn | Customer | Problem | Solution | Customer Change |\n|------|----------|---------|----------|-----------------|';
  const rows = traces.map((t) => {
    const last = t.dimensionEntries.reduce(
      (acc, e) => {
        acc[e.affectedDimension] = `${statusGlyph(e.newJudgment.status)} ${e.newJudgment.summary.slice(0, 24)}`;
        return acc;
      },
      {} as Partial<Record<CeoJudgmentDimensionId, string>>,
    );
    const snap = (id: CeoJudgmentDimensionId) => last[id] ?? '—';
    return `| ${String(t.turnIndex).padStart(2, '0')} | ${snap('customer')} | ${snap('problem')} | ${snap('solution')} | ${snap('customerChange')} |`;
  });
  return [header, ...rows].join('\n');
}

function statusGlyph(status: CeoJudgmentStatus): string {
  switch (status) {
    case 'clear':
      return '🟢';
    case 'needs_check':
      return '🟡';
    case 'unknown':
      return '🔴';
  }
}
