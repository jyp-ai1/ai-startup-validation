/**
 * DAY 8-I P0 FIX-6/7 — Evidence-grounded business review (strict alignment).
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
import { isAiPmJudgmentFix7V1Active } from './ai-pm-judgment-fix7-v1';
import {
  buildStructuredReviewEntry,
  buildStructuredSourceMap,
  renderDimensionStructuredReview,
} from './ai-pm-judgment-structured-review';
import { renderSolutionJudgmentStructured } from './ai-pm-judgment-structured-solution';

export type DimensionSourceTrace = {
  dimensionId: CeoJudgmentDimensionId;
  finalSummary: string;
  sourceTurnIndex: number | null;
  evidenceSpan: string | null;
  aligned: boolean;
};

export function formatDimensionForReview(dimension: CeoJudgmentDimension): string {
  if (isAiPmJudgmentFix7V1Active()) {
    return renderDimensionStructuredReview(dimension);
  }
  if (dimension.id === 'solution' && dimension.solutionLayers) {
    return renderSolutionJudgmentStructured(dimension.solutionLayers);
  }
  return evidenceGroundedSummary(dimension);
}

export function buildDimensionSourceTrace(
  dimension: CeoJudgmentDimension,
): DimensionSourceTrace {
  if (isAiPmJudgmentFix7V1Active()) {
    const entry = buildStructuredReviewEntry(dimension);
    return {
      dimensionId: dimension.id,
      finalSummary: entry.display,
      sourceTurnIndex: entry.primarySourceTurn,
      evidenceSpan: entry.primaryEvidenceSpan,
      aligned: entry.aligned,
    };
  }

  const primary = primaryEvidenceRecord(dimension);
  const finalSummary = formatDimensionForReview(dimension);
  const evidenceSpan = primary?.span?.trim() || null;
  const sourceTurnIndex = primary?.sourceTurnIndex ?? dimension.sourceTurns?.[0] ?? null;
  const aligned = Boolean(evidenceSpan && sourceTurnIndex);

  return {
    dimensionId: dimension.id,
    finalSummary,
    sourceTurnIndex,
    evidenceSpan,
    aligned,
  };
}

export function buildEvidenceSourceMap(state: CeoJudgmentState): string {
  if (isAiPmJudgmentFix7V1Active()) {
    return buildStructuredSourceMap(state);
  }

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
    if (id === 'solution' && isAiPmJudgmentFix7V1Active()) {
      const ev = state.dimensions.solution.solutionLayerEvidence ?? [];
      for (const layer of ['approach', 'keyFeature', 'mvpScope'] as const) {
        const hit = ev.find((e) => e.layer === layer);
        if (!hit?.sourceTurnIndex) {
          issues.push({ dimensionId: id, issue: `solution layer ${layer} missing source turn` });
        }
      }
      if (!trace.aligned) {
        issues.push({ dimensionId: id, issue: 'solution layers not fully evidence-grounded' });
      }
      continue;
    }
    if (!trace.evidenceSpan || !trace.sourceTurnIndex) {
      issues.push({ dimensionId: id, issue: 'missing primary evidence span or source turn' });
      continue;
    }
    if (!trace.aligned) {
      issues.push({
        dimensionId: id,
        issue: `final not aligned with evidence "${trace.evidenceSpan}"`,
      });
    }
  }

  return issues;
}
