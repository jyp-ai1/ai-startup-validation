/**
 * DAY 8-I P0 FIX-6 — Evidence-grounded business review (Final ↔ Source ↔ Span).
 */

import type {
  CeoJudgmentDimension,
  CeoJudgmentDimensionId,
  CeoJudgmentState,
} from './ai-pm-ceo-judgment-dimensions';
import { CEO_JUDGMENT_DIMENSION_LABELS, statusEmoji } from './ai-pm-ceo-judgment-dimensions';
import {
  evidenceGroundedSummary,
  primaryEvidenceRecord,
} from './ai-pm-judgment-evidence-model';
import { renderSolutionJudgmentStructured } from './ai-pm-judgment-structured-solution';

export type DimensionSourceTrace = {
  dimensionId: CeoJudgmentDimensionId;
  finalSummary: string;
  sourceTurnIndex: number | null;
  evidenceSpan: string | null;
  aligned: boolean;
};

export function formatDimensionForReview(dimension: CeoJudgmentDimension): string {
  if (dimension.id === 'solution' && dimension.solutionLayers) {
    return renderSolutionJudgmentStructured(dimension.solutionLayers);
  }
  return evidenceGroundedSummary(dimension);
}

export function buildDimensionSourceTrace(
  dimension: CeoJudgmentDimension,
): DimensionSourceTrace {
  const primary = primaryEvidenceRecord(dimension);
  const finalSummary = formatDimensionForReview(dimension);
  const evidenceSpan = primary?.span?.trim() || null;
  const sourceTurnIndex = primary?.sourceTurnIndex ?? dimension.sourceTurns?.[0] ?? null;

  let aligned = Boolean(evidenceSpan);
  if (aligned && dimension.id === 'problem') {
    aligned =
      finalSummary.includes('확인 시간') ||
      finalSummary.includes('주문 확인') ||
      (evidenceSpan?.includes('확인') ?? false) ||
      !/배송\s*누락이\s*핵심/.test(finalSummary);
  }

  return {
    dimensionId: dimension.id,
    finalSummary,
    sourceTurnIndex,
    evidenceSpan,
    aligned,
  };
}

export function buildEvidenceSourceMap(state: CeoJudgmentState): string {
  const lines: string[] = [];

  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    const d = state.dimensions[id];
    const trace = buildDimensionSourceTrace(d);
    lines.push(`### ${CEO_JUDGMENT_DIMENSION_LABELS[id]}`);
    lines.push(`Final: ${statusEmoji(d.status)} ${trace.finalSummary || '(empty)'}`);
    if (trace.sourceTurnIndex && trace.evidenceSpan) {
      lines.push(
        `Source Turn: Turn ${String(trace.sourceTurnIndex).padStart(2, '0')}: "${trace.evidenceSpan}"`,
      );
    } else if (d.sourceTurns?.length) {
      lines.push(`Source Turns: ${d.sourceTurns.map((t) => `Turn ${String(t).padStart(2, '0')}`).join(', ')}`);
    } else {
      lines.push('Source Turn: (no evidence record)');
    }
    lines.push(`Aligned: ${trace.aligned ? '✅' : '❌'}`);
    lines.push('');
  }

  return lines.join('\n');
}

export function evaluateEvidenceAlignment(state: CeoJudgmentState): Array<{
  dimensionId: CeoJudgmentDimensionId;
  issue: string;
}> {
  const issues: Array<{ dimensionId: CeoJudgmentDimensionId; issue: string }> = [];

  for (const id of ['customer', 'problem', 'solution', 'customerChange'] as CeoJudgmentDimensionId[]) {
    const trace = buildDimensionSourceTrace(state.dimensions[id]);
    if (!trace.evidenceSpan) {
      issues.push({ dimensionId: id, issue: 'missing primary evidence span' });
      continue;
    }
    if (!trace.aligned) {
      issues.push({
        dimensionId: id,
        issue: `final "${trace.finalSummary}" not aligned with evidence "${trace.evidenceSpan}"`,
      });
    }
  }

  return issues;
}
