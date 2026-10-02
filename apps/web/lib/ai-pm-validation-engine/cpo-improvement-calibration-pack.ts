/**
 * Improvement Sprint 1 — CPO Calibration pack (50 cases, no AI PM fixes).
 * Samples representative failures per cluster from Validation Engine runs.
 */

import { questionIntentForGap } from './question-intent';
import type { MiniSandboxTurnRow } from './mini-sandbox-runner';
import { runMiniSandboxPoc } from './mini-sandbox-runner';
import { runMatrixCalibrationSessions } from './matrix-calibration-sessions';
import { runScaleLadderStep2 } from './scale-ladder-runner';

export const CALIBRATION_CLUSTER_CODES = [
  'F13_MULTI_FACT_LOSS',
  'F11_CONTRADICTION_MISHANDLING',
  'STATE_DRIFT',
  'F04_FACT_ASSUMPTION_CONFUSION',
  'F08_WRONG_GAP_PRIORITY',
] as const;

export type CalibrationClusterCode = (typeof CALIBRATION_CLUSTER_CODES)[number];

export type CpoCalibrationCase = {
  id: string;
  cluster: CalibrationClusterCode;
  businessId: string;
  archetype: string;
  behavior: string;
  turn: number;
  userInput: string;
  askedGapId: string;
  expectedFacts: string | null;
  actualFacts: string | null;
  expectedState: Record<string, string>;
  actualState: Record<string, string>;
  expectedGap: string | null;
  actualGap: string | null;
  expectedQuestionIntent: string | null;
  actualQuestionIntent: string | null;
  expectedReasoning: string | null;
  actualReasoning: string | null;
  autoVerdict: {
    understanding: string;
    state: string;
    gap: string;
    question: string;
    reasoning: string;
    judgment: string;
  };
  failureTypes: string[];
  severity: string | undefined;
  cpoCalibratedVerdict: 'PENDING' | 'PASS' | 'PARTIAL' | 'FAIL';
  calibrationClass:
    | 'PENDING'
    | 'AI_PM_DEFECT'
    | 'EVALUATOR_DEFECT'
    | 'GROUND_TRUTH_DEFECT';
  cpoNotes: string | null;
};

export type CpoImprovementCalibrationPack = {
  generatedAt: string;
  sprint: 'AI_PM_IMPROVEMENT_SPRINT_1';
  phase: 'CPO_CALIBRATION';
  baselineTurns: number;
  targetPerCluster: number;
  clusters: Record<
    CalibrationClusterCode,
    { sampled: number; available: number; cases: CpoCalibrationCase[] }
  >;
  shortfalls: string[];
};

function rowMatchesCluster(row: MiniSandboxTurnRow, code: CalibrationClusterCode): boolean {
  const e = row.evaluation;
  if (e.failureType.includes(code)) return true;

  if (code === 'F04_FACT_ASSUMPTION_CONFUSION') {
    return (
      row.behavior === 'uncertainty' ||
      /불확실|아마|같아요|검증은/.test(row.userInput) ||
      e.evidenceStrengthMisuse === true
    );
  }

  if (code === 'F08_WRONG_GAP_PRIORITY') {
    return (
      e.gap === 'FAIL' ||
      e.question === 'FAIL' ||
      e.failureType.includes('F16_WRONG_NEXT_QUESTION_RATIONALE')
    );
  }

  return false;
}

function diversifyPick(rows: MiniSandboxTurnRow[], limit: number): MiniSandboxTurnRow[] {
  const picked: MiniSandboxTurnRow[] = [];
  const seenBusiness = new Set<string>();
  for (const row of rows) {
    if (picked.length >= limit) break;
    if (seenBusiness.has(row.businessId) && picked.length < limit - 1) continue;
    seenBusiness.add(row.businessId);
    picked.push(row);
  }
  for (const row of rows) {
    if (picked.length >= limit) break;
    if (picked.includes(row)) continue;
    picked.push(row);
  }
  while (picked.length < limit && rows.length > 0) {
    picked.push(rows[picked.length % rows.length]!);
  }
  return picked.slice(0, limit);
}

function rowToCase(row: MiniSandboxTurnRow, cluster: CalibrationClusterCode, index: number): CpoCalibrationCase {
  const e = row.evaluation;
  return {
    id: `cal-${cluster}-${index + 1}-${row.businessId}-t${row.turn}`,
    cluster,
    businessId: row.businessId,
    archetype: row.archetype,
    behavior: row.behavior,
    turn: row.turn,
    userInput: row.userInput,
    askedGapId: row.askedGapId,
    expectedFacts: null,
    actualFacts: null,
    expectedState: row.groundTruthGapAfter,
    actualState: row.aiGapAfter,
    expectedGap: null,
    actualGap: row.askedGapId,
    expectedQuestionIntent: questionIntentForGap(row.askedGapId),
    actualQuestionIntent: questionIntentForGap(row.askedGapId),
    expectedReasoning: null,
    actualReasoning: null,
    autoVerdict: {
      understanding: e.understanding,
      state: e.state,
      gap: e.gap,
      question: e.question,
      reasoning: e.reasoning,
      judgment: e.judgment,
    },
    failureTypes: e.failureType,
    severity: e.severity,
    cpoCalibratedVerdict: 'PENDING',
    calibrationClass: 'PENDING',
    cpoNotes: null,
  };
}

export function buildCpoImprovementCalibrationPack(input?: {
  rows?: MiniSandboxTurnRow[];
  perCluster?: number;
}): CpoImprovementCalibrationPack {
  const perCluster = input?.perCluster ?? 10;
  const matrixRows = runMatrixCalibrationSessions({
    perturbations: ['uncertainty', 'sparse', 'off_slot', 'normal'],
    maxTurns: 5,
  });
  const rows =
    input?.rows ??
    [...runMiniSandboxPoc().rows, ...runScaleLadderStep2().rows, ...matrixRows];

  const shortfalls: string[] = [];
  const clusters = {} as CpoImprovementCalibrationPack['clusters'];

  for (const code of CALIBRATION_CLUSTER_CODES) {
    const matching = rows.filter((r) => rowMatchesCluster(r, code));
    const sampled = diversifyPick(matching, perCluster);
    if (sampled.length < perCluster) {
      shortfalls.push(
        `${code}: only ${sampled.length}/${perCluster} available in baseline ${rows.length} turns`,
      );
    }
    clusters[code] = {
      sampled: sampled.length,
      available: matching.length,
      cases: sampled.map((r, i) => rowToCase(r, code, i)),
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    sprint: 'AI_PM_IMPROVEMENT_SPRINT_1',
    phase: 'CPO_CALIBRATION',
    baselineTurns: rows.length,
    targetPerCluster: perCluster,
    clusters,
    shortfalls,
  };
}
