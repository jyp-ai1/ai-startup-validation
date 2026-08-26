import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  SHARED_UNDERSTANDING_PENDING,
  buildSharedUnderstanding,
} from './build-shared-understanding';
import { buildAiPmDynamicDiagnosis } from './build-ai-pm-dynamic-diagnosis';
import { factKeyForIssue } from './build-conversation-memory';
import { memoryHasFact, type ConversationMemory } from './conversation-memory';
import {
  buildLivingUnderstandingState,
  resolveNextIssueFromLivingState,
} from './living-understanding-state';
import { getResolvedIssueIds } from './workspace-ai-pm-loop-store';
import {
  type AiPmLoopIssueId,
  type AiPmLoopState,
} from './workspace-ai-pm-loop-types';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** Spine field → loop issue that fills the gap (S17-3). */
const MISSING_FIELD_ISSUE: Array<{
  field: 'customer' | 'problem' | 'business';
  issueId: AiPmLoopIssueId;
  priorityBoost: number;
}> = [
  { field: 'customer', issueId: 'customer_definition', priorityBoost: 40 },
  { field: 'problem', issueId: 'problem_definition', priorityBoost: 35 },
  { field: 'business', issueId: 'bm_design', priorityBoost: 20 },
];

export type MissingFieldPriority = {
  issueId: AiPmLoopIssueId;
  missingField: 'business' | 'customer' | 'problem' | 'market' | 'competitor' | 'bm';
  rationale: string;
  score: number;
};

type PriorityOptions = {
  documentText?: string | null;
  entities?: LaunchLensDomainContext | null;
  memory?: ConversationMemory | null;
  analysisResultExists?: boolean;
  turns?: AiPmLoopTurn[];
};

function isIssueLockedInMemory(
  issueId: AiPmLoopIssueId,
  memory: ConversationMemory | null | undefined,
): boolean {
  if (!memory) return false;
  const key = factKeyForIssue(issueId);
  return key ? memoryHasFact(memory, key) : false;
}

function isPending(value: string): boolean {
  const trimmed = value.trim();
  return !trimmed || trimmed === SHARED_UNDERSTANDING_PENDING;
}

/**
 * S17-3 — rank next question by highest-priority missing Shared Understanding field,
 * then fall back to dynamic diagnosis gap scores.
 */
export function resolveMissingFieldPriorities(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
  options?: PriorityOptions,
): MissingFieldPriority[] {
  const resolved = new Set(getResolvedIssueIds(loop));
  const memory = options?.memory ?? null;
  const text = options?.documentText?.trim() ?? '';
  const spine = text
    ? buildSharedUnderstanding({
        documentText: text,
        turns: options?.turns ?? loop.turns,
        understanding,
        entities: options?.entities ?? null,
      })
    : null;

  const diagnosis = buildAiPmDynamicDiagnosis(
    understanding,
    options?.entities,
    text,
    [...resolved],
  );

  const scored = new Map<AiPmLoopIssueId, MissingFieldPriority>();

  // v2 — Living State gap priority (Impact × Unknown × Decision × Answerability)
  if (text.length >= 8) {
    const living = buildLivingUnderstandingState({
      documentText: text,
      understanding,
      entities: options?.entities ?? null,
      turns: options?.turns ?? loop.turns,
      memory,
      resolvedIssueIds: [...resolved],
    });
    const locked = new Set<AiPmLoopIssueId>();
    for (const id of resolved) {
      if (isIssueLockedInMemory(id, memory)) locked.add(id);
    }
    const fromLiving = resolveNextIssueFromLivingState(living, [...resolved], locked);
    if (fromLiving && !resolved.has(fromLiving) && !locked.has(fromLiving)) {
      const topGap = living.gaps.find((g) => g.issueId === fromLiving);
      scored.set(fromLiving, {
        issueId: fromLiving,
        missingField: topGap?.fieldKey.includes('customer')
          ? 'customer'
          : topGap?.fieldKey.includes('problem')
            ? 'problem'
            : topGap?.fieldKey.includes('competitor')
              ? 'competitor'
              : topGap?.fieldKey.includes('market')
                ? 'market'
                : 'business',
        rationale: topGap?.rationale ?? `Living State gap — ${fromLiving}`,
        score: (topGap?.priorityScore ?? 100) + 50,
      });
    }
  }

  for (const risk of diagnosis.riskScores) {
    if (resolved.has(risk.issueId)) continue;
    if (isIssueLockedInMemory(risk.issueId, memory)) continue;
    if (risk.issueId === 'competitor_analysis' && !options?.analysisResultExists) {
      const criticalConfirmed =
        Boolean(memory) &&
        memoryHasFact(memory!, 'customer') &&
        memoryHasFact(memory!, 'problem');
      if (!criticalConfirmed) continue;
    }

    scored.set(risk.issueId, {
      issueId: risk.issueId,
      missingField: risk.dimension === 'bm' ? 'bm' : risk.dimension,
      rationale: risk.rationale,
      score: risk.score,
    });
  }

  if (spine) {
    for (const entry of MISSING_FIELD_ISSUE) {
      if (resolved.has(entry.issueId)) continue;
      if (isIssueLockedInMemory(entry.issueId, memory)) continue;
      const fieldValue = spine[entry.field];
      if (!isPending(fieldValue)) continue;

      const existing = scored.get(entry.issueId);
      const boosted = (existing?.score ?? 50) + entry.priorityBoost;
      scored.set(entry.issueId, {
        issueId: entry.issueId,
        missingField: entry.field,
        rationale: existing?.rationale ?? `Shared Understanding「${entry.field}」가 아직 비어 있습니다.`,
        score: boosted,
      });
    }
  }

  return [...scored.values()].sort((a, b) => b.score - a.score);
}

/** Prefer missing-field priority; preserve in-flight issue. */
export function resolveNextIssueByMissingField(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
  options?: PriorityOptions,
): AiPmLoopIssueId | null {
  if (loop.phase === 'complete') return null;

  const resolved = new Set(getResolvedIssueIds(loop));
  const memory = options?.memory ?? null;

  if (
    loop.currentIssueId &&
    !resolved.has(loop.currentIssueId) &&
    !isIssueLockedInMemory(loop.currentIssueId, memory)
  ) {
    return loop.currentIssueId;
  }

  const ranked = resolveMissingFieldPriorities(understanding, loop, options);
  return ranked[0]?.issueId ?? null;
}
