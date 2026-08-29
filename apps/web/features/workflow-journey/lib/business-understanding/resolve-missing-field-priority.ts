import type { BusinessUnderstanding } from '@repo/types/domain/business-understanding';
import type { LaunchLensDomainContext } from '@repo/types/domain/launchlens-domain';

import { buildAiPmDynamicDiagnosis } from './build-ai-pm-dynamic-diagnosis';
import { factKeyForGapField, factKeyForIssue } from './build-conversation-memory';
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
import {
  selectAdaptiveNextGaps,
  isDiffConfirmedWithoutRelevance,
  listAnalysisBlockingGaps,
} from './adaptive-question-select';
import {
  countUnclosedGapAsks,
  resolveExcludedGaps,
  MAX_SAME_GAP_ASKS_BEFORE_YIELD,
} from './question-decision-engine';
import { reframeQuestion, isSameMeaningQuestion, buildConflictClarifyQuestion } from './reframe-question';
import { getResolvedIssueIds } from './workspace-ai-pm-loop-store';
import {
  type AiPmLoopIssueId,
  type AiPmLoopState,
} from './workspace-ai-pm-loop-types';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';
import { hasDiffRelevanceEvidence } from './understanding-contract';
import {
  buildDeltaAwareWhyNow,
  detectWrongSlotMergeContext,
  resolveWrongSlotQuestionAnchor,
  shouldBlockSolutionForOpenProblem,
  shouldPrioritizePersonaAfterWrongSlotRelevance,
  shouldPrioritizeProblemAfterWrongSlotPersona,
} from './wrong-slot-priority';

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
    case 'differentiation':
      return 'differentiationVsAlternatives';
    case 'diffRelevance':
      return 'validationTestability';
    case 'defensibility':
      return 'executionConstraints';
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
  wrongSlotContext?: ReturnType<typeof detectWrongSlotMergeContext>;
}): MissingFieldPriority {
  const binding = resolveGapQuestionBinding(input.targetGap, input.issueId);
  const baseWhyNow = whyNowForGapField(input.targetGap);
  const whyNow = buildDeltaAwareWhyNow({
    targetGap: input.targetGap,
    baseWhyNow,
    wrongSlotContext: input.wrongSlotContext ?? null,
  });
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
 * Core Final — gaps satisfied only when a mergeable turn confirmed the SEMANTIC fact,
 * not merely because the gap was asked. Prevents wrong-slot "answered" bans.
 */
export function getAnsweredTargetGaps(turns: AiPmLoopTurn[] | undefined): Set<string> {
  const answered = new Set<string>();
  if (!turns?.length) return answered;

  const factToGap: Partial<Record<string, string>> = {
    buyer: 'payer',
    customer: 'customerPersona',
    problem: 'problemJtbd',
    competitor: 'alternativesCompetitors',
    differentiation: 'differentiationVsAlternatives',
    diffRelevance: 'validationTestability',
    defensibility: 'executionConstraints',
    market: 'marketSizeEvidence',
    revenue: 'revenueModel',
    business: 'businessOneLiner',
  };

  for (const turn of turns) {
    if (turn.superseded) continue;
    if (
      turn.intent === 'why_meta' ||
      turn.intent === 'mid_judgment' ||
      turn.intent === 'nonsense' ||
      turn.intent === 'unknown_signal'
    ) {
      continue;
    }
    const keys =
      turn.semanticFactKeys && turn.semanticFactKeys.length > 0
        ? turn.semanticFactKeys
        : turn.semanticFactKey
          ? [turn.semanticFactKey]
          : [];
    for (const key of keys) {
      const gap = factToGap[key];
      if (gap === 'validationTestability') {
        if (keys.includes('diffRelevance') && hasDiffRelevanceEvidence(turn.answer ?? '')) {
          answered.add(gap);
        }
        continue;
      }
      if (gap) answered.add(gap);
    }
    // Only count asked targetGap when it matches a semantic fact (no wrong-slot credit)
    if (turn.targetGap?.trim() && keys.length > 0) {
      const asked = turn.targetGap.trim();
      const binding = resolveGapQuestionBinding(asked);
      if (asked === 'validationTestability') {
        if (keys.includes('diffRelevance') && hasDiffRelevanceEvidence(turn.answer ?? '')) {
          answered.add(asked);
        }
      } else if (keys.includes(binding.factKey) || asked === 'solution') {
        answered.add(asked);
      }
    }
    // P0 — explicit solution turn always closes solution gap
    if (
      turn.targetGap === 'solution' &&
      (turn.intent === 'business_fact' || turn.intent === 'correction') &&
      turn.answer?.trim()
    ) {
      answered.add('solution');
    }
  }
  return answered;
}

function isGapSatisfiedInMemory(
  targetGap: string,
  memory: ConversationMemory | null | undefined,
  options?: { wrongSlotContext?: ReturnType<typeof detectWrongSlotMergeContext> },
): boolean {
  if (!memory) return false;
  // Loop 6 — wrong-slot relevance on persona ask; customer still needs USER_CONFIRMED
  if (
    targetGap === 'customerPersona' &&
    shouldPrioritizePersonaAfterWrongSlotRelevance(options?.wrongSlotContext ?? null)
  ) {
    return false;
  }
  // P0 — solution must never be closed by document business one-liner alone
  if (targetGap === 'solution' || targetGap === 'businessOneLiner') {
    const fact = memory.facts.find(
      (f) =>
        f.key === 'business' &&
        (f.lifecycle ?? 'current') === 'current' &&
        f.source === 'user_turn',
    );
    // businessOneLiner may use user business fact; solution still requires its own turn
    if (targetGap === 'solution') return false;
    return Boolean(fact);
  }
  const key = factKeyForGapField(targetGap);
  return key ? memoryHasFact(memory, key) : false;
}

/**
 * Core v4 — rank next question by judgment-critical gap.
 * Priority: open Conflict → Critical Unknown for judgment → detail.
 * Re-ask ban: answered targetGaps skipped (unless conflict).
 */
export function resolveMissingFieldPriorities(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
  options?: PriorityOptions,
): MissingFieldPriority[] {
  const resolved = new Set(getResolvedIssueIds(loop));
  const memory = options?.memory ?? null;
  const text = options?.documentText?.trim() ?? '';
  const turns = options?.turns ?? loop.turns;
  const answeredGaps = getAnsweredTargetGaps(turns);
  const wrongSlotContext = detectWrongSlotMergeContext(turns);
  // Loop 6 — credit semantically closed gap even when turn lacks stored semanticFactKey
  if (wrongSlotContext && wrongSlotContext.askedGap !== wrongSlotContext.closedGap) {
    answeredGaps.add(wrongSlotContext.closedGap);
  }
  // Loop 6e — prior partial persona turns must not suppress wrong-slot persona re-ask
  if (shouldPrioritizePersonaAfterWrongSlotRelevance(wrongSlotContext)) {
    answeredGaps.delete('customerPersona');
  }

  const scored = new Map<string, MissingFieldPriority>();

  // 0) Open conflicts first — AI must not silently pick (score beats all adaptive gaps)
  if (memory && memoryHasOpenConflict(memory)) {
    const livingForConflict =
      text.length >= 8
        ? buildLivingUnderstandingState({
            documentText: text,
            understanding,
            entities: options?.entities ?? null,
            turns,
            memory,
            resolvedIssueIds: [...resolved],
          })
        : null;
    for (const key of [
      'customer',
      'problem',
      'buyer',
      'competitor',
      'differentiation',
      'diffRelevance',
      'defensibility',
      'market',
      'revenue',
      'business',
    ] as const) {
      const conflict = getConflictFact(memory, key);
      if (!conflict) continue;
      const gapKey = factKeyToGap(key);
      const clarify = buildConflictClarifyQuestion({
        factKey: key,
        targetGap: gapKey,
        priorValue: conflict.conflictWith ?? conflict.value,
        newValue: conflict.value,
        living:
          livingForConflict ??
          buildLivingUnderstandingState({
            documentText: text || 'placeholder',
            understanding,
            turns,
            memory,
            resolvedIssueIds: [...resolved],
          }),
      });
      scored.set(gapKey, {
        ...priorityFromGap({
          targetGap: gapKey,
          issueId: resolveGapQuestionBinding(gapKey).issueId,
          rationale: clarify.whyNow,
          score: 200_000,
        }),
        questionText: clarify.questionText,
        whyNow: clarify.whyNow,
      });
    }
  }

  // Core Final — when competitor unknown, prefer alternativesCompetitors before differentiation
  if (
    memory &&
    !memoryHasFact(memory, 'competitor') &&
    !answeredGaps.has('alternativesCompetitors')
  ) {
    scored.set(
      'alternativesCompetitors',
      priorityFromGap({
        targetGap: 'alternativesCompetitors',
        issueId: 'competitor_analysis',
        rationale: whyNowForGapField('alternativesCompetitors'),
        score: 9_600,
      }),
    );
  }

  // Core v5 — after differentiation fact exists, prefer validationTestability (diff relevance)
  if (
    memory &&
    memoryHasFact(memory, 'differentiation') &&
    !memoryHasFact(memory, 'diffRelevance') &&
    !answeredGaps.has('validationTestability')
  ) {
    scored.set(
      'validationTestability',
      priorityFromGap({
        targetGap: 'validationTestability',
        issueId: 'competitor_analysis',
        rationale: whyNowForGapField('validationTestability'),
        score: 9_700,
      }),
    );
  }

  // Core v5 — after competitor fact exists, prefer differentiationVsAlternatives over unrelated slots
  if (memory && memoryHasFact(memory, 'competitor') && !memoryHasFact(memory, 'differentiation')) {
    if (!answeredGaps.has('differentiationVsAlternatives')) {
      scored.set(
        'differentiationVsAlternatives',
        priorityFromGap({
          targetGap: 'differentiationVsAlternatives',
          issueId: 'competitor_analysis',
          rationale: whyNowForGapField('differentiationVsAlternatives'),
          score: 9_500,
        }),
      );
    }
  }

  // 1) Living State judgment-critical gaps — primary path (adaptive-ranked)
  if (text.length >= 8) {
    const living = buildLivingUnderstandingState({
      documentText: text,
      understanding,
      entities: options?.entities ?? null,
      turns,
      memory,
      resolvedIssueIds: [...resolved],
    });

    const exclude = resolveExcludedGaps({ turns, memory, living });

    // Core Final Stabilization — adaptive ranking is production SoT (no fixed spine)
    for (const candidate of selectAdaptiveNextGaps(living, {
      excludeGaps: exclude,
      answeredFactGaps: answeredGaps,
      turns,
    })) {
      if (candidate.fieldKey === 'solution' && shouldBlockSolutionForOpenProblem(living)) {
        continue;
      }
      if (answeredGaps.has(candidate.fieldKey)) continue;
      if (isGapSatisfiedInMemory(candidate.fieldKey, memory, { wrongSlotContext })) continue;
      if (exclude.has(candidate.fieldKey) && !scored.has(candidate.fieldKey)) continue;

      const existing = scored.get(candidate.fieldKey);
      if (existing && existing.score >= candidate.score) continue;

      let priority = priorityFromGap({
        targetGap: candidate.fieldKey,
        issueId: candidate.issueId,
        rationale: candidate.rationale,
        score: candidate.score,
        wrongSlotContext,
      });

      // Same-gap re-ask → reframe question text (never identical meaning)
      const priorAsks = countUnclosedGapAsks(turns, candidate.fieldKey);
      if (priorAsks > 0) {
        const reframed = reframeQuestion({
          targetGap: candidate.fieldKey,
          living,
          reason: 'adaptive',
          previousQuestionText: priority.questionText,
        });
        priority = {
          ...priority,
          questionText: reframed.questionText,
          whyNow: buildDeltaAwareWhyNow({
            targetGap: candidate.fieldKey,
            baseWhyNow: reframed.whyNow,
            wrongSlotContext,
          }),
          rationale: `${candidate.rationale} (reframe after ${priorAsks} prior ask)`,
        };
      }

      scored.set(candidate.fieldKey, priority);
    }

    // Loop 6 P0-1 — force customerPersona when wrong-slot closed relevance on persona ask
    if (shouldPrioritizePersonaAfterWrongSlotRelevance(wrongSlotContext)) {
      const binding = resolveGapQuestionBinding('customerPersona');
      const existing = scored.get('customerPersona');
      const score = Math.max(existing?.score ?? 0, PERSONA_WRONG_SLOT_BOOST);
      if (!existing || existing.score < score) {
        scored.set(
          'customerPersona',
          priorityFromGap({
            targetGap: 'customerPersona',
            issueId: binding.issueId,
            rationale: binding.whyNow,
            score,
            wrongSlotContext,
          }),
        );
      }
    }

    for (const gap of living.gaps) {
      // Loop 6 — living.gaps path must honor solution block (production SoT bypass @ f633733)
      if (gap.fieldKey === 'solution' && shouldBlockSolutionForOpenProblem(living)) {
        continue;
      }
      const binding = resolveGapQuestionBinding(gap.fieldKey, gap.issueId ?? undefined);
      const issueId = gap.issueId ?? binding.issueId;

      // Core Final — never re-ask answered / excluded gaps
      if (answeredGaps.has(gap.fieldKey) && !scored.has(gap.fieldKey)) {
        continue;
      }
      if (exclude.has(gap.fieldKey) && !scored.has(gap.fieldKey)) {
        continue;
      }

      // Memory already has the fact for this gap
      if (isGapSatisfiedInMemory(gap.fieldKey, memory, { wrongSlotContext })) {
        continue;
      }

      // Sticky fail on non-critical: skip after MAX asks
      if (
        !scored.has(gap.fieldKey) &&
        countUnclosedGapAsks(turns, gap.fieldKey) >= MAX_SAME_GAP_ASKS_BEFORE_YIELD &&
        exclude.has(gap.fieldKey)
      ) {
        continue;
      }

      // Issue-level lock only when gap's own fact is locked (not sibling gaps on same issue)
      if (resolved.has(issueId) && isGapSatisfiedInMemory(gap.fieldKey, memory, { wrongSlotContext })) {
        continue;
      }

      // Differentiation conversation siblings may follow competitor even if competitor_analysis touched
      if (
        resolved.has(issueId) &&
        isIssueLockedInMemory(issueId, memory) &&
        gap.fieldKey !== 'differentiationVsAlternatives' &&
        gap.fieldKey !== 'differentiationHypothesis' &&
        gap.fieldKey !== 'validationTestability' &&
        gap.fieldKey !== 'executionConstraints' &&
        gap.fieldKey !== 'revenueModel' &&
        gap.fieldKey !== 'pricingHint' &&
        gap.fieldKey !== 'payer' &&
        gap.fieldKey !== 'solution' &&
        gap.fieldKey !== 'marketChannel' &&
        gap.fieldKey !== 'marketSizeEvidence'
      ) {
        continue;
      }

      const existing = scored.get(gap.fieldKey);
      if (existing && existing.score >= gap.priorityScore) continue;

      let priority = priorityFromGap({
        targetGap: gap.fieldKey,
        issueId,
        rationale: gap.rationale,
        score: gap.priorityScore,
        wrongSlotContext,
      });
      const priorAsks = countUnclosedGapAsks(turns, gap.fieldKey);
      if (priorAsks > 0) {
        const reframed = reframeQuestion({
          targetGap: gap.fieldKey,
          living,
          reason: 'adaptive',
          previousQuestionText: priority.questionText,
        });
        if (!isSameMeaningQuestion(reframed.questionText, priority.questionText)) {
          priority = {
            ...priority,
            questionText: reframed.questionText,
            whyNow: buildDeltaAwareWhyNow({
              targetGap: gap.fieldKey,
              baseWhyNow: reframed.whyNow,
              wrongSlotContext,
            }),
          };
        }
      }
      scored.set(gap.fieldKey, priority);
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
    if (answeredGaps.has(binding.targetGap)) continue;
    if (isGapSatisfiedInMemory(binding.targetGap, memory, { wrongSlotContext })) continue;
    if (
      binding.targetGap === 'solution' &&
      text.length >= 8 &&
      shouldBlockSolutionForOpenProblem(
        buildLivingUnderstandingState({
          documentText: text,
          understanding,
          entities: options?.entities ?? null,
          turns,
          memory,
          resolvedIssueIds: [...resolved],
        }),
      )
    ) {
      continue;
    }

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

  let ranked = [...scored.values()].sort((a, b) => b.score - a.score);

  // Loop 6 — final guard: production SoT must not lose to living.gaps / diagnosis overrides
  if (text.length >= 8) {
    const livingFinal = buildLivingUnderstandingState({
      documentText: text,
      understanding,
      entities: options?.entities ?? null,
      turns,
      memory,
      resolvedIssueIds: [...resolved],
    });
    if (shouldBlockSolutionForOpenProblem(livingFinal)) {
      ranked = ranked.filter((r) => r.targetGap !== 'solution');
    }
  }

  if (shouldPrioritizePersonaAfterWrongSlotRelevance(wrongSlotContext)) {
    const personaIdx = ranked.findIndex((r) => r.targetGap === 'customerPersona');
    if (personaIdx > 0) {
      const [persona] = ranked.splice(personaIdx, 1);
      ranked.unshift(persona);
    }
  }

  if (shouldPrioritizeProblemAfterWrongSlotPersona(wrongSlotContext)) {
    const problemIdx = ranked.findIndex((r) => r.targetGap === 'problemJtbd');
    if (problemIdx > 0) {
      const [problem] = ranked.splice(problemIdx, 1);
      ranked.unshift(problem);
    }
  }

  return ranked;
}

/**
 * Prefer judgment-critical gap.
 * Core v4 — do NOT stick on currentIssueId when its asked gap was already answered
 * (fixes payer→revenue stuck re-ask loop).
 * Core v5 — sticky yields after re-judge when living ranking changes (e.g. competitor→diff);
 * getWhyThisQuestionNow / getTopGapPriority already re-rank via living — stick only while
 * the in-flight gap is still open.
 */
export function resolveNextIssueByMissingField(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
  options?: PriorityOptions,
): AiPmLoopIssueId | null {
  if (loop.phase === 'complete') return null;

  const memory = options?.memory ?? null;
  const turns = options?.turns ?? loop.turns;
  // Loop 8 — wrong-slot re-ask anchors issue before ranked yield (live panel path)
  const wrongSlotAnchor = resolveWrongSlotQuestionAnchor(turns);
  if (wrongSlotAnchor) return wrongSlotAnchor.issueId;

  const answeredGaps = getAnsweredTargetGaps(turns);
  const ranked = resolveMissingFieldPriorities(understanding, loop, options);
  const wrongSlotContext = detectWrongSlotMergeContext(turns);

  if (
    loop.currentIssueId &&
    !getResolvedIssueIds(loop).includes(loop.currentIssueId) &&
    !isIssueLockedInMemory(loop.currentIssueId, memory)
  ) {
    const lastTurn = [...turns].reverse().find((t) => !t.superseded);
    const lastGap = lastTurn?.targetGap?.trim() ?? null;
    const lastGapDone =
      (lastGap && answeredGaps.has(lastGap)) ||
      (lastGap && isGapSatisfiedInMemory(lastGap, memory));

    // Stick only when in-flight gap still open AND not just answered
    // After why/mid return or re-judge, ranked[0] may differ — yield to top if last gap done
    // Core Final Stabilization — also yield after MAX unclosed asks (prevent identical loop)
    if (!lastGapDone && lastGap) {
      const unclosedAsks = countUnclosedGapAsks(turns, lastGap);
      const relevanceBlocks =
        lastGap === 'validationTestability' &&
        isDiffConfirmedWithoutRelevance(
          buildLivingUnderstandingState({
            documentText: options?.documentText ?? '',
            understanding,
            entities: options?.entities ?? null,
            turns,
            memory,
          }),
        );
      if (unclosedAsks >= MAX_SAME_GAP_ASKS_BEFORE_YIELD && !relevanceBlocks) {
        const top = ranked[0];
        if (top && top.targetGap !== lastGap) {
          return top.issueId;
        }
        // Same issue but different sibling gap preferred
        const sibling = ranked.find((r) => r.targetGap !== lastGap);
        if (sibling) return sibling.issueId;
      }
    }

    if (!lastGapDone) {
      const stillOpenForIssue = ranked.find((r) => r.issueId === loop.currentIssueId);
      if (stillOpenForIssue && !answeredGaps.has(stillOpenForIssue.targetGap)) {
        // If living re-rank strongly prefers a different gap, yield (sticky not absolute)
        const top = ranked[0];
        if (
          top &&
          top.targetGap !== stillOpenForIssue.targetGap &&
          top.score > stillOpenForIssue.score * 1.15
        ) {
          return top.issueId;
        }
        // Prefer top gap when sticky would re-ask same answered-sibling forever
        if (
          top &&
          lastGap &&
          stillOpenForIssue.targetGap === lastGap &&
          top.targetGap !== lastGap
        ) {
          // Loop 8 — do not yield away from wrong-slot asked gap still open
          if (
            shouldPrioritizePersonaAfterWrongSlotRelevance(wrongSlotContext) &&
            lastGap === 'customerPersona'
          ) {
            return loop.currentIssueId;
          }
          if (
            shouldPrioritizeProblemAfterWrongSlotPersona(wrongSlotContext) &&
            lastGap === 'problemJtbd'
          ) {
            return loop.currentIssueId;
          }
          return top.issueId;
        }
        return loop.currentIssueId;
      }
    }
  }

  return ranked[0]?.issueId ?? null;
}

/** Top ranked gap priority — includes targetGap + aligned questionText. */
export function getTopGapPriority(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
  options?: PriorityOptions,
): MissingFieldPriority | null {
  const turns = options?.turns ?? loop.turns;
  const wrongSlotOverride = resolveWrongSlotQuestionOverride(turns);
  if (wrongSlotOverride) return wrongSlotOverride;

  const ranked = resolveMissingFieldPriorities(understanding, loop, options);
  return ranked[0] ?? null;
}

/**
 * Loop 6f/8 — production SoT override when wrong-slot context is definitive.
 * Bypasses ranked[] / answeredGaps skip (prior edit may exclude persona from ranked).
 */
export function resolveWrongSlotQuestionOverride(
  turns: AiPmLoopTurn[] | undefined,
): MissingFieldPriority | null {
  const anchor = resolveWrongSlotQuestionAnchor(turns);
  if (!anchor) return null;
  const binding = resolveGapQuestionBinding(anchor.targetGap);
  return priorityFromGap({
    targetGap: anchor.targetGap,
    issueId: binding.issueId,
    rationale: binding.whyNow,
    score: anchor.score,
    wrongSlotContext: anchor.wrongSlotContext,
  });
}

/**
 * CPO-verifiable "WHY THIS QUESTION NOW" for the active (or top) issue.
 * whyNow and questionText share targetGap (P0-4).
 * Core v4 — prefer top living gap over sticky issue when gap already answered.
 */
export function getWhyThisQuestionNow(
  understanding: BusinessUnderstanding,
  loop: AiPmLoopState,
  options?: PriorityOptions & { issueId?: AiPmLoopIssueId | null; targetGap?: string | null },
): MissingFieldPriority | null {
  const turns = options?.turns ?? loop.turns;
  const wrongSlotOverride = resolveWrongSlotQuestionOverride(turns);
  if (wrongSlotOverride) return wrongSlotOverride;

  const wrongSlotContext = detectWrongSlotMergeContext(turns);
  const ranked = resolveMissingFieldPriorities(understanding, loop, options);
  if (ranked.length === 0) return null;

  if (options?.targetGap) {
    return ranked.find((r) => r.targetGap === options.targetGap) ?? ranked[0] ?? null;
  }

  // Loop 6e — wrong-slot causality overrides answered-gap skip (prior edit may have credited persona)
  if (shouldPrioritizePersonaAfterWrongSlotRelevance(wrongSlotContext)) {
    const persona =
      ranked.find((r) => r.targetGap === 'customerPersona') ??
      ranked[0];
    if (persona?.targetGap === 'customerPersona') return persona;
  }
  if (shouldPrioritizeProblemAfterWrongSlotPersona(wrongSlotContext)) {
    const problem =
      ranked.find((r) => r.targetGap === 'problemJtbd') ??
      ranked[0];
    if (problem?.targetGap === 'problemJtbd') return problem;
  }

  const answeredGaps = getAnsweredTargetGaps(turns);
  if (wrongSlotContext && wrongSlotContext.askedGap !== wrongSlotContext.closedGap) {
    answeredGaps.add(wrongSlotContext.closedGap);
  }

  // Core Final Stabilization — adaptive top gap is always SoT (no issue stickiness / fixed spine)
  const next = ranked.find((r) => !answeredGaps.has(r.targetGap)) ?? ranked[0]!;
  return next;
}

/**
 * Loop 2 — after why/mid meta, preserve in-flight gap (no regression to older slots).
 */
export function resolvePreservedGapAfterMeta(input: {
  living: ReturnType<typeof buildLivingUnderstandingState>;
  turns: AiPmLoopTurn[];
  inFlightGap: string | null;
}): string {
  const answered = getAnsweredTargetGaps(input.turns);
  const blocking = new Set(listAnalysisBlockingGaps(input.living));

  if (
    input.inFlightGap &&
    !answered.has(input.inFlightGap) &&
    blocking.has(input.inFlightGap)
  ) {
    return input.inFlightGap;
  }

  if (
    isDiffConfirmedWithoutRelevance(input.living) &&
    !answered.has('validationTestability')
  ) {
    return 'validationTestability';
  }

  const conflict = input.living.claims.find((c) => c.status === 'contradiction');
  if (conflict && !answered.has(conflict.fieldKey)) {
    return conflict.fieldKey;
  }

  for (const gap of blocking) {
    if (!answered.has(gap)) return gap;
  }

  return input.inFlightGap ?? 'problemJtbd';
}
