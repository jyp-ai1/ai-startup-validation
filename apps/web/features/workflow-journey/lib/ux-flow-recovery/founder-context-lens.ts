/**
 * Founder Context lens — reads existing reviewType only.
 * Never writes V3 decision inputs, DB columns, or new enums.
 */

import {
  isReviewType,
  type ReviewType,
} from '@/features/interview/types/interview-state';

export type FounderContextId = ReviewType;

export type ResultSectionId =
  | 'judgment'
  | 'why'
  | 'facts'
  | 'assumptions'
  | 'unknowns'
  | 'risks'
  | 'nextValidation'
  | 'nextActions';

const DEFAULT_SECTION_ORDER: ResultSectionId[] = [
  'judgment',
  'facts',
  'assumptions',
  'unknowns',
  'risks',
  'nextValidation',
  'nextActions',
  'why',
];

export function resolveFounderContext(reviewType?: string | null): FounderContextId {
  return isReviewType(reviewType ?? '') ? reviewType : 'startup-idea';
}

export function founderContextLabel(id: FounderContextId): string {
  switch (id) {
    case 'startup-idea':
      return '예비창업자 · 초기 대표';
    case 'new-business':
      return '기존 사업 운영자';
    case 'existing-strategy':
      return '사업전략 담당자';
    case 'investment-prep':
      return '투자검토';
  }
}

export function founderContextLensHint(id: FounderContextId): string {
  switch (id) {
    case 'startup-idea':
      return '지금은 첫 검증과 실행 가능성을 기준으로 확인합니다.';
    case 'new-business':
      return '지금은 진입·수익·기존 사업과의 충돌을 기준으로 확인합니다.';
    case 'existing-strategy':
      return '지금은 시장·경쟁·차별을 기준으로 확인합니다.';
    case 'investment-prep':
      return '지금은 리스크·경제성·HOLD 이유를 기준으로 확인합니다.';
  }
}

export function founderContextQuestionHint(id: FounderContextId): string {
  switch (id) {
    case 'startup-idea':
      return '이 답이 첫 검증을 시작할 수 있게 해 줍니다.';
    case 'new-business':
      return '이 답이 기존 사업과 새 사업이 겹치는지 가릅니다.';
    case 'existing-strategy':
      return '이 답이 시장에서 왜 이 사업인지 분명히 합니다.';
    case 'investment-prep':
      return '이 답이 투자 판단의 리스크를 줄입니다.';
  }
}

/** Same confirmed knowledge, different section order only. */
export function resultSectionOrder(id: FounderContextId): ResultSectionId[] {
  switch (id) {
    case 'startup-idea':
      return [
        'nextActions',
        'nextValidation',
        'judgment',
        'facts',
        'assumptions',
        'unknowns',
        'risks',
        'why',
      ];
    case 'new-business':
      return [
        'judgment',
        'risks',
        'facts',
        'assumptions',
        'unknowns',
        'nextValidation',
        'nextActions',
        'why',
      ];
    case 'existing-strategy':
      return [
        'facts',
        'assumptions',
        'judgment',
        'unknowns',
        'risks',
        'nextValidation',
        'nextActions',
        'why',
      ];
    case 'investment-prep':
      return [
        'risks',
        'judgment',
        'why',
        'facts',
        'assumptions',
        'unknowns',
        'nextValidation',
        'nextActions',
      ];
    default:
      return DEFAULT_SECTION_ORDER;
  }
}
