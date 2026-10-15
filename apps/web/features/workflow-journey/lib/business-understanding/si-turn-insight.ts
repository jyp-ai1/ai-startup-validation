/**
 * PR #197 Phase 1 — in-app S.I. insight for next-action ranking.
 * Consumes an already-built SiAiPmQuestion. Does not call @repo/agents
 * and does not re-run analyzeStrategicIntelligence.
 */

import type {
  SiAiPmQuestion,
  SiValidationKind,
} from '@repo/types/domain/strategic-intelligence';

export type SiTurnInsight = {
  kind?: SiValidationKind | null;
  evidenceSought?: string | null;
  whyAsking?: string | null;
  judgmentChanged?: boolean;
  criticalUnknownChanged?: boolean;
  preferredGapIds: string[];
};

const KIND_TO_GAPS: Record<SiValidationKind, string[]> = {
  payer_job: ['payer'],
  payer_split: ['payer', 'customerPersona'],
  segment_proof: ['customerPersona', 'validationTestability'],
  customer_problem: ['customerPersona', 'problemJtbd'],
  paid_conversion: ['validationTestability', 'payer'],
  repeat_loop: ['validationTestability', 'alternativesCompetitors'],
  generic: [],
};

export function preferredGapsFromSiKind(
  kind: SiValidationKind | null | undefined,
): string[] {
  if (!kind) return [];
  return KIND_TO_GAPS[kind] ?? [];
}

/** Map a stored S.I. ask onto ranking input. No analyzer call. */
export function siTurnInsightFromQuestion(
  question: SiAiPmQuestion | null | undefined,
  delta?: {
    judgmentChanged?: boolean;
    criticalUnknownChanged?: boolean;
  },
): SiTurnInsight | null {
  if (!question) return null;
  return {
    kind: question.kind,
    evidenceSought: question.evidenceSought ?? null,
    whyAsking: question.whyAsking ?? null,
    judgmentChanged: delta?.judgmentChanged,
    criticalUnknownChanged: delta?.criticalUnknownChanged,
    preferredGapIds: preferredGapsFromSiKind(question.kind),
  };
}

export function siInsightPrefersGap(
  insight: SiTurnInsight | null | undefined,
  gapId: string,
): boolean {
  return Boolean(insight?.preferredGapIds.includes(gapId));
}
