/**
 * DAY 8-G — AI current conclusion + next check (presentation only).
 */

import type {
  CeoJudgmentDimension,
  CeoJudgmentDimensionId,
  CeoJudgmentState,
  CeoJudgmentStatus,
} from './ai-pm-ceo-judgment-dimensions';
import { CEO_JUDGMENT_DIMENSION_LABELS } from './ai-pm-ceo-judgment-dimensions';

function dim(state: CeoJudgmentState, id: CeoJudgmentDimensionId): CeoJudgmentDimension {
  return state.dimensions[id];
}

function isClear(s: CeoJudgmentStatus): boolean {
  return s === 'clear';
}

function isKnown(s: CeoJudgmentStatus): boolean {
  return s !== 'unknown';
}

/** Build one-line business understanding from 4 dimensions — no invented facts. */
export function buildJudgmentOneLiner(state: CeoJudgmentState): string {
  const customer = dim(state, 'customer');
  const problem = dim(state, 'problem');
  const solution = dim(state, 'solution');

  if (isKnown(customer.status) && isKnown(problem.status) && isKnown(solution.status)) {
    const c = customer.summary.replace(/\.$/, '');
    const p = problem.summary.replace(/\.$/, '');
    const s = solution.summary.replace(/\.$/, '');
    return `${c}의 ${p}을(를) ${s} 방향으로 해결하려는 서비스로 이해했습니다.`;
  }
  if (isKnown(customer.status) && isKnown(problem.status)) {
    return `${customer.summary.replace(/\.$/, '')}의 ${problem.summary.replace(/\.$/, '')} 문제를 다루는 사업으로 이해했습니다.`;
  }
  if (isKnown(customer.status)) {
    return `${customer.summary.replace(/\.$/, '')}을(를) 위한 사업으로 이해했습니다.`;
  }
  return '아직 사업의 핵심 윤곽을 정리하는 중입니다.';
}

export function buildJudgmentConclusion(state: CeoJudgmentState): string {
  const customer = dim(state, 'customer');
  const problem = dim(state, 'problem');
  const solution = dim(state, 'solution');
  const change = dim(state, 'customerChange');

  const clearParts: string[] = [];
  const weakParts: string[] = [];

  if (isClear(customer.status)) clearParts.push('고객');
  else if (customer.status === 'needs_check') weakParts.push('고객');
  else weakParts.push('고객');

  if (isClear(problem.status)) clearParts.push('문제');
  else if (problem.status === 'needs_check') weakParts.push('문제');
  else weakParts.push('문제');

  if (isClear(solution.status)) clearParts.push('해결 방향');
  else if (solution.status === 'needs_check') weakParts.push('해결 방향');

  if (isClear(change.status)) clearParts.push('고객에게 달라지는 점');
  else if (change.status !== 'unknown') weakParts.push('고객에게 달라지는 점');
  else weakParts.push('고객에게 달라지는 점');

  if (clearParts.length >= 2 && weakParts.length === 0) {
    return `${clearParts.join('과 ')}은(는) 비교적 명확합니다. 다만 실제 고객이 이 문제를 얼마나 중요하게 느끼는지는 아직 확인되지 않았습니다.`;
  }
  if (clearParts.length >= 2) {
    return `${clearParts.join('과 ')}은(는) 비교적 명확합니다. ${weakParts.join(', ')}은(는) 추가 확인이 필요합니다.`;
  }
  if (clearParts.length === 1) {
    return `${clearParts[0]}은(는) 어느 정도 파악되었습니다. 나머지 항목은 아직 정보가 부족합니다.`;
  }
  return '현재 대화만으로는 사업에 대한 1차 판단을 내리기 어렵습니다. 핵심 정보를 더 확인해야 합니다.';
}

export function pickNextCheckDimension(state: CeoJudgmentState): CeoJudgmentDimensionId | null {
  const order: CeoJudgmentDimensionId[] = [
    'customer',
    'problem',
    'solution',
    'customerChange',
  ];
  for (const id of order) {
    const d = dim(state, id);
    if (d.status === 'unknown') return id;
  }
  for (const id of order) {
    const d = dim(state, id);
    if (d.status === 'needs_check') return id;
  }
  return null;
}

export function buildNextCheckPrompt(id: CeoJudgmentDimensionId): string {
  switch (id) {
    case 'customer':
      return '누구를 위한 사업인지 더 구체적으로 확인해야 합니다.';
    case 'problem':
      return '고객이 실제로 어떤 불편을 겪는지 더 확인해야 합니다.';
    case 'solution':
      return '무엇을 어떻게 해결하려는지 더 구체적으로 확인해야 합니다.';
    case 'customerChange':
      return '고객이 이 서비스를 쓰면 실제로 무엇이 좋아지는지 확인해야 합니다.';
  }
}

export function finalizeJudgmentPresentation(state: CeoJudgmentState): CeoJudgmentState {
  const nextId = pickNextCheckDimension(state);
  return {
    ...state,
    oneLiner: buildJudgmentOneLiner(state),
    conclusion: buildJudgmentConclusion(state),
    nextCheck: nextId ? buildNextCheckPrompt(nextId) : null,
    updatedAt: new Date().toISOString(),
  };
}

export function weakestDimensionLabel(state: CeoJudgmentState): string | null {
  const id = pickNextCheckDimension(state);
  return id ? CEO_JUDGMENT_DIMENSION_LABELS[id] : null;
}
