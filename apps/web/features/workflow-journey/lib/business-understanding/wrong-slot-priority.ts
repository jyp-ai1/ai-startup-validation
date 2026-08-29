/**
 * Loop 5 — wrong-slot merge priority + delta-aware whyNow.
 * P0-1: persona ask closing relevance must re-rank customerPersona.
 * P0-2: block solution while problemJtbd is unconfirmed critical.
 */

import { listUnconfirmedCriticalGaps } from './adaptive-question-select';
import { resolveGapQuestionBinding } from './gap-question-map';
import { hasDiffRelevanceEvidence } from './understanding-contract';
import type { LivingUnderstandingState } from './living-understanding-state';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

const FACT_TO_GAP: Partial<Record<string, string>> = {
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

export type WrongSlotMergeContext = {
  askedGap: string;
  closedGap: string;
  closedFactKey: string;
  /** True when persona ask answer explicitly narrows segment (customerCue + correction). */
  segmentExplicitlyNarrowed: boolean;
};

function lastMergeableTurn(turns: AiPmLoopTurn[] | undefined): AiPmLoopTurn | null {
  if (!turns?.length) return null;
  for (let i = turns.length - 1; i >= 0; i -= 1) {
    const t = turns[i]!;
    if (t.superseded) continue;
    if (
      t.intent === 'why_meta' ||
      t.intent === 'mid_judgment' ||
      t.intent === 'nonsense' ||
      t.intent === 'unknown_signal'
    ) {
      continue;
    }
    return t;
  }
  return null;
}

function semanticKeys(turn: AiPmLoopTurn): string[] {
  if (turn.semanticFactKeys && turn.semanticFactKeys.length > 0) return turn.semanticFactKeys;
  if (turn.semanticFactKey) return [turn.semanticFactKey];
  return [];
}

function closedGapsFromTurn(turn: AiPmLoopTurn): string[] {
  const keys = semanticKeys(turn);
  const gaps: string[] = [];
  for (const key of keys) {
    const gap = FACT_TO_GAP[key];
    if (gap === 'validationTestability') {
      if (keys.includes('diffRelevance') && hasDiffRelevanceEvidence(turn.answer ?? '')) {
        gaps.push(gap);
      }
      continue;
    }
    if (gap) gaps.push(gap);
  }
  if (turn.targetGap?.trim() && keys.length > 0) {
    const asked = turn.targetGap.trim();
    const binding = resolveGapQuestionBinding(asked);
    if (asked === 'validationTestability') {
      if (keys.includes('diffRelevance') && hasDiffRelevanceEvidence(turn.answer ?? '')) {
        if (!gaps.includes(asked)) gaps.push(asked);
      }
    } else if (keys.includes(binding.factKey) || asked === 'solution') {
      if (!gaps.includes(asked)) gaps.push(asked);
    }
  }
  return gaps;
}

/** Last turn asked one gap but semantically closed a different gap. */
export function detectWrongSlotMergeContext(
  turns: AiPmLoopTurn[] | undefined,
): WrongSlotMergeContext | null {
  const last = lastMergeableTurn(turns);
  if (!last?.targetGap?.trim()) return null;

  const askedGap = last.targetGap.trim();
  const closedGaps = closedGapsFromTurn(last);
  if (closedGaps.length === 0) return null;
  if (closedGaps.includes(askedGap)) return null;

  const closedGap = closedGaps[0]!;
  const closedFactKey = last.semanticFactKey ?? semanticKeys(last)[0] ?? '';

  let segmentExplicitlyNarrowed = false;
  if (askedGap === 'customerPersona') {
    const trimmed = (last.answer ?? '').trim();
    const customerCue =
      /(고객|타깃|타겯|사용자|유저|persona|관광객|여행객|FIT|MZ|누가\s*쓰|필요로\s*하)/i.test(
        trimmed,
      );
    const isCorrection = /(정정|아니라|사실은|틀렸|잘못|수정)/i.test(trimmed);
    segmentExplicitlyNarrowed = customerCue && isCorrection;
  }

  return { askedGap, closedGap, closedFactKey, segmentExplicitlyNarrowed };
}

/** P0-1 — persona-shaped ask closed relevance; persona still open → boost persona. */
export function shouldPrioritizePersonaAfterWrongSlotRelevance(
  ctx: WrongSlotMergeContext | null,
): boolean {
  if (!ctx) return false;
  if (ctx.askedGap !== 'customerPersona') return false;
  if (ctx.closedGap !== 'validationTestability') return false;
  return !ctx.segmentExplicitlyNarrowed;
}

/** P0-2 — never select solution while problemJtbd remains critical-unconfirmed. */
export function shouldBlockSolutionForOpenProblem(living: LivingUnderstandingState): boolean {
  return listUnconfirmedCriticalGaps(living).includes('problemJtbd');
}

const GAP_LABEL: Record<string, string> = {
  validationTestability: '고객 관련성',
  customerPersona: '타깃 고객',
  problemJtbd: '핵심 불편',
  solution: '제공 가치',
};

function gapLabel(fieldKey: string): string {
  return GAP_LABEL[fieldKey] ?? fieldKey;
}

/** P0-3 — append prior-turn delta when gap switch follows wrong-slot merge. */
export function buildDeltaAwareWhyNow(input: {
  targetGap: string;
  baseWhyNow: string;
  wrongSlotContext: WrongSlotMergeContext | null;
}): string {
  const ctx = input.wrongSlotContext;
  if (!ctx) return input.baseWhyNow;

  const closed = gapLabel(ctx.closedGap);
  const next = gapLabel(input.targetGap);

  if (
    ctx.askedGap === 'customerPersona' &&
    ctx.closedGap === 'validationTestability' &&
    input.targetGap === 'customerPersona'
  ) {
    return `방금 확인한 ${closed}과 별도로, ${next}은 아직 미확인입니다. ${input.baseWhyNow}`;
  }

  if (
    ctx.askedGap === 'problemJtbd' &&
    ctx.closedGap === 'customerPersona' &&
    input.targetGap === 'problemJtbd'
  ) {
    return `방금 ${closed}은 확인했지만, ${next}은 아직 미확인입니다. ${input.baseWhyNow}`;
  }

  if (ctx.askedGap !== ctx.closedGap && input.targetGap !== ctx.closedGap) {
    return `방금 확인한 ${closed} → 다음은 ${next} 확인이 필요합니다. ${input.baseWhyNow}`;
  }

  return input.baseWhyNow;
}

/** Score boost for customerPersona after wrong-slot relevance closure on persona ask. */
export const PERSONA_WRONG_SLOT_BOOST = 56_000;

/** P0-2 — problem-shaped ask closed persona; problem still open → boost problem. */
export function shouldPrioritizeProblemAfterWrongSlotPersona(
  ctx: WrongSlotMergeContext | null,
): boolean {
  if (!ctx) return false;
  return ctx.askedGap === 'problemJtbd' && ctx.closedGap === 'customerPersona';
}

/** Score boost for problemJtbd after wrong-slot persona merge on problem ask. */
export const PROBLEM_WRONG_SLOT_BOOST = 56_000;
