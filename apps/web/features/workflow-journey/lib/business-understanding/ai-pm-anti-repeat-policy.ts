/**
 * DAY 8-I P0-6 — Anti-repetition hard acceptance for question engine.
 */

import { selectAdaptiveNextGaps } from './adaptive-question-select';
import type { NextQuestionDecision } from './decide-next-question-from-review';
import { isOffTrackGapForFix10, listFix10FocusCandidates, buildJudgmentBoundQuestion } from './ai-pm-judgment-next-question-binding';
import { isAiPmJudgmentFix10V1Active } from './ai-pm-judgment-fix10-v1';
import type { CeoJudgmentState } from './ai-pm-ceo-judgment-dimensions';
import { STAGE_A_REQUIRED_GAPS, STAGE_B_REQUIRED_GAPS } from './evaluate-stage-readiness';
import { resolveGapQuestionBinding } from './gap-question-map';
import type { LivingUnderstandingState } from './living-understanding-state';
import { whyNowForGapField } from './living-understanding-state';
import { isSameMeaningQuestion } from './reframe-question';
import { isGapAskable } from './update-gap-state-from-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';

const REFRAME_SUFFIXES = [
  '다시 한번 확인해 주세요.',
  '조금 더 구체적으로 알려 주세요.',
  '한 가지만 더 짚어 주세요.',
  '이 부분만 짧게 알려 주세요.',
];

function normalizeQuestion(text: string): string {
  return text.trim().replace(/\s+/g, ' ');
}

function askedQuestionTexts(turns: AiPmLoopTurn[]): string[] {
  const out: string[] = [];
  for (const t of turns) {
    if (t.superseded) continue;
    const q = t.askedQuestionText?.trim();
    if (q) out.push(normalizeQuestion(q));
  }
  return out;
}

function wasQuestionAskedBefore(turns: AiPmLoopTurn[], questionText: string): boolean {
  const norm = normalizeQuestion(questionText);
  return askedQuestionTexts(turns).some(
    (q) => q === norm || isSameMeaningQuestion(q, norm),
  );
}

function pickAlternateGap(input: {
  currentGap: string;
  living: LivingUnderstandingState;
  turns: AiPmLoopTurn[];
  gapState: GapKnowledgeState;
}): string | null {
  const exclude = new Set<string>([input.currentGap]);
  for (const gapId of Object.keys(input.gapState.gaps)) {
    if (!isGapAskable(gapId, input.gapState)) exclude.add(gapId);
  }

  for (const gapId of [...STAGE_A_REQUIRED_GAPS, ...STAGE_B_REQUIRED_GAPS]) {
    if (exclude.has(gapId)) continue;
    if (isGapAskable(gapId, input.gapState)) return gapId;
  }

  const candidates = selectAdaptiveNextGaps(input.living, {
    excludeGaps: exclude,
    turns: input.turns,
  });
  for (const c of candidates) {
    if (isGapAskable(c.fieldKey, input.gapState)) return c.fieldKey;
  }
  return null;
}

function reframeWithSuffix(questionText: string, priorCount: number): string {
  const base = questionText.replace(/[?？]\s*$/, '').trim();
  const suffix = REFRAME_SUFFIXES[priorCount % REFRAME_SUFFIXES.length]!;
  return `${base}? ${suffix}`;
}

export function applyAntiRepeatPolicy(input: {
  decision: NextQuestionDecision;
  turns: AiPmLoopTurn[];
  living: LivingUnderstandingState;
  gapState: GapKnowledgeState;
  judgment?: CeoJudgmentState | null;
}): NextQuestionDecision {
  const { decision, turns, living, gapState, judgment } = input;
  const q = decision.questionText?.trim() ?? '';
  if (!q) return decision;

  const priorTexts = askedQuestionTexts(turns);
  const repeatCount = priorTexts.filter(
    (t) => t === normalizeQuestion(q) || isSameMeaningQuestion(t, q),
  ).length;

  if (repeatCount === 0) return decision;

  if (isAiPmJudgmentFix10V1Active() && judgment) {
    for (const candidate of listFix10FocusCandidates(judgment)) {
      if (candidate.gapId === decision.targetGapId) continue;
      if (isOffTrackGapForFix10(candidate.gapId)) continue;
      const built = buildJudgmentBoundQuestion({
        focus: candidate.focus,
        gapId: candidate.gapId,
        judgment,
      });
      if (!wasQuestionAskedBefore(turns, built.questionText)) {
        return {
          ...decision,
          targetGap: candidate.gapId,
          targetGapId: candidate.gapId,
          issueId: built.issueId,
          questionText: built.questionText,
          whyNow: built.whyNow,
          action: 'advance',
          reviewAction: 'advance',
          actionRationale: '동일 질문 반복 방지 — judgment focus로 이동합니다.',
          reason: `anti-repeat judgment advance to ${candidate.focus}→${candidate.gapId}`,
          reframed: true,
        };
      }
    }
    const reframed = reframeWithSuffix(q, repeatCount);
    if (reframed !== q) {
      return {
        ...decision,
        questionText: reframed,
        actionRationale: '동일 질문 반복 방지 — 표현을 바꿔 재확인합니다.',
        reason: `${decision.reason}; anti-repeat reframe`,
        reframed: true,
      };
    }
    return decision;
  }

  const alternateGap = pickAlternateGap({
    currentGap: decision.targetGapId,
    living,
    turns,
    gapState,
  });

  if (alternateGap && repeatCount >= 1) {
    const binding = resolveGapQuestionBinding(alternateGap);
    const altQ = binding.questionText;
    if (!wasQuestionAskedBefore(turns, altQ)) {
      return {
        ...decision,
        targetGap: alternateGap,
        targetGapId: alternateGap,
        issueId: binding.issueId,
        questionText: altQ,
        whyNow: whyNowForGapField(alternateGap) || binding.whyNow,
        action: 'advance',
        reviewAction: 'advance',
        actionRationale: '동일 질문 반복 방지 — 다음 주제로 이동합니다.',
        reason: `anti-repeat advance from ${decision.targetGapId} to ${alternateGap}`,
        reframed: true,
      };
    }
  }

  const reframed = reframeWithSuffix(q, repeatCount);
  if (reframed !== q) {
    return {
      ...decision,
      questionText: reframed,
      actionRationale: '동일 질문 반복 방지 — 표현을 바꿔 재확인합니다.',
      reason: `${decision.reason}; anti-repeat reframe`,
      reframed: true,
    };
  }

  return decision;
}

export function countExactQuestionRepeats(turns: AiPmLoopTurn[]): number {
  const seen = new Map<string, number>();
  let repeats = 0;
  for (const t of turns) {
    if (t.superseded) continue;
    const q = t.askedQuestionText?.trim();
    if (!q) continue;
    const norm = normalizeQuestion(q);
    const count = seen.get(norm) ?? 0;
    if (count > 0) repeats += 1;
    seen.set(norm, count + 1);
  }
  return repeats;
}
