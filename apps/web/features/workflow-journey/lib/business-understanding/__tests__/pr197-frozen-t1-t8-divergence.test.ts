/**
 * PR #197 — classify T1–T8 divergence without lowering 5263e83e wording.
 * Track A: SoT picker + turn-index answers (CPO FAIL reproduce).
 * Track B: SoT picker + on-slot adapter answers (stop isolation).
 * Track C: scripted problem-first playback + 1:1 wording (existing followEngine shape).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { hasNoAskableGap } from '../ai-pm-no-gap-termination';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
import { resolveGapQuestionBinding } from '../gap-question-map';
import { buildLivingUnderstandingState } from '../living-understanding-state';
import { resolveNextQuestionDecision } from '../resolve-next-question-decision';
import { applyTypedAnswerThroughLoop } from '../route-typed-answer-through-loop';
import { setV3ReviewPipelineForTest } from '../v3-review-pipeline';
import {
  clearAiPmLoopState,
  loadAiPmLoopState,
  patchAiPmLoopState,
} from '../workspace-ai-pm-loop-store';
import {
  classifyTurnMismatch,
  ENGINE_SOT_FIRST_GAP,
  FROZEN_DOCS,
  FROZEN_INTENDED_GAP,
  FROZEN_PLAYBACK_FIRST_GAP,
  FROZEN_SCENARIO_SHA,
  FROZEN_TURNS,
  normalizeQuestion,
  resolveOnSlotAnswer,
  type ScenarioId,
} from './pr197-frozen-scenario-adapter';

const OUT = '/workspace/docs/evidence/ALABOM/AI-PM/PR197-CPO-T1-T8-DIVERGENCE-DUMP.json';

function stubSessionStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('sessionStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => {
      store.set(k, v);
    },
    removeItem: (k: string) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  });
  vi.stubGlobal('window', { sessionStorage: globalThis.sessionStorage });
}

function reset(projectId: string, documentText: string) {
  clearAiPmLoopState(projectId);
  saveWorkspaceDocumentText(documentText, projectId);
  patchAiPmLoopState(
    {
      readingCompleted: true,
      dismissedReadAck: true,
      phase: 'answer',
      currentIssueId: 'problem_definition',
      ceoJudgment: emptyCeoJudgmentState(0),
    },
    projectId,
  );
}

function currentDecision(projectId: string, documentText: string) {
  const loop = loadAiPmLoopState(projectId);
  const memory = buildConversationMemoryFromSources({
    projectId,
    documentText,
    turns: loop.turns,
    gapState: loop.gapState,
  });
  const living = buildLivingUnderstandingState({
    documentText,
    understanding: buildBusinessUnderstanding(documentText),
    turns: loop.turns,
    memory,
    gapState: loop.gapState,
  });
  return resolveNextQuestionDecision({
    living,
    turns: loop.turns,
    memory,
    gapState: loop.gapState,
    projectId,
    judgment: loop.ceoJudgment,
  });
}

function completenessMap(projectId: string) {
  const gaps = loadAiPmLoopState(projectId).gapState?.gaps ?? {};
  const out: Record<string, string> = {};
  for (const [id, rec] of Object.entries(gaps)) {
    out[id] = rec.completeness;
  }
  return out;
}

function spineAfter(projectId: string) {
  const gaps = loadAiPmLoopState(projectId).gapState?.gaps ?? {};
  return {
    customerPersona: gaps.customerPersona?.completeness ?? 'OPEN',
    problemJtbd: gaps.problemJtbd?.completeness ?? 'OPEN',
    payer: gaps.payer?.completeness ?? 'OPEN',
  };
}

function stopCause(projectId: string, nextQuestion: string | null) {
  if (nextQuestion) return null;
  const gapState = loadAiPmLoopState(projectId).gapState;
  const noAskable = gapState ? hasNoAskableGap(gapState) : null;
  return {
    nextNull: true,
    noAskableGap: noAskable,
    reason: noAskable
      ? 'no_askable_gap'
      : 'next_null_with_askable_gaps_after_off_slot_or_repeat_policy',
    spine: spineAfter(projectId),
  };
}

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN';
  }
}

function runTrackA(id: ScenarioId) {
  const pid = `div-a-${id}`;
  const doc = FROZEN_DOCS[id];
  const frozen = FROZEN_TURNS[id];
  reset(pid, doc);
  const turns: Array<Record<string, unknown>> = [];
  let nextQ = currentDecision(pid, doc)?.questionText ?? null;
  let nextGap =
    currentDecision(pid, doc)?.targetGapId ?? currentDecision(pid, doc)?.targetGap ?? null;

  for (let i = 0; i < frozen.length; i += 1) {
    const row = frozen[i]!;
    const intended = FROZEN_INTENDED_GAP[id][i]!;
    const asked = nextQ ?? '';
    const gap = String(nextGap ?? '');
    const exact = Boolean(asked) && normalizeQuestion(asked) === normalizeQuestion(row.expectedQuestion);
    const classes = classifyTurnMismatch({
      turn: i + 1,
      askedQuestion: asked || null,
      expectedQuestion: row.expectedQuestion,
      askedGap: gap || null,
      frozenIntendedGap: intended,
      founderAnswerAppliedToAskedGap: gap === intended,
    });

    if (!asked || !gap) {
      turns.push({
        turn: i + 1,
        expectedQuestion: row.expectedQuestion,
        askedQuestion: null,
        askedGap: null,
        frozenIntendedGap: intended,
        founderAnswer: row.founderAnswer,
        exactMatch: false,
        mismatchClasses: classes,
        status: 'FAIL',
        reason: 'engine had no next question',
        spineAfter: spineAfter(pid),
        gapCompletenessAtStop: completenessMap(pid),
        stopCause: stopCause(pid, null),
      });
      break;
    }

    const after = applyTypedAnswerThroughLoop({
      projectId: pid,
      documentText: doc,
      answer: row.founderAnswer,
      askedGap: gap,
      askedQuestionText: asked,
      customerCompleteness: loadAiPmLoopState(pid).gapState?.gaps.customerPersona?.completeness,
    });
    turns.push({
      turn: i + 1,
      expectedQuestion: row.expectedQuestion,
      askedQuestion: asked,
      askedGap: gap,
      frozenIntendedGap: intended,
      founderAnswer: row.founderAnswer,
      exactMatch: exact,
      mismatchClasses: classes,
      status: exact ? 'PASS' : 'FAIL',
      nextQuestion: after.nextQuestionText,
      nextTargetGap: after.nextTargetGap,
      spineAfter: spineAfter(pid),
      stopCause: after.nextQuestionText ? null : stopCause(pid, after.nextQuestionText),
    });
    nextQ = after.nextQuestionText ?? null;
    nextGap = after.nextTargetGap ?? null;
  }

  return {
    firstAskedGap: turns[0]?.askedGap ?? null,
    firstExpectedGap: FROZEN_INTENDED_GAP[id][0],
    turnCount: turns.length,
    exactMatchCount: turns.filter((t) => t.exactMatch === true).length,
    stoppedEarly: turns.some((t) => (t.mismatchClasses as string[] | undefined)?.includes('STOP')),
    turns,
  };
}

function runTrackB(id: ScenarioId) {
  const pid = `div-b-${id}`;
  const doc = FROZEN_DOCS[id];
  const frozen = FROZEN_TURNS[id];
  const intended = FROZEN_INTENDED_GAP[id];
  reset(pid, doc);
  const used = new Set<number>();
  const turns: Array<Record<string, unknown>> = [];
  let nextQ = currentDecision(pid, doc)?.questionText ?? null;
  let nextGap =
    currentDecision(pid, doc)?.targetGapId ?? currentDecision(pid, doc)?.targetGap ?? null;

  for (let i = 0; i < 8; i += 1) {
    const asked = nextQ ?? '';
    const gap = String(nextGap ?? '');
    if (!asked || !gap) {
      turns.push({
        turn: i + 1,
        askedQuestion: null,
        askedGap: null,
        status: 'STOP',
        spineAfter: spineAfter(pid),
        gapCompletenessAtStop: completenessMap(pid),
        stopCause: stopCause(pid, null),
      });
      break;
    }
    const picked = resolveOnSlotAnswer(frozen, intended, gap, used);
    const after = applyTypedAnswerThroughLoop({
      projectId: pid,
      documentText: doc,
      answer: picked.answer,
      askedGap: gap,
      askedQuestionText: asked,
      customerCompleteness: loadAiPmLoopState(pid).gapState?.gaps.customerPersona?.completeness,
    });
    turns.push({
      turn: i + 1,
      askedQuestion: asked,
      askedGap: gap,
      answerSource: picked.source,
      founderAnswer: picked.answer,
      frozenTurnUsed: picked.frozenTurn,
      nextQuestion: after.nextQuestionText,
      nextTargetGap: after.nextTargetGap,
      spineAfter: spineAfter(pid),
      stopCause: after.nextQuestionText ? null : stopCause(pid, after.nextQuestionText),
    });
    nextQ = after.nextQuestionText ?? null;
    nextGap = after.nextTargetGap ?? null;
  }

  return {
    firstAskedGap: turns[0]?.askedGap ?? null,
    turnCount: turns.filter((t) => t.status !== 'STOP').length,
    askedGaps: turns.filter((t) => t.askedGap).map((t) => t.askedGap),
    reachedEight: turns.filter((t) => t.askedGap).length >= 8,
    stoppedEarly: turns.some((t) => t.status === 'STOP'),
    turns,
  };
}

function runTrackC(id: ScenarioId) {
  const pid = `div-c-${id}`;
  const doc = FROZEN_DOCS[id];
  const frozen = FROZEN_TURNS[id];
  reset(pid, doc);
  const turns: Array<Record<string, unknown>> = [];
  let gap = FROZEN_PLAYBACK_FIRST_GAP[id];
  let question = resolveGapQuestionBinding(gap).questionText;

  for (let i = 0; i < frozen.length; i += 1) {
    const row = frozen[i]!;
    const intended = FROZEN_INTENDED_GAP[id][i]!;
    const asked = question ?? '';
    const exact = Boolean(asked) && normalizeQuestion(asked) === normalizeQuestion(row.expectedQuestion);
    const classes = classifyTurnMismatch({
      turn: i + 1,
      askedQuestion: asked || null,
      expectedQuestion: row.expectedQuestion,
      askedGap: gap || null,
      frozenIntendedGap: intended,
      founderAnswerAppliedToAskedGap: gap === intended,
    });
    if (!asked || !gap) {
      turns.push({
        turn: i + 1,
        expectedQuestion: row.expectedQuestion,
        askedQuestion: null,
        askedGap: null,
        frozenIntendedGap: intended,
        exactMatch: false,
        mismatchClasses: classes,
        status: 'FAIL',
        reason: 'playback had no next question',
      });
      break;
    }
    const after = applyTypedAnswerThroughLoop({
      projectId: pid,
      documentText: doc,
      answer: row.founderAnswer,
      askedGap: gap,
      askedQuestionText: asked,
      customerCompleteness: loadAiPmLoopState(pid).gapState?.gaps.customerPersona?.completeness,
    });
    turns.push({
      turn: i + 1,
      expectedQuestion: row.expectedQuestion,
      askedQuestion: asked,
      askedGap: gap,
      frozenIntendedGap: intended,
      founderAnswer: row.founderAnswer,
      exactMatch: exact,
      mismatchClasses: classes,
      status: exact ? 'PASS' : 'FAIL',
      nextQuestion: after.nextQuestionText,
      nextTargetGap: after.nextTargetGap,
    });
    gap = after.nextTargetGap ?? '';
    question = after.nextQuestionText ?? (gap ? resolveGapQuestionBinding(gap).questionText : '');
  }

  return {
    firstAskedGap: turns[0]?.askedGap ?? null,
    firstExpectedGap: FROZEN_INTENDED_GAP[id][0],
    turnCount: turns.length,
    exactMatchCount: turns.filter((t) => t.exactMatch === true).length,
    stoppedEarly: turns.some((t) => (t.mismatchClasses as string[] | undefined)?.includes('STOP')),
    turns,
  };
}

describe('PR #197 frozen T1–T8 divergence (contract vs adapter)', () => {
  beforeEach(() => {
    setV3ReviewPipelineForTest(true);
    setAiPmJudgmentAggregationV1ForTest(true);
    stubSessionStorage();
  });

  afterEach(() => {
    setV3ReviewPipelineForTest(null);
    setAiPmJudgmentAggregationV1ForTest(null);
    vi.unstubAllGlobals();
  });

  it('records first-Q / order / stop / next-target without lowering expected wording', () => {
    const ids = Object.keys(FROZEN_TURNS) as ScenarioId[];
    const trackA: Record<string, unknown> = {};
    const trackB: Record<string, unknown> = {};
    const trackC: Record<string, unknown> = {};
    let verbatimExact = 0;
    let verbatimCompared = 0;

    for (const id of ids) {
      const a = runTrackA(id);
      const b = runTrackB(id);
      const c = runTrackC(id);
      trackA[id] = a;
      trackB[id] = b;
      trackC[id] = c;
      verbatimCompared += a.turns.length;
      verbatimExact += a.exactMatchCount;
    }

    const dump = {
      meta: {
        implSha: gitSha(),
        executedAt: new Date().toISOString(),
        frozenScenarioSha: FROZEN_SCENARIO_SHA,
        engineSotFirstGap: ENGINE_SOT_FIRST_GAP,
        note:
          'Expected wording is 5263e83e and is not relaxed. Track A reproduces the merge-gate 1:1 FAIL. Track B isolates stop. Track C is scripted problem-first playback, not engine SoT.',
        production: 'NOT VERIFIED',
        googleOauth: 'NOT VERIFIED',
      },
      contract: {
        frozenDocument: 'CPO review script — not runtime SoT. CEO: problem-first engine change is not approved.',
        engineSot:
          'Stage A businessOneLiner → customerPersona → payer → problemJtbd; FIX-10 customer → problem → solution; T7 payer-hold',
        adapterScope: 'verification only under __tests__; not imported by runtime',
        existingPlaybackAdapter: 'followEngine hardcodes first gap=problemJtbd — not engine SoT',
        s6SideSelect: 'frozen T1 marketplaceSide has no engine gap',
      },
      trackA_verbatimSotTurnIndex: {
        totals: {
          compared: verbatimCompared,
          exactMatches: verbatimExact,
          allScenariosExact: verbatimExact === 48,
        },
        scenarios: trackA,
      },
      trackB_sotOnSlotAdapter: {
        scenarios: trackB,
      },
      trackC_scriptedProblemFirst: {
        scenarios: trackC,
      },
    };
    writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`);

    expect(FROZEN_SCENARIO_SHA).toBe('5263e83e');
    expect(verbatimCompared).toBeGreaterThanOrEqual(30);
    expect(dump.trackA_verbatimSotTurnIndex.totals.exactMatches).toBe(0);
    for (const id of ids) {
      expect((trackA[id] as { firstAskedGap: string }).firstAskedGap).toBe(ENGINE_SOT_FIRST_GAP);
    }
  });
});
