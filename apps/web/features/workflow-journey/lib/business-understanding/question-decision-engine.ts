/**
 * ALABOM Core Final Stabilization — Question Decision Engine.
 * current understanding → remaining gaps → criticality → last answer → validation need → next Q
 * Closed gaps never re-asked. Same-meaning identical Q banned. No fixed spine.
 */

import type { LivingClaim, LivingUnderstandingState } from './living-understanding-state';
import { whyNowForGapField } from './living-understanding-state';
import {
  selectAdaptiveNextGaps,
  listUnconfirmedCriticalGaps,
  isDiffConfirmedWithoutRelevance,
  type AdaptiveGapCandidate,
} from './adaptive-question-select';
import { resolveGapQuestionBinding } from './gap-question-map';
import { reframeQuestion, isSameMeaningQuestion } from './reframe-question';
import { factKeyForGapField } from './build-conversation-memory';
import { hasDiffRelevanceEvidence } from './understanding-contract';
import {
  memoryHasFact,
  type ConversationFactKey,
  type ConversationMemory,
} from './conversation-memory';
import type { AiPmLoopIssueId, AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** Max times the same open gap may be asked with identical meaning before forced reframe+yield. */
export const MAX_SAME_GAP_ASKS_BEFORE_YIELD = 2;

const FACT_TO_GAP: Partial<Record<string, string>> = {
  buyer: 'payer',
  customer: 'customerPersona',
  problem: 'problemJtbd',
  competitor: 'alternativesCompetitors',
  differentiation: 'differentiationVsAlternatives',
  diffRelevance: 'validationTestability',
  defensibility: 'executionConstraints',
  market: 'marketSizeEvidence',
  revenue: 'revenueModel',
  business: 'businessOneLiner',
};

/** Local answered-gap set — avoids circular import with resolve-missing-field-priority. */
function answeredTargetGaps(turns: AiPmLoopTurn[] | undefined): Set<string> {
  const answered = new Set<string>();
  if (!turns?.length) return answered;
  for (const turn of turns) {
    if (turn.superseded) continue;
    if (
      turn.intent === 'why_meta' ||
      turn.intent === 'mid_judgment' ||
      turn.intent === 'nonsense' ||
      turn.intent === 'unknown_signal'
    ) {
      continue;
    }
    const keys =
      turn.semanticFactKeys && turn.semanticFactKeys.length > 0
        ? turn.semanticFactKeys
        : turn.semanticFactKey
          ? [turn.semanticFactKey]
          : [];
    for (const key of keys) {
      const gap = FACT_TO_GAP[key];
      if (gap === 'validationTestability') {
        if (keys.includes('diffRelevance') && hasDiffRelevanceEvidence(turn.answer ?? '')) {
          answered.add(gap);
        }
        continue;
      }
      if (gap) answered.add(gap);
    }
    if (turn.targetGap?.trim() && keys.length > 0) {
      const asked = turn.targetGap.trim();
      const binding = resolveGapQuestionBinding(asked);
      if (asked === 'validationTestability') {
        if (keys.includes('diffRelevance') && hasDiffRelevanceEvidence(turn.answer ?? '')) {
          answered.add(asked);
        }
      } else if (keys.includes(binding.factKey as ConversationFactKey)) {
        answered.add(asked);
      }
    }
  }
  return answered;
}

export type QuestionDecision = {
  targetGap: string;
  issueId: AiPmLoopIssueId;
  questionText: string;
  whyNow: string;
  rationale: string;
  score: number;
  reframed: boolean;
  /** Gaps excluded because answered or sticky-failed */
  excludedGaps: string[];
};

/** Count how many prior turns asked this gap without closing it (semantic fact). */
export function countUnclosedGapAsks(
  turns: AiPmLoopTurn[] | undefined,
  targetGap: string,
): number {
  if (!turns?.length) return 0;
  const answered = answeredTargetGaps(turns);
  if (answered.has(targetGap)) return 0;

  let count = 0;
  for (const turn of turns) {
    if (turn.superseded) continue;
    if (turn.targetGap?.trim() !== targetGap) continue;
    if (
      turn.intent === 'why_meta' ||
      turn.intent === 'mid_judgment' ||
      turn.intent === 'nonsense'
    ) {
      continue;
    }
    count += 1;
  }
  return count;
}

/**
 * Gaps that must never be re-asked:
 * - semantically answered
 * - satisfied in Memory
 * - sticky-failed beyond MAX (non-critical only — critical keeps reframing)
 */
export function resolveExcludedGaps(input: {
  turns: AiPmLoopTurn[] | undefined;
  memory: ConversationMemory | null | undefined;
  living: LivingUnderstandingState;
}): Set<string> {
  const exclude = new Set<string>(answeredTargetGaps(input.turns));
  const critical = new Set(listUnconfirmedCriticalGaps(input.living));

  for (const claim of input.living.claims) {
    // P0 — solution never excluded via shared business document fact
    if (claim.fieldKey === 'solution') continue;
    const key = factKeyForGapField(claim.fieldKey);
    if (key && input.memory && memoryHasFact(input.memory, key)) {
      exclude.add(claim.fieldKey);
    }
  }

  // Sticky fail → exclude non-critical follow-ups so conversation advances
  const seenGaps = new Set<string>();
  for (const turn of input.turns ?? []) {
    const gap = turn.targetGap?.trim();
    if (!gap || seenGaps.has(gap)) continue;
    seenGaps.add(gap);
    if (exclude.has(gap)) continue;
    if (critical.has(gap as never)) continue;
    const asks = countUnclosedGapAsks(input.turns, gap);
    if (asks >= MAX_SAME_GAP_ASKS_BEFORE_YIELD) {
      exclude.add(gap);
    }
  }

  return exclude;
}

function lastAskTextForGap(
  turns: AiPmLoopTurn[] | undefined,
  targetGap: string,
): string | null {
  if (!turns?.length) return null;
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const t = turns[i]!;
    if (t.superseded) continue;
    if (t.targetGap?.trim() !== targetGap) continue;
    // causality / question text not always stored — fall back to binding later
    const fromCausality = t.causality?.unresolvedGap === targetGap ? null : null;
    void fromCausality;
    return null;
  }
  return null;
}

function lastQuestionTexts(turns: AiPmLoopTurn[] | undefined): string[] {
  const out: string[] = [];
  if (!turns) return out;
  for (let i = turns.length - 1; i >= 0 && out.length < 5; i -= 1) {
    const t = turns[i]!;
    if (t.superseded) continue;
    // Stored ask surfaces via expectedInformation or whyNow as weak proxy — prefer empty
    if (t.expectedInformation?.trim()) {
      // not the question itself
    }
  }
  return out;
}

/**
 * Decide the single next question from Living Understanding.
 * Applies adaptive ranking + same-meaning reframe + closed-gap exclusion.
 */
export function decideNextQuestion(input: {
  living: LivingUnderstandingState;
  turns?: AiPmLoopTurn[];
  memory?: ConversationMemory | null;
  previousQuestionText?: string | null;
}): QuestionDecision | null {
  const exclude = resolveExcludedGaps({
    turns: input.turns,
    memory: input.memory,
    living: input.living,
  });
  const answered = answeredTargetGaps(input.turns);

  const candidates = selectAdaptiveNextGaps(input.living, {
    excludeGaps: exclude,
    answeredFactGaps: answered,
  });

  const top: AdaptiveGapCandidate | undefined = candidates[0];
  if (!top) return null;

  const binding = resolveGapQuestionBinding(top.fieldKey, top.issueId);
  const priorAsks = countUnclosedGapAsks(input.turns, top.fieldKey);
  const prevText =
    input.previousQuestionText?.trim() ||
    lastAskTextForGap(input.turns, top.fieldKey) ||
    (priorAsks > 0 ? binding.questionText : null);

  let questionText = binding.questionText;
  let whyNow = whyNowForGapField(top.fieldKey) || binding.whyNow || top.rationale;
  let reframed = false;

  // Same gap re-ask OR identical stock → always reframe (never identical meaning)
  if (priorAsks > 0 || (prevText && isSameMeaningQuestion(prevText, binding.questionText))) {
    const reframedQ = reframeQuestion({
      targetGap: top.fieldKey,
      living: input.living,
      reason: priorAsks > 0 ? 'adaptive' : 'unknown_signal',
      previousQuestionText: prevText ?? binding.questionText,
    });
    questionText = reframedQ.questionText;
    whyNow = reframedQ.whyNow;
    reframed = true;
  }

  // Hard same-meaning ban vs previous ask surface
  if (prevText && isSameMeaningQuestion(questionText, prevText)) {
    const forced = reframeQuestion({
      targetGap: top.fieldKey,
      living: input.living,
      reason: 'adaptive',
      previousQuestionText: prevText,
    });
    questionText = forced.questionText;
    whyNow = forced.whyNow;
    reframed = true;
  }

  void lastQuestionTexts;

  // P0 vNext — last answer was differentiation → next MUST be diff customer relevance
  const lastMergeable = [...(input.turns ?? [])]
    .reverse()
    .find(
      (t) =>
        !t.superseded &&
        t.intent !== 'why_meta' &&
        t.intent !== 'mid_judgment' &&
        t.intent !== 'nonsense' &&
        t.intent !== 'unknown_signal',
    );
  if (
    lastMergeable &&
    (lastMergeable.targetGap === 'differentiationVsAlternatives' ||
      lastMergeable.semanticFactKey === 'differentiation' ||
      lastMergeable.semanticFactKeys?.includes('differentiation')) &&
    isDiffConfirmedWithoutRelevance(input.living) &&
    !exclude.has('validationTestability') &&
    !answered.has('validationTestability')
  ) {
    const binding = resolveGapQuestionBinding('validationTestability');
    return {
      targetGap: 'validationTestability',
      issueId: binding.issueId,
      questionText: binding.questionText,
      whyNow: whyNowForGapField('validationTestability') || binding.whyNow,
      rationale: '방금 확인한 차별점이 고객 문제와 어떻게 연결되는지 확인합니다.',
      score: 58_000,
      reframed: false,
      excludedGaps: [...exclude],
    };
  }

  return {
    targetGap: top.fieldKey,
    issueId: top.issueId,
    questionText,
    whyNow,
    rationale: top.rationale,
    score: top.score,
    reframed,
    excludedGaps: [...exclude],
  };
}

/** Domain sufficiency status for one claim/gap. */
export type DomainSufficiency =
  | 'sufficient'
  | 'partial'
  | 'uncertain'
  | 'conflict'
  | 'unconfirmed';

export function domainSufficiencyForClaim(
  living: LivingUnderstandingState,
  fieldKey: string,
): DomainSufficiency {
  const claim = living.claims.find((c) => c.fieldKey === fieldKey);
  if (!claim || claim.status === 'unknown' || !claim.value?.trim()) return 'unconfirmed';
  if (claim.status === 'contradiction') return 'conflict';
  if (
    claim.status === 'confirmed' &&
    (claim.provenance === 'USER_CONFIRMED' || claim.provenance === 'USER_CORRECTED')
  ) {
    return 'sufficient';
  }
  if (claim.status === 'inferred' || claim.provenance === 'AI_INFERENCE') return 'uncertain';
  if (claim.status === 'known' || claim.provenance === 'DOCUMENT') return 'partial';
  return 'uncertain';
}

/**
 * Pick ONE highest-impact unresolved item (not answer-count / bare score).
 */
export function pickHighestImpactUnresolved(
  living: LivingUnderstandingState,
): { fieldKey: string; status: DomainSufficiency; rationale: string } | null {
  const critical = listUnconfirmedCriticalGaps(living);
  if (critical.length > 0) {
    const fieldKey = critical[0]!;
    return {
      fieldKey,
      status: domainSufficiencyForClaim(living, fieldKey),
      rationale: whyNowForGapField(fieldKey),
    };
  }
  const conflict = living.claims.find((c) => c.status === 'contradiction');
  if (conflict) {
    return {
      fieldKey: conflict.fieldKey,
      status: 'conflict',
      rationale: `모순 해소: ${conflict.fieldKey}`,
    };
  }
  const top = living.gaps[0];
  if (!top) return null;
  return {
    fieldKey: top.fieldKey,
    status: domainSufficiencyForClaim(living, top.fieldKey),
    rationale: top.rationale,
  };
}
