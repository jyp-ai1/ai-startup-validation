/**
 * DAY 8-I P0 FIX-7 — Final review rendered directly from structured judgment.
 * Never from accumulated summary strings.
 */

import type {
  CeoJudgmentDimension,
  CeoJudgmentDimensionId,
  CeoJudgmentState,
  CeoJudgmentStatus,
} from './ai-pm-ceo-judgment-dimensions';
import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  statusEmoji,
} from './ai-pm-ceo-judgment-dimensions';
import type { SolutionLayerEvidence } from './ai-pm-ceo-judgment-dimensions';
import type { SolutionLayers } from './ai-pm-judgment-structured-solution';

export type StructuredReviewEntry = {
  dimensionId: CeoJudgmentDimensionId;
  status: CeoJudgmentStatus;
  display: string;
  primaryEvidenceSpan: string | null;
  primarySourceTurn: number | null;
  aligned: boolean;
};

function primaryRecord(d: CeoJudgmentDimension) {
  return d.evidenceRecords?.find((r) => r.role === 'primary') ?? d.evidenceRecords?.[0] ?? null;
}

function relatedRecords(d: CeoJudgmentDimension) {
  return d.evidenceRecords?.filter((r) => r.role === 'related') ?? [];
}

export function renderProblemStructuredReview(d: CeoJudgmentDimension): string {
  const primary = primaryRecord(d);
  const related = relatedRecords(d);
  const lines: string[] = [];
  lines.push(`PRIMARY: ${primary?.meaning ?? d.currentConclusion ?? '(empty)'}`);
  if (related.length > 0) {
    lines.push('RELATED:');
    for (const r of related) {
      lines.push(`- ${r.meaning || r.span}`);
    }
  }
  return lines.join('\n');
}

export function renderSolutionStructuredReview(
  layers: SolutionLayers | undefined,
  layerEvidence: SolutionLayerEvidence[] | undefined,
): string {
  if (!layers) return '(empty)';
  const lines: string[] = [];
  const layerDefs: Array<{ key: keyof SolutionLayers; label: string }> = [
    { key: 'approach', label: '접근' },
    { key: 'keyFeature', label: '핵심 기능' },
    { key: 'mvpScope', label: 'MVP' },
  ];
  for (const { key, label } of layerDefs) {
    const text = layers[key]?.trim();
    if (!text) continue;
    const ev = layerEvidence?.find((e) => e.layer === key);
    const turn =
      ev?.sourceTurnIndex != null
        ? ` (Turn ${String(ev.sourceTurnIndex).padStart(2, '0')}: "${ev.evidenceSpan}")`
        : '';
    lines.push(`- ${label}: ${text}${turn}`);
  }
  return lines.length > 0 ? lines.join('\n') : '(empty)';
}

export function renderCustomerChangeStructuredReview(d: CeoJudgmentDimension): string {
  const primary = primaryRecord(d);
  const prefix =
    d.evidenceType === 'hypothesis'
      ? '🟡 (가설) '
      : d.evidenceType === 'expectation'
        ? '🟡 (기대효과) '
        : '';
  const conclusion = primary?.meaning ?? d.currentConclusion ?? d.summary;
  return `${prefix}${conclusion || '(empty)'}`;
}

export function renderDimensionStructuredReview(d: CeoJudgmentDimension): string {
  switch (d.id) {
    case 'problem':
      return renderProblemStructuredReview(d);
    case 'solution':
      return renderSolutionStructuredReview(d.solutionLayers, d.solutionLayerEvidence);
    case 'customerChange':
      return renderCustomerChangeStructuredReview(d);
    default: {
      const primary = primaryRecord(d);
      return primary?.meaning ?? d.currentConclusion ?? d.summary ?? '(empty)';
    }
  }
}

export function buildStructuredReviewEntry(d: CeoJudgmentDimension): StructuredReviewEntry {
  const primary = primaryRecord(d);
  const primaryEvidenceSpan = primary?.span?.trim() || null;
  const primarySourceTurn = primary?.sourceTurnIndex ?? d.sourceTurns?.[0] ?? null;

  let aligned = Boolean(primaryEvidenceSpan && primarySourceTurn);

  if (d.id === 'solution') {
    const layers = d.solutionLayerEvidence ?? [];
    const required = ['approach', 'keyFeature', 'mvpScope'] as const;
    const hasAll = required.every((k) => layers.some((e) => e.layer === k && e.sourceTurnIndex));
    aligned = hasAll;
  }

  return {
    dimensionId: d.id,
    status: d.status,
    display: renderDimensionStructuredReview(d),
    primaryEvidenceSpan,
    primarySourceTurn,
    aligned,
  };
}

export function buildStructuredFinalReview(state: CeoJudgmentState): string {
  const lines: string[] = [];
  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    const d = state.dimensions[id];
    const entry = buildStructuredReviewEntry(d);
    lines.push(`### ${CEO_JUDGMENT_DIMENSION_LABELS[id]}`);
    lines.push(`${statusEmoji(entry.status)} ${entry.display}`);
    if (d.id === 'solution' && d.solutionLayerEvidence?.length) {
      lines.push('Source:');
      for (const ev of d.solutionLayerEvidence) {
        lines.push(
          `- ${ev.layer}: Turn ${String(ev.sourceTurnIndex).padStart(2, '0')}: "${ev.evidenceSpan}"`,
        );
      }
    } else if (entry.primarySourceTurn && entry.primaryEvidenceSpan) {
      lines.push(
        `Source: Turn ${String(entry.primarySourceTurn).padStart(2, '0')}: "${entry.primaryEvidenceSpan}"`,
      );
    } else {
      lines.push('Source: (missing evidence record)');
    }
    lines.push(`Aligned: ${entry.aligned ? '✅' : '❌'}`);
    lines.push('');
  }
  return lines.join('\n');
}

export function buildStructuredSourceMap(state: CeoJudgmentState): string {
  return buildStructuredFinalReview(state);
}
