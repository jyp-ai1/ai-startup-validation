import type { GapCompleteness } from '@repo/types/domain/answer-review';
import type { GapKnowledgeRecord } from '@repo/types/domain/gap-knowledge-state';

import {
  gapCeoSurfaceFromAnswer,
  gapCeoSurfaceKind,
  gapCeoSurfaceLabel,
  type GapCeoSurfaceKind,
} from './gap-ceo-surface-label';

/** Track B — map persisted gap record → CEO surface (reopen-aware display only). */
export function resolveGapCeoSurfaceForRecord(
  record: Pick<GapKnowledgeRecord, 'completeness'>,
  context?: {
    priorCompleteness?: GapCompleteness;
    answerLooksAmbiguous?: boolean;
  },
): GapCeoSurfaceKind {
  const { priorCompleteness, answerLooksAmbiguous } = context ?? {};
  const reopened =
    priorCompleteness === 'CLOSED' &&
    (record.completeness === 'OPEN' ||
      record.completeness === 'PARTIAL' ||
      record.completeness === 'CONTRADICTED');

  if (reopened && record.completeness === 'CONTRADICTED') {
    return 'CONFLICT';
  }
  if (reopened) {
    return 'UNVERIFIED';
  }

  return gapCeoSurfaceFromAnswer({
    completeness: record.completeness,
    answerLooksAmbiguous,
  });
}

export function formatGapCeoSurfaceLine(input: {
  gapLabel: string;
  record: Pick<GapKnowledgeRecord, 'completeness'>;
  context?: Parameters<typeof resolveGapCeoSurfaceForRecord>[1];
}): string {
  const kind = resolveGapCeoSurfaceForRecord(input.record, input.context);
  return `${input.gapLabel} — ${gapCeoSurfaceLabel(kind)}`;
}

export { gapCeoSurfaceLabel, gapCeoSurfaceKind };
