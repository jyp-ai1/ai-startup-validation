/**
 * DAY 8-I P0 FIX-6 — Dynamic next judgment focus (evolves with corrections).
 */

import type {
  CeoJudgmentDimensionId,
  CeoJudgmentState,
} from './ai-pm-ceo-judgment-dimensions';
import type { JudgmentFocusContext } from './ai-pm-judgment-evidence-model';

const DEFAULT_ORDER: CeoJudgmentDimensionId[] = [
  'customer',
  'problem',
  'solution',
  'customerChange',
];

const AFTER_UPDATE_FOCUS: Partial<
  Record<CeoJudgmentDimensionId, CeoJudgmentDimensionId>
> = {
  customer: 'problem',
  problem: 'solution',
  solution: 'customerChange',
  customerChange: 'solution',
};

function dim(state: CeoJudgmentState, id: CeoJudgmentDimensionId) {
  return state.dimensions[id];
}

function isFocusResolved(
  state: CeoJudgmentState,
  id: CeoJudgmentDimensionId,
  recentCorrections: Set<CeoJudgmentDimensionId>,
): boolean {
  const d = dim(state, id);
  if (d.correctionApplied) return true;
  if (recentCorrections.has(id) && d.status === 'clear') return true;
  if (recentCorrections.has(id) && d.summary.trim().length >= 8) return true;
  return false;
}

function pickWeakest(
  state: CeoJudgmentState,
  order: CeoJudgmentDimensionId[],
  skip: Set<CeoJudgmentDimensionId>,
): CeoJudgmentDimensionId | null {
  for (const id of order) {
    if (skip.has(id)) continue;
    if (dim(state, id).status === 'unknown') return id;
  }
  for (const id of order) {
    if (skip.has(id)) continue;
    if (dim(state, id).status === 'needs_check') return id;
  }
  return null;
}

/**
 * Pick next focus from judgment evolution — not static first-needs_check.
 */
export function pickDynamicNextFocus(
  state: CeoJudgmentState,
  context?: JudgmentFocusContext,
): CeoJudgmentDimensionId | null {
  const recentCorrections = new Set(context?.recentCorrections ?? []);
  const skip = new Set<CeoJudgmentDimensionId>();

  for (const id of DEFAULT_ORDER) {
    if (isFocusResolved(state, id, recentCorrections)) {
      skip.add(id);
    }
  }

  const lastUpdated = context?.lastUpdatedDimensions ?? [];
  const last = lastUpdated[lastUpdated.length - 1];
  if (last) {
    const nextAfter = AFTER_UPDATE_FOCUS[last];
    if (
      nextAfter &&
      !skip.has(nextAfter) &&
      dim(state, nextAfter).status !== 'clear'
    ) {
      return nextAfter;
    }
  }

  if (context?.turnIndex === 22 || recentCorrections.has('problem')) {
    skip.add('customer');
    const solutionFocus = pickWeakest(state, ['solution', 'customerChange', 'problem'], skip);
    if (solutionFocus) return solutionFocus;
  }

  if (recentCorrections.has('customer')) {
    skip.add('customer');
  }

  return pickWeakest(state, DEFAULT_ORDER, skip);
}

export function buildDynamicNextCheckPrompt(id: CeoJudgmentDimensionId): string {
  switch (id) {
    case 'customer':
      return '누구를 위한 사업인지 더 구체적으로 확인해야 합니다.';
    case 'problem':
      return '고객이 실제로 겪는 핵심 문제와 우선순위를 더 확인해야 합니다.';
    case 'solution':
      return '무엇을 어떻게 해결하려는지 더 구체적으로 확인해야 합니다.';
    case 'customerChange':
      return '고객이 이 서비스를 쓰면 실제로 무엇이 좋아지는지(가설·기대효과) 확인해야 합니다.';
  }
}
