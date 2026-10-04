/**
 * Maps Living Understanding → founder-facing summary.
 * Presentation only — does not write gap/state/decision.
 */

import type { LivingClaim, LivingUnderstandingState } from '../business-understanding/living-understanding-state';
import { SHARED_UNDERSTANDING_PENDING } from '../business-understanding/build-shared-understanding';
import { sanitizeUxCopy } from './sanitize-ux-copy';

export type UxClaimTrust = 'ceo_provided' | 'ai_understood' | 'needs_check';

export type UxSummarySlotId =
  | 'business'
  | 'user'
  | 'customer'
  | 'problem'
  | 'market'
  | 'competition';

export type UxSummarySlot = {
  id: UxSummarySlotId;
  label: string;
  confirmed: boolean;
  value: string | null;
  trust: UxClaimTrust;
};

export type UxBusinessSummaryView = {
  projectTitle: string;
  shortDescription: string;
  fullDescription: string;
  understoodNarrative: string;
  slots: UxSummarySlot[];
  unknowns: string[];
  judgment: string;
  questionIndex: number;
};

const SLOT_DEFS: Array<{
  id: UxSummarySlotId;
  label: string;
  fieldKey: string;
  unknownLabel: string;
}> = [
  { id: 'business', label: '사업', fieldKey: 'businessOneLiner', unknownLabel: '사업이 무엇을 하는지' },
  { id: 'user', label: '실제 사용자', fieldKey: 'customerPersona', unknownLabel: '실제로 사용하는 사람' },
  { id: 'customer', label: '고객', fieldKey: 'payer', unknownLabel: '비용을 지불할 이유' },
  { id: 'problem', label: '문제', fieldKey: 'problemJtbd', unknownLabel: '고객이 실제로 겪는 핵심 문제' },
  { id: 'market', label: '시장', fieldKey: 'marketChannel', unknownLabel: '현재 사용하는 대안' },
  { id: 'competition', label: '경쟁', fieldKey: 'alternativesCompetitors', unknownLabel: '현재 사용하는 대안' },
];

function claimByKey(living: LivingUnderstandingState, key: string): LivingClaim | undefined {
  return living.claims.find((claim) => claim.fieldKey === key);
}

function trustFor(claim: LivingClaim | undefined): UxClaimTrust {
  if (!claim || !claim.value?.trim() || claim.status === 'unknown') return 'needs_check';
  if (claim.status === 'inferred' || claim.provenance === 'AI_INFERENCE') return 'needs_check';
  if (
    claim.provenance === 'DOCUMENT' ||
    claim.provenance === 'USER_CONFIRMED' ||
    claim.provenance === 'USER_CORRECTED'
  ) {
    return 'ceo_provided';
  }
  return 'ai_understood';
}

function isFilled(claim: LivingClaim | undefined): boolean {
  if (!claim?.value?.trim()) return false;
  if (claim.status === 'unknown') return false;
  const value = claim.value.trim();
  if (value === SHARED_UNDERSTANDING_PENDING) return false;
  if (value.includes('아직 문서에서 사업 내용을 충분히 이해하지 못했습니다')) return false;
  return true;
}

function clipSentence(text: string, max = 160): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('다.'), cut.lastIndexOf('요.'));
  if (lastStop >= 40) return cut.slice(0, lastStop + 1).trim();
  return `${cut.trim()}…`;
}

export function buildUxBusinessSummary(input: {
  projectTitle: string;
  documentText?: string | null;
  living: LivingUnderstandingState;
  questionIndex?: number;
}): UxBusinessSummaryView {
  const fullDescription = (input.documentText ?? '').trim();
  const business = claimByKey(input.living, 'businessOneLiner');
  const spineBusiness = input.living.spine.business?.trim() ?? '';
  const understoodSource =
    (isFilled(business) ? business!.value!.trim() : '') ||
    (spineBusiness && spineBusiness !== SHARED_UNDERSTANDING_PENDING ? spineBusiness : '') ||
    fullDescription;

  const slots = SLOT_DEFS.map((def) => {
    const claim = claimByKey(input.living, def.fieldKey);
    const filled = isFilled(claim);
    return {
      id: def.id,
      label: def.label,
      confirmed: filled && trustFor(claim) !== 'needs_check',
      value: filled ? claim!.value!.trim() : null,
      trust: trustFor(claim),
    } satisfies UxSummarySlot;
  });

  const unknowns = SLOT_DEFS.filter((def) => {
    const slot = slots.find((item) => item.id === def.id);
    return !slot?.confirmed;
  }).map((def) => def.unknownLabel);

  const uniqueUnknowns = [...new Set(unknowns)];

  const defaultJudgment = uniqueUnknowns.length
    ? '현재 정보만으로는 사업성 판단을 확정하기 어렵습니다.'
    : '핵심 이해는 정리됐습니다. 사업성 검토 결과로 이어갈 수 있습니다.';

  return {
    projectTitle: input.projectTitle.trim() || '새 프로젝트',
    shortDescription: clipSentence(understoodSource || fullDescription || '아직 사업 설명이 없습니다.'),
    fullDescription: fullDescription || understoodSource,
    understoodNarrative: understoodSource || '아직 사업을 충분히 이해하지 못했습니다.',
    slots,
    unknowns: uniqueUnknowns,
    judgment: sanitizeUxCopy(input.living.judgmentSummary) || defaultJudgment,
    questionIndex: Math.max(1, input.questionIndex ?? 1),
  };
}

export function uxTrustLabel(trust: UxClaimTrust): string {
  switch (trust) {
    case 'ceo_provided':
      return 'CEO 제공';
    case 'ai_understood':
      return 'AI가 이해한 내용';
    default:
      return '확인 필요';
  }
}
