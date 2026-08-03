import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  inferDomainFromPaste,
  loadWorkspaceDocumentText,
  saveWorkspaceDomain,
  saveWorkspaceEntities,
  type WorkspaceDomainEvidence,
} from '../workspace-ai-pm-messages';

import { applyAiPmLoopAnswer } from './apply-ai-pm-loop-answer';
import { buildConversationMemoryFromSources } from './build-conversation-memory';
import {
  loadConversationMemory,
  saveConversationMemory,
} from './conversation-memory-store';
import { loadAiPmLoopState } from './workspace-ai-pm-loop-store';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

export type WorkspaceLoopAnswerResult = {
  domain: WorkspaceDomainEvidence;
  entities: LaunchLensDomainContext;
  documentText: string;
};

/**
 * S7-2 — single write path after a loop answer.
 * S9 ADR-053 — Conversation Memory (Facts) updated after every confirmed turn.
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

  const loop = loadAiPmLoopState(projectId);
  const memory = buildConversationMemoryFromSources({
    projectId: projectId ?? 'default',
    documentText,
    turns: loop.turns,
    entities: inferred.entities,
    previous: loadConversationMemory(projectId),
  });
  saveConversationMemory(memory, projectId);

  return {
    domain: inferred.domain,
    entities: inferred.entities,
    documentText,
  };
}
