import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  inferDomainFromPaste,
  loadWorkspaceDocumentText,
  saveWorkspaceDomain,
  saveWorkspaceEntities,
  type WorkspaceDomainEvidence,
} from '../workspace-ai-pm-messages';

import { applyAiPmLoopAnswer } from './apply-ai-pm-loop-answer';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

export type WorkspaceLoopAnswerResult = {
  domain: WorkspaceDomainEvidence;
  entities: LaunchLensDomainContext;
  documentText: string;
};

/**
 * S7-2 — single write path after a loop answer.
 * Loop → WorkspaceState inputs (document + domain + entities) stay aligned.
 */
export function applyWorkspaceLoopAnswer(
  issueId: AiPmLoopIssueId,
  answer: string,
  projectId?: string,
): WorkspaceLoopAnswerResult {
  applyAiPmLoopAnswer(issueId, answer, projectId);
  const documentText = loadWorkspaceDocumentText(projectId)?.trim() ?? '';
  const inferred = inferDomainFromPaste(documentText, projectId);
  saveWorkspaceDomain(inferred.domain, projectId);
  saveWorkspaceEntities(inferred.entities, projectId);
  return {
    domain: inferred.domain,
    entities: inferred.entities,
    documentText,
  };
}
