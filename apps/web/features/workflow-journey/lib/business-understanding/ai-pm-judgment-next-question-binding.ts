/**
 * DAY 8-I P0 FIX-10 P0-FIX-A — Latest canonical judgment → next question binding.
 * Next question must follow current judgment focus, not stale gap/target artifacts.
 */

import type {
  CeoJudgmentDimensionId,
  CeoJudgmentState,
} from './ai-pm-ceo-judgment-dimensions';
import { hasCanonicalProblemPrimary } from './ai-pm-judgment-canonical-state';
import { extractProblemPrimaryText } from './ai-pm-judgment-problem-primary';
import { isAiPmJudgmentFix10V1Active } from './ai-pm-judgment-fix10-v1';
import { dimensionForGap } from './ai-pm-judgment-target-binding';
import { isSemanticCopy } from './ai-pm-judgment-target-binding';
import {
  buildDynamicNextCheckPrompt,
} from './ai-pm-judgment-next-focus';
import { inferTargetGapFromQuestionText } from './gap-question-map';
import type { NextQuestionDecision } from './decide-next-question-from-review';
import { resolveGapQuestionBinding } from './gap-question-map';
import { whyNowForGapField } from './living-understanding-state';
import { isRepeatedQuestion } from './ai-pm-no-gap-termination';
import type { AiPmLoopTurn } from './workspace-ai-pm-loop-types';
import type { JudgmentTurnTrace } from './ai-pm-judgment-trace';

const DIMENSION_TO_PRIMARY_GAP: Record<CeoJudgmentDimensionId, string> = {
  customer: 'customerPersona',
  problem: 'problemJtbd',
  solution: 'solution',
  customerChange: 'pricingHint',
};

export function gapForJudgmentDimension(id: CeoJudgmentDimensionId): string {
  return DIMENSION_TO_PRIMARY_GAP[id];
}

const FIX10_FOCUS_ORDER: CeoJudgmentDimensionId[] = [
  'customer',
  'problem',
  'solution',
  'customerChange',
];

const OFF_TRACK_GAP_RE =
  /^(payer|pricingHint|revenueModel|marketChannel|marketSizeEvidence|problemFrequencySeverity)$/;

export function isOffTrackGapForFix10(gapId: string): boolean {
  return OFF_TRACK_GAP_RE.test(gapId.trim());
}

export function isJudgmentBoundDecision(decision: NextQuestionDecision): boolean {
  return (
    decision.reason?.includes('judgment-bound') === true ||
    decision.reason?.includes('judgment-bootstrap') === true ||
    decision.actionRationale?.includes('FIX-10 P0-FIX-A') === true
  );
}

export function listFix10UnresolvedDimensions(
  judgment: CeoJudgmentState,
): CeoJudgmentDimensionId[] {
  return FIX10_FOCUS_ORDER.filter((id) => isFix10DimensionUnresolved(judgment, id));
}

function isFix10DimensionUnresolved(
  state: CeoJudgmentState,
  id: CeoJudgmentDimensionId,
): boolean {
  const d = state.dimensions[id];
  if (id === 'customer') {
    return d.status === 'unknown' || (d.status === 'needs_check' && !d.summary.trim());
  }
  if (id === 'problem') {
    if (d.status === 'unknown' || !d.summary.trim()) return true;
    if (d.status === 'needs_check') return true;
    if (isAiPmJudgmentFix10V1Active() && !hasCanonicalProblemPrimary(d)) return true;
    return d.status !== 'clear';
  }
  if (id === 'solution') {
    return d.status === 'unknown' || !d.summary.trim();
  }
  if (id === 'customerChange') {
    return d.status === 'needs_check' && Boolean(d.summary.trim());
  }
  return d.status === 'unknown' || d.status === 'needs_check';
}

/** FIX-10: core dimensions before hypothesis slots (customer → problem → solution → change). */
export function pickFix10JudgmentFocus(
  judgment: CeoJudgmentState,
): CeoJudgmentDimensionId | null {
  const recent = new Set(judgment.recentCorrections ?? []);

  if (recent.has('customer') && judgment.dimensions.customer.status !== 'unknown') {
    if (isFix10DimensionUnresolved(judgment, 'problem')) return 'problem';
  }

  if (recent.has('problem')) {
    const prob = judgment.dimensions.problem;
    if (
      isFix10DimensionUnresolved(judgment, 'problem') &&
      prob.status === 'needs_check' &&
      hasCanonicalProblemPrimary(prob)
    ) {
      return 'problem';
    }
    if (isFix10DimensionUnresolved(judgment, 'customer')) return 'customer';
    if (isFix10DimensionUnresolved(judgment, 'problem')) return 'problem';
  }

  for (const id of FIX10_FOCUS_ORDER) {
    if (isFix10DimensionUnresolved(judgment, id)) return id;
  }
  return null;
}

export type JudgmentNextQuestionAudit = {
  focusDimension: CeoJudgmentDimensionId | null;
  boundGapId: string | null;
  previousTargetGap: string;
  staleTargetDetected: boolean;
  reason: string;
};

export type Fix10TurnAudit = {
  turnIndex: number;
  ceoAnswer: string;
  answerMeaning: string;
  changedDimension: CeoJudgmentDimensionId | null;
  unresolvedDimensions: CeoJudgmentDimensionId[];
  nextFocus: CeoJudgmentDimensionId | null;
  boundGapId: string | null;
  selectedQuestion: string;
  whyNow: string;
  previousTarget: string;
  selectedTargetGap: string | null;
  staleTarget: boolean;
  verdict: 'PASS' | 'FAIL';
  failReason: string;
};

function isCustomerDefinitionText(text: string): boolean {
  return /^(?:고객(?:은|이)?|타깃|타겟|대상)/.test(text.trim()) || /^양조장(?:입니다|이)?\.?$/.test(text.trim());
}

/** Confirm value contradicts canonical judgment for the requested gap. */
export function isStaleKnowledgeForJudgment(input: {
  gapId: string;
  value: string;
  judgment: CeoJudgmentState | null | undefined;
}): boolean {
  if (!isAiPmJudgmentFix10V1Active() || !input.judgment) return false;

  const dim = dimensionForGap(input.gapId);
  if (!dim) return false;

  const val = input.value.trim();
  if (!val) return false;

  const canonical = input.judgment.dimensions[dim].summary.trim();
  const recent = new Set(input.judgment.recentCorrections ?? []);

  if (input.gapId === 'problemJtbd' && isCustomerDefinitionText(val)) {
    return true;
  }

  if (dim === 'customer' && recent.has('customer') && canonical && !isSemanticCopy(val, canonical)) {
    return true;
  }

  if (canonical && !isSemanticCopy(val, canonical)) {
    const valDim =
      isCustomerDefinitionText(val) ? 'customer' : null;
    if (valDim && valDim !== dim) return true;
  }

  return false;
}

export function turnJudgmentDimensions(
  turn: AiPmLoopTurn,
  traces: JudgmentTurnTrace[],
): CeoJudgmentDimensionId[] {
  const trace = traces.find(
    (t) =>
      t.turnId === turn.appliedAt ||
      (t.answer.trim() === turn.answer?.trim() && t.question === turn.askedQuestionText),
  );
  if (!trace) return [];
  return trace.dimensionEntries.map((e) => e.affectedDimension);
}

/** When judgment trace shows answer updated dimension X, do not reuse for other gaps. */
export function turnMapsToGapByJudgment(input: {
  turn: AiPmLoopTurn;
  gapId: string;
  traces: JudgmentTurnTrace[];
}): boolean | null {
  if (!isAiPmJudgmentFix10V1Active()) return null;
  const dims = turnJudgmentDimensions(input.turn, input.traces);
  if (dims.length === 0) return null;
  const gapDim = dimensionForGap(input.gapId);
  if (!gapDim) return null;
  return dims.includes(gapDim);
}

export function resolveJudgmentBoundTargetGap(
  judgment: CeoJudgmentState,
): { focus: CeoJudgmentDimensionId; gapId: string } | null {
  if (!isAiPmJudgmentFix10V1Active()) return null;
  const focus = pickFix10JudgmentFocus(judgment);
  if (!focus) return null;
  return { focus, gapId: gapForJudgmentDimension(focus) };
}

/** Ordered focus candidates — primary first, then remaining unresolved dimensions. */
export function listFix10FocusCandidates(
  judgment: CeoJudgmentState,
): Array<{ focus: CeoJudgmentDimensionId; gapId: string }> {
  const primary = pickFix10JudgmentFocus(judgment);
  const out: Array<{ focus: CeoJudgmentDimensionId; gapId: string }> = [];
  const seen = new Set<CeoJudgmentDimensionId>();
  const coreOpen =
    isFix10DimensionUnresolved(judgment, 'customer') ||
    isFix10DimensionUnresolved(judgment, 'problem') ||
    isFix10DimensionUnresolved(judgment, 'solution');

  if (primary) {
    out.push({ focus: primary, gapId: gapForJudgmentDimension(primary) });
    seen.add(primary);
  }
  for (const id of listFix10UnresolvedDimensions(judgment)) {
    if (seen.has(id)) continue;
    if (coreOpen && id === 'customerChange') continue;
    out.push({ focus: id, gapId: gapForJudgmentDimension(id) });
    seen.add(id);
  }
  return out;
}

function clipConfirm(text: string, max = 36): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1).trim()}…`;
}

export function buildJudgmentBoundQuestion(input: {
  focus: CeoJudgmentDimensionId;
  gapId: string;
  judgment: CeoJudgmentState;
}): Pick<NextQuestionDecision, 'questionText' | 'whyNow' | 'issueId' | 'questionType' | 'confirmKnownValue'> {
  const binding = resolveGapQuestionBinding(input.gapId);
  const whyNow =
    buildDynamicNextCheckPrompt(input.focus) ||
    whyNowForGapField(input.gapId) ||
    binding.whyNow;
  const dim = input.judgment.dimensions[input.focus];
  const summary = dim.summary.trim();

  if (
    input.focus === 'problem' &&
    dim.status === 'needs_check' &&
    summary &&
    hasCanonicalProblemPrimary(dim)
  ) {
    const primary = extractProblemPrimaryText(summary) || summary.replace(/^PRIMARY:\s*/i, '');
    return {
      issueId: binding.issueId,
      questionText: `핵심 불편은(는) 「${clipConfirm(primary)}」으로 이해했습니다. 맞나요?`,
      whyNow,
      questionType: 'confirm',
      confirmKnownValue: primary,
    };
  }

  return {
    issueId: binding.issueId,
    questionText: binding.questionText,
    whyNow,
    questionType: 'open',
  };
}

/**
 * P0-FIX-A-2 — Canonical judgment is the direct consumer of next-question selection.
 */
export function applyJudgmentNextQuestionBinding(input: {
  decision: NextQuestionDecision;
  judgment: CeoJudgmentState | null | undefined;
  turns?: AiPmLoopTurn[];
}): NextQuestionDecision {
  if (!isAiPmJudgmentFix10V1Active() || !input.judgment) {
    return input.decision;
  }

  if (
    input.decision.targetGapId === 'businessOneLiner' &&
    input.decision.questionType === 'confirm'
  ) {
    return input.decision;
  }

  const candidates = listFix10FocusCandidates(input.judgment);
  if (candidates.length === 0) return input.decision;

  let bound = candidates[0]!;
  let built = buildJudgmentBoundQuestion({ ...bound, judgment: input.judgment });

  if (input.turns?.length) {
    for (const candidate of candidates) {
      const candidateBuilt = buildJudgmentBoundQuestion({
        ...candidate,
        judgment: input.judgment,
      });
      if (!isRepeatedQuestion(input.turns, candidateBuilt.questionText)) {
        bound = candidate;
        built = candidateBuilt;
        break;
      }
    }
  }

  const staleTargetDetected =
    input.decision.targetGapId !== bound.gapId ||
    isOffTrackGapForFix10(input.decision.targetGapId);

  return {
    ...input.decision,
    targetGap: bound.gapId,
    targetGapId: bound.gapId,
    issueId: built.issueId,
    questionText: built.questionText,
    whyNow: built.whyNow,
    rationale: built.whyNow,
    reframed: staleTargetDetected || input.decision.reframed,
    questionType: built.questionType ?? 'open',
    confirmKnownValue: built.confirmKnownValue,
    confirmGapId: built.questionType === 'confirm' ? bound.gapId : undefined,
    actionRationale: `FIX-10 P0-FIX-A-2 — judgment focus ${bound.focus}`,
    reason: `judgment-bound ${bound.focus}→${bound.gapId}${staleTargetDetected ? ' (replaced off-track target)' : ''}`,
  };
}

/** Bootstrap next question purely from canonical judgment when V3 decision is null. */
export function createJudgmentBoundDecision(
  judgment: CeoJudgmentState,
): NextQuestionDecision | null {
  if (!isAiPmJudgmentFix10V1Active()) return null;
  const bound = resolveJudgmentBoundTargetGap(judgment);
  if (!bound) return null;
  const built = buildJudgmentBoundQuestion({ ...bound, judgment });
  return {
    targetGap: bound.gapId,
    targetGapId: bound.gapId,
    issueId: built.issueId,
    questionText: built.questionText,
    whyNow: built.whyNow,
    rationale: built.whyNow,
    score: 45_000,
    reframed: true,
    excludedGaps: [],
    drivenByReview: true,
    sourceAnswerId: 'judgment-bound',
    sourceReviewId: 'judgment-bound',
    reviewAction: 'advance',
    action: 'advance',
    actionRationale: `FIX-10 P0-FIX-A bootstrap — ${bound.focus}`,
    reason: `judgment-bootstrap ${bound.focus}→${bound.gapId}`,
    questionType: built.questionType ?? 'open',
    confirmKnownValue: built.confirmKnownValue,
    confirmGapId: built.questionType === 'confirm' ? bound.gapId : undefined,
  };
}

export function auditJudgmentNextQuestion(input: {
  judgment: CeoJudgmentState | null | undefined;
  selectedTargetGap?: string | null;
  previousTargetGap?: string | null;
}): JudgmentNextQuestionAudit {
  const previousTargetGap = input.previousTargetGap?.trim() ?? '';
  if (!input.judgment) {
    return {
      focusDimension: null,
      boundGapId: null,
      previousTargetGap,
      staleTargetDetected: false,
      reason: 'no judgment snapshot',
    };
  }

  const bound = resolveJudgmentBoundTargetGap(input.judgment);
  if (!bound) {
    return {
      focusDimension: null,
      boundGapId: null,
      previousTargetGap,
      staleTargetDetected: false,
      reason: 'no unresolved focus',
    };
  }

  const selected = input.selectedTargetGap?.trim() ?? '';
  const staleTargetDetected =
    Boolean(selected && selected !== bound.gapId) ||
    isOffTrackGapForFix10(selected);
  return {
    focusDimension: bound.focus,
    boundGapId: bound.gapId,
    previousTargetGap,
    staleTargetDetected,
    reason: staleTargetDetected
      ? `selected ${selected || '(empty)'} ≠ bound ${bound.gapId} (${bound.focus})`
      : `aligned on ${bound.gapId} (${bound.focus})`,
  };
}

export function buildFix10TurnAudit(input: {
  turnIndex: number;
  ceoAnswer: string;
  trace: JudgmentTurnTrace | null;
  judgment: CeoJudgmentState | null;
  previousTargetGap: string;
  nextQuestion: string | null;
  nextTargetGap?: string | null;
  nextWhyNow?: string | null;
}): Fix10TurnAudit {
  const judgment = input.judgment;
  const changed =
    input.trace?.dimensionEntries.find((e) => e.changeType === 'NEW' || e.changeType === 'CONFLICTED')
      ?.affectedDimension ??
    input.trace?.dimensionEntries[0]?.affectedDimension ??
    null;
  const answerMeaning =
    input.trace?.dimensionEntries[0]?.interpretedMeaning ??
    input.trace?.dimensionEntries[0]?.reason ??
    changed ??
    '(none)';

  if (!judgment) {
    return {
      turnIndex: input.turnIndex,
      ceoAnswer: input.ceoAnswer,
      answerMeaning: String(answerMeaning),
      changedDimension: changed,
      unresolvedDimensions: [],
      nextFocus: null,
      boundGapId: null,
      selectedQuestion: input.nextQuestion ?? '',
      whyNow: input.nextWhyNow ?? '',
      previousTarget: input.previousTargetGap,
      selectedTargetGap: input.nextTargetGap ?? null,
      staleTarget: false,
      verdict: input.nextQuestion ? 'FAIL' : 'PASS',
      failReason: input.nextQuestion ? 'missing judgment snapshot' : '',
    };
  }

  const candidates = listFix10FocusCandidates(judgment);
  const primary = candidates[0] ?? null;
  const selectedTargetGap =
    input.nextTargetGap?.trim() ||
    inferTargetGapFromQuestionText(input.nextQuestion) ||
    null;
  const matched = selectedTargetGap
    ? candidates.find((c) => c.gapId === selectedTargetGap)
    : null;
  const nextFocus = matched?.focus ?? primary?.focus ?? null;
  const boundGapId = matched?.gapId ?? primary?.gapId ?? null;
  const unresolved = listFix10UnresolvedDimensions(judgment);
  const built = primary
    ? buildJudgmentBoundQuestion({ ...primary, judgment })
    : null;
  const whyNow = input.nextWhyNow ?? built?.whyNow ?? '';
  const staleTarget =
    Boolean(primary && selectedTargetGap && !matched && selectedTargetGap !== primary.gapId) ||
    isOffTrackGapForFix10(selectedTargetGap ?? '');

  let verdict: 'PASS' | 'FAIL' = 'PASS';
  let failReason = '';

  if (input.nextQuestion) {
    if (isOffTrackGapForFix10(selectedTargetGap ?? '')) {
      verdict = 'FAIL';
      failReason = `off-track gap ${selectedTargetGap}`;
    } else if (primary && selectedTargetGap && !matched) {
      verdict = 'FAIL';
      failReason = `selected ${selectedTargetGap} ∉ judgment candidates`;
    } else if (
      boundGapId === 'problemJtbd' &&
      (/고객(?:은|이)\s*양조장/.test(input.nextQuestion) ||
        /「고객은\s*양조장/.test(input.nextQuestion))
    ) {
      verdict = 'FAIL';
      failReason = 'stale customer confirm after correction';
    }
  }

  if (input.turnIndex === 3 && changed === 'problem' && isOffTrackGapForFix10(selectedTargetGap ?? '')) {
    verdict = 'FAIL';
    failReason = 'T3 problem NEW must not advance to payer/pricing';
  }

  return {
    turnIndex: input.turnIndex,
    ceoAnswer: input.ceoAnswer,
    answerMeaning: String(answerMeaning),
    changedDimension: changed,
    unresolvedDimensions: unresolved,
    nextFocus,
    boundGapId,
    selectedQuestion: input.nextQuestion ?? '',
    whyNow,
    previousTarget: input.previousTargetGap,
    selectedTargetGap,
    staleTarget,
    verdict,
    failReason,
  };
}
