import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import {
  CEO_JUDGMENT_DIMENSION_LABELS,
  CEO_JUDGMENT_STATUS_LABEL,
} from './ai-pm-ceo-judgment-dimensions';
import { formatFounderJudgmentSummary } from './build-conversation-understanding-summary';
import type { LivingUnderstandingState } from './living-understanding-state';
import { isUserFacingSurfaceCopy } from './build-ceo-six-surfaces';

/** Track D — CEO judgment trace bundle (persisted artifacts → display lines). */
export type CeoJudgmentTraceBundle = {
  livingSummary: string | null;
  dimensionLines: string[];
  knownUnknownHint: string;
};

const FORBIDDEN = /\btargetGapId\b|businessOneLiner|problemJtbd|score:\s*\d/i;

export function buildCeoJudgmentTraceBundle(input: {
  living?: LivingUnderstandingState | null;
  judgment?: CeoJudgmentState | null;
}): CeoJudgmentTraceBundle {
  const livingSummary = input.living ? formatFounderJudgmentSummary(input.living) : null;

  const dimensionLines: string[] = [];
  if (input.judgment?.dimensions) {
    for (const dim of Object.values(input.judgment.dimensions)) {
      if (!dim.summary?.trim()) continue;
      const label = CEO_JUDGMENT_DIMENSION_LABELS[dim.id] ?? dim.id;
      const status = CEO_JUDGMENT_STATUS_LABEL[dim.status] ?? dim.status;
      const line = `${label}: ${status} — ${dim.summary.trim()}`;
      if (isUserFacingSurfaceCopy(line) && !FORBIDDEN.test(line)) {
        dimensionLines.push(line);
      }
    }
  }

  const needsCheck = dimensionLines.filter((l) => l.includes('확인 필요')).length;
  const knownUnknownHint =
    needsCheck > 0
      ? '일부 판단 축은 추가 확인이 필요합니다. 다음 질문은 그 공백을 줄이기 위함입니다.'
      : '확인된 근거를 바탕으로 다음 검증 질문을 이어갑니다.';

  return { livingSummary, dimensionLines, knownUnknownHint };
}

export function assertCeoJudgmentTraceSafe(bundle: CeoJudgmentTraceBundle): boolean {
  const blob = JSON.stringify(bundle);
  return !FORBIDDEN.test(blob);
}
