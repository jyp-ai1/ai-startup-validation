/**
 * PR6 — CEO 6-surface presenter (S17).
 * Renders persisted artifacts only — no semantic recalculation or live rank.
 */

import type { AnswerReview } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import type { NextQuestionDecision } from './decide-next-question-from-review';
import { founderFieldLabel } from './founder-field-labels';
import type { LockedAskSurface } from './question-transition-lock';
import { resolveRemountAskSurface } from './resolve-remount-ask-surface';
import { isGapAskable } from './update-gap-state-from-review';
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
  solution: '핵심 방법',
  revenueModel: '수익',
  categoryScope: '시장 범위',
  problemFrequencySeverity: '문제 빈도·심각도',
};

const INTERNAL_GAP_IDS = new Set(Object.keys(GAP_LABELS));

const FORBIDDEN_UI_PATTERNS = [
  /\btargetGapId\b/i,
  /\breviewId\b/i,
  /\bscore\b/i,
  /\brecommendedAction\b/i,
  /핵심 공백/,
  /다시 묻습니다/,
  /의미\s*라우팅/i,
  /\bprimary\s*=/i,
  /\bsignal\s*[≥>=]/i,
  /\basked-slot\b/i,
  /\brouting\b/i,
];

export function isUserFacingSurfaceCopy(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (isInternalGapId(trimmed)) return false;
  return !FORBIDDEN_UI_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function isInternalGapId(text: string): boolean {
  return INTERNAL_GAP_IDS.has(text.trim());
}

function gapLabel(gapId: string): string {
  return GAP_LABELS[gapId] ?? '확인 항목';
}

/** Strip routing/engine metadata — display layer only. */
function sanitizeUserFacingValue(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed || isInternalGapId(trimmed)) return null;
  if (!isUserFacingSurfaceCopy(trimmed)) return null;
  return trimmed;
}

function isPersistedTargetAskable(
  targetGap: string | undefined,
  gapState?: GapKnowledgeState,
): boolean {
  const trimmed = targetGap?.trim();
  if (!trimmed || !gapState) return true;
  return isGapAskable(trimmed, gapState);
}

function sanitizePersistedDecision(
  decision: NextQuestionDecision | null | undefined,
  gapState?: GapKnowledgeState,
): NextQuestionDecision | null | undefined {
  if (!decision) return decision;
  const target = decision.targetGapId ?? decision.targetGap;
  if (!isPersistedTargetAskable(target, gapState)) return null;
  return decision;
}

function sanitizeLockedAskSurface(
  lock: LockedAskSurface | null | undefined,
  gapState?: GapKnowledgeState,
): LockedAskSurface | null | undefined {
  if (!lock) return lock;
  if (!isPersistedTargetAskable(lock.targetGap, gapState)) return null;
  return lock;
}

function formatAiUnderstanding(review: AnswerReview): string | null {
  if (review.extractedFacts.length > 0) {
    const values = review.extractedFacts
      .map((f) => f.value.trim())
      .filter(Boolean);
    if (values.length === 1) return values[0]!;
    if (values.length > 1) return values.join('; ');
  }
  if (review.known.length > 0) {
    const labels = review.known
      .map((item) => {
        const trimmed = item.trim();
        if (!trimmed) return null;
        return isInternalGapId(trimmed) ? founderFieldLabel(trimmed) : trimmed;
      })
      .filter(Boolean) as string[];
    if (labels.length > 0) return labels.join('. ');
  }
  const rationale = review.rationale?.trim();
  return rationale || null;
}

function confirmedFromArtifacts(
  review: AnswerReview | undefined,
  gapState?: GapKnowledgeState,
): string[] {
  const items = new Set<string>();

  for (const line of review?.known ?? []) {
    const trimmed = line.trim();
    if (isInternalGapId(trimmed)) {
      items.add(`확인됨: ${gapLabel(trimmed)}`);
      continue;
    }
    if (isUserFacingSurfaceCopy(trimmed)) items.add(trimmed);
  }

  if (gapState) {
    for (const record of Object.values(gapState.gaps)) {
      if (record.completeness !== 'CLOSED') continue;
      const evidence = record.evidence.map((e) => e.value).filter(Boolean).join(', ');
      const value =
        sanitizeUserFacingValue(evidence) ??
        sanitizeUserFacingValue(record.rationale?.trim() ?? '');
      const line = value
        ? `확인됨: ${gapLabel(record.gapId)} → ${value}`
        : `확인됨: ${gapLabel(record.gapId)}`;
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
    const trimmed = line.trim();
    if (isInternalGapId(trimmed)) {
      items.add(`아직 필요: ${gapLabel(trimmed)}`);
      continue;
    }
    if (isUserFacingSurfaceCopy(trimmed)) items.add(trimmed);
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
  gapState?: GapKnowledgeState;
}): CeoSurfaceFive {
  const gapState = input.gapState ?? input.loop?.gapState;
  const lastDecision = sanitizePersistedDecision(input.lastDecision, gapState);
  const lockedAskSurface = sanitizeLockedAskSurface(input.lockedAskSurface, gapState);

  const remount =
    input.loop != null
      ? resolveRemountAskSurface(input.loop)
      : null;
  const remountTarget = remount?.targetGap;
  const safeRemount =
    remount && isPersistedTargetAskable(remountTarget, gapState) ? remount : null;

  const actionRationale =
    lastDecision?.actionRationale?.trim() ||
    safeRemount?.rationale?.trim() ||
    lockedAskSurface?.rationale?.trim() ||
    '';

  const whyNow =
    lastDecision?.whyNow?.trim() ||
    safeRemount?.whyNow?.trim() ||
    lockedAskSurface?.whyNow?.trim() ||
    '';

  const questionText =
    lastDecision?.questionText?.trim() ||
    safeRemount?.questionText?.trim() ||
    lockedAskSurface?.questionText?.trim() ||
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
  const gapState = input.gapState ?? input.loop?.gapState;
  const whyAsk = buildSurfaceFive({
    ...input,
    lastDecision: sanitizePersistedDecision(input.lastDecision ?? input.loop?.lastDecision, gapState),
    lockedAskSurface: sanitizeLockedAskSurface(
      input.lockedAskSurface ?? input.loop?.lockedAskSurface,
      gapState,
    ),
    gapState,
  });
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
