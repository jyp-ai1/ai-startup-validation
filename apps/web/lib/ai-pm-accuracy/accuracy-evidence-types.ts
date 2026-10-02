import type { AccuracyFailureType, AccuracyGateId } from './failure-taxonomy';

export type TurnEvidenceRecord = {
  scenario: string;
  turn: number;
  userInput: string;
  expectedInterpretation: Record<string, unknown>;
  actualInterpretation: Record<string, unknown>;
  expectedState: Record<string, unknown>;
  actualState: Record<string, unknown>;
  expectedGap: Record<string, unknown>;
  actualGap: Record<string, unknown>;
  expectedNextQuestion: Record<string, unknown> | null;
  actualNextQuestion: Record<string, unknown> | null;
  expectedReason: string | null;
  actualReason: string | null;
  pass: boolean;
  failureTypes: AccuracyFailureType[];
  gates: AccuracyGateId[];
};

export type ScenarioEvidenceSummary = {
  scenarioId: string;
  label: string;
  gates: AccuracyGateId[];
  pass: boolean;
  turns: TurnEvidenceRecord[];
};

export type AccuracyEvidencePackage = {
  generatedAt: string;
  pipeline: 'v3-review';
  scenarioCount: number;
  passCount: number;
  failCount: number;
  scenarios: ScenarioEvidenceSummary[];
};
