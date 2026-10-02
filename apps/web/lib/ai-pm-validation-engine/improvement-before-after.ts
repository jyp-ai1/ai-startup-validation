import { mineFailures } from './failure-mining';
import { runMatrixCalibrationSessions } from './matrix-calibration-sessions';
import { runMiniSandboxPoc } from './mini-sandbox-runner';
import { runScaleLadderStep2 } from './scale-ladder-runner';

export type ImprovementBaselineCompare = {
  generatedAt: string;
  totalTurns: number;
  before: ReturnType<typeof mineFailures>;
  after: ReturnType<typeof mineFailures>;
  clusterDelta: Record<string, { before: number; after: number }>;
};

function allRows() {
  const matrixRows = runMatrixCalibrationSessions({
    perturbations: ['uncertainty', 'sparse', 'off_slot', 'normal'],
    maxTurns: 5,
  });
  return [...runMiniSandboxPoc().rows, ...runScaleLadderStep2().rows, ...matrixRows];
}

export function compareImprovementBaseline(): ImprovementBaselineCompare {
  const rows = allRows();
  const after = mineFailures(rows);

  const beforeCounts: Record<string, number> = {
    F13_MULTI_FACT_LOSS: 98,
    F11_CONTRADICTION_MISHANDLING: 40,
    STATE_DRIFT: 40,
    F04_FACT_ASSUMPTION_CONFUSION: 0,
    F08_WRONG_GAP_PRIORITY: 0,
  };

  const clusterDelta: ImprovementBaselineCompare['clusterDelta'] = {};
  for (const c of after.clusters) {
    clusterDelta[c.code] = {
      before: beforeCounts[c.code] ?? 0,
      after: c.count,
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    totalTurns: rows.length,
    before: {
      totalTurns: 450,
      failedTurns: 138,
      clusters: Object.entries(beforeCounts).map(([code, count]) => ({
        code,
        count,
        examples: [],
      })),
      byBehavior: {},
      byBusiness: {},
    },
    after,
    clusterDelta,
  };
}
