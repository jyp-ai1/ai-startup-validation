import {
  emptyConversationMemory,
  type ConversationMemory,
} from './conversation-memory';

const MEMORY_KEY = 'launchlens.conversationMemory';

function memoryKey(projectId?: string): string {
  return projectId ? `${MEMORY_KEY}.${projectId}` : MEMORY_KEY;
}

export function loadConversationMemory(projectId?: string): ConversationMemory {
  const id = projectId ?? 'default';
  if (typeof window === 'undefined') return emptyConversationMemory(id);
  try {
    const raw = sessionStorage.getItem(memoryKey(projectId));
    if (!raw) return emptyConversationMemory(id);
    const parsed = JSON.parse(raw) as ConversationMemory;
    if (parsed.version !== 1 || !Array.isArray(parsed.facts)) {
      return emptyConversationMemory(id);
    }
    return {
      version: 1,
      projectId: parsed.projectId || id,
      facts: parsed.facts.filter(
        (fact) =>
          typeof fact.key === 'string' &&
          typeof fact.value === 'string' &&
          fact.value.trim().length >= 2 &&
          (fact.source === 'document' || fact.source === 'user_turn'),
      ),
      updatedAt: parsed.updatedAt || new Date().toISOString(),
    };
  } catch {
    return emptyConversationMemory(id);
  }
}

export function saveConversationMemory(memory: ConversationMemory, projectId?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(memoryKey(projectId ?? memory.projectId), JSON.stringify(memory));
}

export function clearConversationMemory(projectId?: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(memoryKey(projectId));
}
