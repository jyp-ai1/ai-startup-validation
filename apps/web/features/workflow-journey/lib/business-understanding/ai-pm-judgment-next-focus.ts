/**
 * DAY 8-I P0 FIX-6/7 — Dynamic next judgment focus (milestone + state aware).
 */

import type {
  CeoJudgmentDimensionId,
  CeoJudgmentState,
} from './ai-pm-ceo-judgment-dimensions';
import type { JudgmentFocusContext } from './ai-pm-judgment-evidence-model';
import { isAiPmJudgmentFix7V1Active } from './ai-pm-judgment-fix7-v1';

const DEFAULT_ORDER: CeoJudgmentDimensionId[] = [
  'customer',
  'problem',
  'solution',
  'customerChange',
];

/** After turn N completes, preferred focus dimension (FIX-7 CPO milestones). */
const TURN_MILESTONE_FOCUS: Array<{
  afterTurn: number;
  focus: CeoJudgmentDimensionId | null;
  skip?: CeoJudgmentDimensionId[];
}> = [
  { afterTurn: 4, focus: 'solution' },
  { afterTurn: 8, focus: 'problem', skip: ['customer'] },
  { afterTurn: 18, focus: 'customerChange', skip: ['customer'] },
  { afterTurn: 22, focus: 'solution', skip: ['customer', 'problem'] },
  { afterTurn: 28, focus: 'customerChange' },
  { afterTurn: 29, focus: null },
  { afterTurn: 30, focus: null },
];

function dim(state: CeoJudgmentState, id: CeoJudgmentDimensionId) {
  return state.dimensions[id];
}

function isSolutionStructureComplete(state: CeoJudgmentState): boolean {
  const layers = state.dimensions.solution.solutionLayers;
  const evidence = state.dimensions.solution.solutionLayerEvidence ?? [];
  const hasLayers = Boolean(layers?.approach && layers.keyFeature && layers.mvpScope);
  const hasEvidence = ['approach', 'keyFeature', 'mvpScope'].every((k) =>
    evidence.some((e) => e.layer === k && e.sourceTurnIndex),
  );
  return hasLayers && hasEvidence;
}

function isFocusResolved(
  state: CeoJudgmentState,
  id: CeoJudgmentDimensionId,
  recentCorrections: Set<CeoJudgmentDimensionId>,
): boolean {
  const d = dim(state, id);
  if (d.correctionApplied) return true;
  if (recentCorrections.has(id) && d.summary.trim().length >= 8) return true;
  if (id === 'customer' && recentCorrections.has('customer')) return true;
  if (id === 'solution' && isSolutionStructureComplete(state)) return true;
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

function pickMilestoneFocus(
  turnIndex: number,
  state: CeoJudgmentState,
): CeoJudgmentDimensionId | null {
  let chosen: (typeof TURN_MILESTONE_FOCUS)[number] | null = null;
  for (const m of TURN_MILESTONE_FOCUS) {
    if (turnIndex >= m.afterTurn) chosen = m;
  }
  if (!chosen) return null;
  if (chosen.focus === null) return null;

  const skip = new Set(chosen.skip ?? []);
  if (chosen.focus === 'solution' && isSolutionStructureComplete(state)) {
    skip.add('solution');
    return pickWeakest(state, ['customerChange', 'problem', 'customer'], skip);
  }
  if (skip.has(chosen.focus)) {
    return pickWeakest(state, DEFAULT_ORDER, skip);
  }
  return chosen.focus;
}

/**
 * Pick next focus from judgment evolution — milestone-aware when FIX-7 active.
 */
export function pickDynamicNextFocus(
  state: CeoJudgmentState,
  context?: JudgmentFocusContext,
): CeoJudgmentDimensionId | null {
  const turnIndex = context?.turnIndex ?? state.currentTurnIndex;
  const recentCorrections = new Set(context?.recentCorrections ?? state.recentCorrections ?? []);
  const skip = new Set<CeoJudgmentDimensionId>();

  for (const id of DEFAULT_ORDER) {
    if (isFocusResolved(state, id, recentCorrections)) skip.add(id);
  }

  if (isAiPmJudgmentFix7V1Active() && turnIndex) {
    const milestone = pickMilestoneFocus(turnIndex, state);
    if (milestone && !skip.has(milestone)) return milestone;
    if (turnIndex >= 29) return null;
  }

  if (recentCorrections.has('customer')) skip.add('customer');
  if (recentCorrections.has('problem')) skip.add('problem');
  if (isSolutionStructureComplete(state)) skip.add('solution');

  const order: CeoJudgmentDimensionId[] = [
    'customerChange',
    'solution',
    'problem',
    'customer',
  ];
  return pickWeakest(state, order, skip);
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
      return '고객 변화 가설·기대효과를 실제로 검증할 방법을 확인해야 합니다.';
  }
}

/** Expected focus dimension at a pipeline milestone (for acceptance tests). */
export function expectedFocusAtTurn(turnIndex: number): CeoJudgmentDimensionId | null {
  const m = TURN_MILESTONE_FOCUS.filter((x) => x.afterTurn <= turnIndex).pop();
  return m?.focus ?? null;
}

export function expectedFocusPromptAtTurn(turnIndex: number): string | null {
  const focus = expectedFocusAtTurn(turnIndex);
  if (!focus) return null;
  return buildDynamicNextCheckPrompt(focus);
}
