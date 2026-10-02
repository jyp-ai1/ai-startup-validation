import type { AnswerBehaviorId } from './contracts';
import { mineFailures } from './failure-mining';
import {
  MINI_SANDBOX_BEHAVIORS,
  MINI_SANDBOX_BUSINESSES,
} from './mini-sandbox-businesses';
import { runMiniSandboxSession, type MiniSandboxTurnRow } from './mini-sandbox-runner';

/** Step 2 ladder: 10 × 6 behaviors × 5 turns (after POC gate). */
export const SCALE_LADDER_BEHAVIORS: AnswerBehaviorId[] = [
  ...MINI_SANDBOX_BEHAVIORS,
  'sparse',
  'off_slot',
  'uncertainty',
];

export type ScaleLadderPack = {
  generatedAt: string;
  step: '10x6x5';
  matrix: { businesses: number; behaviors: number; turnsPerSession: number; totalTurns: number };
  failureMining: ReturnType<typeof mineFailures>;
  rows: MiniSandboxTurnRow[];
};

export function runScaleLadderStep2(maxTurns = 5): ScaleLadderPack {
  const rows: MiniSandboxTurnRow[] = [];
  for (const business of MINI_SANDBOX_BUSINESSES) {
    for (const behavior of SCALE_LADDER_BEHAVIORS) {
      rows.push(...runMiniSandboxSession({ business, behavior, maxTurns }));
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    step: '10x6x5',
    matrix: {
      businesses: MINI_SANDBOX_BUSINESSES.length,
      behaviors: SCALE_LADDER_BEHAVIORS.length,
      turnsPerSession: maxTurns,
      totalTurns: rows.length,
    },
    failureMining: mineFailures(rows),
    rows,
  };
}
