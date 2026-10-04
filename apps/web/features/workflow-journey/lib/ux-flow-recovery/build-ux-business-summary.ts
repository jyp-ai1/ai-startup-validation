/**
 * Maps Living Understanding → founder-facing summary.
 * Presentation only — does not write gap/state/decision.
 */

import type { GapCompleteness } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import type { LivingClaim, LivingUnderstandingState } from '../business-understanding/living-understanding-state';
import { SHARED_UNDERSTANDING_PENDING } from '../business-understanding/build-shared-understanding';
import { resolveFounderContext, founderContextLensHint } from './founder-context-lens';
import { sanitizeUxCopy } from './sanitize-ux-copy';

export type UxClaimTrust = 'ceo_provided' | 'ai_understood' | 'needs_check';

export type UxSummarySlotId =
  | 'business'
  | 'user'
  | 'payer'
  | 'problem'
  | 'market'
  | 'competition';

export type UxSlotMark = 'open' | 'partial' | 'current' | 'closed' | 'conflict';

export type UxSummarySlot = {
  id: UxSummarySlotId;
  label: string;
  confirmed: boolean;
  value: string | null;
  trust: UxClaimTrust;
  mark: UxSlotMark;
  fieldKey: string;
};

export type UxBusinessSummaryView = {
  projectTitle: string;
  shortDescription: string;
  fullDescription: string;
  understoodNarrative: string;
  displayOneLiner?: string;
  founderContextHint?: string;
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
  { id: 'business', label: '사업', fieldKey: 'businessOneLiner', unknownLabel: '무엇을 하는 사업인가' },
  { id: 'user', label: '실제 사용자', fieldKey: 'customerPersona', unknownLabel: '실제로 사용하는 사람' },
  { id: 'payer', label: '결제자', fieldKey: 'payer', unknownLabel: '돈을 지불하는 사람' },
  { id: 'problem', label: '문제', fieldKey: 'problemJtbd', unknownLabel: '해결하려는 핵심 문제' },
  { id: 'market', label: '시장/채널', fieldKey: 'marketChannel', unknownLabel: '어디서 누구에게 어떻게 접근하는가' },
  { id: 'competition', label: '대안/경쟁', fieldKey: 'alternativesCompetitors', unknownLabel: '현재 고객이 사용하는 대안/경쟁' },
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

function normalizeComparable(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isNearDuplicateOfSource(value: string, source: string): boolean {
  const a = normalizeComparable(value);
  const b = normalizeComparable(source);
  if (!a || !b) return false;
  if (a === b) return true;
  if (a.length >= 24 && b.includes(a)) return true;
  if (b.length >= 24 && a.includes(b)) return true;
  return false;
}

function hasJongseong(text: string): boolean {
  const last = text.trim().slice(-1);
  const code = last.codePointAt(0);
  if (!code || code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function withObjectParticle(noun: string): string {
  return `${noun}${hasJongseong(noun) ? '을' : '를'}`;
}

function clipSentence(text: string, max = 160): string {
  const trimmed = normalizeComparable(text);
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('.'), cut.lastIndexOf('다.'), cut.lastIndexOf('요.'));
  if (lastStop >= 40) return cut.slice(0, lastStop + 1).trim();
  return `${cut.trim()}…`;
}

/** Presentation paraphrase — never returns the founder source document. */
export function composeUnderstoodNarrative(
  living: LivingUnderstandingState,
  sourceDocument: string,
): string {
  const source = sourceDocument.trim();
  const business = claimByKey(living, 'businessOneLiner');
  const user = claimByKey(living, 'customerPersona');
  const problem = claimByKey(living, 'problemJtbd');
  const businessValue = isFilled(business) ? business!.value!.trim().replace(/[.。]+$/u, '') : '';
  const userValue = isFilled(user) ? user!.value!.trim().replace(/[.。]+$/u, '') : '';
  const problemValue = isFilled(problem) ? problem!.value!.trim().replace(/[.。]+$/u, '') : '';
  const usableBusiness =
    businessValue && !isNearDuplicateOfSource(businessValue, source) ? businessValue : '';
  const usableProblem =
    problemValue && !isNearDuplicateOfSource(problemValue, source) ? problemValue : '';

  const parts: string[] = [];
  if (usableBusiness) parts.push(`사업은 ${usableBusiness.replace(/입니다\.?$/, '')}`);
  if (userValue) parts.push(`고객은 ${userValue}`);
  if (usableProblem) parts.push(`문제는 ${usableProblem.replace(/입니다\.?$/, '')}`);
  if (parts.length > 0) {
    return `${parts.join('. ')}로 이해했습니다.`;
  }

  const spine = living.spine.business?.trim() ?? '';
  if (spine && spine !== SHARED_UNDERSTANDING_PENDING && !isNearDuplicateOfSource(spine, source)) {
    return `${spine.replace(/입니다\.?$/, '')}로 이해했습니다.`;
  }
  return '아직 사업을 충분히 이해하지 못했습니다.';
}

function markFromCompleteness(
  completeness: GapCompleteness | undefined,
  isCurrent: boolean,
  livingConfirmed: boolean,
  filled: boolean,
): UxSlotMark {
  if (completeness === 'CONTRADICTED') return 'conflict';
  if (completeness === 'CLOSED') return 'closed';
  if (isCurrent) return 'current';
  if (completeness === 'PARTIAL') return 'partial';
  if (completeness === 'OPEN') return filled ? 'partial' : 'open';
  if (livingConfirmed) return 'closed';
  if (filled) return 'partial';
  return 'open';
}

export function uxSlotSymbol(mark: UxSlotMark): string {
  switch (mark) {
    case 'closed':
      return '✓';
    case 'partial':
      return '△';
    case 'current':
      return '●';
    case 'conflict':
      return '△';
    default:
      return '○';
  }
}

export function buildUxBusinessSummary(input: {
  projectTitle: string;
  documentText?: string | null;
  living: LivingUnderstandingState;
  questionIndex?: number;
  displayOneLiner?: string;
  gapState?: GapKnowledgeState | null;
  targetGapId?: string | null;
  reviewType?: string | null;
}): UxBusinessSummaryView {
  const fullDescription = (input.documentText ?? '').trim();
  const understoodNarrative = composeUnderstoodNarrative(input.living, fullDescription);
  const founderContext = resolveFounderContext(input.reviewType);

  const slots = SLOT_DEFS.map((def) => {
    const claim = claimByKey(input.living, def.fieldKey);
    const filled = isFilled(claim);
    const livingConfirmed = filled && trustFor(claim) !== 'needs_check';
    const completeness = input.gapState
      ? (input.gapState.gaps[def.fieldKey]?.completeness ?? 'OPEN')
      : undefined;
    const mark = markFromCompleteness(
      completeness,
      input.targetGapId === def.fieldKey,
      livingConfirmed,
      filled,
    );
    return {
      id: def.id,
      label: def.label,
      confirmed: mark === 'closed',
      value: filled ? claim!.value!.trim() : null,
      trust: trustFor(claim),
      mark,
      fieldKey: def.fieldKey,
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
    shortDescription: clipSentence(understoodNarrative),
    fullDescription,
    understoodNarrative,
    displayOneLiner: input.displayOneLiner?.trim() || undefined,
    founderContextHint: founderContextLensHint(founderContext),
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
