/**
 * Seed A–F regression — runs matrix regression-set businesses with perturbations tied to seeds.
 */

import { runValidationLabSession } from '../ai-pm-accuracy/validation-lab-runner';
import type { InputPerturbationType } from '../ai-pm-accuracy/input-perturbation-types';

export type SeedRegressionResult = {
  seedId: string;
  businessId: string;
  perturbation: InputPerturbationType;
  turns: number;
  failureSignals: string[];
};

const SEED_RUNS: Array<{
  seedId: string;
  businessId: string;
  perturbation: InputPerturbationType;
}> = [
  { seedId: 'A', businessId: 'biz-01', perturbation: 'uncertainty' },
  { seedId: 'B', businessId: 'biz-07', perturbation: 'sparse' },
  { seedId: 'C', businessId: 'biz-01', perturbation: 'off_slot' },
  { seedId: 'D', businessId: 'biz-01', perturbation: 'multi_fact' },
  { seedId: 'E', businessId: 'biz-01', perturbation: 'contradiction' },
  { seedId: 'F', businessId: 'biz-07', perturbation: 'correction' },
];

export function runSeedFailureRegression(maxTurns = 5): {
  generatedAt: string;
  results: SeedRegressionResult[];
} {
  const results: SeedRegressionResult[] = [];

  for (const run of SEED_RUNS) {
    const rows = runValidationLabSession({
      businessId: run.businessId,
      perturbation: run.perturbation,
      maxTurns,
    });
    const failureSignals = rows.flatMap((r) => r.failureType ?? []);
    results.push({
      seedId: run.seedId,
      businessId: run.businessId,
      perturbation: run.perturbation,
      turns: rows.length,
      failureSignals: [...new Set(failureSignals)],
    });
  }

  return { generatedAt: new Date().toISOString(), results };
}
