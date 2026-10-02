import { adjudicateCalibrationCase } from './cpo-calibration-adjudication';
import { replayCalibrationTurn } from './calibration-turn-replay';
import {
  buildCpoImprovementCalibrationPack,
  CALIBRATION_CLUSTER_CODES,
  type CalibrationClusterCode,
  type CpoCalibrationCase,
} from './cpo-improvement-calibration-pack';

export type CalibrationSubmissionCase = Omit<CpoCalibrationCase, 'expectedFacts' | 'actualFacts'> & {
  caseId: string;
  business: string;
  expectedFacts: string;
  actualFacts: string;
  expectedGaps: Record<string, string>;
  actualGaps: Record<string, string>;
  expectedQuestionIntent: string;
  actualQuestionIntent: string;
  expectedReasoning: string;
  actualReasoning: string;
  autoVerdict: CpoCalibrationCase['autoVerdict'];
  cpoCalibratedVerdict: 'PASS' | 'PARTIAL' | 'FAIL';
  calibrationClass: 'AI_PM_DEFECT' | 'EVALUATOR_DEFECT' | 'GROUND_TRUTH_DEFECT';
  cpoRationale: string;
  confirmedForFix: boolean;
  actualNextQuestion: string | null;
  actualNextTargetGap: string | null;
};

export type CalibrationSummaryRow = {
  cluster: CalibrationClusterCode;
  autoFail: number;
  cpoAiDefect: number;
  evaluatorDefect: number;
  gtDefect: number;
  confirmed: number;
};

export type CpoCalibrationSubmission = {
  generatedAt: string;
  sprint: 'AI_PM_IMPROVEMENT_SPRINT_1';
  phase: 'CALIBRATION_SUBMISSION';
  cpoReviewStatus: 'AWAITING_CPO_CONFIRMATION';
  note: string;
  cases: CalibrationSubmissionCase[];
  summaryTable: CalibrationSummaryRow[];
};

function autoIsFail(v: CpoCalibrationCase['autoVerdict']): boolean {
  return (
    v.understanding === 'FAIL' ||
    v.state === 'FAIL' ||
    v.gap === 'FAIL' ||
    v.question === 'FAIL' ||
    v.reasoning === 'FAIL' ||
    v.judgment === 'FAIL'
  );
}

export function buildCpoCalibrationSubmission(): CpoCalibrationSubmission {
  const pack = buildCpoImprovementCalibrationPack();
  const cases: CalibrationSubmissionCase[] = [];

  for (const cluster of CALIBRATION_CLUSTER_CODES) {
    for (const base of pack.clusters[cluster].cases) {
      const replay = replayCalibrationTurn({
        businessId: base.businessId,
        behavior: base.behavior,
        turn: base.turn,
      });

      const replaySafe = replay ?? {
        businessId: base.businessId,
        behavior: base.behavior,
        turn: base.turn,
        userInput: base.userInput,
        askedGapId: base.askedGapId,
        askedQuestionText: '',
        actualFacts: [],
        expectedFactsHint: '',
        expectedState: base.expectedState,
        actualState: base.actualState,
        expectedGaps: base.expectedState,
        actualGaps: base.actualState,
        expectedQuestionIntent: base.expectedQuestionIntent ?? 'unknown',
        actualQuestionIntent: base.actualQuestionIntent ?? 'unknown',
        actualNextQuestion: null,
        actualNextTargetGap: null,
        expectedPriorityGap: null,
        reviewRationale: null,
        contradictions: [],
      };

      const adj = adjudicateCalibrationCase({
        cluster,
        replay: replaySafe,
        autoFail: autoIsFail(base.autoVerdict),
        failureTypes: base.failureTypes,
      });

      cases.push({
        ...base,
        caseId: base.id,
        business: base.businessId,
        expectedFacts: replaySafe.expectedFactsHint,
        actualFacts: JSON.stringify(replaySafe.actualFacts),
        expectedState: replaySafe.expectedState,
        actualState: replaySafe.actualState,
        expectedGaps: replaySafe.expectedGaps,
        actualGaps: replaySafe.actualGaps,
        expectedGap: replaySafe.expectedPriorityGap,
        actualGap: replaySafe.actualNextTargetGap,
        expectedQuestionIntent: replaySafe.expectedQuestionIntent,
        actualQuestionIntent: replaySafe.actualQuestionIntent,
        expectedReasoning: 'Evidence strength must not exceed claim (L5 internal)',
        actualReasoning: replaySafe.reviewRationale ?? '(no rationale)',
        autoVerdict: base.autoVerdict,
        cpoCalibratedVerdict: adj.cpoCalibratedVerdict,
        calibrationClass: adj.calibrationClass,
        cpoRationale: adj.cpoRationale,
        confirmedForFix: adj.confirmedForFix,
        actualNextQuestion: replaySafe.actualNextQuestion,
        actualNextTargetGap: replaySafe.actualNextTargetGap,
        cpoNotes: adj.cpoRationale,
      });
    }
  }

  const summaryTable: CalibrationSummaryRow[] = CALIBRATION_CLUSTER_CODES.map((cluster) => {
    const subset = cases.filter((c) => c.cluster === cluster);
    return {
      cluster,
      autoFail: subset.filter((c) => autoIsFail(c.autoVerdict)).length,
      cpoAiDefect: subset.filter((c) => c.calibrationClass === 'AI_PM_DEFECT').length,
      evaluatorDefect: subset.filter((c) => c.calibrationClass === 'EVALUATOR_DEFECT').length,
      gtDefect: subset.filter((c) => c.calibrationClass === 'GROUND_TRUTH_DEFECT').length,
      confirmed: subset.filter((c) => c.confirmedForFix).length,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    sprint: 'AI_PM_IMPROVEMENT_SPRINT_1',
    phase: 'CALIBRATION_SUBMISSION',
    cpoReviewStatus: 'AWAITING_CPO_CONFIRMATION',
    note:
      'CTO structured adjudication per CPO Phase 2 rubric — CPO must confirm before any AI PM structural fix.',
    cases,
    summaryTable,
  };
}

export function formatSummaryMarkdown(submission: CpoCalibrationSubmission): string {
  const lines = [
    '# CPO Calibration Summary (Improvement Sprint 1)',
    '',
    '| Cluster | Auto FAIL | CPO AI Defect | Evaluator Defect | GT Defect | Confirmed |',
    '|---------|----------:|--------------:|-----------------:|----------:|----------:|',
  ];
  for (const row of submission.summaryTable) {
    lines.push(
      `| ${row.cluster} | ${row.autoFail} | ${row.cpoAiDefect} | ${row.evaluatorDefect} | ${row.gtDefect} | ${row.confirmed} |`,
    );
  }
  lines.push('', `Status: **${submission.cpoReviewStatus}**`, '', submission.note);
  return lines.join('\n');
}
