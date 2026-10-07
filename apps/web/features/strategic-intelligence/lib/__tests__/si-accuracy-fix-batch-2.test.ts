import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { accuracyBatch2CaseIds, scoreCase } from './si-accuracy-batch-2.test';

const SNAPSHOT_PATH = resolve(
  process.cwd(),
  '../../docs/evidence/ALABOM/SI/si-v1-accuracy-fix-batch-2.json',
);
const ANALYZER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../analyze-strategic-intelligence.ts'),
  'utf8',
);
const PRESENTER_SRC = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../present-si-ai-pm-question.ts'),
  'utf8',
);

const PRODUCTION_SHA = 'dea7cb1916cfbd4e6f8c54a86e6da920ed708bd2';
const FIX_SHA = '4b2aa21fc1cca089357e59cfcbeda327d3af2846';

describe('S.I. Accuracy Fix Batch #2 — post-fix measure', () => {
  it('does not rewrite the presenter or hardcode businesses', () => {
    expect(PRESENTER_SRC).toMatch(/QUESTION_BY_KIND/);
    expect(PRESENTER_SRC).not.toMatch(/applySignalRetractions/);
    expect(ANALYZER_SRC).toMatch(/function isRepeatDirectDenial/);
    expect(ANALYZER_SRC).toMatch(/function hasLiveValidated/);
    expect(`${ANALYZER_SRC}\n${PRESENTER_SRC}`).not.toMatch(
      /주인집|LMULM|RIDM|ridm\.ai|클리닉플로우|ClinicFlow|핏브릿지|FitBridge/i,
    );
  });

  it('records post-fix A/B/C axes without opening a question-generator patch', () => {
    const rows = accuracyBatch2CaseIds().map((id) => scoreCase(id));
    const axisIds = [
      'judgment',
      'evidence',
      'state',
      'negative_contradictory',
      'cu_priority',
      'question',
      'founder_outcome',
    ];
    const axisCounts = Object.fromEntries(
      axisIds.map((id) => [
        id,
        {
          PASS: rows.filter((row) => row.axes.find((axis) => axis.id === id)?.score === 'PASS').length,
          PARTIAL: rows.filter((row) => row.axes.find((axis) => axis.id === id)?.score === 'PARTIAL').length,
          FAIL: rows.filter((row) => row.axes.find((axis) => axis.id === id)?.score === 'FAIL').length,
        },
      ]),
    );
    const focusIds = ['positive_promotion', 'conflict', 'regression'] as const;
    const focusCounts = Object.fromEntries(
      focusIds.map((id) => [
        id,
        {
          PASS: rows.filter((row) => row.focus[id] === 'PASS').length,
          PARTIAL: rows.filter((row) => row.focus[id] === 'PARTIAL').length,
          FAIL: rows.filter((row) => row.focus[id] === 'FAIL').length,
        },
      ]),
    );
    const failureCounts: Record<string, number> = {};
    for (const row of rows) {
      for (const failure of row.failures) {
        failureCounts[failure] = (failureCounts[failure] ?? 0) + 1;
      }
    }
    const repeated = Object.entries(failureCounts)
      .filter(([, count]) => count >= 3)
      .map(([id]) => id)
      .sort();
    const oneOff = Object.entries(failureCounts)
      .filter(([, count]) => count < 3)
      .map(([id]) => id)
      .sort();

    mkdirSync(dirname(SNAPSHOT_PATH), { recursive: true });
    writeFileSync(
      SNAPSHOT_PATH,
      `${JSON.stringify(
        {
          productionSha: PRODUCTION_SHA,
          negativeJudgmentFixSha: FIX_SHA,
          scenarioCount: rows.length * 6,
          axisCounts,
          focusCounts,
          failureCounts,
          repeated,
          oneOff,
          rows,
        },
        null,
        2,
      )}\n`,
      'utf8',
    );

    expect(rows).toHaveLength(8);
    expect(axisCounts.evidence).toEqual({ PASS: 8, PARTIAL: 0, FAIL: 0 });
    expect(axisCounts.judgment).toEqual({ PASS: 8, PARTIAL: 0, FAIL: 0 });
    expect(axisCounts.state).toEqual({ PASS: 8, PARTIAL: 0, FAIL: 0 });
    expect(axisCounts.cu_priority).toEqual({ PASS: 8, PARTIAL: 0, FAIL: 0 });
    expect(axisCounts.founder_outcome).toEqual({ PASS: 8, PARTIAL: 0, FAIL: 0 });
    expect(axisCounts.negative_contradictory).toEqual({ PASS: 8, PARTIAL: 0, FAIL: 0 });
    expect(focusCounts.conflict).toEqual({ PASS: 8, PARTIAL: 0, FAIL: 0 });
    expect(focusCounts.regression).toEqual({ PASS: 8, PARTIAL: 0, FAIL: 0 });
    expect(failureCounts.ignored_direct_conflict ?? 0).toBe(0);
    expect(failureCounts.repeat_zero_promoted ?? 0).toBe(0);
    expect(failureCounts.stale_cu_after_promotion ?? 0).toBe(0);
    expect(failureCounts.generic_ask_after_specific_cu).toBe(5);
  });
});
