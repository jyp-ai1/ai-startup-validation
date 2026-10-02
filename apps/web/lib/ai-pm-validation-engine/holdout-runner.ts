/**
 * Holdout — biz-16 / biz-17 only. Never mixed into mini-sandbox development set.
 */

import {
  BUSINESS_SCENARIO_MATRIX,
  getBusinessScenario,
} from '../ai-pm-accuracy/business-scenario-matrix';
import type { AnswerBehaviorId } from './contracts';
import { mineFailures } from './failure-mining';
import { matrixRowToScenario } from './matrix-bridge';
import { MINI_SANDBOX_BEHAVIORS } from './mini-sandbox-businesses';
import { runMiniSandboxSession, type MiniSandboxTurnRow } from './mini-sandbox-runner';

export type HoldoutPack = {
  generatedAt: string;
  holdoutIds: string[];
  isolationVerified: boolean;
  matrix: { sessions: number; totalTurns: number };
  failureMining: ReturnType<typeof mineFailures>;
  rows: MiniSandboxTurnRow[];
};

const HOLDOUT_IDS = ['biz-16', 'biz-17'];

export function assertHoldoutIsolation(devBusinessIds: string[]): boolean {
  return !devBusinessIds.some((id) => HOLDOUT_IDS.includes(id));
}

export function runHoldoutEvaluation(input?: {
  behaviors?: AnswerBehaviorId[];
  maxTurns?: number;
}): HoldoutPack {
  const behaviors = input?.behaviors ?? MINI_SANDBOX_BEHAVIORS;
  const rows: MiniSandboxTurnRow[] = [];

  for (const id of HOLDOUT_IDS) {
    const row = getBusinessScenario(id);
    if (!row || row.set !== 'holdout') {
      throw new Error(`Holdout missing or wrong set: ${id}`);
    }
    const scenario = matrixRowToScenario(row);
    for (const behavior of behaviors) {
      rows.push(...runMiniSandboxSession({ business: scenario, behavior, maxTurns: input?.maxTurns ?? 5 }));
    }
  }

  const devIds = BUSINESS_SCENARIO_MATRIX.filter((b) => b.set === 'development').map((b) => b.id);

  return {
    generatedAt: new Date().toISOString(),
    holdoutIds: HOLDOUT_IDS,
    isolationVerified: assertHoldoutIsolation(devIds),
    matrix: {
      sessions: HOLDOUT_IDS.length * behaviors.length,
      totalTurns: rows.length,
    },
    failureMining: mineFailures(rows),
    rows,
  };
}
