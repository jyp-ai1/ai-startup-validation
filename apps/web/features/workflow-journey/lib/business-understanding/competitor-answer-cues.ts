/**
 * CEO walkthrough — free-form competitor answers omit BANK keywords (클룩, 경쟁사, …).
 * Shared cues for alternativesCompetitors gap closure vs business-slot steal.
 */

/** Existence / category competitor cues — verticals, "many services", alternatives landscape. */
export const COMPETITOR_EXISTENCE_CUE_RE =
  /(경쟁|대안|비슷한|이미\s*있|많(다|음|은|아)|개별\s*서비스|유사\s*서비스|대체|vs\.?|트립|클룩|가이드\s*매칭|카탈로그|나열|플랫폼\s*들|앱\s*들|서비스\s*들|관련\s*서비스|전통주|여행관련|여행\s*관련|막걸리|양조|관광\s*앱|ota)/i;

/** CEO free-form: describes alternative landscape without naming a single product. */
export function hasCompetitorExistenceCue(text: string): boolean {
  return COMPETITOR_EXISTENCE_CUE_RE.test(text.trim());
}

/** On-slot competitor answer — not a business one-liner restatement. */
export function isOnSlotCompetitorAnswer(answer: string): boolean {
  const trimmed = answer.trim();
  if (trimmed.length < 4) return false;
  return hasCompetitorExistenceCue(trimmed);
}
