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
 * Rebuild Memory from conversation sources.
 * - User loop answers → confirmed facts (always)
 * - Readable document business label → confirmed (explicit extract only)
 * Assumed inferences stay OUT of Memory (Presenter Confidence layer).
 */
export function buildConversationMemoryFromSources(input: {
  projectId: string;
  documentText: string;
  turns: AiPmLoopTurn[];
  entities?: LaunchLensDomainContext | null;
  previous?: ConversationMemory | null;
}): ConversationMemory {
  let memory = emptyConversationMemory(input.projectId);

  // Preserve prior confirmed facts unless overwritten below
  if (input.previous?.facts.length) {
    for (const fact of input.previous.facts) {
      memory = upsertConfirmedFact(memory, fact.key, fact.value, fact.source);
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
    const key = TURN_TO_FACT[turn.issueId];
    if (!key) continue;
    const answer = turn.answer.trim();
    if (answer.length < 2) continue;
    memory = upsertConfirmedFact(memory, key, answer, 'user_turn');
    // S14 — customer_definition answers also lock buyer (payer) Fact
    if (turn.issueId === 'customer_definition') {
      memory = upsertConfirmedFact(memory, 'buyer', answer, 'user_turn');
    }
  }

  return memory;
}

export function factKeyForIssue(issueId: AiPmLoopIssueId): ConversationFactKey | null {
  return TURN_TO_FACT[issueId] ?? null;
}
