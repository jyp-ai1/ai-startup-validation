/**
 * S9 ADR-053 — Conversation Memory stores Facts only.
 * Core v3 — current vs superseded; conflict never silently kept as dual current.
 */
export type ConversationFactKey =
  | 'business'
  | 'customer'
  | 'problem'
  | 'buyer'
  | 'revenue'
  | 'market'
  | 'competitor';

export type ConversationFactLifecycle = 'current' | 'superseded' | 'conflict';

/** Facts in Memory are always confirmed knowledge (when lifecycle=current). */
export type ConversationFact = {
  key: ConversationFactKey;
  value: string;
  /** How the fact was locked into Memory */
  source: 'document' | 'user_turn';
  confirmedAt: string;
  /** v3 — only one current per key; superseded kept for audit */
  lifecycle: ConversationFactLifecycle;
  /** When conflict: the opposing value awaiting founder choice */
  conflictWith?: string | null;
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

function normalizeLifecycle(fact: ConversationFact): ConversationFact {
  return {
    ...fact,
    lifecycle: fact.lifecycle ?? 'current',
  };
}

/** Current (non-superseded, non-conflict) fact for key. */
export function getFact(
  memory: ConversationMemory,
  key: ConversationFactKey,
): ConversationFact | null {
  const hit =
    memory.facts
      .map(normalizeLifecycle)
      .find((fact) => fact.key === key && fact.lifecycle === 'current') ?? null;
  return hit;
}

export function getConflictFact(
  memory: ConversationMemory,
  key: ConversationFactKey,
): ConversationFact | null {
  return (
    memory.facts
      .map(normalizeLifecycle)
      .find((fact) => fact.key === key && fact.lifecycle === 'conflict') ?? null
  );
}

function trimValue(value: string): string {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (trimmed.length <= 120) return trimmed;
  return `${trimmed.slice(0, 119).trim()}…`;
}

/** Upsert current fact — prior current becomes superseded (not deleted). */
export function upsertConfirmedFact(
  memory: ConversationMemory,
  key: ConversationFactKey,
  value: string,
  source: ConversationFact['source'],
): ConversationMemory {
  const trimmed = trimValue(value);
  if (trimmed.length < 2) return memory;

  const now = new Date().toISOString();
  const next: ConversationFact = {
    key,
    value: trimmed,
    source,
    confirmedAt: now,
    lifecycle: 'current',
  };

  const normalized = memory.facts.map(normalizeLifecycle);
  const superseded = normalized
    .filter((fact) => fact.key === key && fact.lifecycle === 'current')
    .map((fact) => ({ ...fact, lifecycle: 'superseded' as const }));
  const kept = normalized.filter(
    (fact) =>
      !(fact.key === key && (fact.lifecycle === 'current' || fact.lifecycle === 'conflict')),
  );

  return {
    ...memory,
    facts: [...kept, ...superseded, next],
    updatedAt: now,
  };
}

/** Park contradiction — do not silently pick. No dual current. */
export function parkConflictFact(
  memory: ConversationMemory,
  key: ConversationFactKey,
  priorValue: string,
  newValue: string,
): ConversationMemory {
  const now = new Date().toISOString();
  const normalized = memory.facts.map(normalizeLifecycle);
  const withoutCurrentConflict = normalized.filter(
    (fact) =>
      !(fact.key === key && (fact.lifecycle === 'current' || fact.lifecycle === 'conflict')),
  );
  // Keep prior as current until founder resolves; mark conflict sidecar
  const priorCurrent: ConversationFact = {
    key,
    value: trimValue(priorValue),
    source: 'user_turn',
    confirmedAt: now,
    lifecycle: 'current',
  };
  const conflict: ConversationFact = {
    key,
    value: trimValue(newValue),
    source: 'user_turn',
    confirmedAt: now,
    lifecycle: 'conflict',
    conflictWith: trimValue(priorValue),
  };
  return {
    ...memory,
    facts: [...withoutCurrentConflict, priorCurrent, conflict],
    updatedAt: now,
  };
}

/** Resolve conflict: accept new (supersede prior) or keep prior (drop conflict). */
export function resolveConflictFact(
  memory: ConversationMemory,
  key: ConversationFactKey,
  choice: 'keep_prior' | 'accept_new',
  priorValue: string,
  newValue: string,
): ConversationMemory {
  if (choice === 'keep_prior') {
    const normalized = memory.facts.map(normalizeLifecycle);
    return {
      ...memory,
      facts: normalized.filter((f) => !(f.key === key && f.lifecycle === 'conflict')),
      updatedAt: new Date().toISOString(),
    };
  }
  return upsertConfirmedFact(memory, key, newValue, 'user_turn');
}

export function memoryHasFact(memory: ConversationMemory, key: ConversationFactKey): boolean {
  return Boolean(getFact(memory, key)?.value.trim());
}

export function memoryHasOpenConflict(memory: ConversationMemory): boolean {
  return memory.facts.map(normalizeLifecycle).some((f) => f.lifecycle === 'conflict');
}

/** Clear current (+ conflict) for keys after prior-answer edit invalidation. */
export function clearFactsByKeys(
  memory: ConversationMemory,
  keys: ConversationFactKey[],
): ConversationMemory {
  const keySet = new Set(keys);
  const now = new Date().toISOString();
  const normalized = memory.facts.map(normalizeLifecycle);
  const next = normalized.map((fact) => {
    if (!keySet.has(fact.key)) return fact;
    if (fact.lifecycle === 'current' || fact.lifecycle === 'conflict') {
      return { ...fact, lifecycle: 'superseded' as const };
    }
    return fact;
  });
  return { ...memory, facts: next, updatedAt: now };
}
