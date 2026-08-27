import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  inferDomainFromPaste,
  loadWorkspaceDocumentText,
  saveWorkspaceDomain,
  saveWorkspaceEntities,
  type WorkspaceDomainEvidence,
} from '../workspace-ai-pm-messages';

import { applyAiPmLoopAnswer } from './apply-ai-pm-loop-answer';
import { buildBusinessUnderstanding } from './build-business-understanding';
import { buildConversationMemoryFromSources, factKeyForIssue } from './build-conversation-memory';
import {
  getFact,
  parkConflictFact,
  type ConversationFactKey,
} from './conversation-memory';
import {
  loadConversationMemory,
  saveConversationMemory,
} from './conversation-memory-store';
import {
  interpretAnswerSemantics,
  type SemanticInterpretation,
} from './interpret-answer-semantics';
import { getWhyThisQuestionNow } from './resolve-missing-field-priority';
import {
  evaluateAnswerQuality,
  type AnswerQuality,
} from './understanding-contract';
import { loadAiPmLoopState } from './workspace-ai-pm-loop-store';
import type { AiPmLoopIssueId } from './workspace-ai-pm-loop-types';
import { buildWhyFollowUp, type WhyFollowUp } from './correction-and-why';

export type WorkspaceLoopAnswerResult = {
  domain: WorkspaceDomainEvidence;
  entities: LaunchLensDomainContext;
  documentText: string;
  quality: AnswerQuality;
  /** False when Answer Quality / semantic gate blocks Memory merge. */
  applied: boolean;
  existingFact: string | null;
  /** Core v3 semantic interpretation */
  semantic: SemanticInterpretation;
  /** Why display payload when intent=why_meta */
  whyFollowUp?: WhyFollowUp | null;
  /** Mid-judgment display text when intent=mid_judgment */
  midJudgmentText?: string | null;
};

export type ApplyWorkspaceLoopAnswerOptions = {
  /** Force merge after contradiction confirm (accept new). */
  forceAccept?: boolean;
  /** Pre-computed semantic (submit path). */
  semantic?: SemanticInterpretation;
};

/**
 * Core v3 — single write path after a loop answer.
 * Semantic interpretation BEFORE Memory merge. Wrong-slot dump forbidden.
 */
export function applyWorkspaceLoopAnswer(
  issueId: AiPmLoopIssueId,
  answer: string,
  projectId?: string,
  options?: ApplyWorkspaceLoopAnswerOptions,
): WorkspaceLoopAnswerResult {
  const documentTextBefore = loadWorkspaceDocumentText(projectId)?.trim() ?? '';
  const previousMemory = loadConversationMemory(projectId);

  const existingFactsByKey: Partial<Record<ConversationFactKey, string | null>> = {};
  for (const fact of previousMemory.facts) {
    if ((fact.lifecycle ?? 'current') === 'current') {
      existingFactsByKey[fact.key] = fact.value;
    }
  }

  const semantic =
    options?.semantic ??
    interpretAnswerSemantics({
      answer,
      askedIssueId: issueId,
      existingFact: factKeyForIssue(issueId)
        ? getFact(previousMemory, factKeyForIssue(issueId)!)?.value ?? null
        : null,
      existingFactsByKey,
    });

  const existingFact = semantic.factKey
    ? getFact(previousMemory, semantic.factKey)?.value ?? null
    : null;

  // Display-only paths — never Memory / document Fact blocks
  if (semantic.intent === 'why_meta') {
    const inferred = inferDomainFromPaste(documentTextBefore, projectId);
    const loopForWhy = loadAiPmLoopState(projectId);
    const understandingForWhy =
      documentTextBefore.length >= 8
        ? buildBusinessUnderstanding(documentTextBefore)
        : null;
    const livingWhy =
      (understandingForWhy
        ? getWhyThisQuestionNow(understandingForWhy, loopForWhy, {
            documentText: documentTextBefore,
            memory: previousMemory,
            turns: loopForWhy.turns,
            analysisResultExists: true,
            issueId: issueId,
          })?.whyNow
        : null) ??
      '이 질문은 지금 사업 GO/HOLD에 필요한 Critical Unknown을 메우기 위한 것입니다.';
    return {
      domain: inferred.domain,
      entities: inferred.entities,
      documentText: documentTextBefore,
      quality: 'IRRELEVANT',
      applied: false,
      existingFact,
      semantic,
      whyFollowUp: buildWhyFollowUp({
        judgment: livingWhy,
        reasons: [
          '이미 문서·이전 답변으로 확인된 내용은 다시 묻지 않습니다.',
          livingWhy,
          '답변 후에는 Living Understanding이 갱신되고, 다음 공백이 다시 골라집니다.',
        ],
        criticalGap: semantic.resolvedIssueId,
      }),
    };
  }

  if (semantic.intent === 'mid_judgment') {
    const inferred = inferDomainFromPaste(documentTextBefore, projectId);
    const known = previousMemory.facts
      .filter((f) => (f.lifecycle ?? 'current') === 'current')
      .map((f) => `${f.key}: ${f.value}`)
      .slice(0, 6);
    return {
      domain: inferred.domain,
      entities: inferred.entities,
      documentText: documentTextBefore,
      quality: 'IRRELEVANT',
      applied: false,
      existingFact,
      semantic,
      midJudgmentText:
        known.length > 0
          ? `지금까지 확인한 내용:\n${known.map((l) => `· ${l}`).join('\n')}\n\n(이 요약은 화면에만 표시되며 Confirmed Fact로 저장되지 않습니다.)`
          : '아직 확정된 Fact가 많지 않습니다. 문서·대화로 핵심을 더 채우면 중간 판단을 구체화합니다.\n\n(화면 표시만 — Fact DB 미저장)',
    };
  }

  if (!options?.forceAccept && semantic.quality === 'CONTRADICTORY' && semantic.factKey && existingFact) {
    const inferred = inferDomainFromPaste(documentTextBefore, projectId);
    const parked = parkConflictFact(
      previousMemory,
      semantic.factKey,
      existingFact,
      answer,
    );
    saveConversationMemory(parked, projectId);
    return {
      domain: inferred.domain,
      entities: inferred.entities,
      documentText: documentTextBefore,
      quality: 'CONTRADICTORY',
      applied: false,
      existingFact,
      semantic,
    };
  }

  if (!semantic.mergeable && !options?.forceAccept) {
    const inferred = inferDomainFromPaste(documentTextBefore, projectId);
    return {
      domain: inferred.domain,
      entities: inferred.entities,
      documentText: documentTextBefore,
      quality: semantic.quality,
      applied: false,
      existingFact,
      semantic,
    };
  }

  // Merge into document under SEMANTIC issue section (not wrong asked-slot)
  const mergeIssueId = semantic.resolvedIssueId ?? issueId;
  // Multi-fact: write one document block per distinct semantic issue (primary first)
  const mergeIssueIds = [
    mergeIssueId,
    ...semantic.facts
      .map((f) => f.issueId)
      .filter((id) => id !== mergeIssueId),
  ];
  const uniqueMergeIssues = [...new Set(mergeIssueIds)];
  for (const id of uniqueMergeIssues.slice(0, 2)) {
    applyAiPmLoopAnswer(id, answer, projectId);
  }
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
    quality: options?.forceAccept ? 'VALID' : semantic.quality,
    applied: true,
    existingFact,
    semantic,
  };
}

/** @deprecated Prefer semantic path; kept for legacy callers using raw quality only */
export function previewAnswerQuality(
  answer: string,
  existingFact?: string | null,
): { quality: AnswerQuality; mergeable: boolean } {
  return evaluateAnswerQuality(answer, { existingFact });
}
