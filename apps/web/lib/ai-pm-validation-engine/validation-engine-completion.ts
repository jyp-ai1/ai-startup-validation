import { compareAutoVsCpoCalibration } from './cpo-calibration-compare';
import { buildCoverageMatrix } from './coverage-matrix';
import { mineFailures } from './failure-mining';
import { runHoldoutEvaluation } from './holdout-runner';
import { MINI_SANDBOX_BUSINESSES } from './mini-sandbox-businesses';
import { runMiniSandboxPoc } from './mini-sandbox-runner';
import { runScaleLadderStep2 } from './scale-ladder-runner';
import { runSeedFailureRegression } from './seed-regression-runner';

export type ValidationEngineCompletionPack = {
  generatedAt: string;
  gitSha: string | null;
  sprint: 'VALIDATION_ENGINE_SPRINT';
  architectureDoc: string;
  schemasPath: string;
  miniSandbox: ReturnType<typeof runMiniSandboxPoc>;
  scaleLadder: ReturnType<typeof runScaleLadderStep2>;
  holdout: ReturnType<typeof runHoldoutEvaluation>;
  failureMining: ReturnType<typeof mineFailures>;
  calibration: ReturnType<typeof compareAutoVsCpoCalibration>;
  seedRegression: ReturnType<typeof runSeedFailureRegression>;
  coverage: ReturnType<typeof buildCoverageMatrix>;
  knownLimitations: string[];
  nextFixClusters: string[];
};

export function buildValidationEngineCompletionPack(gitSha?: string | null): ValidationEngineCompletionPack {
  const miniSandbox = runMiniSandboxPoc();
  const scaleLadder = runScaleLadderStep2();
  const holdout = runHoldoutEvaluation();
  const failureMining = mineFailures([...miniSandbox.rows, ...scaleLadder.rows]);
  const calibration = compareAutoVsCpoCalibration(scaleLadder.rows);
  const seedRegression = runSeedFailureRegression();
  const coverage = buildCoverageMatrix(MINI_SANDBOX_BUSINESSES, [
    ...miniSandbox.rows,
    ...scaleLadder.rows,
  ]);

  const nextFixClusters = failureMining.clusters.slice(0, 5).map((c) => c.code);

  return {
    generatedAt: new Date().toISOString(),
    gitSha: gitSha ?? null,
    sprint: 'VALIDATION_ENGINE_SPRINT',
    architectureDoc:
      'docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/VALIDATION-ENGINE-ARCHITECTURE.md',
    schemasPath: 'docs/evidence/ALABOM/AI-PM-ACCURACY-SPRINT-1/schemas/',
    miniSandbox,
    scaleLadder,
    holdout,
    failureMining,
    calibration,
    seedRegression,
    coverage,
    knownLimitations: [
      'Auto L5 judgment uses heuristic evidence strength — CPO calibration required for authority',
      'Scale ladder stops at 10×6×5 until next CPO gate',
      'Real business set not re-run in this pack (use evidence:real-business-review)',
      'AI PM accuracy failures expected; engine measures and clusters — not production quality claim',
    ],
    nextFixClusters,
  };
}
