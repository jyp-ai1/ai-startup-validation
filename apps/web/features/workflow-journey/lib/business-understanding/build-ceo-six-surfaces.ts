/**
 * PR6 — CEO 6-surface presenter (S17).
 * Renders persisted artifacts only — no semantic recalculation or live rank.
 */

import type { AnswerReview } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import type { NextQuestionDecision } from './decide-next-question-from-review';
import type { LockedAskSurface } from './question-transition-lock';
import { resolveRemountAskSurface } from './resolve-remount-ask-surface';
import type { AiPmLoopState, AiPmLoopTurn } from './workspace-ai-pm-loop-types';

/** Surface ⑤ internal order: actionRationale → whyNow → questionText */
export type CeoSurfaceFive = {
  actionRationale: string;
  whyNow: string;
  questionText: string;
};

export type CeoSixSurfaces = {
  /** ① 내 답변 */
  userAnswer: string | null;
  /** ② AI가 이해한 내용 */
  aiUnderstanding: string | null;
  /** ③ 확인된 내용 */
  confirmedFacts: string[];
  /** ④ 아직 확인되지 않은 내용 */
  unconfirmedItems: string[];
  /** ⑤ 왜 이것을 묻는지 */
  whyAsk: CeoSurfaceFive;
  /** ⑥ 다음 질문 */
  nextQuestion: string | null;
};

const GAP_LABELS: Record<string, string> = {
  payer: '지불 주체',
  customerPersona: '고객',
  problemJtbd: '핵심 문제',
  businessOneLiner: '사업 한 줄',
  marketChannel: '시장',
  alternativesCompetitors: '경쟁/대안',
  differentiationVsAlternatives: '차별점',
  validationTestability: '검증 가능성',
};

const FORBIDDEN_UI_PATTERNS = [
  /\btargetGapId\b/i,
  /\breviewId\b/i,
  /\bscore\b/i,
  /\brecommendedAction\b/i,
  /핵심 공백/,
  /다시 묻습니다/,
];

export function isUserFacingSurfaceCopy(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  return !FORBIDDEN_UI_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function gapLabel(gapId: string): string {
  return GAP_LABELS[gapId] ?? gapId;
}

function formatAiUnderstanding(review: AnswerReview): string | null {
  if (review.extractedFacts.length > 0) {
    const values = review.extractedFacts
      .map((f) => f.value.trim())
      .filter(Boolean);
    if (values.length === 1) return values[0]!;
    if (values.length > 1) return values.join('; ');
  }
  if (review.known.length > 0) return review.known.join('. ');
  const rationale = review.rationale?.trim();
  return rationale || null;
}

function confirmedFromArtifacts(
  review: AnswerReview | undefined,
  gapState?: GapKnowledgeState,
): string[] {
  const items = new Set<string>();

  for (const line of review?.known ?? []) {
    if (isUserFacingSurfaceCopy(line)) items.add(line);
  }

  if (gapState) {
    for (const record of Object.values(gapState.gaps)) {
      if (record.completeness !== 'CLOSED') continue;
      const evidence = record.evidence.map((e) => e.value).filter(Boolean).join(', ');
      const value = evidence || record.rationale?.trim();
      if (!value) continue;
      const line = `확인됨: ${gapLabel(record.gapId)} → ${value}`;
      if (isUserFacingSurfaceCopy(line)) items.add(line);
    }
  }

  return [...items];
}

function unconfirmedFromArtifacts(
  review: AnswerReview | undefined,
  gapState?: GapKnowledgeState,
): string[] {
  const items = new Set<string>();

  for (const line of [...(review?.unknown ?? []), ...(review?.unconfirmed ?? [])]) {
    if (isUserFacingSurfaceCopy(line)) items.add(line);
  }

  if (gapState) {
    for (const record of Object.values(gapState.gaps)) {
      if (record.completeness !== 'OPEN' && record.completeness !== 'PARTIAL') continue;
      const line = `아직 필요: ${gapLabel(record.gapId)}`;
      if (isUserFacingSurfaceCopy(line)) items.add(line);
    }
  }

  return [...items];
}

function buildSurfaceFive(input: {
  lastDecision?: NextQuestionDecision | null;
  lockedAskSurface?: LockedAskSurface | null;
  loop?: AiPmLoopState;
}): CeoSurfaceFive {
  const remount =
    input.loop != null
      ? resolveRemountAskSurface(input.loop)
      : null;

  const actionRationale =
    input.lastDecision?.actionRationale?.trim() ||
    remount?.rationale?.trim() ||
    input.lockedAskSurface?.rationale?.trim() ||
    '';

  const whyNow =
    input.lastDecision?.whyNow?.trim() ||
    remount?.whyNow?.trim() ||
    input.lockedAskSurface?.whyNow?.trim() ||
    '';

  const questionText =
    input.lastDecision?.questionText?.trim() ||
    remount?.questionText?.trim() ||
    input.lockedAskSurface?.questionText?.trim() ||
    '';

  return { actionRationale, whyNow, questionText };
}

/** Build CEO 6 surfaces from persisted loop artifacts (post-answer UX). */
export function buildCeoSixSurfaces(input: {
  lastTurn: AiPmLoopTurn | null;
  gapState?: GapKnowledgeState;
  lastDecision?: NextQuestionDecision | null;
  lockedAskSurface?: LockedAskSurface | null;
  loop?: AiPmLoopState;
}): CeoSixSurfaces {
  const review = input.lastTurn?.review;
  const whyAsk = buildSurfaceFive(input);
  const nextQuestion = whyAsk.questionText || null;

  return {
    userAnswer: input.lastTurn?.answer?.trim() || null,
    aiUnderstanding: review ? formatAiUnderstanding(review) : null,
    confirmedFacts: confirmedFromArtifacts(review, input.gapState),
    unconfirmedItems: unconfirmedFromArtifacts(review, input.gapState),
    whyAsk,
    nextQuestion,
  };
}

/** Surface ⑤ render lines in frozen order (S14 §7). */
export function renderSurfaceFiveLines(whyAsk: CeoSurfaceFive): string[] {
  return [whyAsk.actionRationale, whyAsk.whyNow, whyAsk.questionText].filter(
    (line) => line.trim().length > 0,
  );
}
