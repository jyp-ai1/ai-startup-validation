import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import { buildAiPmDynamicDiagnosis } from './build-ai-pm-dynamic-diagnosis';
import { factKeyForIssue } from './build-conversation-memory';
import {
  getConflictFact,
  memoryHasFact,
  memoryHasOpenConflict,
  type ConversationFactKey,
  type ConversationMemory,
} from './conversation-memory';
import { resolveGapQuestionBinding } from './gap-question-map';
import {
  buildLivingUnderstandingState,
  whyNowForGapField,
} from './living-understanding-state';
import { getResolvedIssueIds } from './workspace-ai-pm-loop-store';
import {
  type AiPmLoopIssueId,
  type AiPmLoopState,
} from './workspace-ai-pm-loop-types';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

export type MissingFieldPriority = {
  issueId: AiPmLoopIssueId;
  /** Living gap fieldKey — same id drives whyNow + question (P0-4) */
  targetGap: string;
  missingField: 'business' | 'customer' | 'problem' | 'market' | 'competitor' | 'bm';
  rationale: string;
  score: number;
  /** Why this question now — for transcript / UX */
  whyNow: string;
  /** Gap-aligned question text (may differ from issue template) */
  questionText: string;
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

function factKeyToGap(factKey: ConversationFactKey): string {
  switch (factKey) {
    case 'buyer':
      return 'payer';
    case 'customer':
      return 'customerPersona';
    case 'problem':
      return 'problemJtbd';
    case 'competitor':
      return 'alternativesCompetitors';
    case 'market':
      return 'marketSizeEvidence';
    case 'revenue':
      return 'revenueModel';
    case 'business':
      return 'businessOneLiner';
    default:
      return factKey;
  }
}

function priorityFromGap(input: {
  targetGap: string;
  issueId: AiPmLoopIssueId;
  rationale: string;
  score: number;
}): MissingFieldPriority {
  const binding = resolveGapQuestionBinding(input.targetGap, input.issueId);
  const whyNow = whyNowForGapField(input.targetGap);
  return {
    issueId: binding.issueId,
    targetGap: input.targetGap,
    missingField: fieldFromGapKey(input.targetGap),
    rationale: input.rationale,
    score: input.score,
    whyNow,
    questionText: binding.questionText,
  };
}

/**
 * Core v3 — rank next question by judgment-critical gap.
 * No fixed Problem→Customer→Market template order (P0-3).
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

  const scored = new Map<string, MissingFieldPriority>();

  // 0) Open conflicts first — AI must not silently pick
  if (memory && memoryHasOpenConflict(memory)) {
    for (const key of ['customer', 'problem', 'buyer', 'competitor', 'market', 'revenue'] as const) {
      const conflict = getConflictFact(memory, key);
      if (!conflict) continue;
      const gapKey = factKeyToGap(key);
      const binding = resolveGapQuestionBinding(gapKey);
      scored.set(gapKey, priorityFromGap({
        targetGap: gapKey,
        issueId: binding.issueId,
        rationale: `「${key}」에 모순된 답이 있습니다. 어느 쪽이 맞는지 확인이 필요합니다.`,
        score: 10_000,
      }));
    }
  }

  // 1) Living State judgment-critical gaps — primary path (P0-3)
  if (text.length >= 8) {
    const living = buildLivingUnderstandingState({
      documentText: text,
      understanding,
      entities: options?.entities ?? null,
      turns: options?.turns ?? loop.turns,
      memory,
      resolvedIssueIds: [...resolved],
    });

    for (const gap of living.gaps) {
      const binding = resolveGapQuestionBinding(gap.fieldKey, gap.issueId ?? undefined);
      const issueId = gap.issueId ?? binding.issueId;
      if (resolved.has(issueId) && isIssueLockedInMemory(issueId, memory)) {
        // Still allow re-ask when same gap unknown (e.g. differentiation after competitor)
        if (gap.fieldKey !== 'differentiationVsAlternatives' && gap.fieldKey !== 'differentiationHypothesis') {
          continue;
        }
      }
      const existing = scored.get(gap.fieldKey);
      if (existing && existing.score >= gap.priorityScore) continue;
      scored.set(
        gap.fieldKey,
        priorityFromGap({
          targetGap: gap.fieldKey,
          issueId,
          rationale: gap.rationale,
          score: gap.priorityScore,
        }),
      );
    }
  }

  // 2) Dynamic diagnosis — soft signal only; never imposes fixed order
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

    const binding = resolveGapQuestionBinding(null, risk.issueId);
    if (scored.has(binding.targetGap)) continue;

    scored.set(
      binding.targetGap,
      priorityFromGap({
        targetGap: binding.targetGap,
        issueId: risk.issueId,
        rationale: risk.rationale,
        score: risk.score,
      }),
    );
  }

  // P0-3 — removed fixed soft-spine Problem→Customer→Business order

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

/** Top ranked gap priority — includes targetGap + aligned questionText. */
export function getTopGapPriority(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
  options?: PriorityOptions,
): MissingFieldPriority | null {
  const ranked = resolveMissingFieldPriorities(understanding, loop, options);
  return ranked[0] ?? null;
}

/**
 * CPO-verifiable "WHY THIS QUESTION NOW" for the active (or top) issue.
 * whyNow and questionText share targetGap (P0-4).
 */
export function getWhyThisQuestionNow(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
  options?: PriorityOptions & { issueId?: AiPmLoopIssueId | null; targetGap?: string | null },
): MissingFieldPriority | null {
  const ranked = resolveMissingFieldPriorities(understanding, loop, options);
  if (ranked.length === 0) return null;

  if (options?.targetGap) {
    return ranked.find((r) => r.targetGap === options.targetGap) ?? ranked[0] ?? null;
  }

  const want = options?.issueId;
  if (want) {
    return ranked.find((r) => r.issueId === want) ?? ranked[0] ?? null;
  }
  return ranked[0] ?? null;
}
