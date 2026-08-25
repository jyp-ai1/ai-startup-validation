import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  inferDomainFromPaste,
  loadWorkspaceDocumentText,
  saveWorkspaceDomain,
  saveWorkspaceEntities,
  type WorkspaceDomainEvidence,
} from '../workspace-ai-pm-messages';

import { applyAiPmLoopAnswer } from './apply-ai-pm-loop-answer';
import { buildConversationMemoryFromSources, factKeyForIssue } from './build-conversation-memory';
import { getFact } from './conversation-memory';
import {
  loadConversationMemory,
  saveConversationMemory,
} from './conversation-memory-store';
import {
  evaluateAnswerQuality,
  type AnswerQuality,
} from './understanding-contract';
import { loadAiPmLoopState } from './workspace-ai-pm-loop-store';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';

export type WorkspaceLoopAnswerResult = {
  domain: WorkspaceDomainEvidence;
  entities: LaunchLensDomainContext;
  documentText: string;
  quality: AnswerQuality;
  /** False when Answer Quality blocks Memory/Understanding merge. */
  applied: boolean;
  existingFact: string | null;
};

export type ApplyWorkspaceLoopAnswerOptions = {
  /** Force merge after contradiction confirm (accept new). */
  forceAccept?: boolean;
};

/**
 * S7-2 — single write path after a loop answer.
 * S9 ADR-053 — Conversation Memory (Facts) updated after every confirmed turn.
 * Long Sprint — Answer Quality gate: nonsense / contradiction never silently ✔-pass.
 */
export function applyWorkspaceLoopAnswer(
  issueId: AiPmLoopIssueId,
  answer: string,
  projectId?: string,
  options?: ApplyWorkspaceLoopAnswerOptions,
): WorkspaceLoopAnswerResult {
  const documentTextBefore = loadWorkspaceDocumentText(projectId)?.trim() ?? '';
  const previousMemory = loadConversationMemory(projectId);
  const factKey = factKeyForIssue(issueId);
  const existingFact = factKey ? getFact(previousMemory, factKey)?.value ?? null : null;
  const { quality, mergeable } = evaluateAnswerQuality(answer, { existingFact });

  if (!mergeable && !options?.forceAccept) {
    const inferred = inferDomainFromPaste(documentTextBefore, projectId);
    return {
      domain: inferred.domain,
      entities: inferred.entities,
      documentText: documentTextBefore,
      quality,
      applied: false,
      existingFact,
    };
  }

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
    previous: previousMemory,
  });
  saveConversationMemory(memory, projectId);

  return {
    domain: inferred.domain,
    entities: inferred.entities,
    documentText,
    quality: options?.forceAccept ? 'VALID' : quality,
    applied: true,
    existingFact,
  };
}
