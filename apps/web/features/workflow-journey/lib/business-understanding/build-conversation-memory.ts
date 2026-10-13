import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import {
  emptyConversationMemory,
  getConflictFact,
  getFact,
  parkUnresolvedContradiction,
  upsertConfirmedFact,
  type ConversationFactKey,
  type ConversationMemory,
} from './conversation-memory';
import {
  isWorkspaceDocumentReadable,
  looksLikeDocumentFileName,
} from './workspace-document-eligibility';
import { interpretAnswerSemantics } from './interpret-answer-semantics';
import {
  extractCorrectedFactValue,
  isCustomerCorrectionWithoutPayerEvidence,
  isMisroutedCustomerDescription,
  parseNotXButYCorrection,
  scrubRejectedCustomerMention,
  type ParsedNotXButY,
} from './ai-pm-correction-semantics';
import { inferAskedTargetGapFromTurn } from './resolve-asked-target-gap';
import type { AiPmLoopIssueId, AiPmLoopTurn } from './workspace-ai-pm-loop-types';

const TURN_TO_FACT: Partial<Record<AiPmLoopIssueId, ConversationFactKey>> = {
  customer_definition: 'customer',
  problem_definition: 'problem',
  bm_design: 'revenue',
  market_validation: 'market',
  competitor_analysis: 'competitor',
};

function truncate(value: string, max = 80): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1).trim()}…`;
}

function safeBusinessFromEntities(entities: LaunchLensDomainContext | null): string | null {
  const candidates = [
    entities?.business.name,
    entities?.product.value,
    entities?.business.value,
  ];
  for (const candidate of candidates) {
    const trimmed = candidate?.trim() ?? '';
    if (trimmed.length < 2) continue;
    if (looksLikeDocumentFileName(trimmed)) continue;
    return truncate(trimmed, 64);
  }
  return null;
}

/** Solution answers populate solution claim via turn.targetGap — must NOT overwrite business one-liner. */
function filterMemoryFactKeys(
  keys: ConversationFactKey[],
  targetGap?: string | null,
): ConversationFactKey[] {
  if (targetGap !== 'solution') return keys;
  return keys.filter((key) => key !== 'business');
}

function applyCustomerCorrectionRevision(
  memory: ConversationMemory,
  answer: string,
): ConversationMemory {
  const revision = parseNotXButYCorrection(answer);
  if (!revision) return memory;

  let next = memory;
  for (const key of ['problem', 'business'] as ConversationFactKey[]) {
    const fact = next.facts.find(
      (f) => f.key === key && (f.lifecycle ?? 'current') === 'current',
    );
    if (!fact?.value.includes(revision.rejected)) continue;

    if (key === 'problem' && isMisroutedCustomerDescription(fact.value)) {
      const cleaned = scrubRejectedCustomerMention(fact.value, revision);
      if (cleaned.length >= 2) {
        next = upsertConfirmedFact(next, key, cleaned, 'user_turn');
      }
      continue;
    }

    const cleaned = scrubRejectedCustomerMention(fact.value, revision);
    if (cleaned.length >= 2 && cleaned !== fact.value) {
      next = upsertConfirmedFact(next, key, cleaned, 'user_turn');
    }
  }
  return next;
}

function upsertSemanticFacts(
  memory: ConversationMemory,
  answer: string,
  keys: ConversationFactKey[],
  targetGap?: string | null,
  intent?: AiPmLoopTurn['intent'],
): ConversationMemory {
  let next = memory;
  const unique = filterMemoryFactKeys([...new Set(keys)], targetGap);
  for (const key of unique) {
    if (key === 'buyer' && isCustomerCorrectionWithoutPayerEvidence(answer)) {
      continue;
    }
    const value =
      intent === 'correction' ? extractCorrectedFactValue(key, answer) : answer;
    if (!value || value.trim().length < 2) continue;
    next = upsertConfirmedFact(next, key, value, 'user_turn');
  }
  if (intent === 'correction' && unique.includes('customer')) {
    next = applyCustomerCorrectionRevision(next, answer);
  }
  // Payer-oriented answers also lock buyer when payment cue present.
  // Customer-correction leftovers must not become the current 구매자.
  if (
    !isCustomerCorrectionWithoutPayerEvidence(answer) &&
    (unique.includes('buyer') ||
      (unique.includes('customer') && /(결제|지불|payer)/i.test(answer)))
  ) {
    next = upsertConfirmedFact(next, 'buyer', answer, 'user_turn');
  }
  return next;
}

/**
 * Rebuild Memory from conversation sources (Core v4).
 * - Semantic interpretation per turn — NOT issue-slot dump
 * - Multi-fact keys from one utterance
 * - Why / mid-judgment / nonsense never become Facts
 * - Superseded turns skipped
 */
function latestCustomerGapCompleteness(
  turns: AiPmLoopTurn[],
  gapState?: GapKnowledgeState | null,
): string | null {
  if (gapState?.gaps.customerPersona?.completeness) {
    return gapState.gaps.customerPersona.completeness;
  }
  for (const turn of [...turns].reverse()) {
    const completeness = turn.review?.gapVerdicts?.customerPersona?.completeness;
    if (completeness) return completeness;
  }
  return null;
}

function valuesOverlap(left: string, right: string): boolean {
  if (left.length < 2 || right.length < 2) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function applyOpenCustomerContradiction(
  memory: ConversationMemory,
  turns: AiPmLoopTurn[],
): ConversationMemory {
  if (getConflictFact(memory, 'customer') && !getFact(memory, 'customer')) {
    return memory;
  }
  const correctionTurn = [...turns]
    .reverse()
    .find(
      (turn) =>
        !turn.superseded &&
        (turn.review?.gapVerdicts?.customerPersona?.completeness === 'CONTRADICTED' ||
          turn.intent === 'correction'),
    );
  const parsed = correctionTurn ? parseNotXButYCorrection(correctionTurn.answer) : null;
  const incoming = parsed?.accepted.trim() || correctionTurn?.answer.trim() || '';
  const priorFact = memory.facts.find((fact) => {
    if (fact.key !== 'customer') return false;
    const value = fact.value.trim();
    if (value.length < 2) return false;
    return !valuesOverlap(value, incoming);
  });
  const prior = priorFact?.value.trim() ?? '';
  if (prior.length < 2 && incoming.length < 2) return memory;
  return parkUnresolvedContradiction(memory, 'customer', prior || incoming, incoming || prior);
}

export function buildConversationMemoryFromSources(input: {
  projectId: string;
  documentText: string;
  turns: AiPmLoopTurn[];
  entities?: LaunchLensDomainContext | null;
  previous?: ConversationMemory | null;
  gapState?: GapKnowledgeState | null;
}): ConversationMemory {
  let memory = emptyConversationMemory(input.projectId);

  if (input.previous?.facts.length) {
    for (const fact of input.previous.facts) {
      if (fact.source !== 'document') continue;
      if ((fact.lifecycle ?? 'current') !== 'current') continue;
      memory = upsertConfirmedFact(memory, fact.key, fact.value, 'document');
    }
  }

  const readable = isWorkspaceDocumentReadable(input.documentText);
  if (readable) {
    const business = safeBusinessFromEntities(input.entities ?? null);
    if (business) {
      memory = upsertConfirmedFact(memory, 'business', business, 'document');
    }
  }

  for (const turn of input.turns) {
    if (turn.superseded) continue;
    if (
      turn.intent === 'why_meta' ||
      turn.intent === 'mid_judgment' ||
      turn.intent === 'nonsense' ||
      turn.intent === 'unknown_signal'
    ) {
      continue;
    }

    const answer = turn.answer.trim();
    if (answer.length < 2) continue;

    // Prefer stored semantic keys when present (multi-fact + primary)
    const storedKeys =
      turn.semanticFactKeys && turn.semanticFactKeys.length > 0
        ? turn.semanticFactKeys
        : turn.semanticFactKey
          ? [turn.semanticFactKey]
          : null;

    if (storedKeys) {
      memory = upsertSemanticFacts(memory, answer, storedKeys, turn.targetGap, turn.intent);
      continue;
    }

    const existingFactsByKey: Partial<Record<ConversationFactKey, string | null>> = {};
    for (const key of Object.keys(TURN_TO_FACT) as AiPmLoopIssueId[]) {
      const fk = TURN_TO_FACT[key];
      if (fk) {
        existingFactsByKey[fk] =
          memory.facts.find((f) => f.key === fk && (f.lifecycle ?? 'current') === 'current')
            ?.value ?? null;
      }
    }

    const semantic = interpretAnswerSemantics({
      answer,
      askedIssueId: turn.issueId,
      existingFactsByKey,
      askedTargetGap: inferAskedTargetGapFromTurn(turn),
    });

    if (!semantic.mergeable || !semantic.factKey) continue;

    const keys =
      semantic.facts.length > 0
        ? semantic.facts.map((f) => f.key)
        : [semantic.factKey];
    memory = upsertSemanticFacts(memory, answer, keys, turn.targetGap, turn.intent);
  }

  if (latestCustomerGapCompleteness(input.turns, input.gapState) === 'CONTRADICTED') {
    memory = applyOpenCustomerContradiction(memory, input.turns);
  }

  return memory;
}

export function factKeyForIssue(issueId: AiPmLoopIssueId): ConversationFactKey | null {
  return TURN_TO_FACT[issueId] ?? null;
}

/** Gap fieldKey → memory fact that satisfies that gap (Core v4 re-ask gate). */
export function factKeyForGapField(fieldKey: string): ConversationFactKey | null {
  switch (fieldKey) {
    case 'payer':
      return 'buyer';
    case 'customerPersona':
      return 'customer';
    case 'problemJtbd':
    case 'problemFrequencySeverity':
      return 'problem';
    case 'alternativesCompetitors':
      return 'competitor';
    case 'differentiationVsAlternatives':
    case 'differentiationHypothesis':
      return 'differentiation';
    case 'validationTestability':
      return 'diffRelevance';
    case 'executionConstraints':
      return 'defensibility';
    case 'marketChannel':
    case 'marketSizeEvidence':
      return 'market';
    case 'revenueModel':
    case 'pricingHint':
      return 'revenue';
    case 'businessOneLiner':
    case 'categoryScope':
      return 'business';
    case 'solution':
      // Solution claim is resolved from turns — not business memory
      return null;
    default:
      return null;
  }
}
