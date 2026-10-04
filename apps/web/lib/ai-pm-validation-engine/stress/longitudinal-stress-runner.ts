/**
 * Phase 2-D — Longitudinal stress runner.
 * Business → AI PM question (production decision path) → adaptive User Agent answer →
 * Answer Review → Gap State → next AI PM question … for 10–40+ turns, evaluated per turn (L1–L5).
 */

import type { ExtractedFact } from '@repo/types/domain/answer-review';
import type { GapKnowledgeState } from '@repo/types/domain/gap-knowledge-state';

import { buildAnswerReview } from '@/features/workflow-journey/lib/business-understanding/build-answer-review';
import { buildBusinessUnderstanding } from '@/features/workflow-journey/lib/business-understanding/build-business-understanding';
import { buildConversationMemoryFromSources } from '@/features/workflow-journey/lib/business-understanding/build-conversation-memory';
import {
  evaluateStageReadiness,
  STAGE_A_REQUIRED_GAPS,
  STAGE_B_REQUIRED_GAPS,
} from '@/features/workflow-journey/lib/business-understanding/evaluate-stage-readiness';
import { decideNextQuestionFromReview } from '@/features/workflow-journey/lib/business-understanding/decide-next-question-from-review';
import { resolveGapQuestionBinding } from '@/features/workflow-journey/lib/business-understanding/gap-question-map';
import { buildLivingUnderstandingState } from '@/features/workflow-journey/lib/business-understanding/living-understanding-state';
import { resolveNextQuestionDecision } from '@/features/workflow-journey/lib/business-understanding/resolve-next-question-decision';
import {
  createEmptyGapState,
  getClosedGapIds,
  updateGapStateFromReview,
} from '@/features/workflow-journey/lib/business-understanding/update-gap-state-from-review';
import { setV3ReviewPipelineForTest } from '@/features/workflow-journey/lib/business-understanding/v3-review-pipeline';
import type { AiPmLoopTurn } from '@/features/workflow-journey/lib/business-understanding/workspace-ai-pm-loop-types';

import {
  snapshotFactsFromGapState,
  snapshotGapCompleteness,
} from '../../ai-pm-accuracy/accuracy-turn-harness';
import { isGapPriorityAligned } from '../gap-priority-evaluator';

import {
  createStressAgentMemory,
  generateStressAnswer,
  pickBehavior,
  seededRandom,
  type StressBehavior,
  type StressClaim,
} from './adaptive-user-agent';
import type { StressBusinessTruth } from './stress-business-universe';

export const STRESS_REQUIRED_GAPS: readonly string[] = [
  ...STAGE_A_REQUIRED_GAPS,
  ...STAGE_B_REQUIRED_GAPS,
];

/** Gaps the Answer Review can populate from a semantic fact key; others close via the asked-gap verdict only. */
const FACT_KEYED_GAPS: ReadonlySet<string> = new Set([
  'payer',
  'customerPersona',
  'problemJtbd',
  'businessOneLiner',
  'revenueModel',
  'marketChannel',
  'alternativesCompetitors',
  'differentiationVsAlternatives',
]);

export type StressGtState = 'OPEN' | 'CLOSED' | 'ASSUMPTION' | 'CONFLICT';

export type StressFindingCode =
  // L1 Understanding
  | 'L1_VALUE_MISMATCH'
  | 'L1_MISSED_FACT'
  // L2 State
  | 'L2_UNSUPPORTED_CLOSE'
  | 'L2_MISSED_CONFLICT'
  | 'L2_FALSE_CONTRADICTION'
  | 'L2_OVERCONFIDENT_CLOSE'
  | 'L2_UNDER_CLOSE'
  | 'L2_STORED_VALUE_MISMATCH'
  // L3 Gap
  | 'L3_REOPENED_CLOSED'
  | 'L3_ASKED_SLOT_POLLUTION'
  // L4 Question
  | 'L4_ASK_CLOSED_GAP'
  | 'L4_PRIORITY_SKIP'
  | 'L4_REPEAT_LOOP'
  | 'L4_QUESTION_LEAK'
  | 'L4_PREMATURE_STOP'
  // L5 Reasoning
  | 'L5_EVIDENCE_OVERCLAIM';

export type StressSeverity = 'high' | 'medium' | 'low';

export const STRESS_FINDING_SEVERITY: Record<StressFindingCode, StressSeverity> = {
  L1_VALUE_MISMATCH: 'high',
  L1_MISSED_FACT: 'low',
  L2_UNSUPPORTED_CLOSE: 'high',
  L2_MISSED_CONFLICT: 'high',
  L2_FALSE_CONTRADICTION: 'high',
  L2_OVERCONFIDENT_CLOSE: 'high',
  L2_UNDER_CLOSE: 'low',
  L2_STORED_VALUE_MISMATCH: 'high',
  L3_REOPENED_CLOSED: 'high',
  L3_ASKED_SLOT_POLLUTION: 'high',
  L4_ASK_CLOSED_GAP: 'high',
  L4_PRIORITY_SKIP: 'medium',
  L4_REPEAT_LOOP: 'medium',
  L4_QUESTION_LEAK: 'high',
  L4_PREMATURE_STOP: 'high',
  L5_EVIDENCE_OVERCLAIM: 'high',
};

export type StressFinding = { code: StressFindingCode; gap: string | null; detail: string };

export type StressTurnRow = {
  businessId: string;
  sessionLength: number;
  turn: number;
  askedGapId: string;
  askedQuestionText: string;
  behavior: StressBehavior;
  scheduledBehavior: StressBehavior;
  userAnswer: string;
  claims: StressClaim[];
  extractedFacts: Array<Pick<ExtractedFact, 'key' | 'value' | 'evidenceClass' | 'targetGap'>>;
  contradictions: number;
  aiGapsAfter: Record<string, string>;
  gtGapsAfter: Record<string, StressGtState>;
  nextTargetGap: string | null;
  nextQuestionText: string | null;
  /** Asked via the raw V3 decider after the production path stopped with required gaps open. */
  continuation: boolean;
  findings: StressFinding[];
};

export type StressSessionResult = {
  businessId: string;
  sessionLength: number;
  turnsRun: number;
  terminatedEarly: boolean;
  /** Ended because every Stage A + B required gap is CLOSED. */
  completed: boolean;
  /** Turn after which the production path returned null while required gaps were still open. */
  prematureStopAfterTurn: number | null;
  rows: StressTurnRow[];
};

const LEAK_RE =
  /아직 문서에서 사업 내용을 충분히|「[^」]*(?:타겟:|핵심 문제:|문제:|구매:|사용:|수익:)|\b[a-z]+[A-Z][A-Za-z]+\b/u;

function norm(text: string): string {
  return text.replace(/[\s.,·]/g, '').toLowerCase();
}

function valuesMatch(expected: string, actual: string): boolean {
  const e = norm(expected);
  const a = norm(actual);
  if (!e || !a) return false;
  return a.includes(e) || (e.includes(a) && a.length >= Math.ceil(e.length * 0.6));
}

function storedValue(gapState: GapKnowledgeState, gap: string): string | null {
  const ev = gapState.gaps[gap]?.evidence ?? [];
  return ev.length ? ev[ev.length - 1]!.value : null;
}

function applyClaimsToGt(
  gt: Record<string, StressGtState>,
  gtValue: Record<string, string>,
  claims: StressClaim[],
): void {
  for (const c of claims) {
    if (c.kind === 'repetition') continue;
    if (c.kind === 'contradiction') {
      gt[c.gap] = 'CONFLICT';
      continue;
    }
    if (c.evidence === 'ASSUMPTION') {
      if (gt[c.gap] !== 'CLOSED') gt[c.gap] = 'ASSUMPTION';
      continue;
    }
    gt[c.gap] = 'CLOSED';
    gtValue[c.gap] = c.value;
  }
}

function evaluateTurn(input: {
  row: Omit<StressTurnRow, 'findings'>;
  prevAiGaps: Record<string, string>;
  prevGt: Record<string, StressGtState>;
  gtValue: Record<string, string>;
  gapState: GapKnowledgeState;
  questionHistory: string[];
}): StressFinding[] {
  const { row, prevAiGaps, prevGt, gtValue, gapState } = input;
  const out: StressFinding[] = [];
  const add = (code: StressFindingCode, gap: string | null, detail: string) =>
    out.push({ code, gap, detail });
  const touched = new Set(row.claims.map((c) => c.gap));

  // L1 — per-claim understanding
  for (const c of row.claims) {
    if (c.kind === 'repetition' || c.evidence !== 'FACT' || !FACT_KEYED_GAPS.has(c.gap)) continue;
    const fact = row.extractedFacts.find((f) => f.targetGap === c.gap);
    if (!fact) add('L1_MISSED_FACT', c.gap, `no fact for ${c.gap}`);
    else if (!valuesMatch(c.value, fact.value))
      add('L1_VALUE_MISMATCH', c.gap, `expected "${c.value}" got "${fact.value}"`);
  }

  // L3 — asked-slot pollution: no claim for the asked gap, yet a FACT lands on it
  if (!touched.has(row.askedGapId)) {
    const polluting = row.extractedFacts.find(
      (f) => f.targetGap === row.askedGapId && f.evidenceClass === 'FACT',
    );
    if (polluting && prevAiGaps[row.askedGapId] !== 'CLOSED' && row.aiGapsAfter[row.askedGapId] === 'CLOSED') {
      add('L3_ASKED_SLOT_POLLUTION', row.askedGapId, `${row.behavior}: "${polluting.value}"`);
    }
  }

  for (const gap of STRESS_REQUIRED_GAPS) {
    const ai = row.aiGapsAfter[gap];
    const prevAi = prevAiGaps[gap];
    const gt = row.gtGapsAfter[gap] ?? 'OPEN';
    const changed = ai !== prevAi;

    // L3 — CLOSED monotonicity (only an explicit contradiction may reopen)
    if (prevAi === 'CLOSED' && ai !== 'CLOSED') {
      const legit = row.claims.some((c) => c.gap === gap && c.kind === 'contradiction');
      if (!legit) {
        const isRepeat = row.claims.some((c) => c.gap === gap && c.kind === 'repetition');
        add(
          isRepeat && ai === 'CONTRADICTED' ? 'L2_FALSE_CONTRADICTION' : 'L3_REOPENED_CLOSED',
          gap,
          `${prevAi}→${ai} on ${row.behavior}`,
        );
        continue;
      }
    }

    if (!changed && prevGt[gap] === gt) continue;

    if (gt === 'OPEN' && ai === 'CLOSED' && changed) {
      add('L2_UNSUPPORTED_CLOSE', gap, `${row.behavior} closed ${gap} without evidence`);
    } else if (gt === 'OPEN' && ai === 'CONTRADICTED' && changed) {
      add('L2_FALSE_CONTRADICTION', gap, `${row.behavior}`);
    } else if (gt === 'ASSUMPTION' && ai === 'CLOSED') {
      add('L2_OVERCONFIDENT_CLOSE', gap, `${row.behavior}`);
    } else if (gt === 'CONFLICT' && ai === 'CLOSED') {
      add('L2_MISSED_CONFLICT', gap, `${row.behavior}`);
    } else if (gt === 'CLOSED' && ai === 'CONTRADICTED') {
      add('L2_FALSE_CONTRADICTION', gap, `${row.behavior}`);
    } else if (gt === 'CLOSED' && ai !== 'CLOSED' && touched.has(gap)) {
      add('L2_UNDER_CLOSE', gap, `${row.behavior}: AI ${ai ?? 'absent'}`);
    }
  }

  // L2 — stored value must be the value the founder stands behind (correction / answer)
  for (const c of row.claims) {
    if (c.evidence !== 'FACT' || c.kind === 'contradiction' || c.kind === 'repetition') continue;
    if (row.aiGapsAfter[c.gap] !== 'CLOSED') continue;
    const stored = storedValue(gapState, c.gap);
    if (stored && !valuesMatch(gtValue[c.gap] ?? c.value, stored)) {
      add('L2_STORED_VALUE_MISMATCH', c.gap, `stored "${stored}" expected "${gtValue[c.gap] ?? c.value}"`);
    }
  }

  // L5 — hedged / overclaimed answers must not become FACT
  if (row.behavior === 'uncertainty' || row.behavior === 'overclaim') {
    const fact = row.extractedFacts.find((f) => f.evidenceClass === 'FACT');
    if (fact) add('L5_EVIDENCE_OVERCLAIM', fact.targetGap, `${row.behavior}: ${fact.key} FACT`);
  }

  // L4 — next question
  if (row.nextTargetGap) {
    if (row.aiGapsAfter[row.nextTargetGap] === 'CLOSED') {
      add('L4_ASK_CLOSED_GAP', row.nextTargetGap, 'next target already CLOSED');
    } else if (!isGapPriorityAligned(row.nextTargetGap, row.aiGapsAfter).pass) {
      add('L4_PRIORITY_SKIP', row.nextTargetGap, 'skips an unfinished stage');
    }
  }
  if (row.nextQuestionText) {
    if (LEAK_RE.test(row.nextQuestionText)) {
      add('L4_QUESTION_LEAK', row.nextTargetGap, row.nextQuestionText.slice(0, 120));
    }
    const h = input.questionHistory;
    if (h.length >= 2 && h[h.length - 1] === row.nextQuestionText && h[h.length - 2] === row.nextQuestionText) {
      add('L4_REPEAT_LOOP', row.nextTargetGap, 'same question 3× in a row');
    }
  }

  return out;
}

export function runStressSession(input: {
  truth: StressBusinessTruth;
  sessionLength: number;
}): StressSessionResult {
  setV3ReviewPipelineForTest(true);
  const { truth } = input;
  const rand = seededRandom(`${truth.id}:${input.sessionLength}`);
  const memory = createStressAgentMemory();
  const understanding = buildBusinessUnderstanding(truth.documentText) ?? undefined;

  let gapState = createEmptyGapState();
  let existingFactsByKey: Partial<Record<string, string | null>> = {};
  const loopTurns: AiPmLoopTurn[] = [];
  const gt: Record<string, StressGtState> = {};
  const gtValue: Record<string, string> = {};
  const rows: StressTurnRow[] = [];
  const questionHistory: string[] = [];

  const livingNow = () => {
    const mem = buildConversationMemoryFromSources({
      projectId: truth.id,
      documentText: truth.documentText,
      turns: loopTurns,
      entities: null,
      previous: null,
    });
    return {
      memory: mem,
      living: buildLivingUnderstandingState({
        documentText: truth.documentText,
        understanding: understanding!,
        turns: loopTurns,
        memory: mem,
      }),
    };
  };

  const allRequiredClosed = () =>
    STRESS_REQUIRED_GAPS.every((g) => gapState.gaps[g]?.completeness === 'CLOSED');

  let continuation = false;
  let prematureStopAfterTurn: number | null = null;

  const decide = (previousQuestionText: string | null, turn: number) => {
    const { living, memory: mem } = livingNow();
    if (!continuation) {
      const resolved = resolveNextQuestionDecision({
        living,
        turns: loopTurns,
        memory: mem,
        gapState,
        previousQuestionText,
      });
      if (resolved || allRequiredClosed()) return { decision: resolved, stopped: false };
      continuation = true;
      prematureStopAfterTurn = turn;
    }
    const lastReview = [...loopTurns].reverse().find((x) => x.review)?.review ?? null;
    const raw = decideNextQuestionFromReview({
      living,
      turns: loopTurns,
      memory: mem,
      lastReview,
      gapState,
      stageReadiness: evaluateStageReadiness({ gapState, turns: loopTurns }),
      previousQuestionText,
    });
    return { decision: raw, stopped: prematureStopAfterTurn === turn };
  };

  let decision = decide(null, 0).decision;
  let terminatedEarly = false;

  for (let t = 1; t <= input.sessionLength; t += 1) {
    if (!decision) {
      terminatedEarly = true;
      break;
    }
    const askedInContinuation = continuation;
    const askedGapId = decision.targetGap ?? 'customerPersona';
    const binding = resolveGapQuestionBinding(askedGapId);
    const askedQuestionText = decision.questionText ?? binding.questionText;
    questionHistory.push(askedQuestionText);

    const userTurn = generateStressAnswer({
      truth,
      askedGapId,
      behavior: pickBehavior(rand),
      answeredGaps: Object.keys(memory.answeredText),
      memory,
      rand,
    });

    const prevAiGaps = snapshotGapCompleteness(gapState);
    const prevGt = { ...gt };
    applyClaimsToGt(gt, gtValue, userTurn.claims);

    const turnId = `${truth.id}-L${input.sessionLength}-t${t}`;
    const { review, semantic } = buildAnswerReview({
      turnId,
      askedGapId,
      askedQuestionText,
      askedIssueId: binding.issueId,
      userAnswer: userTurn.text,
      displayedQuestionText: askedQuestionText,
      existingFactsByKey,
      priorClosedGaps: getClosedGapIds(gapState),
    });
    gapState = updateGapStateFromReview(review, gapState);
    existingFactsByKey = snapshotFactsFromGapState(gapState);
    loopTurns.push({
      issueId: binding.issueId,
      answer: userTurn.text,
      appliedAt: turnId,
      targetGap: askedGapId,
      askedQuestionText,
      semanticFactKey: semantic.factKey,
      semanticFactKeys: semantic.facts.map((f) => f.key),
      intent: semantic.intent,
      review,
    });

    const next = decide(askedQuestionText, t);
    decision = next.decision;

    const base: Omit<StressTurnRow, 'findings'> = {
      businessId: truth.id,
      sessionLength: input.sessionLength,
      turn: t,
      askedGapId,
      askedQuestionText,
      behavior: userTurn.behavior,
      scheduledBehavior: userTurn.scheduledBehavior,
      userAnswer: userTurn.text,
      claims: userTurn.claims,
      extractedFacts: review.extractedFacts.map((f) => ({
        key: f.key,
        value: f.value,
        evidenceClass: f.evidenceClass,
        targetGap: f.targetGap,
      })),
      contradictions: review.contradictions.length,
      aiGapsAfter: snapshotGapCompleteness(gapState),
      gtGapsAfter: { ...gt },
      nextTargetGap: decision?.targetGap ?? null,
      nextQuestionText: decision?.questionText ?? null,
      continuation: askedInContinuation,
    };
    const findings = evaluateTurn({ row: base, prevAiGaps, prevGt, gtValue, gapState, questionHistory });
    if (next.stopped) {
      const open = STRESS_REQUIRED_GAPS.filter((g) => base.aiGapsAfter[g] !== 'CLOSED');
      findings.push({
        code: 'L4_PREMATURE_STOP',
        gap: open[0] ?? null,
        detail: `production path ended with required gaps open: ${open.join(',')}`,
      });
    }
    rows.push({ ...base, findings });
  }

  return {
    businessId: truth.id,
    sessionLength: input.sessionLength,
    turnsRun: rows.length,
    terminatedEarly,
    completed: terminatedEarly && allRequiredClosed(),
    prematureStopAfterTurn,
    rows,
  };
}

export type StressSummary = {
  sessions: number;
  turns: number;
  terminatedEarly: number;
  completed: number;
  prematureStops: number;
  findingsByCode: Partial<Record<StressFindingCode, number>>;
  turnsWithHigh: number;
  highByBehavior: Record<string, number>;
};

export function summarizeStress(results: StressSessionResult[]): StressSummary {
  const findingsByCode: Partial<Record<StressFindingCode, number>> = {};
  const highByBehavior: Record<string, number> = {};
  let turns = 0;
  let turnsWithHigh = 0;
  for (const s of results) {
    for (const r of s.rows) {
      turns += 1;
      let high = false;
      for (const f of r.findings) {
        findingsByCode[f.code] = (findingsByCode[f.code] ?? 0) + 1;
        if (STRESS_FINDING_SEVERITY[f.code] === 'high') {
          high = true;
          highByBehavior[r.behavior] = (highByBehavior[r.behavior] ?? 0) + 1;
        }
      }
      if (high) turnsWithHigh += 1;
    }
  }
  return {
    sessions: results.length,
    turns,
    terminatedEarly: results.filter((s) => s.terminatedEarly).length,
    completed: results.filter((s) => s.completed).length,
    prematureStops: results.filter((s) => s.prematureStopAfterTurn !== null).length,
    findingsByCode,
    turnsWithHigh,
    highByBehavior,
  };
}
