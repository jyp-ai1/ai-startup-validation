import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  emptyConversationMemory,
  upsertConfirmedFact,
  type ConversationFactKey,
  type ConversationMemory,
} from './conversation-memory';
import {
  isWorkspaceDocumentReadable,
  looksLikeDocumentFileName,
} from './workspace-document-eligibility';
import { interpretAnswerSemantics } from './interpret-answer-semantics';
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

function upsertSemanticFacts(
  memory: ConversationMemory,
  answer: string,
  keys: ConversationFactKey[],
  targetGap?: string | null,
): ConversationMemory {
  let next = memory;
  const unique = filterMemoryFactKeys([...new Set(keys)], targetGap);
  for (const key of unique) {
    next = upsertConfirmedFact(next, key, answer, 'user_turn');
  }
  // Payer-oriented answers also lock buyer when payment cue present
  if (
    unique.includes('buyer') ||
    (unique.includes('customer') && /(결제|지불|payer)/i.test(answer))
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
export function buildConversationMemoryFromSources(input: {
  projectId: string;
  documentText: string;
  turns: AiPmLoopTurn[];
  entities?: LaunchLensDomainContext | null;
  previous?: ConversationMemory | null;
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
      memory = upsertSemanticFacts(memory, answer, storedKeys, turn.targetGap);
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
    memory = upsertSemanticFacts(memory, answer, keys, turn.targetGap);
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
