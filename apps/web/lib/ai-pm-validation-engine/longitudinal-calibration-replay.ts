/**
 * Sprint 2 — replays multi-turn longitudinal scenarios for calibration evidence.
 * Harness only — no AI PM product changes.
 */

import { replayCalibrationTurn, type CalibrationTurnReplay } from './calibration-turn-replay';
import { MINI_SANDBOX_BUSINESSES } from './mini-sandbox-businesses';

export type LongitudinalCheckpoint = {
  turn: number;
  replay: CalibrationTurnReplay;
  customerPersona: string | null;
  pricingHint: string | null;
  contradictionCount: number;
  revenueEvidenceClass: string | null;
};

export type LongitudinalScenarioResult = {
  businessId: string;
  archetype: string;
  behavior: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3' | 'P4';
  checkpoints: LongitudinalCheckpoint[];
};

const LONGITUDINAL_BEHAVIORS: Array<{
  behavior: string;
  priority: LongitudinalScenarioResult['priority'];
  checkpointTurns: number[];
}> = [
  { behavior: 'longitudinal_f11', priority: 'P0', checkpointTurns: [4, 5, 6, 7] },
  { behavior: 'longitudinal_f04_pricing', priority: 'P1', checkpointTurns: [3, 5, 6] },
];

function pickGap(replay: CalibrationTurnReplay, gapId: string): string | null {
  return replay.actualGaps[gapId] ?? replay.actualState[gapId] ?? null;
}

function revenueClass(replay: CalibrationTurnReplay): string | null {
  const rev = replay.actualFacts.find((f) => f.key === 'revenue');
  return rev?.evidenceClass ?? null;
}

export function replayLongitudinalScenario(input: {
  businessId: string;
  behavior: string;
  maxTurn: number;
  checkpointTurns: number[];
}): LongitudinalScenarioResult | null {
  const biz = MINI_SANDBOX_BUSINESSES.find((b) => b.id === input.businessId);
  if (!biz) return null;

  const checkpoints: LongitudinalCheckpoint[] = [];
  for (const turn of input.checkpointTurns) {
    if (turn > input.maxTurn) continue;
    const replay = replayCalibrationTurn({
      businessId: input.businessId,
      behavior: input.behavior,
      turn,
    });
    if (!replay) continue;
    checkpoints.push({
      turn,
      replay,
      customerPersona: pickGap(replay, 'customerPersona'),
      pricingHint: pickGap(replay, 'pricingHint'),
      contradictionCount: Array.isArray(replay.contradictions) ? replay.contradictions.length : 0,
      revenueEvidenceClass: revenueClass(replay),
    });
  }

  const meta = LONGITUDINAL_BEHAVIORS.find((b) => b.behavior === input.behavior);

  return {
    businessId: input.businessId,
    archetype: biz.archetype,
    behavior: input.behavior,
    priority: meta?.priority ?? 'P0',
    checkpoints,
  };
}

export function buildLongitudinalCalibrationPack(): {
  generatedAt: string;
  sprint: 'AI_PM_ACCURACY_SPRINT_2';
  phase: 'LONGITUDINAL_CALIBRATION_SET';
  scenarios: LongitudinalScenarioResult[];
} {
  const scenarios: LongitudinalScenarioResult[] = [];
  for (const biz of MINI_SANDBOX_BUSINESSES) {
    for (const row of LONGITUDINAL_BEHAVIORS) {
      const result = replayLongitudinalScenario({
        businessId: biz.id,
        behavior: row.behavior,
        maxTurn: 7,
        checkpointTurns: row.checkpointTurns,
      });
      if (result) scenarios.push(result);
    }
  }
  return {
    generatedAt: new Date().toISOString(),
    sprint: 'AI_PM_ACCURACY_SPRINT_2',
    phase: 'LONGITUDINAL_CALIBRATION_SET',
    scenarios,
  };
}
