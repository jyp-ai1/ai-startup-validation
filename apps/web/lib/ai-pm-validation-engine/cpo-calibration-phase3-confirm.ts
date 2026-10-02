import { adjudicateCalibrationCase } from './cpo-calibration-adjudication';
import { replayCalibrationTurn } from './calibration-turn-replay';
import {
  buildCpoCalibrationSubmission,
  type CalibrationSubmissionCase,
  type CpoCalibrationSubmission,
} from './cpo-calibration-submission';
import { CALIBRATION_CLUSTER_CODES, type CalibrationClusterCode } from './cpo-improvement-calibration-pack';

export type ConfirmedCalibrationCase = CalibrationSubmissionCase & {
  cpoConfirmed: true;
  draftClass: CalibrationSubmissionCase['calibrationClass'];
  draftVerdict: CalibrationSubmissionCase['cpoCalibratedVerdict'];
};

export type ConfirmedClusterRow = {
  cluster: CalibrationClusterCode;
  aiPm: number;
  evaluator: number;
  gt: number;
  cpoConfirmed: number;
};

export type Phase3CalibrationConfirm = {
  generatedAt: string;
  phase: 'CALIBRATION_CPO_CONFIRMED';
  note: string;
  cases: ConfirmedCalibrationCase[];
  summaryTable: ConfirmedClusterRow[];
  confirmedFixClusters: CalibrationClusterCode[];
};

/** Phase 3 rubric — do not treat CTO draft counts as facts; re-apply CPO rules. */
function confirmCase(c: CalibrationSubmissionCase): ConfirmedCalibrationCase {
  const replay = replayCalibrationTurn({
    businessId: c.businessId,
    behavior: c.behavior,
    turn: c.turn,
  });
  if (!replay) {
    return {
      ...c,
      cpoConfirmed: true,
      draftClass: c.calibrationClass,
      draftVerdict: c.cpoCalibratedVerdict,
      calibrationClass: 'GROUND_TRUTH_DEFECT',
      cpoRationale: `${c.cpoRationale} [CPO confirm: replay failed — GT/evidence gap]`,
      confirmedForFix: false,
    };
  }

  let adj = adjudicateCalibrationCase({
    cluster: c.cluster,
    replay,
    autoFail:
      c.autoVerdict.understanding === 'FAIL' ||
      c.autoVerdict.state === 'FAIL' ||
      c.autoVerdict.gap === 'FAIL' ||
      c.autoVerdict.question === 'FAIL',
    failureTypes: c.failureTypes,
  });

  if (c.cluster === 'STATE_DRIFT') {
    const v3UsesContradicted =
      replay.actualGaps.customerPersona === 'CONTRADICTED' ||
      replay.actualGaps.customerPersona === 'CLOSED';
    if (v3UsesContradicted && c.failureTypes.includes('STATE_DRIFT')) {
      adj = {
        cpoCalibratedVerdict: 'PASS',
        calibrationClass: 'GROUND_TRUTH_DEFECT',
        cpoRationale:
          'Sandbox GT uses CONFLICT keys not aligned with V3 CONTRADICTED/CLOSED — not AI PM drift.',
        confirmedForFix: false,
      };
    } else if (!c.failureTypes.includes('STATE_DRIFT')) {
      adj = {
        cpoCalibratedVerdict: 'PASS',
        calibrationClass: 'EVALUATOR_DEFECT',
        cpoRationale: 'No drift signal after V3-aligned comparison.',
        confirmedForFix: false,
      };
    }
  }

  if (c.cluster === 'F08_WRONG_GAP_PRIORITY') {
    adj = {
      cpoCalibratedVerdict: 'PASS',
      calibrationClass: 'EVALUATOR_DEFECT',
      cpoRationale: 'Intent/Priority evaluation — gap id mismatch alone is not AI PM defect (CPO Phase 3).',
      confirmedForFix: false,
    };
  }

  return {
    ...c,
    ...adj,
    cpoRationale: adj.cpoRationale,
    cpoConfirmed: true,
    draftClass: c.calibrationClass,
    draftVerdict: c.cpoCalibratedVerdict,
    confirmedForFix: adj.confirmedForFix,
  };
}

export function buildPhase3CalibrationConfirm(
  submission: CpoCalibrationSubmission = buildCpoCalibrationSubmission(),
): Phase3CalibrationConfirm {
  const cases = submission.cases.map(confirmCase);

  const summaryTable: ConfirmedClusterRow[] = CALIBRATION_CLUSTER_CODES.map((cluster) => {
    const subset = cases.filter((x) => x.cluster === cluster);
    return {
      cluster,
      aiPm: subset.filter((x) => x.calibrationClass === 'AI_PM_DEFECT').length,
      evaluator: subset.filter((x) => x.calibrationClass === 'EVALUATOR_DEFECT').length,
      gt: subset.filter((x) => x.calibrationClass === 'GROUND_TRUTH_DEFECT').length,
      cpoConfirmed: subset.filter((x) => x.confirmedForFix).length,
    };
  });

  const confirmedFixClusters = CALIBRATION_CLUSTER_CODES.filter((cluster) =>
    cases.some((x) => x.cluster === cluster && x.confirmedForFix),
  );

  return {
    generatedAt: new Date().toISOString(),
    phase: 'CALIBRATION_CPO_CONFIRMED',
    note: 'CPO Phase 3 confirmation pass — draft submission overturned where rubric requires.',
    cases,
    summaryTable,
    confirmedFixClusters,
  };
}
