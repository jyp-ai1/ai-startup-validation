/**
 * DAY 8-I P0 FIX-6 — Judgment evidence model (current conclusion + evidence chain).
 */

import type {
  CeoJudgmentDimension,
  CeoJudgmentDimensionId,
} from './ai-pm-ceo-judgment-dimensions';

export type JudgmentEvidenceRole = 'primary' | 'supporting' | 'related';

export type JudgmentEvidenceRecord = {
  span: string;
  meaning: string;
  sourceTurnIndex?: number;
  role: JudgmentEvidenceRole;
};

export type JudgmentFocusContext = {
  turnIndex?: number;
  lastUpdatedDimensions: CeoJudgmentDimensionId[];
  recentCorrections: CeoJudgmentDimensionId[];
};

function clip(text: string, max = 120): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function emptyEvidenceRecords(): JudgmentEvidenceRecord[] {
  return [];
}

/** Append or replace evidence by role — primary span wins for conclusion. */
export function upsertEvidenceRecord(
  records: JudgmentEvidenceRecord[],
  incoming: JudgmentEvidenceRecord,
): JudgmentEvidenceRecord[] {
  const next = [...records];
  if (incoming.role === 'primary') {
    const withoutPrimary = next.filter((r) => r.role !== 'primary');
    return [incoming, ...withoutPrimary.filter((r) => r.span.trim() !== incoming.span.trim())];
  }
  if (next.some((r) => r.span.trim() === incoming.span.trim() && r.role === incoming.role)) {
    return next;
  }
  return [...next, incoming];
}

export function buildConclusionFromEvidence(
  records: JudgmentEvidenceRecord[],
  fallback = '',
): string {
  const primary = records.find((r) => r.role === 'primary');
  if (primary?.meaning.trim()) return clip(primary.meaning);
  if (primary?.span.trim()) return clip(primary.span);
  const supporting = records.filter((r) => r.role === 'supporting').map((r) => r.meaning || r.span);
  if (supporting.length > 0) return clip(supporting.join(' · '));
  return fallback.trim() ? clip(fallback) : '';
}

export function sourceTurnIndices(records: JudgmentEvidenceRecord[]): number[] {
  const turns = records
    .map((r) => r.sourceTurnIndex)
    .filter((t): t is number => typeof t === 'number' && t > 0);
  return [...new Set(turns)].sort((a, b) => a - b);
}

export function applyEvidenceToDimension(
  prior: CeoJudgmentDimension,
  input: {
    conclusion?: string;
    summary?: string;
    records?: JudgmentEvidenceRecord[];
    sourceTurnIndex?: number;
    correctionApplied?: boolean;
  },
): CeoJudgmentDimension {
  const mergedRecords = input.records?.length
    ? input.records.reduce(
        (acc, rec) => upsertEvidenceRecord(acc, rec),
        [...(prior.evidenceRecords ?? [])],
      )
    : [...(prior.evidenceRecords ?? [])];

  if (input.sourceTurnIndex && input.records?.length) {
    for (const rec of input.records) {
      if (!rec.sourceTurnIndex) rec.sourceTurnIndex = input.sourceTurnIndex;
    }
  }

  const currentConclusion =
    input.conclusion?.trim() ||
    buildConclusionFromEvidence(mergedRecords, prior.currentConclusion ?? prior.summary);

  const summary = input.summary?.trim() || currentConclusion || prior.summary;

  return {
    ...prior,
    currentConclusion,
    summary: clip(summary),
    evidenceRecords: mergedRecords,
    sourceTurns: sourceTurnIndices(mergedRecords),
    correctionApplied: input.correctionApplied ?? prior.correctionApplied,
  };
}

export function primaryEvidenceRecord(
  dimension: CeoJudgmentDimension,
): JudgmentEvidenceRecord | null {
  const records = dimension.evidenceRecords ?? [];
  return records.find((r) => r.role === 'primary') ?? records[0] ?? null;
}

export function evidenceGroundedSummary(dimension: CeoJudgmentDimension): string {
  const conclusion = dimension.currentConclusion?.trim();
  if (conclusion) return conclusion;
  const primary = primaryEvidenceRecord(dimension);
  if (primary) return clip(primary.meaning || primary.span);
  return dimension.summary;
}
