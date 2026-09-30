import type { ConversationFactKey, ConversationMemory } from './conversation-memory';
import { emptyConversationMemory } from './conversation-memory';
import { applyUserCorrection } from './correction-and-why';
import type { WorkspaceDomainEvidence, WorkspaceDomainFieldId } from '../workspace-ai-pm-messages';

const DOMAIN_TO_MEMORY: Array<{
  domainKey: WorkspaceDomainFieldId;
  factKey: ConversationFactKey;
}> = [
  { domainKey: 'business', factKey: 'business' },
  { domainKey: 'customer', factKey: 'customer' },
  { domainKey: 'market', factKey: 'market' },
  { domainKey: 'competitor', factKey: 'competitor' },
];

/** P0-2A — persist founder domain edits into conversation memory (existing SoT). */
export function applyWorkspaceDomainToMemory(input: {
  projectId: string;
  domain: WorkspaceDomainEvidence;
  previous?: ConversationMemory | null;
}): ConversationMemory {
  let memory = input.previous ?? emptyConversationMemory(input.projectId);
  for (const { domainKey, factKey } of DOMAIN_TO_MEMORY) {
    const value = input.domain[domainKey]?.trim() ?? '';
    if (!value) continue;
    memory = applyUserCorrection({
      projectId: input.projectId,
      fieldKey: factKey,
      nextValue: value,
      previous: memory,
    }).memory;
  }
  return memory;
}
