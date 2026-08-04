import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import { buildBusinessUnderstanding } from './build-business-understanding';
import {
  buildSharedUnderstanding,
  type WorkspaceSharedUnderstanding,
} from './build-shared-understanding';
import { isWorkspaceDocumentReadable } from './workspace-document-eligibility';
import type { AiPmLoopState } from './workspace-ai-pm-loop-types';

/** S8-2 — post-edit AI understanding summary for founder confirm step. */
export function buildEditUnderstandingSummary(input: {
  documentText: string;
  entities: LaunchLensDomainContext | null;
  loop: AiPmLoopState;
}): WorkspaceSharedUnderstanding {
  const readable = isWorkspaceDocumentReadable(input.documentText);
  const understanding = buildBusinessUnderstanding(input.documentText);
  return (
    buildSharedUnderstanding({
      documentText: input.documentText,
      entities: input.entities,
      understanding,
      turns: input.loop.turns,
    }) ?? {
      business: understanding.business.value?.trim() || '아직 확인 중',
      customer: '아직 확인 중',
      problem: '아직 확인 중',
    }
  );
}
