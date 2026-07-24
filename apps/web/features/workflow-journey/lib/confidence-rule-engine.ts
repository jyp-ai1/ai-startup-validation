import type { ConfidenceRule, MissingDataItem } from '../constants/intelligence-mock';

export type ConfidenceBreakdown = {
  base: number;
  applied: { id: string; labelKey: string; gain: number }[];
  total: number;
  target: number;
};

/** Rule-based confidence — no LLM (Epic 2 Sprint 1). */
export function calculateConfidence(
  base: number,
  completedRuleIds: string[],
  rules: ConfidenceRule[],
  target = 80,
): ConfidenceBreakdown {
  const applied = rules
    .filter((r) => completedRuleIds.includes(r.id))
    .map((r) => ({ id: r.id, labelKey: r.labelKey, gain: r.gain }));

  const total = Math.min(100, base + applied.reduce((sum, r) => sum + r.gain, 0));

  return { base, applied, total, target };
}

export function missingDataGain(items: MissingDataItem[], completedIds: string[]): number {
  return items
    .filter((item) => !completedIds.includes(item.id))
    .reduce((sum, item) => sum + item.gain, 0);
}

export function projectConfidenceAfterAction(current: number, gain: number): number {
  return Math.min(100, current + gain);
}
