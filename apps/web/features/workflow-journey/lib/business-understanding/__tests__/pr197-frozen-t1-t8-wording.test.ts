/**
 * PR #197 remaining merge gate — frozen T1–T8 wording (5263e83e).
 * Records 1:1 question text vs scenario. Does not lower expected wording.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

import { saveWorkspaceDocumentText } from '@/features/workflow-journey/lib/workspace-ai-pm-messages';

import { setAiPmJudgmentAggregationV1ForTest } from '../ai-pm-judgment-aggregation-v1';
import { emptyCeoJudgmentState } from '../ai-pm-ceo-judgment-dimensions';
import { buildBusinessUnderstanding } from '../build-business-understanding';
import { buildConversationMemoryFromSources } from '../build-conversation-memory';
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
  FROZEN_DOCS as DOCS,
  FROZEN_SCENARIO_SHA as FROZEN_SHA,
  FROZEN_TURNS as FROZEN,
  normalizeQuestion as normalize,
} from './pr197-frozen-scenario-adapter';

const OUT = '/workspace/docs/evidence/ALABOM/AI-PM/PR197-CPO-FROZEN-T1-T8-DUMP.json';

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

function livingNow(projectId: string, documentText: string) {
  const loop = loadAiPmLoopState(projectId);
  const memory = buildConversationMemoryFromSources({
    projectId,
    documentText,
    turns: loop.turns,
    gapState: loop.gapState,
  });
  return {
    loop,
    memory,
    living: buildLivingUnderstandingState({
      documentText,
      understanding: buildBusinessUnderstanding(documentText),
      turns: loop.turns,
      memory,
      gapState: loop.gapState,
    }),
  };
}

function currentDecision(projectId: string, documentText: string) {
  const { loop, living, memory } = livingNow(projectId, documentText);
  return resolveNextQuestionDecision({
    living,
    turns: loop.turns,
    memory,
    gapState: loop.gapState,
    projectId,
    judgment: loop.ceoJudgment,
  });
}

function gitSha() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'UNKNOWN';
  }
}

describe('PR #197 frozen T1–T8 wording (5263e83e)', () => {
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

  it('records 1:1 asked vs frozen T1–T8 without lowering expected wording', () => {
    const scenarios: Record<string, unknown> = {};
    let exactMatches = 0;
    let compared = 0;

    for (const id of Object.keys(FROZEN) as Array<keyof typeof DOCS>) {
      const pid = `frozen-${id}`;
      reset(pid, DOCS[id]);
      const turns: Array<Record<string, unknown>> = [];
      let nextQ: string | null = currentDecision(pid, DOCS[id])?.questionText ?? null;
      let nextGap = currentDecision(pid, DOCS[id])?.targetGapId ?? currentDecision(pid, DOCS[id])?.targetGap ?? null;

      for (let i = 0; i < FROZEN[id].length; i += 1) {
        const frozen = FROZEN[id][i]!;
        const asked = nextQ ?? '';
        const gap = String(nextGap ?? '');
        const exact = Boolean(asked) && normalize(asked) === normalize(frozen.expectedQuestion);
        compared += 1;
        if (exact) exactMatches += 1;

        if (!asked || !gap) {
          turns.push({
            turn: i + 1,
            expectedQuestion: frozen.expectedQuestion,
            askedQuestion: asked || null,
            askedGap: gap || null,
            founderAnswer: frozen.founderAnswer,
            exactMatch: false,
            status: 'FAIL',
            reason: 'engine had no next question',
          });
          break;
        }

        const after = applyTypedAnswerThroughLoop({
          projectId: pid,
          documentText: DOCS[id],
          answer: frozen.founderAnswer,
          askedGap: gap,
          askedQuestionText: asked,
          customerCompleteness: loadAiPmLoopState(pid).gapState?.gaps.customerPersona?.completeness,
        });

        turns.push({
          turn: i + 1,
          expectedQuestion: frozen.expectedQuestion,
          askedQuestion: asked,
          askedGap: gap,
          founderAnswer: frozen.founderAnswer,
          exactMatch: exact,
          status: exact ? 'PASS' : 'FAIL',
          nextQuestion: after.nextQuestionText,
          nextTargetGap: after.nextTargetGap,
        });

        nextQ = after.nextQuestionText ?? null;
        nextGap = after.nextTargetGap ?? null;
      }

      const matchCount = turns.filter((t) => t.exactMatch === true).length;
      scenarios[id] = {
        turnCount: turns.length,
        exactMatchCount: matchCount,
        allEightExact: matchCount === 8,
        verdict: {
          status: matchCount === 8 ? 'PASS' : 'FAIL',
          reason: `${id} exact wording ${matchCount}/8 vs frozen ${FROZEN_SHA}`,
        },
        turns,
      };
    }

    const dump = {
      meta: {
        implSha: gitSha(),
        executedAt: new Date().toISOString(),
        frozenScenarioSha: FROZEN_SHA,
        path: 'engine resolveNextQuestionDecision → applyTypedAnswerThroughLoop',
        note: '1:1 wording. Expected text is 5263e83e. Failures are not relaxed.',
        production: 'NOT VERIFIED',
        googleOauth: 'NOT VERIFIED',
      },
      totals: {
        compared,
        exactMatches,
        allScenariosExact: Object.values(scenarios).every(
          (s) => (s as { allEightExact?: boolean }).allEightExact === true,
        ),
      },
      scenarios,
    };
    writeFileSync(OUT, `${JSON.stringify(dump, null, 2)}\n`);

    expect(compared).toBeGreaterThanOrEqual(8);
    expect(dump.meta.frozenScenarioSha).toBe(FROZEN_SHA);
  });
});
