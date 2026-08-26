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

/**
 * Rebuild Memory from conversation sources (Core v3).
 * - Semantic interpretation per turn — NOT issue-slot dump
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

  // Preserve prior document facts only (user turns rebuilt from turns below)
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
    // Explicit non-fact intents
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

    // Prefer stored semantic key when present
    if (turn.semanticFactKey) {
      memory = upsertConfirmedFact(memory, turn.semanticFactKey, answer, 'user_turn');
      if (turn.semanticFactKey === 'customer' || turn.semanticFactKey === 'buyer') {
        // Payer-oriented customer answers also lock buyer when text signals payment
        if (turn.semanticFactKey === 'buyer' || /(결제|지불|payer)/i.test(answer)) {
          memory = upsertConfirmedFact(memory, 'buyer', answer, 'user_turn');
        }
      }
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
    });

    if (!semantic.mergeable || !semantic.factKey) continue;

    memory = upsertConfirmedFact(memory, semantic.factKey, answer, 'user_turn');
    if (semantic.factKey === 'buyer' || /(결제|지불|payer)/i.test(answer)) {
      memory = upsertConfirmedFact(memory, 'buyer', answer, 'user_turn');
    }
  }

  return memory;
}

export function factKeyForIssue(issueId: AiPmLoopIssueId): ConversationFactKey | null {
  return TURN_TO_FACT[issueId] ?? null;
}
