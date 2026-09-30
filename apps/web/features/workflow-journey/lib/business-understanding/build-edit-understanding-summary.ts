import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import type { WorkspaceDomainEvidence } from '../workspace-ai-pm-messages';
import { buildBusinessUnderstanding } from './build-business-understanding';
import {
  buildSharedUnderstanding,
  mergeWorkspaceDomainIntoSharedUnderstanding,
  type WorkspaceSharedUnderstanding,
} from './build-shared-understanding';
import type { ConversationMemory } from './conversation-memory';
import type { AiPmLoopState } from './workspace-ai-pm-loop-types';

/** S8-2 — post-edit AI understanding summary for founder confirm step. */
export function buildEditUnderstandingSummary(input: {
  documentText: string;
  entities: LaunchLensDomainContext | null;
  loop: AiPmLoopState;
  domain?: WorkspaceDomainEvidence | null;
  memory?: ConversationMemory | null;
}): WorkspaceSharedUnderstanding {
  const understanding = buildBusinessUnderstanding(input.documentText);
  const base =
    buildSharedUnderstanding({
      documentText: input.documentText,
      entities: input.entities,
      understanding,
      turns: input.loop.turns,
      memory: input.memory,
      domain: input.domain,
    }) ?? {
      business: understanding.business.value?.trim() || '아직 확인 중',
      customer: '아직 확인 중',
      problem: '아직 확인 중',
    };
  return mergeWorkspaceDomainIntoSharedUnderstanding(base, input.domain);
}
