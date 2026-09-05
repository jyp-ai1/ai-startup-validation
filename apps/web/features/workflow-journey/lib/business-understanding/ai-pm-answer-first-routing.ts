/**
 * DAY 8-D Phase B — Answer-first semantic routing.
 * CEO utterance meaning beats current question slot; no per-domain hardcode patches.
 */

import type { ConversationFactKey } from './conversation-memory';
import { resolveGapQuestionBinding } from './gap-question-map';
import type { SemanticFactHit, SemanticInterpretation } from './interpret-answer-semantics';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';
import { isAiPmAnswerFirstRoutingV1Active } from './ai-pm-answer-first-routing-policy-v1';

export type AnswerSlotConflict = {
  askedGap: string;
  expectedFactKey: ConversationFactKey;
  resolvedFactKey: ConversationFactKey;
  resolvedIssueId: AiPmLoopIssueId;
  topRouteScore: number;
  rationale: string;
};

const STRONG_SIGNAL_THRESHOLD = 9;
const WEAK_SIGNAL_THRESHOLD = 7;

/** Gap field → fact the slot expects when answer is on-topic. */
export function gapExpectedFactKey(askedGap: string | null | undefined): ConversationFactKey | null {
  const gap = askedGap?.trim();
  if (!gap) return null;
  return resolveGapQuestionBinding(gap).factKey;
}

/** Fact key → gap field for review / memory routing. */
const FACT_KEY_TO_GAP: Partial<Record<ConversationFactKey, string>> = {
  buyer: 'payer',
  customer: 'customerPersona',
  problem: 'problemJtbd',
  business: 'solution',
  revenue: 'revenueModel',
  market: 'marketChannel',
  competitor: 'alternativesCompetitors',
  differentiation: 'differentiationVsAlternatives',
  diffRelevance: 'validationTestability',
  defensibility: 'executionConstraints',
};

export function gapForSemanticFactKey(key: ConversationFactKey): string | undefined {
  return FACT_KEY_TO_GAP[key];
}

/**
 * Detect when answer semantics point to a different domain than the asked gap.
 * Returns null when on-slot or when no reliable semantic signal exists.
 */
export function detectAnswerSlotConflict(input: {
  askedGap: string | null | undefined;
  primaryFactKey: ConversationFactKey | null;
  facts: SemanticFactHit[];
  topRouteScore: number;
  isCorrection?: boolean;
  isCustomerFieldCorrection?: boolean;
}): AnswerSlotConflict | null {
  if (!isAiPmAnswerFirstRoutingV1Active()) return null;

  const askedGap = input.askedGap?.trim() ?? '';
  if (!askedGap || !input.primaryFactKey) return null;

  // CORRECT on customer field — correction path owns routing
  if (input.isCorrection && input.isCustomerFieldCorrection) return null;

  const expectedFactKey = gapExpectedFactKey(askedGap);
  if (!expectedFactKey) return null;

  const resolvedFactKey = input.primaryFactKey;
  if (resolvedFactKey === expectedFactKey) return null;

  const offSlotFacts = input.facts.filter((f) => f.key !== expectedFactKey);
  const hasOffSlotFact = offSlotFacts.some((f) => f.key === resolvedFactKey);
  const strongSignal =
    input.topRouteScore >= STRONG_SIGNAL_THRESHOLD ||
    (hasOffSlotFact && input.topRouteScore >= WEAK_SIGNAL_THRESHOLD);

  if (!strongSignal) return null;

  const resolvedIssueId =
    offSlotFacts.find((f) => f.key === resolvedFactKey)?.issueId ??
    input.facts.find((f) => f.key === resolvedFactKey)?.issueId ??
    null;
  if (!resolvedIssueId) return null;

  return {
    askedGap,
    expectedFactKey,
    resolvedFactKey,
    resolvedIssueId,
    topRouteScore: input.topRouteScore,
    rationale: `Answer-first: ${resolvedFactKey} signal (≥${input.topRouteScore}) beats asked slot ${askedGap} (${expectedFactKey})`,
  };
}

/** True when asked-gap force-fill must be skipped for this utterance. */
export function shouldSkipAskedGapForceFill(input: {
  askedGap: string | null | undefined;
  primaryFactKey: ConversationFactKey | null;
  facts: SemanticFactHit[];
  topRouteScore: number;
  isCorrection?: boolean;
  isCustomerFieldCorrection?: boolean;
}): boolean {
  return detectAnswerSlotConflict(input) !== null;
}

/**
 * Preserve multi-fact hits while ensuring primary semantic winner is first.
 * Does not inject asked-slot fact when conflict detected.
 */
export function finalizeAnswerFirstFacts(input: {
  conflict: AnswerSlotConflict | null;
  facts: SemanticFactHit[];
  primaryFactKey: ConversationFactKey;
  resolvedIssueId: AiPmLoopIssueId;
}): SemanticFactHit[] {
  const { conflict, facts, primaryFactKey, resolvedIssueId } = input;
  let next = [...facts];

  if (conflict) {
    next = next.filter((f) => f.key !== conflict.expectedFactKey);
  }

  if (!next.some((f) => f.key === primaryFactKey)) {
    next = [{ key: primaryFactKey, issueId: resolvedIssueId }, ...next];
  }

  return next;
}

/** Apply answer-first routing adjustments to a semantic interpretation. */
export function applyAnswerFirstRouting(input: {
  askedGap: string | null | undefined;
  answer: string;
  semantic: SemanticInterpretation;
  topRouteScore: number;
  isCorrection?: boolean;
  isCustomerFieldCorrection?: boolean;
}): SemanticInterpretation & { slotConflict: AnswerSlotConflict | null } {
  const conflict = detectAnswerSlotConflict({
    askedGap: input.askedGap,
    primaryFactKey: input.semantic.factKey,
    facts: input.semantic.facts,
    topRouteScore: input.topRouteScore,
    isCorrection: input.isCorrection,
    isCustomerFieldCorrection: input.isCustomerFieldCorrection,
  });

  if (!conflict || !input.semantic.factKey || !input.semantic.resolvedIssueId) {
    return { ...input.semantic, slotConflict: null };
  }

  const facts = finalizeAnswerFirstFacts({
    conflict,
    facts: input.semantic.facts,
    primaryFactKey: input.semantic.factKey,
    resolvedIssueId: input.semantic.resolvedIssueId,
  });

  return {
    ...input.semantic,
    facts,
    slotConflict: conflict,
    rationale: `${input.semantic.rationale}; ${conflict.rationale}`,
  };
}

/** Review layer — asked gap stays OPEN when CEO answered a different semantic domain. */
export function isAskedGapOpenDueToSlotConflict(
  askedGapId: string,
  semantic: SemanticInterpretation & { slotConflict?: AnswerSlotConflict | null },
): boolean {
  if (!isAiPmAnswerFirstRoutingV1Active()) return false;
  const conflict = semantic.slotConflict;
  if (!conflict) return false;
  return conflict.askedGap === askedGapId;
}
