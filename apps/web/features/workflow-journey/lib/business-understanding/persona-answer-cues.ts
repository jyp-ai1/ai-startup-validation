/**
 * CEO walkthrough — free-form persona answers use natural Korean (not BANK keywords).
 * Shared cues for customerPersona gap closure vs wrong-slot diffRelevance.
 */

import { hasDiffRelevanceEvidence } from './understanding-contract';

/** WHO-segment cues — demographic / traveler description (not diff-value prose). */
export const PERSONA_SEGMENT_CUE_RE =
  /(타깃|타겯|타겟|FIT|MZ|밀레니얼|방문|머무|여행객|세그먼트|persona|누구|초기\s*타깃|2인\s*여행|외국인|커플|부부|20대|30대|40대|50대|여성|남성|사람|분들|혼행|solo|traveler|세대|직장인|학생|일본|미국|영어권)/i;

export const CUSTOMER_PERSONA_CUE_RE =
  /(고객|타깃|타겯|타겟|사용자|유저|persona|관광객|여행객|FIT|MZ|누가\s*쓰|필요로\s*하|외국인|커플|부부)/i;

const DIFF_RELEVANCE_SURFACE_RE = /(체감|예약\s*전|차이|동선|왜\s*중요|관련성)/i;

export { DIFF_RELEVANCE_SURFACE_RE };

export function hasPersonaSegmentCue(text: string): boolean {
  return PERSONA_SEGMENT_CUE_RE.test(text.trim());
}

export function hasCustomerPersonaCue(text: string): boolean {
  return CUSTOMER_PERSONA_CUE_RE.test(text.trim());
}

/**
 * Persona ask + pure relevance sentence (BANK diffRelevance wrong-slot).
 * False when answer describes WHO even if relevance words co-occur (CEO free-form).
 */
export function isRelevanceDominantOnPersonaAsk(text: string): boolean {
  const trimmed = text.trim();
  return (
    hasDiffRelevanceEvidence(trimmed) &&
    DIFF_RELEVANCE_SURFACE_RE.test(trimmed) &&
    !hasPersonaSegmentCue(trimmed)
  );
}

/** On-slot persona answer for wrongSlotReaskPending clear. */
export function isOnSlotPersonaAnswer(answer: string): boolean {
  const trimmed = answer.trim();
  if (trimmed.length < 2) return false;
  if (isRelevanceDominantOnPersonaAsk(trimmed)) return false;
  return hasPersonaSegmentCue(trimmed) || hasCustomerPersonaCue(trimmed);
}
