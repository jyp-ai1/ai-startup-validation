/**
 * Core Final W15 — Final Result Integrity / Provenance / Domain Contamination.
 */

import type { LivingClaim, LivingUnderstandingState } from './living-understanding-state';
import type { UnderstandingProvenance } from './understanding-contract';
import {
  evaluateIntentDrift,
  loadOriginalBusinessIntent,
} from './original-business-intent';
import { detectBusinessArchetype } from './adaptive-question-select';

export type ClaimProvenanceLabel =
  | 'document'
  | 'user_confirmed'
  | 'user_inferred'
  | 'AI_inferred'
  | 'unknown';

export function provenanceLabel(claim: LivingClaim): ClaimProvenanceLabel {
  switch (claim.provenance) {
    case 'DOCUMENT':
      return 'document';
    case 'USER_CONFIRMED':
    case 'USER_CORRECTED':
      return 'user_confirmed';
    case 'EXTERNAL_EVIDENCE':
      return 'user_inferred';
    case 'AI_INFERENCE':
      return 'AI_inferred';
    default:
      if (claim.status === 'inferred' || claim.status === 'known') return 'AI_inferred';
      return 'unknown';
  }
}

/** AI_inferred must never render as user_confirmed in final copy. */
export function formatProvenanceTag(label: ClaimProvenanceLabel): string {
  switch (label) {
    case 'document':
      return '[document]';
    case 'user_confirmed':
      return '[user_confirmed]';
    case 'user_inferred':
      return '[user_inferred]';
    case 'AI_inferred':
      return '[AI_inferred]';
    default:
      return '[unknown]';
  }
}

const B2B_SAAS_TEMPLATE_RE =
  /Differentiation in B2B SaaS|B2B SaaS|구독 플랫폼으로 중소기업|엔터프라이즈 SaaS|SaaS 차별화/i;

const TOURISM_SAFE_RE = /관광|여행|투어|외국인|현지|체험|FIT|가이드/i;

export type DomainContaminationResult = {
  contaminated: boolean;
  hits: string[];
  cleanedValue: string | null;
};

/**
 * Strip / flag cross-domain template contamination (e.g. B2B SaaS on tourism demo).
 */
export function detectDomainContamination(input: {
  living: LivingUnderstandingState;
  text: string;
  originalIntentText?: string | null;
}): DomainContaminationResult {
  const archetype = detectBusinessArchetype(input.living);
  const original =
    input.originalIntentText ??
    (typeof window !== 'undefined'
      ? loadOriginalBusinessIntent()?.text
      : null) ??
    '';

  const hits: string[] = [];
  const isTourism =
    archetype === 'tourism' || TOURISM_SAFE_RE.test(original) || TOURISM_SAFE_RE.test(input.living.spine.business);

  if (isTourism && B2B_SAAS_TEMPLATE_RE.test(input.text)) {
    hits.push('b2b_saas_template_on_tourism');
  }

  if (original && evaluateIntentDrift(original, input.text).drifted) {
    if (TOURISM_SAFE_RE.test(original) && B2B_SAAS_TEMPLATE_RE.test(input.text)) {
      hits.push('intent_drift_tourism_to_saas');
    }
  }

  let cleaned: string | null = input.text;
  if (hits.length > 0) {
    cleaned = input.text
      .replace(B2B_SAAS_TEMPLATE_RE, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (!cleaned) cleaned = null;
  }

  return {
    contaminated: hits.length > 0,
    hits,
    cleanedValue: cleaned,
  };
}

/** Sanitize final claim values for founder-facing output. */
export function sanitizeFinalClaimValue(
  claim: LivingClaim,
  living: LivingUnderstandingState,
): { value: string | null; provenance: ClaimProvenanceLabel; contaminated: boolean } {
  const label = provenanceLabel(claim);
  if (!claim.value?.trim()) {
    return { value: null, provenance: label, contaminated: false };
  }

  const check = detectDomainContamination({
    living,
    text: claim.value,
  });

  // Never present AI_inferred as if user confirmed
  if (label === 'AI_inferred' || label === 'document') {
    return {
      value: check.cleanedValue ?? claim.value,
      provenance: label,
      contaminated: check.contaminated,
    };
  }

  return {
    value: check.cleanedValue ?? claim.value,
    provenance: label,
    contaminated: check.contaminated,
  };
}

export function livingHasDomainContamination(living: LivingUnderstandingState): boolean {
  return living.claims.some((c) => {
    if (!c.value) return false;
    return detectDomainContamination({ living, text: c.value }).contaminated;
  });
}

export type { UnderstandingProvenance };
