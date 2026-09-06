/**
 * DAY 8-F F-1 — Answer Target Binding.
 * Latest answer meaning > memory artifacts for confirm/ask value resolution.
 * Does not mutate V3 gapState SoT or ConversationFactKey schema.
 */

import { gapForSemanticFactKey } from './ai-pm-answer-first-routing';
import { isAiPmAnswerTargetBindingV1Active } from './ai-pm-answer-target-binding-policy-v1';
import type { SemanticKnowledgeHit } from './ai-pm-no-ask-policy';
import { isUserConfirmedClaim } from './adaptive-question-select';
import { factKeyForGapField } from './build-conversation-memory';
import {
  getFact,
  memoryHasFact,
  type ConversationFactKey,
  type ConversationMemory,
} from './conversation-memory';
import { resolveGapQuestionBinding } from './gap-question-map';
import { interpretAnswerSemantics } from './interpret-answer-semantics';
import type { LivingUnderstandingState } from './living-understanding-state';
import { SHARED_UNDERSTANDING_PENDING } from './build-shared-understanding';
import { isConfirmPollutionValue } from './ai-pm-question-presentation';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';
import { hasCustomerPersonaCue, hasPersonaSegmentCue } from './persona-answer-cues';

const SPINE_FACT: Partial<Record<ConversationFactKey, keyof LivingUnderstandingState['spine']>> = {
  business: 'business',
  customer: 'customer',
  problem: 'problem',
};

const DOCUMENT_MEMORY_ALLOWED_GAPS = new Set(['businessOneLiner', 'categoryScope']);

function clipValue(value: string, max = 48): string {
  const t = value.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

function isPendingSpine(value: string | null | undefined): boolean {
  const t = value?.trim() ?? '';
  return !t || t === SHARED_UNDERSTANDING_PENDING || t.includes('아직 확인');
}

function claimForGap(living: LivingUnderstandingState, gapId: string) {
  return living.claims.find((c) => c.fieldKey === gapId);
}

function turnMapsToGap(turn: AiPmLoopTurn, gapId: string): boolean {
  if (turn.targetGap?.trim() === gapId) return true;

  const answer = turn.answer?.trim() ?? '';
  if (answer.length < 2) return false;

  const storedKeys =
    turn.semanticFactKeys && turn.semanticFactKeys.length > 0
      ? turn.semanticFactKeys
      : turn.semanticFactKey
        ? [turn.semanticFactKey]
        : [];

  let keys = storedKeys as ConversationFactKey[];
  if (keys.length === 0) {
    const interpreted = interpretAnswerSemantics({
      answer,
      askedIssueId: turn.issueId,
      askedTargetGap: turn.targetGap,
    });
    if (interpreted.mergeable && interpreted.facts.length > 0) {
      keys = interpreted.facts.map((f) => f.key);
    } else if (interpreted.factKey) {
      keys = [interpreted.factKey];
    }
  }

  for (const key of keys) {
    if (gapForSemanticFactKey(key) === gapId) return true;
  }

  if (gapId === 'solution' && turn.targetGap === 'solution') return true;

  if (gapId === 'customerPersona' && (hasCustomerPersonaCue(answer) || hasPersonaSegmentCue(answer))) {
    return true;
  }

  return false;
}

/** Latest non-polluted turn whose meaning binds to this gap. */
function findLatestTurnKnowledge(
  gapId: string,
  turns: AiPmLoopTurn[],
): SemanticKnowledgeHit | null {
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const turn = turns[i]!;
    if (turn.superseded) continue;
    const answer = turn.answer?.trim() ?? '';
    if (answer.length < 4 || isConfirmPollutionValue(answer)) continue;
    if (!turnMapsToGap(turn, gapId)) continue;

    const binding = resolveGapQuestionBinding(gapId);
    return {
      gapId,
      factKey: binding.factKey,
      value: clipValue(answer),
      source: 'prior_turn',
      userConfirmed: true,
    };
  }
  return null;
}

/**
 * Resolve knowledge for a gap with latest-answer-first priority.
 * memory_document never wins over a recent CEO turn for non-document gaps.
 */
export function resolveAnswerTargetKnowledgeForGap(input: {
  gapId: string;
  living: LivingUnderstandingState;
  memory: ConversationMemory | null;
  turns: AiPmLoopTurn[];
}): SemanticKnowledgeHit | null {
  if (!isAiPmAnswerTargetBindingV1Active()) return null;

  const gapId = input.gapId.trim();
  if (!gapId) return null;

  const binding = resolveGapQuestionBinding(gapId);
  const factKey = binding.factKey;
  const memoryFactKey = factKeyForGapField(gapId);

  // Payer — inference alone never satisfies (unchanged)
  if (factKey === 'buyer') {
    const claim = claimForGap(input.living, gapId);
    if (isUserConfirmedClaim(claim) && claim?.value?.trim() && !isConfirmPollutionValue(claim.value)) {
      return {
        gapId,
        factKey,
        value: clipValue(claim.value),
        source: 'claim',
        userConfirmed: true,
      };
    }
    const mem = input.memory ? getFact(input.memory, 'buyer') : null;
    if (mem?.source === 'user_turn' && mem.value.trim()) {
      return {
        gapId,
        factKey,
        value: clipValue(mem.value),
        source: 'memory_user',
        userConfirmed: true,
      };
    }
    return null;
  }

  // 1 — Latest turn meaning (highest priority)
  const latestTurn = findLatestTurnKnowledge(gapId, input.turns);
  if (latestTurn) return latestTurn;

  // 2 — Living claim (user-confirmed, same gap field)
  const claim = claimForGap(input.living, gapId);
  if (
    claim?.value?.trim() &&
    !isConfirmPollutionValue(claim.value) &&
    claim.status !== 'unknown' &&
    (claim.provenance === 'USER_CONFIRMED' || claim.provenance === 'USER_CORRECTED')
  ) {
    return {
      gapId,
      factKey,
      value: clipValue(claim.value),
      source: 'claim',
      userConfirmed: true,
    };
  }

  // 3 — memory user_turn only (never document for solution / value gaps)
  if (input.memory && memoryFactKey && memoryHasFact(input.memory, memoryFactKey)) {
    const mem = getFact(input.memory, memoryFactKey)!;
    if (mem.source === 'user_turn' && mem.value.trim() && !isConfirmPollutionValue(mem.value)) {
      return {
        gapId,
        factKey: memoryFactKey,
        value: clipValue(mem.value),
        source: 'memory_user',
        userConfirmed: true,
      };
    }
  }

  // 4 — spine (non-pending) — solution gap uses turn/claim only, not business spine
  const spineKey = gapId === 'solution' ? undefined : SPINE_FACT[factKey];
  if (spineKey) {
    const spineVal = input.living.spine[spineKey];
    if (!isPendingSpine(spineVal) && !isConfirmPollutionValue(spineVal)) {
      return {
        gapId,
        factKey,
        value: clipValue(spineVal),
        source: 'spine',
        userConfirmed: false,
      };
    }
  }

  // 5 — document memory ONLY for explicit document gaps when no user turn knowledge
  if (
    DOCUMENT_MEMORY_ALLOWED_GAPS.has(gapId) &&
    input.memory &&
    memoryFactKey &&
    memoryHasFact(input.memory, memoryFactKey)
  ) {
    const mem = getFact(input.memory, memoryFactKey)!;
    if (mem.source === 'document' && mem.value.trim() && !isConfirmPollutionValue(mem.value)) {
      return {
        gapId,
        factKey: memoryFactKey,
        value: clipValue(mem.value),
        source: 'memory_document',
        userConfirmed: false,
      };
    }
  }

  return null;
}
