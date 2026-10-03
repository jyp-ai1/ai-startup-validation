/**
 * Project Brief — returning-founder summary of persisted AI PM state.
 * Read-only presenter: consumes stored V3 artifacts (gapState, lastDecision, turn reviews)
 * and never re-runs review, gap update, or question decision.
 */

import type { GapCompleteness } from '@repo/types/domain/answer-review';
import type { GapKnowledgeRecord, GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import {
  buildCeoSixSurfaces,
  isUserFacingSurfaceCopy,
} from '@/features/workflow-journey/lib/business-understanding/build-ceo-six-surfaces';
import {
  evaluateStageReadiness,
  STAGE_A_REQUIRED_GAPS,
  STAGE_B_REQUIRED_GAPS,
} from '@/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness';
import {
  founderFieldLabel,
  INTERNAL_DOMAIN_KEYS,
} from '@/features/workflow-journey/lib/business-understanding/founder-field-labels';
import {
  gapCeoSurfaceKind,
  gapCeoSurfaceLabel,
} from '@/features/workflow-journey/lib/business-understanding/gap-ceo-surface-label';
import type {
  AiPmLoopState,
  AiPmLoopTurn,
} from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';

const MAX_VALUE_LENGTH = 80;

const REQUIRED_GAP_ORDER: readonly string[] = [...STAGE_A_REQUIRED_GAPS, ...STAGE_B_REQUIRED_GAPS];

const INTERNAL_KEYS = new Set<string>([...INTERNAL_DOMAIN_KEYS, ...REQUIRED_GAP_ORDER]);

export type ProjectBriefItem = {
  label: string;
  statusLabel: string;
  value: string | null;
};

/** `understanding` = Stage A open · `validation` = Stage A done, Stage B open · `ready` = both done. */
export type ProjectBriefReviewStatus = 'understanding' | 'validation' | 'ready';

export type ProjectBriefState =
  | { kind: 'empty' }
  | { kind: 'unstructured'; answeredCount: number; lastAnsweredAt: string | null }
  | {
      kind: 'brief';
      answeredCount: number;
      lastAnsweredAt: string | null;
      confirmed: ProjectBriefItem[];
      unconfirmed: ProjectBriefItem[];
      conflicts: ProjectBriefItem[];
      reviewStatus: ProjectBriefReviewStatus;
      /** Founder label of the first required item still blocking the current stage. */
      blockerLabel: string | null;
      recentUnderstanding: string | null;
      nextQuestion: string | null;
      nextQuestionReason: string | null;
    };

function activeTurns(loop: AiPmLoopState): AiPmLoopTurn[] {
  return (loop.turns ?? []).filter((turn) => !turn.superseded);
}

function latestAnsweredAt(turns: AiPmLoopTurn[]): string | null {
  let latest: string | null = null;
  for (const turn of turns) {
    const at = turn.appliedAt;
    if (typeof at !== 'string' || !at) continue;
    if (!latest || at > latest) latest = at;
  }
  return latest;
}

function hasGapRecords(gapState: GapKnowledgeState | undefined): gapState is GapKnowledgeState {
  return Boolean(gapState && gapState.gaps && Object.keys(gapState.gaps).length > 0);
}

function evidenceValue(record: GapKnowledgeRecord | undefined): string | null {
  if (!record) return null;
  const joined = (record.evidence ?? [])
    .map((e) => e.value?.trim())
    .filter(Boolean)
    .join(', ');
  if (!joined || !isUserFacingSurfaceCopy(joined)) return null;
  if (joined.split(/[\s,.;:=()]+/).some((token) => INTERNAL_KEYS.has(token))) return null;
  return joined.length > MAX_VALUE_LENGTH ? `${joined.slice(0, MAX_VALUE_LENGTH - 1)}…` : joined;
}

function toItem(gapId: string, completeness: GapCompleteness, record?: GapKnowledgeRecord): ProjectBriefItem {
  return {
    label: founderFieldLabel(gapId),
    statusLabel: gapCeoSurfaceLabel(gapCeoSurfaceKind(completeness)),
    value: completeness === 'OPEN' ? null : evidenceValue(record),
  };
}

/** Required gaps first (stage order), then any other recorded gaps in stored order. */
function orderedGapIds(gapState: GapKnowledgeState): string[] {
  const recorded = Object.keys(gapState.gaps);
  const extras = recorded.filter((id) => !REQUIRED_GAP_ORDER.includes(id));
  return [...REQUIRED_GAP_ORDER, ...extras];
}

/** Design constitution bans verdict vocabulary on founder surfaces. */
const VERDICT_VOCABULARY = /\bGO\b|\bHOLD\b|NO-GO/;

function firstUserFacing(...candidates: Array<string | null | undefined>): string | null {
  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (trimmed && isUserFacingSurfaceCopy(trimmed) && !VERDICT_VOCABULARY.test(trimmed)) {
      return trimmed;
    }
  }
  return null;
}

/** Facts extracted from the latest answer — label-only fallbacks are not an "understanding". */
function recentUnderstanding(lastTurn: AiPmLoopTurn | undefined): string | null {
  const values = (lastTurn?.review?.extractedFacts ?? [])
    .map((fact) => fact.value?.trim())
    .filter((value): value is string => Boolean(value));
  const unique = [...new Set(values)];
  if (unique.length === 0) return null;
  return firstUserFacing(unique.join(' · '));
}

export function buildProjectBrief(loop: AiPmLoopState | null | undefined): ProjectBriefState {
  if (!loop) return { kind: 'empty' };

  const turns = activeTurns(loop);
  const answeredCount = turns.length;
  const lastAnsweredAt = latestAnsweredAt(turns);

  if (!hasGapRecords(loop.gapState)) {
    return answeredCount > 0
      ? { kind: 'unstructured', answeredCount, lastAnsweredAt }
      : { kind: 'empty' };
  }

  const gapState = loop.gapState;
  const confirmed: ProjectBriefItem[] = [];
  const unconfirmed: ProjectBriefItem[] = [];
  const conflicts: ProjectBriefItem[] = [];

  for (const gapId of orderedGapIds(gapState)) {
    const record = gapState.gaps[gapId];
    const completeness: GapCompleteness = record?.completeness ?? 'OPEN';
    const item = toItem(gapId, completeness, record);
    if (completeness === 'CLOSED') confirmed.push(item);
    else if (completeness === 'CONTRADICTED') conflicts.push(item);
    else unconfirmed.push(item);
  }

  const readiness = evaluateStageReadiness({ gapState, loop });
  const reviewStatus: ProjectBriefReviewStatus = !readiness.stageAReady
    ? 'understanding'
    : readiness.stageId === 'B_validation' && readiness.status === 'READY'
      ? 'ready'
      : 'validation';

  let blockerGapId: string | null = readiness.blocker?.gapId ?? null;
  if (!blockerGapId && reviewStatus === 'validation') {
    blockerGapId =
      readiness.optionalGaps.find((gap) => gap.completeness !== 'CLOSED')?.gapId ?? null;
  }

  const lastTurn = turns.at(-1);
  const surfaces = buildCeoSixSurfaces({
    lastTurn: lastTurn ?? null,
    gapState,
    loop,
  });

  const nextQuestion =
    loop.phase === 'complete' ? null : firstUserFacing(surfaces.nextQuestion);

  return {
    kind: 'brief',
    answeredCount,
    lastAnsweredAt,
    confirmed,
    unconfirmed,
    conflicts,
    reviewStatus,
    blockerLabel: blockerGapId ? founderFieldLabel(blockerGapId) : null,
    recentUnderstanding: recentUnderstanding(lastTurn),
    nextQuestion,
    nextQuestionReason: nextQuestion
      ? firstUserFacing(surfaces.whyAsk.whyNow, surfaces.whyAsk.actionRationale)
      : null,
  };
}