/**
 * S9 ADR-053 — Conversation Memory stores Facts only.
 * Not chat history. Not Assumed / Decision / Question.
 */
export type ConversationFactKey =
  | 'business'
  | 'customer'
  | 'problem'
  | 'buyer'
  | 'revenue'
  | 'market'
  | 'competitor';

/** Facts in Memory are always confirmed knowledge. */
export type ConversationFact = {
  key: ConversationFactKey;
  value: string;
  /** How the fact was locked into Memory */
  source: 'document' | 'user_turn';
  confirmedAt: string;
};

export type ConversationMemory = {
  version: 1;
  projectId: string;
  facts: ConversationFact[];
  updatedAt: string;
};

export const CONVERSATION_FACT_KEYS: ConversationFactKey[] = [
  'business',
  'customer',
  'problem',
  'buyer',
  'revenue',
  'market',
  'competitor',
];

export function emptyConversationMemory(projectId: string): ConversationMemory {
  return {
    version: 1,
    projectId,
    facts: [],
    updatedAt: new Date().toISOString(),
  };
}

export function getFact(
  memory: ConversationMemory,
  key: ConversationFactKey,
): ConversationFact | null {
  return memory.facts.find((fact) => fact.key === key) ?? null;
}

export function upsertConfirmedFact(
  memory: ConversationMemory,
  key: ConversationFactKey,
  value: string,
  source: ConversationFact['source'],
): ConversationMemory {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length < 2) return memory;

  const next: ConversationFact = {
    key,
    value: trimmed.length > 120 ? `${trimmed.slice(0, 119).trim()}…` : trimmed,
    source,
    confirmedAt: new Date().toISOString(),
  };

  const without = memory.facts.filter((fact) => fact.key !== key);
  return {
    ...memory,
    facts: [...without, next],
    updatedAt: next.confirmedAt,
  };
}

export function memoryHasFact(memory: ConversationMemory, key: ConversationFactKey): boolean {
  return Boolean(getFact(memory, key)?.value.trim());
}
