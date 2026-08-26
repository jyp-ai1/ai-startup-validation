import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import {
  SHARED_UNDERSTANDING_PENDING,
  buildSharedUnderstanding,
} from './build-shared-understanding';
import { buildAiPmDynamicDiagnosis } from './build-ai-pm-dynamic-diagnosis';
import { factKeyForIssue } from './build-conversation-memory';
import {
  getConflictFact,
  memoryHasFact,
  memoryHasOpenConflict,
  type ConversationMemory,
} from './conversation-memory';
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

export type MissingFieldPriority = {
  issueId: AiPmLoopIssueId;
  missingField: 'business' | 'customer' | 'problem' | 'market' | 'competitor' | 'bm';
  rationale: string;
  score: number;
  /** Why this question now — for transcript / UX */
  whyNow: string;
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

function fieldFromGapKey(
  fieldKey: string,
): MissingFieldPriority['missingField'] {
  if (fieldKey.includes('customer') || fieldKey === 'payer') return 'customer';
  if (fieldKey.includes('problem')) return 'problem';
  if (fieldKey.includes('competitor') || fieldKey.includes('differentiation')) return 'competitor';
  if (fieldKey.includes('market')) return 'market';
  if (fieldKey.includes('revenue') || fieldKey.includes('pricing') || fieldKey.includes('business')) {
    return 'bm';
  }
  return 'business';
}

/**
 * Core v3 — rank next question by judgment-critical gap.
 * No fixed Problem→Customer→Market template order.
 * Priority: open Conflict → Critical Unknown for judgment → detail.
 */
export function resolveMissingFieldPriorities(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
  options?: PriorityOptions,
): MissingFieldPriority[] {
  const resolved = new Set(getResolvedIssueIds(loop));
  const memory = options?.memory ?? null;
  const text = options?.documentText?.trim() ?? '';

  const scored = new Map<AiPmLoopIssueId, MissingFieldPriority>();

  // 0) Open conflicts first — AI must not silently pick
  if (memory && memoryHasOpenConflict(memory)) {
    for (const key of ['customer', 'problem', 'buyer', 'competitor', 'market', 'revenue'] as const) {
      const conflict = getConflictFact(memory, key);
      if (!conflict) continue;
      const issueId =
        key === 'buyer' || key === 'customer'
          ? 'customer_definition'
          : key === 'problem'
            ? 'problem_definition'
            : key === 'competitor'
              ? 'competitor_analysis'
              : key === 'market'
                ? 'market_validation'
                : 'bm_design';
      if (resolved.has(issueId) && isIssueLockedInMemory(issueId, memory) && !conflict) continue;
      scored.set(issueId, {
        issueId,
        missingField: fieldFromGapKey(key),
        rationale: `「${key}」에 모순된 답이 있습니다. 어느 쪽이 맞는지 확인이 필요합니다.`,
        score: 10_000,
        whyNow: `contradiction on ${key} — clarifying Q before any other gap`,
      });
    }
  }

  // 1) Living State judgment-critical gaps (Impact × Unknown × Decision × Answerability)
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

    for (const gap of living.gaps) {
      if (!gap.issueId) continue;
      if (resolved.has(gap.issueId) && isIssueLockedInMemory(gap.issueId, memory)) continue;
      if (locked.has(gap.issueId)) continue;
      const existing = scored.get(gap.issueId);
      if (existing && existing.score >= gap.priorityScore) continue;
      scored.set(gap.issueId, {
        issueId: gap.issueId,
        missingField: fieldFromGapKey(gap.fieldKey),
        rationale: gap.rationale,
        score: gap.priorityScore,
        whyNow: gap.rationale,
      });
    }

    const fromLiving = resolveNextIssueFromLivingState(living, [...resolved], locked);
    if (fromLiving && !scored.has(fromLiving)) {
      const topGap = living.gaps.find((g) => g.issueId === fromLiving);
      scored.set(fromLiving, {
        issueId: fromLiving,
        missingField: fieldFromGapKey(topGap?.fieldKey ?? ''),
        rationale: topGap?.rationale ?? `Living State gap — ${fromLiving}`,
        score: (topGap?.priorityScore ?? 100) + 50,
        whyNow: topGap?.rationale ?? `critical unknown for judgment — ${fromLiving}`,
      });
    }
  }

  // 2) Dynamic diagnosis — only as soft signal, no fixed field order boost
  const diagnosis = buildAiPmDynamicDiagnosis(
    understanding,
    options?.entities,
    text,
    [...resolved],
  );

  for (const risk of diagnosis.riskScores) {
    if (resolved.has(risk.issueId) && isIssueLockedInMemory(risk.issueId, memory)) continue;
    if (isIssueLockedInMemory(risk.issueId, memory)) continue;
    if (risk.issueId === 'competitor_analysis' && !options?.analysisResultExists) {
      const criticalConfirmed =
        Boolean(memory) &&
        memoryHasFact(memory!, 'customer') &&
        memoryHasFact(memory!, 'problem');
      if (!criticalConfirmed) continue;
    }

    const existing = scored.get(risk.issueId);
    if (existing) continue;

    scored.set(risk.issueId, {
      issueId: risk.issueId,
      missingField: risk.dimension === 'bm' ? 'bm' : risk.dimension,
      rationale: risk.rationale,
      score: risk.score,
      whyNow: risk.rationale,
    });
  }

  // Soft spine hint — only if Living State empty for that field; NO fixed order boost
  if (text.length >= 8) {
    const spine = buildSharedUnderstanding({
      documentText: text,
      turns: options?.turns ?? loop.turns,
      understanding,
      entities: options?.entities ?? null,
      memory,
    });
    if (spine) {
      const soft: Array<{
        field: 'customer' | 'problem' | 'business';
        issueId: AiPmLoopIssueId;
      }> = [
        { field: 'problem', issueId: 'problem_definition' },
        { field: 'customer', issueId: 'customer_definition' },
        { field: 'business', issueId: 'bm_design' },
      ];
      for (const entry of soft) {
        if (scored.has(entry.issueId)) continue;
        if (resolved.has(entry.issueId) && isIssueLockedInMemory(entry.issueId, memory)) continue;
        if (isIssueLockedInMemory(entry.issueId, memory)) continue;
        const fieldValue = spine[entry.field];
        const pending =
          !fieldValue.trim() || fieldValue.trim() === SHARED_UNDERSTANDING_PENDING;
        if (!pending) continue;
        scored.set(entry.issueId, {
          issueId: entry.issueId,
          missingField: entry.field,
          rationale: `Shared Understanding「${entry.field}」가 아직 비어 사업·판단에 필요합니다.`,
          score: 40,
          whyNow: `document+dialogue left ${entry.field} unknown — needed for GO/HOLD judgment`,
        });
      }
    }
  }

  return [...scored.values()].sort((a, b) => b.score - a.score);
}

/** Prefer judgment-critical gap; preserve in-flight issue. */
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
